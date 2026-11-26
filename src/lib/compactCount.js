// Short, readable counts for chart stats (1.2k, 18k, 2.4m).
export default function compactCount(value) {
  const n = Math.max(0, Number(value) || 0);
  if (n < 1000) return n.toLocaleString();
  if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, '') + 'k';
  return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
}