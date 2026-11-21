// API — thin fetch wrapper that normalizes { ok, data, error } responses.
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
  const res = await fetch(path, opts);
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
