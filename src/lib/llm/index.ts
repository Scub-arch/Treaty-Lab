/**
 * Treaty-Lab LLM layer (AI-001) — single import surface.
 *
 *   import { chatTreaty, chatTreatyStream, ANALYST_SYSTEM_PROMPT } from "@/lib/llm";
 */

export { getToken, WORKSPACE_HOST } from "./databricks-auth";
export type { GetTokenOptions } from "./databricks-auth";

export { chatTreaty, chatTreatyStream, askTreaty } from "./databricks-chat";
export type {
  Role,
  Message,
  ChatOpts,
  ChatResult,
  StreamEvent,
  StreamOpts,
} from "./databricks-chat";

export { ANALYST_SYSTEM_PROMPT, ANALYST_SYSTEM_PROMPT_MARKDOWN } from "./prompts";
