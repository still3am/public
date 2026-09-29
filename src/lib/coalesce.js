// Realtime subscriptions can fire several events in a burst (a like storm, a
// batch of follows). Each event used to trigger its own re-read of the
// collection, which turned one burst into a dozen API requests and tripped the
// platform rate limit. This collapses a burst into a single trailing call.
export function coalesce(fn, ms = 1200) {
  let timer = null;
  const run = (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
  run.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return run;
}