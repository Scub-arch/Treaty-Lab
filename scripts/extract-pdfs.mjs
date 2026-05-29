#!/usr/bin/env node
// Extract text from every PDF under C:\Phase 8 Sources into .txt files
// at C:\Phase 8 Sources\_extracted\<relative path>\<name>.txt.
//
// Runs from Treaty-Lab where `unpdf` is installed. No Poppler / pdftoppm needed.

import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, dirname, basename, relative } from "node:path";
import { extractText, getDocumentProxy } from "unpdf";

const ROOT = "C:\\Phase 8 Sources";
const OUT_ROOT = "C:\\Phase 8 Sources\\_extracted";
const SKIP_DIRS = new Set(["_extracted", "ui-app", "node_modules", ".git"]);

async function* walkPdfs(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    console.error(`Cannot read dir ${dir}: ${e.message}`);
    return;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkPdfs(full);
    } else if (e.name.toLowerCase().endsWith(".pdf")) {
      yield full;
    }
  }
}

async function extractOne(pdfPath) {
  const rel = relative(ROOT, pdfPath);
  const outDir = join(OUT_ROOT, dirname(rel));
  const txtPath = join(outDir, basename(pdfPath, ".pdf") + ".txt");

  // Skip if already extracted (idempotent re-runs)
  try {
    await stat(txtPath);
    return { status: "skip", pdf: rel };
  } catch {
    // not present — proceed
  }

  try {
    const buffer = await readFile(pdfPath);
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    await mkdir(outDir, { recursive: true });
    await writeFile(txtPath, text, "utf8");
    return { status: "ok", pdf: rel, pages: totalPages, chars: text.length };
  } catch (e) {
    return { status: "fail", pdf: rel, error: e.message };
  }
}

async function main() {
  await mkdir(OUT_ROOT, { recursive: true });
  let ok = 0,
    skip = 0,
    fail = 0;
  for await (const pdfPath of walkPdfs(ROOT)) {
    const r = await extractOne(pdfPath);
    if (r.status === "ok") {
      console.log(`OK ${String(r.pages).padStart(4)}p ${String(r.chars).padStart(7)}c  ${r.pdf}`);
      ok++;
    } else if (r.status === "skip") {
      console.log(`SKIP                          ${r.pdf}`);
      skip++;
    } else {
      console.error(`FAIL                          ${r.pdf}  (${r.error})`);
      fail++;
    }
  }
  console.log(`\nDone. ok=${ok} skip=${skip} fail=${fail} total=${ok + skip + fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
