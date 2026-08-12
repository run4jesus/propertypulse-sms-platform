export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const usedHeaders = new Map<string, number>();
  const headers = lines[0].split(",").map((cell, index) => {
    const base = cell.trim().replace(/^"|"$/g, "") || `Unnamed Column ${index + 1}`;
    const occurrences = usedHeaders.get(base) ?? 0;
    usedHeaders.set(base, occurrences + 1);
    return occurrences === 0 ? base : `${base} (${occurrences + 1})`;
  });

  const rows = lines.slice(1).map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );
  return { headers, rows };
}
