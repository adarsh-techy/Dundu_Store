import { useSyncExternalStore } from 'react';

let now = Date.now();
const listeners = new Set();
let timer = null;

const subscribe = (cb) => {
  listeners.add(cb);
  if (!timer) timer = setInterval(() => { now = Date.now(); listeners.forEach((l) => l()); }, 30_000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) { clearInterval(timer); timer = null; }
  };
};

/** Current time (ms), refreshed every 30s — safe to use during render. */
export default function useNow() {
  return useSyncExternalStore(subscribe, () => now, () => now);
}
