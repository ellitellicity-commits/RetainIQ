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
