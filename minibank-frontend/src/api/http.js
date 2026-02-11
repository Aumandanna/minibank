// ✅ อ่าน API base จาก ENV ก่อน (ตั้งใน Vercel/Netlify/Railway)
// ตัวอย่าง: https://minibank-production.up.railway.app
//
// หมายเหตุสำคัญ (Vite):
// - ตัวแปร env ต้องขึ้นต้นด้วย VITE_
// - ค่าจะถูก "ฝัง" ตอน build ดังนั้นแก้ env แล้วต้อง Redeploy/Trigger new build

function pickApiBase() {
  // รองรับหลายชื่อ key กันพลาด (บางคนตั้งใน Netlify เป็น VITE_API_URL / VITE_API_URL_BASE)
  const env =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_URL_BASE ||
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API;

  const base = (env || "http://localhost:8080").replace(/\/$/, "");

  // ถ้าอยู่บน production (https) แต่ยังชี้ไป localhost → จะขึ้น Failed to fetch บนมือถือแน่นอน
  if (typeof window !== "undefined") {
    const isHttpsSite = window.location.protocol === "https:";
    const isLocalhostApi =
      base.includes("localhost") || base.includes("127.0.0.1") || base.includes("0.0.0.0");

    if (isHttpsSite && isLocalhostApi) {
      console.warn(
        "[MiniBank] API_BASE ชี้ไป localhost แต่หน้าเว็บเป็น https → จะเรียก API ไม่ได้ (Failed to fetch).\n" +
          "ให้ตั้งค่า Netlify/Vercel env เป็น VITE_API_BASE_URL=https://<your-backend-domain> แล้ว redeploy."
      );
    }
  }

  return base;
}

export const API_BASE = pickApiBase();

// ✅ ให้ระบบอ่าน token ได้ทั้ง 2 key กันพังทุก flow
export function getToken() {
  return localStorage.getItem("mb_token") || localStorage.getItem("token");
}

// ✅ เวลา set ให้เขียนทั้ง 2 key
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
