type TaskDate = { month: string; created_at: string };

/** Continuous task history, including gaps, through one month ahead (or the latest task month, if later). */
export function taskMonths(tasks: TaskDate[], now = new Date()): string[] {
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  const dates = tasks.flatMap((task) => [task.month, task.created_at.slice(0, 7)])
    .filter((value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
  const sorted = [current, ...dates].sort();
  const first = sorted[0] ?? current;
  const latest = sorted[sorted.length - 1] ?? current;
  const last = latest > nextMonth ? latest : nextMonth;
  const months: string[] = [];
  let [year = now.getFullYear(), month = now.getMonth() + 1] = first.split("-").map(Number);
  while (true) {
    const value = `${year}-${String(month).padStart(2, "0")}`;
    if (value > last) break;
    months.push(value);
    month += 1;
    if (month === 13) { month = 1; year += 1; }
  }
  return months.reverse();
}