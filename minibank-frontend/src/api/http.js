
const envBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8080";

export const API_BASE = String(envBase).replace(/\/$/, "");



export function getToken() {
  return localStorage.getItem("mb_token") || localStorage.getItem("token");
}


export function setToken(token) {
  localStorage.setItem("mb_token", token);
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("mb_token");
  localStorage.removeItem("token");
}

export async function api(path, { method = "GET", body, headers } = {}) {
  const token = getToken();

  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || "Request failed";
    const err = new Error(msg);
    if (data?.errors) err.errors = data.errors;
    throw err;
  }

  return data;
}