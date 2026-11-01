/** ISO (UTC) string → value for <input type="datetime-local"> in the user's local time. */
export function toDatetimeLocal(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** datetime-local value (local time) → ISO (UTC) string. */
export function fromDatetimeLocal(v: string): string {
  return v ? new Date(v).toISOString() : "";
}
