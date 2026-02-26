export function formatPrettyTime(value: unknown): string {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw < 0) {
    return "DNF";
  }

  let time = Math.floor(raw);
  const bits = time % 1000;
  time = (time - bits) / 1000;
  const secs = time % 60;
  const mins = ((time - secs) / 60) % 60;
  const hours = (time - secs - 60 * mins) / 3600;

  let text = String(bits);
  if (bits < 10) text = "0" + text;
  if (bits < 100) text = "0" + text;
  text = secs + "." + text;
  if (secs < 10 && (mins > 0 || hours > 0)) text = "0" + text;
  if (mins > 0 || hours > 0) text = mins + ":" + text;
  if (mins < 10 && hours > 0) text = "0" + text;
  if (hours > 0) text = hours + ":" + text;
  return text;
}
