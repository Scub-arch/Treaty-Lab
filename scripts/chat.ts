import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import Anthropic from "@anthropic-ai/sdk";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const WORK_DIR = join(PROJECT_ROOT, ".work");
const DB_PATH = join(PROJECT_ROOT, "dev.db");
const MODEL = "claude-opus-4-7";
const MAX_ROWS = 50;

function loadEvidence(): string {
  const files = readdirSync(WORK_DIR)
    .filter((f) => f.startsWith("agent-out-") && f.endsWith(".md"))
    .sort();
  return files
    .map((f) => `## ${f}\n\n${readFileSync(join(WORK_DIR, f), "utf8")}`)
    .join("\n\n---\n\n");
}

const SCHEMA_HINT = `## Available SQL tables (SQLite, read-only)

- Treaty(id, slug, name, shortName, openedAt, enteredIntoForceAt, depository, summary, fullText, sourceUrl, createdAt, updatedAt)
- Party(id, code, name, type)  -- type is "country" | "organization"; code is ISO alpha-2 (e.g. "US", "CA") or org code (e.g. "UN", "EU")
- Signature(id, treatyId, partyId, signedAt, ratifiedAt, reservation, createdAt)
- Topic(id, slug, name, parentId)  -- self-referential hierarchy
- "_TreatyTopics"(A, B)  -- M:N join: A = treatyId, B = topicId. Quote the table name.

Dates are ISO 8601 strings. Use the \`query_database\` tool to run SELECT/WITH queries. Prefer adding LIMIT in your SQL when you only need a sample.`;

const SYSTEM_PROMPT = `You are the Treaty-Lab research assistant — an Indigenous-led infrastructure intelligence terminal covering treaty rights, water, energy/grid, Indigenous finance, governance, and precedents.

You have two sources of grounded information:

1. **Evidence synthesis** (the \`.work/agent-out-*.md\` files below) — Canadian Indigenous infrastructure intelligence: legal, finance, water, power/AI/data-centres, government policy, community validation, and precedents.
2. **\`dev.db\`** — a SQLite database of international treaty documents, accessible via the \`query_database\` tool. Use this when the question is about treaty text, signatories, ratification dates, or topic groupings.

When answering:
- Cite specific facts, figures, and document names from the synthesis when relevant.
- Distinguish between confirmed facts, risks, open questions, stated assumptions, and items needing community or legal validation.
- **Attach a citation marker to every claim drawn from grounded sources.** Use \`[source: agent-out-finance.md]\` (or whichever file) when the claim comes from the synthesis; use \`[source: dev.db]\` when it comes from a SQL query. Don't fabricate citations and don't pad answers with them.
- If a question is outside the scope of both sources, say so plainly and offer what you do know from general training (without citation markers).

${SCHEMA_HINT}

# Evidence synthesis (.work/agent-out-*.md)

${loadEvidence()}`;

const tools: Anthropic.Tool[] = [
  {
    name: "query_database",
    description:
      "Run a single read-only SQL query against Treaty-Lab's SQLite database (dev.db). Only SELECT and WITH (CTE) statements are allowed. Results are returned as JSON, capped at " +
      MAX_ROWS +
      " rows. Use LIMIT in your query when sampling.",
    input_schema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description:
            "A single SELECT or WITH statement. No semicolons except an optional trailing one. No multi-statement queries.",
        },
      },
      required: ["sql"],
    },
  },
];

const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

function runQuery(sql: string): string {
  const trimmed = sql.trim().replace(/;$/, "");
  if (!/^(select|with)\s/i.test(trimmed)) {
    return JSON.stringify({
      error: "Only SELECT or WITH (CTE) queries are allowed.",
    });
  }
  try {
    const rows = db.prepare(trimmed).all();
    const truncated = rows.length > MAX_ROWS;
    return JSON.stringify({
      rows: rows.slice(0, MAX_ROWS),
      row_count: rows.length,
      truncated,
    });
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message });
  }
}

function executeToolUse(block: Anthropic.ToolUseBlock): Anthropic.ToolResultBlockParam {
  if (block.name === "query_database") {
    const sql = (block.input as { sql: string }).sql;
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: runQuery(sql),
    };
  }
  return {
    type: "tool_result",
    tool_use_id: block.id,
    content: JSON.stringify({ error: `Unknown tool: ${block.name}` }),
    is_error: true,
  };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY in .env");
    process.exit(1);
  }

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [];
  const rl = createInterface({ input, output });

  console.log(
    `Treaty-Lab chat (model: ${MODEL}, tools: query_database). Type 'exit' or Ctrl+C to quit.\n`,
  );

  while (true) {
    const userInput = (await rl.question("you: ")).trim();
    if (!userInput) continue;
    if (userInput === "exit" || userInput === "quit") break;

    messages.push({ role: "user", content: userInput });
    process.stdout.write("\nclaude: ");

    // Agentic loop: keep going until Claude stops calling tools
    while (true) {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools,
        messages,
      });

      stream.on("text", (delta) => process.stdout.write(delta));
      const finalMessage = await stream.finalMessage();
      messages.push({ role: "assistant", content: finalMessage.content });

      if (finalMessage.stop_reason === "end_turn") {
        process.stdout.write("\n\n");
        const {
          input_tokens,
          cache_creation_input_tokens,
          cache_read_input_tokens,
          output_tokens,
        } = finalMessage.usage;
        console.error(
          `[in: ${input_tokens} | cache write: ${cache_creation_input_tokens ?? 0} | cache read: ${cache_read_input_tokens ?? 0} | out: ${output_tokens}]\n`,
        );
        break;
      }

      if (finalMessage.stop_reason === "tool_use") {
        const toolUseBlocks = finalMessage.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
        );
        const toolResults = toolUseBlocks.map((b) => {
          process.stdout.write(
            `\n[calling ${b.name}: ${JSON.stringify(b.input).slice(0, 120)}...]\n`,
          );
          return executeToolUse(b);
        });
        messages.push({ role: "user", content: toolResults });
        process.stdout.write("\nclaude: ");
        continue;
      }

      // Unexpected stop_reason — bail out of inner loop
      process.stdout.write(`\n[stopped: ${finalMessage.stop_reason}]\n\n`);
      break;
    }
  }

  rl.close();
  db.close();
}

main().catch((err) => {
  if (err?.code === "ERR_USE_AFTER_CLOSE") process.exit(0);
  console.error("\nError:", err);
  process.exit(1);
});
