import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import { requestRegisterOtp, verifyRegisterOtp } from "../api/auth";

const RESEND_COOLDOWN_SECONDS = 60;

export default function RegisterOtp() {
  const nav = useNavigate();

  // ✅ อ่านจาก sessionStorage แค่ครั้งเดียวตอน mount แล้วเก็บลง state
  const [reg, setReg] = useState(() => ({
    username: sessionStorage.getItem("reg_username") || "",
    fullName: sessionStorage.getItem("reg_fullName") || "",
    email: sessionStorage.getItem("reg_email") || "",
    password: sessionStorage.getItem("reg_password") || "",
  }));

  const { username, fullName, email, password } = reg;

  const [otp, setOtp] = useState("");
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [error, setError] = useState("");

  // countdown
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  const canResend = useMemo(
    () => secondsLeft <= 0 && !loadingResend && !loadingVerify,
    [secondsLeft, loadingResend, loadingVerify]
  );

  // ✅ เช็คแค่ตอน mount ถ้าไม่มีข้อมูลจริง ๆ ค่อยเด้งกลับ
  useEffect(() => {
    if (!username || !email) nav("/login", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // countdown ticker
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const clearRegisterSession = () => {
    sessionStorage.removeItem("reg_username");
    sessionStorage.removeItem("reg_fullName");
    sessionStorage.removeItem("reg_email");
    sessionStorage.removeItem("reg_password");
  };

  const onVerify = async (e) => {
    e.preventDefault();
    setError("");

    const code = otp.trim();
    if (!code) return setError("กรุณากรอก OTP");
    if (!/^\d{6}$/.test(code)) return setError("OTP ต้องเป็นตัวเลข 6 หลัก");

    setLoadingVerify(true);
    try {
      const res = await verifyRegisterOtp(username, email, code);

      // ✅ เซ็ตให้หน้าโปรไฟล์ใน Dashboard แสดงได้เลย
      localStorage.setItem("mb_user", res?.username || username);
      localStorage.setItem("mb_fullName", res?.fullName || fullName || "");
      localStorage.setItem("mb_email", res?.email || email || "");

      // ✅ ไป dashboard ก่อน (กัน useEffect เด้งกลับ login)
      nav("/dashboard", { replace: true });

      // ✅ ค่อยล้าง session หลังจากเริ่ม navigate แล้ว
      setTimeout(() => {
        clearRegisterSession();
      }, 0);
    } catch (err) {
      setError(err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoadingVerify(false);
    }
  };

  const onResend = async () => {
    setError("");

    if (!username || !fullName || !email || !password) {
      setError("ข้อมูลสมัครสมาชิกไม่ครบ กรุณากดแก้ไข");
      return;
    }
    if (!canResend) return;

    setLoadingResend(true);
    try {
      await requestRegisterOtp(username, fullName, email, password);
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err?.message || "ส่ง OTP ใหม่ไม่สำเร็จ");
    } finally {
      setLoadingResend(false);
    }
  };

  const onEdit = () => {
    // กลับไปหน้า register พร้อมกรอกข้อมูลเดิม
    nav("/login", {
      state: {
        tab: "register",
        prefill: { username, fullName, email, password },
      },
      replace: true,
    });
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authTop">
          <div className="authTitle">Verify OTP</div>
          <div className="authDesc">กรอก OTP ที่ส่งไปยัง: {email}</div>
        </div>

        <form className="formArea" onSubmit={onVerify}>
          <div className="field">
            <label>OTP</label>
            <input
              className="input2"
              placeholder="เช่น 123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>

          <button className="submitBtn" type="submit" disabled={loadingVerify}>
            {loadingVerify ? "Verifying..." : "Confirm"}
          </button>

          <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "space-between" }}>
            <button
              type="button"
              onClick={onEdit}
              style={{
                flex: 1,
                background: "rgba(160,210,255,0.10)",
                border: "1px solid rgba(160,210,255,0.18)",
                borderRadius: 14,
                padding: "10px 12px",
                color: "rgba(160,210,255,0.95)",
                fontWeight: 900,
                cursor: "pointer",
              }}
              disabled={loadingVerify || loadingResend}
            >
              แก้ไข
            </button>

            <button
              type="button"
              onClick={onResend}
              style={{
                flex: 1,
                background: canResend ? "rgba(160,210,255,0.20)" : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14,
                padding: "10px 12px",
                color: canResend ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                fontWeight: 900,
                cursor: canResend ? "pointer" : "not-allowed",
              }}
              disabled={!canResend}
            >
              {loadingResend ? "Sending..." : "ส่ง OTP ใหม่"}
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 700 }}>
            {secondsLeft > 0 ? `ส่งใหม่ได้ใน ${secondsLeft} วินาที` : "สามารถส่ง OTP ใหม่ได้แล้ว"}
          </div>

          {error ? (
            <div style={{ marginTop: 10, color: "rgba(255,160,170,0.95)", fontWeight: 800 }}>
              ⚠️ {error}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}