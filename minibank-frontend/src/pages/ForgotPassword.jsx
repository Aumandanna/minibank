import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotLookup, forgotStart } from "../api/auth";

export default function ForgotPassword() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // แสดงเมื่อ lookup สำเร็จ
  const [lookedUp, setLookedUp] = useState(false);

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canLookup = useMemo(() => email.trim().length > 0, [email]);
  const canStart = useMemo(() => {
    if (!lookedUp) return false;
    if (!newPass.trim() || !confirmPass.trim()) return false;
    if (newPass !== confirmPass) return false;
    return true;
  }, [lookedUp, newPass, confirmPass]);

  async function onLookup() {
    setError("");
    const em = email.trim();
    if (!em) return setError("กรุณากรอก Email");

    setLoading(true);
    try {
      const res = await forgotLookup(em);
      // ถ้า email ไม่ผูก backend จะ throw message มา
      setUsername(res?.username || "");
      setLookedUp(true);
    } catch (e) {
      setLookedUp(false);
      setUsername("");
      setError(e?.message || "ไม่สามารถตรวจสอบอีเมลได้");
    } finally {
      setLoading(false);
    }
  }

  function onEditEmail() {
    setError("");
    setLookedUp(false);
    setUsername("");
    setNewPass("");
    setConfirmPass("");
  }

  async function onStartOtp() {
    setError("");

    const em = email.trim();
    if (!em) return setError("กรุณากรอก Email");
    if (!lookedUp) return setError("กรุณากดยืนยันเพื่อตรวจสอบอีเมลก่อน");
    if (!newPass.trim()) return setError("กรุณากรอกรหัสผ่านใหม่");
    if (!confirmPass.trim()) return setError("กรุณายืนยันรหัสผ่านใหม่");
    if (newPass !== confirmPass) return setError("รหัสผ่านใหม่ไม่ตรงกัน");

    setLoading(true);
    try {
      const res = await forgotStart(em, newPass);

      // เก็บไว้ใช้ในหน้า OTP
      sessionStorage.setItem("fp_email", em);
      sessionStorage.setItem("fp_username", res?.username || username || "");
      sessionStorage.setItem("fp_resetRequestId", res?.resetRequestId || "");
      sessionStorage.setItem("fp_lastSentAt", String(Date.now())); // ใช้นับถอยหลัง 60s ฝั่งหน้า OTP

      nav("/forgot/otp");
    } catch (e) {
      setError(e?.message || "ส่ง OTP ไม่สำเร็จ");
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

          <div className="authTitle">Forgot Password</div>
          <div className="authDesc">กรอกอีเมลเพื่อรีเซ็ตรหัสผ่าน</div>
        </div>

        <div className="formArea">
          {/* Email */}
          <div className="field">
            <label>Email</label>
            <input
              className="input2"
              placeholder="เช่น you@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              autoComplete="email"
              inputMode="email"
              disabled={loading || lookedUp} // ล็อกไว้หลัง lookup เพื่อให้ไปตาม flow
            />
          </div>

          {/* ปุ่มยืนยัน email */}
          {!lookedUp ? (
            <button className="submitBtn" type="button" disabled={loading || !canLookup} onClick={onLookup}>
              {loading ? "Processing..." : "ยืนยันอีเมล"}
            </button>
          ) : null}

          {/* แสดง username หลังยืนยัน */}
          {lookedUp ? (
            <div style={{ marginTop: 12, color: "rgba(200,235,255,0.95)", fontWeight: 900 }}>
              ✅ พบผู้ใช้งาน: <span style={{ color: "white" }}>{username}</span>
            </div>
          ) : null}

          {/* ฟอร์มตั้งรหัสใหม่ */}
          {lookedUp ? (
            <>
              <div className="field" style={{ marginTop: 14 }}>
                <label>รหัสผ่านใหม่</label>
                <input
                  className="input2"
                  placeholder="••••••••"
                  type="password"
                  value={newPass}
                  onChange={(e) => {
                    setNewPass(e.target.value);
                    setError("");
                  }}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              <div className="field">
                <label>ยืนยันรหัสผ่านใหม่</label>
                <input
                  className="input2"
                  placeholder="••••••••"
                  type="password"
                  value={confirmPass}
                  onChange={(e) => {
                    setConfirmPass(e.target.value);
                    setError("");
                  }}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="submitBtn"
                  style={{ flex: 1, opacity: loading ? 0.7 : 1 }}
                  onClick={onEditEmail}
                  disabled={loading}
                >
                  แก้ไขอีเมล
                </button>

                <button
                  type="button"
                  className="submitBtn"
                  style={{ flex: 1, opacity: loading ? 0.7 : 1 }}
                  onClick={onStartOtp}
                  disabled={loading || !canStart}
                >
                  {loading ? "Processing..." : "ยืนยัน"}
                </button>
              </div>
            </>
          ) : null}

          {/* Error */}
          {error ? (
            <div style={{ marginTop: 12, color: "rgba(255,160,170,0.95)", fontWeight: 800 }}>
              ⚠️ {error}
            </div>
          ) : null}

          {/* Back */}
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => nav("/login")}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.8)",
                padding: "12px 14px",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              กลับไปหน้า Login
            </button>
          </div>

          <div className="formHint" style={{ marginTop: 14 }}>
            <span className="dot" /> ระบบจะส่ง OTP เพื่อยืนยันการลืมรหัสผ่าน
          </div>
        </div>

        <div className="techRow">
          <span className="techPill">🔐 OTP</span>
          <span className="techPill">🛡️ Security</span>
          <span className="techPill">⚡ Vite + React</span>
        </div>
      </div>
    </div>
  );
}