import "./SplashScreen.css";

export default function SplashScreen() {
  return (
    <div className="splash-wrap">
      <div className="splash-bg" />

      <div className="splash-card">
        {/* โลโก้มาใส่ตรงนี้ */}
        <img src="/bank.png" alt="logo" className="splash-logo" />

        <h1 className="splash-title">MINIBANK</h1>
        <p className="splash-sub">กำลังโหลด</p>

        <div className="splash-loader">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  );
}