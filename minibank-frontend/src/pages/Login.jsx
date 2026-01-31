import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./login.css";
import logo from "./img/download.png";

import { login, requestRegisterOtp } from "../api/auth";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState("login"); // login | register

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const st = location?.state;
    if (!st) return;

    if (st.tab === "register") setTab("register");
    if (st.prefill) {
      setUsername(st.prefill.username ?? "");
      setFullName(st.prefill.fullName ?? "");
      setEmail(st.prefill.email ?? "");
      setPassword(st.prefill.password ?? "");
    }

    window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    if (!username.trim() || !password.trim()) return false;
    if (tab === "register" && !fullName.trim()) return false;
    if (tab === "register" && !email.trim()) return false;
    return true;
  }, [tab, username, fullName, email, password]);

  function validate() {
    const errs = {};
    const u = username.trim();
    const p = password.trim();
    const fn = fullName.trim();
    const em = email.trim();

    if (!u) errs.username = "กรุณากรอก Username";
    if (!p) errs.password = "กรุณากรอก Password";

    if (tab === "register") {
      if (!fn) errs.fullName = "กรุณากรอก Full name";
      if (!em) errs.email = "กรุณากรอก Email";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) errs.email = "รูปแบบอีเมลไม่ถูกต้อง";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setError("");

    const ok = validate();
    if (!ok) return;

    setLoading(true);
    try {
      if (tab === "login") {
        const res = await login(username.trim(), password);

        // ✅ เก็บให้ Dashboard/โปรไฟล์อ่านได้ (คง UI เดิม)
        localStorage.setItem("mb_user", res?.username || username.trim());
        if (res?.fullName) localStorage.setItem("mb_fullName", res.fullName);
        if (res?.email) localStorage.setItem("mb_email", res.email);

        nav("/dashboard");
      } else {
        await requestRegisterOtp(username.trim(), fullName.trim(), email.trim(), password);

        sessionStorage.setItem("reg_username", username.trim());
        sessionStorage.setItem("reg_fullName", fullName.trim());
        sessionStorage.setItem("reg_email", email.trim());
        sessionStorage.setItem("reg_password", password);

        nav("/register/otp");
      }
    } catch (err) {
      if (err?.errors && typeof err.errors === "object") {
        setFieldErrors(err.errors);
      }
      setError(err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  function clearFieldError(name) {
    setFieldErrors((prev) => {
      if (!prev?.[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authTop">
          <div className="brandRow">
            <img src={logo} alt="MiniBank Logo" className="brandLogo" />
            <div className="brandText">
              <div className="brandName">MiniBank</div>
            </div>
          </div>

          <div className="authTitle">Sign in</div>
          <div className="authDesc">เข้าสู่ระบบเพื่อใช้งานแดชบอร์ด</div>
        </div>

        <div className="tabRow">
          <button
            className={`tabBtn ${tab === "login" ? "active" : ""}`}
            onClick={() => {
              setTab("login");
              setError("");
              setFieldErrors({});
              setSubmitted(false);
            }}
            type="button"
          >
            ล็อกอิน
          </button>
          <button
            className={`tabBtn ${tab === "register" ? "active" : ""}`}
            onClick={() => {
              setTab("register");
              setError("");
              setFieldErrors({});
              setSubmitted(false);
            }}
            type="button"
          >
            สมัครสมาชิก
          </button>
        </div>

        <form className="formArea" onSubmit={onSubmit}>
          <div className="field">
            <label>Username</label>
            <input
              className="input2"
              placeholder="เช่น user"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                clearFieldError("username");
              }}
              autoComplete="username"
            />
            {submitted && fieldErrors?.username ? (
              <div style={{ marginTop: 6, color: "rgba(255,160,170,0.95)", fontWeight: 700 }}>
                ⚠️ {fieldErrors.username}
              </div>
            ) : null}
          </div>

          {tab === "register" && (
            <div className="field">
              <label>Full name</label>
              <input
                className="input2"
                placeholder="เช่น user paln"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clearFieldError("fullName");
                }}
                autoComplete="name"
              />
              {submitted && fieldErrors?.fullName ? (
                <div style={{ marginTop: 6, color: "rgba(255,160,170,0.95)", fontWeight: 700 }}>
                  ⚠️ {fieldErrors.fullName}
                </div>
              ) : null}
            </div>
          )}

          {tab === "register" && (
            <div className="field">
              <label>Email</label>
              <input
                className="input2"
                placeholder="เช่น you@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                autoComplete="email"
                inputMode="email"
              />
              {submitted && fieldErrors?.email ? (
                <div style={{ marginTop: 6, color: "rgba(255,160,170,0.95)", fontWeight: 700 }}>
                  ⚠️ {fieldErrors.email}
                </div>
              ) : null}
            </div>
          )}

          <div className="field">
            <label>Password</label>
            <input
              className="input2"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
              }}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
            />
            {submitted && fieldErrors?.password ? (
              <div style={{ marginTop: 6, color: "rgba(255,160,170,0.95)", fontWeight: 700 }}>
                ⚠️ {fieldErrors.password}
              </div>
            ) : null}

            {/* ✅ ลืมรหัสผ่าน (แสดงเฉพาะแท็บล็อกอิน) */}
            {tab === "login" ? (
              <div style={{ marginTop: 8, textAlign: "right", position: "relative", zIndex: 999 }}>
                <button
                  type="button"
                  onClick={() => nav("/forgot")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(180,220,255,0.95)",
                    fontWeight: 800,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
            ) : null}
          </div>

          {error ? (
            <div style={{ marginTop: 10, color: "rgba(255,160,170,0.95)", fontWeight: 700 }}>
              ⚠️ {error}
            </div>
          ) : null}

          <button className="submitBtn" type="submit" disabled={loading || !canSubmit}>
            {loading ? "Processing..." : tab === "login" ? "Sign in" : "Send OTP"}
          </button>

          <div className="formHint">
            <span className="dot" /> ใช้งานเพื่อการทดสอบระบบและนำเสนอผลงาน
          </div>
        </form>

        <div className="techRow">
          <span className="techPill">🔐 JWT</span>
          <span className="techPill">🛡️ Spring Security</span>
          <span className="techPill">⚡ Vite + React</span>
        </div>
      </div>
    </div>
  );
}