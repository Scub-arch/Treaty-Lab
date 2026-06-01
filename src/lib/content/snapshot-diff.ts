// AUDIT-002b — pure, deterministic field-level diff between two JSON snapshots.
// No DB. v1 compares TOP-LEVEL fields (added / removed / changed) carrying
// before/after values; deep per-array-element diffing is a documented v2
// refinement. Output is sorted by field name so it is deterministic.

export type FieldChange =
  | { field: string; kind: "added"; after: unknown }
  | { field: string; kind: "removed"; before: unknown }
  | { field: string; kind: "changed"; before: unknown; after: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Stable JSON serialization (object keys sorted) for order-independent equality. */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) =>
    isRecord(val) ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, val[k]])) : val,
  );
}

function equal(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

/**
 * Top-level field diff between two snapshots. A key present only in `after` is
 * "added", only in `before" is "removed", in both but unequal is "changed".
 * Non-object snapshots are compared whole as a single "(root)" field. Result is
 * sorted by field name (deterministic).
 */
export function diffSnapshots(before: unknown, after: unknown): FieldChange[] {
  if (!isRecord(before) || !isRecord(after)) {
    return equal(before, after) ? [] : [{ field: "(root)", kind: "changed", before, after }];
  }

  const fields = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  const changes: FieldChange[] = [];
  for (const field of fields) {
    const inBefore = Object.prototype.hasOwnProperty.call(before, field);
    const inAfter = Object.prototype.hasOwnProperty.call(after, field);
    if (inAfter && !inBefore) {
      changes.push({ field, kind: "added", after: after[field] });
    } else if (inBefore && !inAfter) {
      changes.push({ field, kind: "removed", before: before[field] });
    } else if (!equal(before[field], after[field])) {
      changes.push({ field, kind: "changed", before: before[field], after: after[field] });
    }
  }
  return changes;
}
