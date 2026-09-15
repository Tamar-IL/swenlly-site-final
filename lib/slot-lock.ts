// Serializes booking attempts so two visitors cannot take the same time.
//
// Without this, "is the slot free?" and "take the slot" are two awaits apart,
// and two requests that arrive together both read "free" before either writes.
// The lock is per calendar day: meetings on different days can never clash, and
// a day is small enough that serializing it costs nothing at this volume.
//
// This covers one Node process, which is what the site runs as. The second
// guard — the one that survives a second instance — is the reconciliation in
// booking-service.ts, which settles a race after the fact.

const KEY = Symbol.for("swenlly.slotLocks");
type Holder = { [KEY]?: Map<string, Promise<void>> };

function chains(): Map<string, Promise<void>> {
  const holder = globalThis as unknown as Holder;
  if (!holder[KEY]) holder[KEY] = new Map();
  return holder[KEY];
}

const settle = () => undefined;

/** Runs `fn` with nothing else holding `key`. A rejection reaches the caller but
 *  never poisons the chain for whoever is queued behind. */
export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const map = chains();
  const previous = map.get(key) ?? Promise.resolve();
  // .then(fn, fn) so a failure ahead of us still lets us run.
  const run = previous.then(fn, fn);
  const tail = run.then(settle, settle);
  map.set(key, tail);
  tail.then(() => {
    // Whoever queued after us already replaced the entry; only the last clears it.
    if (map.get(key) === tail) map.delete(key);
  });
  return run;
}
