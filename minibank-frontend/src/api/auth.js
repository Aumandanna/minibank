import { api, setToken, clearToken } from "./http";

function pickToken(data) {
  // รองรับหลายรูปแบบที่ backend มักส่งมา
  return (
    data?.token ||
    data?.jwt ||
    data?.accessToken ||
    data?.data?.token ||
    data?.data?.jwt ||
    null
  );
}

/* =========================
   AUTH: LOGIN / REGISTER
========================= */

export async function login(username, password) {
  const data = await api("/auth/login", {
    method: "POST",
    body: { username, password },
  });

  const t = pickToken(data);
  if (t) setToken(t);
  return data;
}

export async function register(username, fullName, email, password) {
  const data = await api("/auth/register", {
    method: "POST",
    body: { username, fullName, email, password },
  });

  const t = pickToken(data);
  if (t) setToken(t);
  return data;
}

export function logout() {
  clearToken();
}

/* =========================
   REGISTER OTP FLOW
========================= */

export async function requestRegisterOtp(username, fullName, email, password) {
  return api("/auth/register/request-otp", {
    method: "POST",
    body: { username, fullName, email, password },
  });
}

export async function verifyRegisterOtp(username, email, otp) {
  const data = await api("/auth/register/verify-otp", {
    method: "POST",
    body: { username, email, otp },
  });

  const t = pickToken(data);
  if (t) setToken(t);

  return data;
}

/* =========================
   FORGOT PASSWORD FLOW
   (Email -> Lookup -> Set New Pass -> Send OTP -> Verify OTP -> Login)
========================= */

/**
 * 1) ตรวจว่า email นี้ผูกกับ username ไหม
 * backend ควรตอบ { username: "..." }
 */
export async function forgotLookup(email) {
  return api("/auth/forgot/lookup", {
    method: "POST",
    body: { email },
  });
}

/**
 * 2) เริ่ม reset: ส่ง newPassword ไปเก็บไว้ชั่วคราว + ส่ง OTP
 * backend ควรตอบ { resetRequestId: "...", username: "..." }
 */
export async function forgotStart(email, newPassword) {
  return api("/auth/forgot/start", {
    method: "POST",
    body: { email, newPassword },
  });
}

/**
 * 3) ส่ง OTP ใหม่ (Resend)
 * backend ควรตอบ { message: "..." }
 */
export async function forgotResendOtp(resetRequestId) {
  return api("/auth/forgot/resend-otp", {
    method: "POST",
    body: { resetRequestId },
  });
}

/**
 * 4) ยืนยัน OTP เพื่อเปลี่ยนรหัสผ่าน + login ทันที
 * backend ควรตอบ { token: "...", username: "...", role: "USER" }
 */
export async function forgotConfirmOtp(resetRequestId, otp) {
  const data = await api("/auth/forgot/confirm", {
    method: "POST",
    body: { resetRequestId, otp },
  });

  const t = pickToken(data);
  if (t) setToken(t);

  return data;
}