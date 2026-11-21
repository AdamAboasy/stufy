// API — thin fetch wrapper that normalizes { ok, data, error } responses.
// Adds a request timeout so no call can hang the UI forever.
async function api(path, options = {}) {
  const opts = {
    credentials: "same-origin",
    headers: {},
    ...options,
  };
  if (opts.body && typeof opts.body !== "string" && !(opts.body instanceof FormData)) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  opts.signal = controller.signal;

  let res;
  try {
    res = await fetch(path, opts);
  } catch (err) {
    clearTimeout(timeout);
    const e = new Error(
      err.name === "AbortError"
        ? "Request timed out — check your connection and reload."
        : "Network error — the server could not be reached."
    );
    e.code = "NETWORK";
    throw e;
  }
  clearTimeout(timeout);

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const json = await res.json();
    if (!res.ok || json.ok === false) {
      const err = new Error(json.error?.message || "Request failed");
      err.code = json.error?.code || "ERROR";
      err.status = res.status;
      // If access is restricted to the manager, send blocked users to sign in.
      if (err.code === "ADMIN_ONLY" && !location.pathname.startsWith("/login")) {
        location.href = "/login";
      }
      throw err;
    }
    return json.data;
  }
  if (!res.ok) {
    const err = new Error("Request failed");
    err.status = res.status;
    throw err;
  }
  return res;
}

window.api = api;
