// frontend/src/lib/api.js

/**
 * Normalize the API base:
 * - supports either VITE_API_BASE_URL or VITE_API_URL
 * - strips trailing slashes
 * - strips accidental "/api" or "/api/v1" suffixes from the base
 *   (the path you pass should include "api/v1/...").
 */
function normalizeApiBase(u) {
  if (!u) return "";
  let s = String(u).trim();

  // strip trailing slashes
  s = s.replace(/\/+$/, "");

  // strip a trailing /api or /api/vX, if someone put it in the env var
  s = s.replace(/\/api(\/v\d+)?$/i, "");

  return s;
}

const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5555";

export const apiBase = normalizeApiBase(RAW_BASE);

/** Join base + path safely.
 *  Usage: joinApi("api/v1/ward/meta/WARD_001")
 */
export function joinApi(path) {
  const p = String(path || "").replace(/^\/+/, "");
  return `${apiBase}/${p}`;
}

/** Fetch JSON with consistent errors and credentials included.
 *  You can pass a full http(s) URL, or an API path ("api/v1/...").
 */
export async function fetchJson(path, init = {}) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = isAbsolute ? path : joinApi(String(path).replace(/^\/+/, ""));

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    credentials: init.credentials ?? "include",
    ...init,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let body = null;
    try {
      body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // body not json — ignore
    }
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  if (res.status === 204) return null; // empty
  return res.json();
}
