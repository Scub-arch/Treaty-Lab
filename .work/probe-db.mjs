import Database from "better-sqlite3";
const db = new Database("./dev.db", { readonly: true });
const tables = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%' AND name NOT LIKE 'sqlite%' ORDER BY name",
  )
  .all();
for (const t of tables) {
  const c = db.prepare(`SELECT COUNT(*) as n FROM "${t.name}"`).get();
  console.log(`${t.name}: ${c.n} rows`);
}
const sample = db.prepare(`SELECT id, name, openedAt FROM Treaty ORDER BY openedAt LIMIT 5`).all();
console.log("\nSample treaties:");
for (const row of sample) console.log(`  ${row.openedAt?.slice(0, 10) ?? "?"} — ${row.name}`);
db.close();
