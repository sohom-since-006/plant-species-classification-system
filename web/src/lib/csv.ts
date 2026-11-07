/** Escape a CSV field value (handle commas, quotes, newlines) */
function escapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Convert an array of objects to a CSV string */
export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.map(escapeField).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeField(String(row[h] ?? ''))).join(','),
  );
  return [headerLine, ...dataLines].join('\n');
}

/** Trigger a CSV file download in the browser */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
