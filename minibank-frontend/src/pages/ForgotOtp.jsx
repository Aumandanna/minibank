import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotConfirmOtp, forgotResendOtp } from "../api/auth";

export default function ForgotOtp() {
  const nav = useNavigate();

  // ✅ อ่านจาก sessionStorage "ครั้งเดียว" ตอน mount แล้วเก็บเป็น state
  const [email] = useState(() => sessionStorage.getItem("fp_email") || "");
  const [usernameFromSession] = useState(() => sessionStorage.getItem("fp_username") || "");
  const [resetRequestId] = useState(() => sessionStorage.getItem("fp_resetRequestId") || "");

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [leftSec, setLeftSec] = useState(0);

  // ✅ guard: ทำแค่ตอน mount ครั้งเดียวพอ
  useEffect(() => {
    if (!email || !resetRequestId) {
      nav("/forgot", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const lastSentAt = Number(sessionStorage.getItem("fp_lastSentAt") || "0");
    if (!lastSentAt) {
      setLeftSec(0);
      return;
    }
    const tick = () => {
      const diff = Math.max(0, 60 - Math.floor((Date.now() - lastSentAt) / 1000));
      setLeftSec(diff);
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, []);

  const canResend = useMemo(() => leftSec <= 0 && !loading, [leftSec, loading]);
  const canVerify = useMemo(() => otp.trim().length === 6 && !loading, [otp, loading]);

  async function onVerify() {
    setError("");
    const code = otp.trim();
    if (code.length !== 6) return setError("กรุณากรอก OTP 6 หลัก");

    setLoading(true);
    try {
      const res = await forgotConfirmOtp(resetRequestId, code);

      // ✅ เซ็ตข้อมูลให้หน้าโปรไฟล์ใน Dashboard แสดงได้
      const finalUsername = res?.username || usernameFromSession || "";
      if (finalUsername) localStorage.setItem("mb_user", finalUsername);

      // email: ใช้ของ backend ถ้ามี ไม่งั้น fallback เป็น email ที่กรอก
      localStorage.setItem("mb_email", res?.email || email || "");
      if (res?.fullName) localStorage.setItem("mb_fullName", res.fullName);

      // ✅ ไป dashboard ก่อน (ให้ component unmount)
      nav("/dashboard", { replace: true });

      // ✅ ค่อยเคลียร์ sessionStorage หลังจาก nav (กันเด้งกลับ)
      setTimeout(() => {
        sessionStorage.removeItem("fp_email");
        sessionStorage.removeItem("fp_username");
        sessionStorage.removeItem("fp_resetRequestId");
        sessionStorage.removeItem("fp_lastSentAt");
      }, 0);
    } catch (e) {
      setError(e?.message || "OTP ไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError("");
    if (!canResend) return;

    setLoading(true);
    try {
      await forgotResendOtp(resetRequestId);
      sessionStorage.setItem("fp_lastSentAt", String(Date.now()));
      setLeftSec(60);
    } catch (e) {
      setError(e?.message || "ส่ง OTP ใหม่ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authTop">
          <div className="brandRow">
            <div className="brandText">
              <div className="brandName">MiniBank</div>
            </div>
          </div>

          <div className="authTitle">Verify OTP</div>
          <div className="authDesc">
            ส่ง OTP ไปที่ <span style={{ color: "white", fontWeight: 900 }}>{email}</span>
          </div>
        </div>

        <div className="formArea">
          {usernameFromSession ? (
            <div style={{ marginBottom: 10, color: "rgba(200,235,255,0.95)", fontWeight: 900 }}>
              ผู้ใช้งาน: <span style={{ color: "white" }}>{usernameFromSession}</span>
            </div>
          ) : null}

          <div className="field">
            <label>OTP (6 หลัก)</label>
            <input
              className="input2"
              placeholder="เช่น 123456"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 6));
                setError("");
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={loading}
            />
          </div>

          {error ? (
            <div style={{ marginTop: 10, color: "rgba(255,160,170,0.95)", fontWeight: 800 }}>
              ⚠️ {error}
            </div>
          ) : null}

          <button className="submitBtn" type="button" disabled={!canVerify} onClick={onVerify}>
            {loading ? "Processing..." : "ยืนยัน OTP"}
          </button>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => nav("/forgot")}
              style={{
                flex: 1,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.85)",
                padding: "12px 14px",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 800,
              }}
              disabled={loading}
            >
              ย้อนกลับ
            </button>

            <button
              type="button"
              onClick={onResend}
              style={{
                flex: 1,
                background: canResend ? "rgba(60,120,160,0.85)" : "rgba(60,120,160,0.35)",
                border: "none",
                color: "white",
                padding: "12px 14px",
                borderRadius: 12,
                cursor: canResend ? "pointer" : "not-allowed",
                fontWeight: 900,
              }}
              disabled={!canResend}
            >
              {leftSec > 0 ? `ส่ง OTP ใหม่ได้ใน ${leftSec}s` : "ส่ง OTP ใหม่"}
            </button>
          </div>

          <div className="formHint" style={{ marginTop: 14 }}>
            <span className="dot" /> OTP นี้ใช้สำหรับ <b>การลืมรหัสผ่าน</b>
          </div>
        </div>

        <div className="techRow">
          <span className="techPill">🔐 OTP</span>
          <span className="techPill">⏱️ 60s</span>
          <span className="techPill">⚡ Auto Login</span>
        </div>
      </div>
    </div>
  );
}