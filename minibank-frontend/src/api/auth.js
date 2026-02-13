import { api, setToken, clearToken } from "./http";

function pickToken(data) {
 
  return (
    data?.token ||
    data?.jwt ||
    data?.accessToken ||
    data?.data?.token ||
    data?.data?.jwt ||
    null
  );
}



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


export async function forgotLookup(email) {
  return api("/auth/forgot/lookup", {
    method: "POST",
    body: { email },
  });
}


export async function forgotStart(email, newPassword) {
  return api("/auth/forgot/start", {
    method: "POST",
    body: { email, newPassword },
  });
}


 
export async function forgotResendOtp(resetRequestId) {
  return api("/auth/forgot/resend-otp", {
    method: "POST",
    body: { resetRequestId },
  });
}


export async function forgotConfirmOtp(resetRequestId, otp) {
  const data = await api("/auth/forgot/confirm", {
    method: "POST",
    body: { resetRequestId, otp },
  });

  const t = pickToken(data);
  if (t) setToken(t);

  return data;
}