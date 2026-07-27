// Every backend route except the public auth endpoints (login/signup/guest/
// config) now requires a bearer token -- this is the one place that reads it
// out of localStorage, so call sites merge it into their fetch() headers
// instead of each reimplementing the lookup.
export function authHeaders() {
  let token = null;
  try {
    token = localStorage.getItem("riq_auth_token");
  } catch (e) {}
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Lightweight in-memory GET cache with a short TTL. Several pages (Dashboard,
// Clients, Contacts, Analytics, AI Co-pilot) each independently fetch the same
// slow-changing collections (clients, deals, retention history) on mount --
// this lets a page-to-page navigation within the TTL window reuse the last
// response instead of re-issuing an identical request. Not persisted, not a
// dependency -- just a Map cleared on refresh, tag-invalidated on writes.
const CACHE_TTL_MS = 30000;
const cache = new Map();

export function cachedGetJson(url, ttl = CACHE_TTL_MS) {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expiresAt > now) return hit.promise;

  const promise = fetch(url, { headers: authHeaders() })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
    .catch((err) => { cache.delete(url); throw err; });

  cache.set(url, { promise, expiresAt: now + ttl });
  return promise;
}

// Call after any write that changes cached data, e.g. invalidateCache("clients")
// after an import, or invalidateCache("deals") after a stage change. Matches
// against the cached URL, so a substring of the route path is enough.
export function invalidateCache(pathFragment) {
  if (!pathFragment) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(pathFragment)) cache.delete(key);
  }
}
