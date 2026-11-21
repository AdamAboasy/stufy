export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const isForm = options?.body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: isForm
      ? options?.headers
      : { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (res.headers.get("content-type")?.includes("spreadsheet")) {
    return (await res.blob()) as T;
  }
  const json = (await res.json().catch(() => null)) as
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string } }
    | null;
  if (!json || !("ok" in json)) {
    throw new ApiRequestError("NETWORK", "Unable to reach the server.", res.status);
  }
  if (!json.ok) {
    throw new ApiRequestError(json.error.code, json.error.message, res.status);
  }
  return json.data;
}

export const fetcher = (path: string) => api(path);
