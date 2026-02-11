import { useMemo, useState, useRef, useEffect } from "react";
import "../dashboard.css";
import { api } from "../api/http";
import {
  getDashboardData,
  createTransfer,
  createBillPayment,
  createTopup,
  createWithdrawal,
} from "../mockBankApi";
import "../dashboard.css";
import "../dashboard.mobile.css";
import "../dashboard.desktop.css";


// ✅ Avatar Storage (per user)
const avatarKeyOf = (u) => `mb_avatar:${u || "guest"}`;
const loadAvatarOf = (u) => localStorage.getItem(avatarKeyOf(u)) || "";
const saveAvatarOf = (u, dataUrl) => localStorage.setItem(avatarKeyOf(u), dataUrl);
const removeAvatarOf = (u) => localStorage.removeItem(avatarKeyOf(u));

/** ---------- Mini Chart (SVG) : point-aligned X labels + anti-clipping ---------- */
function MiniAreaChart({ title = "สรุปยอดรายวัน", series = [], currency = true, emptyMeta }) {
  const W = 760,
    H = 190;

  const padL = 92,
    padR = 18,
    padT = 18,
    padB = 15;

  const safe = Array.isArray(series) ? series : [];

  const plot =
    safe.length === 1
      ? [
          { ...safe[0], __ghost: true, __x: "L" },
          { ...safe[0], __ghost: true, __x: "R" },
        ]
      : safe;

  const vals = plot.map((d) => Number(d.value || 0));

  const fmtMoney = (n) => {
    const val = Number(n || 0);
    const absVal = Math.abs(val);

    if (absVal >= 1_000_000) {
      return new Intl.NumberFormat("th-TH", {
        style: currency ? "currency" : "decimal",
        currency: "THB",
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: 1,
      }).format(absVal);
    }

    return currency
      ? new Intl.NumberFormat("th-TH", {
          style: "currency",
          currency: "THB",
          maximumFractionDigits: 0,
        }).format(absVal)
      : new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(absVal);
  };

  const rawMax = vals.length ? Math.max(0, ...vals) : 0;
  const rawMin = 0;

  const niceStep = (range, maxTicks = 5) => {
    const rough = range / (maxTicks - 1 || 1);
    if (!isFinite(rough) || rough <= 0) return 1;

    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    const frac = rough / pow;

    let niceFrac = 1;
    if (frac <= 1) niceFrac = 1;
    else if (frac <= 2) niceFrac = 2;
    else if (frac <= 5) niceFrac = 5;
    else niceFrac = 10;

    return niceFrac * pow;
  };

  const range = Math.max(1, rawMax - rawMin);
  const tickCount = 5;
  const step = niceStep(range, tickCount);

  let niceMin = Math.floor(rawMin / step) * step;
  let niceMax = Math.ceil(rawMax / step) * step;

  if (niceMax === niceMin) {
    niceMax += step;
    niceMin -= step;
  }

  const scaleX = (i) => {
    const d = plot[i];
    if (d?.__x === "L") return padL;
    if (d?.__x === "R") return W - padR;

    if (plot.length <= 1) return padL + (W - padL - padR) / 2;
    return padL + (i * (W - padL - padR)) / (plot.length - 1);
  };

  const scaleY = (v) => {
    const t = (v - niceMin) / (niceMax - niceMin || 1);
    return padT + (1 - t) * (H - padT - padB);
  };

  const yTicks = Array.from({ length: tickCount }, (_, i) => {
    const v = niceMax - i * step;
    return { v, y: scaleY(v) };
  });

  const line = plot
    .map((d, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(2)} ${scaleY(d.value).toFixed(2)}`)
    .join(" ");

  const area =
    plot.length > 0
      ? `${line} L ${scaleX(plot.length - 1).toFixed(2)} ${(H - padB).toFixed(
          2
        )} L ${scaleX(0).toFixed(2)} ${(H - padB).toFixed(2)} Z`
      : "";

  const last = safe[safe.length - 1]?.value ?? 0;
  const sum = safe.reduce((acc, d) => acc + Number(d.value || 0), 0);

  const [hover, setHover] = useState(null);
  const stageRef = useRef(null);

  const getAnchorAndX = (x) => {
    const leftBound = padL + 10;
    const rightBound = W - padR - 10;

    if (x < leftBound) return { anchor: "start", x: leftBound };
    if (x > rightBound) return { anchor: "end", x: rightBound };
    return { anchor: "middle", x };
  };

  const showPointValues = safe.length > 0 && safe.length <= 8;

  return (
    <div className="chartCard">
      <div className="chartHeadRow">
        <div className="chartHeadLeft">
          <div className="chartTitle">{title}</div>
        </div>

        <div className="chartHeadRight">
          <div className="chartKpiLine">
            <span className="chartKpiLabel">รวม</span>
            <b className="chartKpiValue">{fmtMoney(sum)}</b>
          </div>
          <div className="chartKpiLine">
            <span className="chartKpiLabel">ล่าสุด</span>
            <b className="chartKpiValue">{fmtMoney(last)}</b>
          </div>
        </div>
      </div>

      <div className="chartWrap">
        {safe.length === 0 ? (
          <div
            className="chartEmpty"
            style={{
              padding: 18,
              borderRadius: 16,
              background: "transparent",
              border: "none",
              display: "grid",
              gap: 10,
              placeItems: "center",
              textAlign: "center",
              minHeight: 140,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 14, color: "rgba(234,240,255,0.9)" }}>
              {emptyMeta?.verb ? `ยังไม่มีข้อมูล${emptyMeta.verb}ในช่วงที่เลือก` : "ยังไม่มีข้อมูลในช่วงที่เลือก"}
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.06)" }}>
                รายการ: <b>0</b>
              </span>
              <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.06)" }}>
                จำนวนเงิน: <b>{fmtMoney(0)}</b>
              </span>
              {emptyMeta?.unit && (
                <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.06)" }}>
                  ประเภท: <b>{emptyMeta.unit}</b>
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="chartStage" ref={stageRef} onMouseLeave={() => setHover(null)}>
            {hover && (
              <div
                className="chartTooltip"
                style={{
                  left: Math.min(hover.x + 12, W - 170),
                  top: Math.max(hover.y - 14, 10),
                }}
              >
                <div className="ttDate">{hover.label}</div>
                <div className="ttValue">{fmtMoney(hover.value)}</div>
                {hover.fullDate ? <div className="ttSub">วันที่จริง: {hover.fullDate}</div> : null}
              </div>
            )}

            <svg viewBox={`0 0 ${W} ${H}`} className="chartSvg" preserveAspectRatio="none">
              <rect x="0" y="0" width={padL - 6} height={H} className="chartYBand" />

              {yTicks.map((t, i) => (
                <g key={i}>
                  <path d={`M ${padL} ${t.y} L ${W - padR} ${t.y}`} className="chartGrid" />
                  <text x={padL - 12} y={t.y + 4} textAnchor="end" className="chartYLabel">
                    {fmtMoney(t.v)}
                  </text>
                </g>
              ))}

              <path d={`M ${padL} ${padT} L ${padL} ${H - padB}`} className="chartAxis" />
              <path d={`M ${padL} ${H - padB} L ${W - padR} ${H - padB}`} className="chartAxis" />

              <path d={area} className="chartArea" />
              <path d={line} className="chartLine" />

              {safe.map((d, i) => {
                const x0 = scaleX(i);
                const y0 = scaleY(d.value);

                const { anchor, x } = getAnchorAndX(x0);

                const VALUE_OFFSET_UP = 18;
                const VALUE_OFFSET_DOWN = 22;

                let valueY = y0 - VALUE_OFFSET_UP;
                const TOO_CLOSE_TOP = padT + 14;
                if (valueY < TOO_CLOSE_TOP) valueY = y0 + VALUE_OFFSET_DOWN;

                let dateY = y0 + 36;
                dateY = Math.min(dateY, H - 10);

                const MIN_GAP = 16;
                if (showPointValues && Math.abs(dateY - valueY) < MIN_GAP) {
                  dateY = valueY > y0 ? valueY + MIN_GAP : Math.max(dateY, valueY + MIN_GAP);
                  dateY = Math.min(dateY, H - 10);
                }

                return (
                  <g key={i}>
                    <circle
                      cx={x0}
                      cy={y0}
                      r="4"
                      className="chartDot"
                      onMouseEnter={() => setHover({ x: x0, y: y0, ...d })}
                      onMouseMove={() => setHover({ x: x0, y: y0, ...d })}
                    />

                    {showPointValues && (
                      <text x={x} y={valueY} textAnchor={anchor} className="chartPointValue">
                        {fmtMoney(d.value)}
                      </text>
                    )}

                    <text x={x} y={dateY} textAnchor={anchor} className="chartPointLabel">
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      <div className="chartFoot">
        {safe.slice(-10).map((d, i) => (
          <span key={i} className="chartChip">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** ---------- Modal ---------- */
function Modal({ open, title, children, onClose, width = 520, zIndex = 999 }) {
  if (!open) return null;

  const isMobile =
    typeof window !== "undefined" ? window.matchMedia("(max-width: 520px)").matches : false;

  const overlayPad = isMobile ? 10 : 16;

  // ✅ สำคัญ: กันล้นจอมือถือด้วย calc(100vw - padding*2)
  const cardWidth = isMobile
    ? `min(${width}px, calc(100vw - ${overlayPad * 2}px))`
    : `min(${width}px, 100%)`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        background: "rgba(0,0,0,0.55)",
        padding: overlayPad,
        overflowY: "auto",
        overflowX: "hidden", // ✅ กันแนวนอน
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          margin: isMobile ? "10px auto" : "24px auto",
          width: cardWidth,
          boxSizing: "border-box", // ✅ รวม padding/border เข้า width
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(10,16,28,0.92)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          padding: 14,
          maxHeight: isMobile ? "none" : "calc(100vh - 48px)",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: "rgba(234,240,255,0.95)" }}>{title}</div>
          <button className="miniGhost" onClick={onClose} type="button">
            ปิด
          </button>
        </div>

        <div style={{ height: 10 }} />

        <div
          style={{
            overflow: isMobile ? "visible" : "auto",
            paddingRight: isMobile ? 0 : 6,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}


/** ---------- Toast ---------- */
function Toast({ open, type = "success", message, onClose }) {
  if (!open) return null;

  const isError = type === "error";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4000,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,0.55)",
        padding: 16,
      }}
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 92vw)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(10,16,28,0.92)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          padding: 16,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            margin: "0 auto 10px",
            display: "grid",
            placeItems: "center",
            background: isError ? "rgba(255,120,140,0.14)" : "rgba(110,231,255,0.14)",
            border: isError ? "1px solid rgba(255,120,140,0.25)" : "1px solid rgba(110,231,255,0.25)",
            fontSize: 26,
          }}
        >
          {isError ? "⚠️" : "✅"}
        </div>

        <div style={{ fontWeight: 900, fontSize: 16, color: "rgba(234,240,255,0.95)" }}>
          {isError ? "แจ้งเตือน" : "สำเร็จ"}
        </div>

        <div style={{ marginTop: 6, color: "rgba(234,240,255,0.78)", lineHeight: 1.5 }}>{message}</div>

        <div style={{ height: 12 }} />

        <button
          type="button"
          className="btn"
          onClick={onClose}
          style={{
            width: "100%",
            borderRadius: 14,
            padding: "12px 14px",
            fontWeight: 900,
          }}
        >
          ปิด
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("transfers");
  const [range, setRange] = useState("this");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [toast, setToast] = useState({ open: false, type: "success", message: "" });
  const showToast = (message, type = "success") => setToast({ open: true, type, message });

  const [confirmDel, setConfirmDel] = useState({
    open: false,
    tab: "",
    id: "",
    title: "ยืนยันการลบ",
    message: "",
  });

  const openConfirmDelete = (tab, id, message) => {
    setConfirmDel({
      open: true,
      tab,
      id,
      title: "ยืนยันการลบ",
      message: message || "ต้องการลบรายการนี้ใช่ไหม?",
    });
  };

  const closeConfirmDelete = () => setConfirmDel((s) => ({ ...s, open: false }));

  // ====== USER INFO (โปรไฟล์) ======
  const username = localStorage.getItem("mb_user") || "guest";
  const emailLS = localStorage.getItem("mb_email") || "";
  const fullNameLS = localStorage.getItem("mb_fullName") || localStorage.getItem("mb_name") || "";

  const [profile, setProfile] = useState({
    username,
    fullName: fullNameLS,
    email: emailLS,
    avatar: loadAvatarOf(username) || "",
  });

  // ✅ sync ตอน mount ครั้งเดียว (อ่านจาก localStorage)
  useEffect(() => {
    const u = localStorage.getItem("mb_user") || "guest";

    setProfile((p) => ({
      ...p,
      username: u,
      email: localStorage.getItem("mb_email") || p.email || "",
      fullName: localStorage.getItem("mb_fullName") || localStorage.getItem("mb_name") || p.fullName || "",
      avatar: loadAvatarOf(u) || p.avatar || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ ถ้า username เปลี่ยน (เช่น login/logout แล้วมาอยู่หน้าเดิม) ให้เปลี่ยน avatar ตาม user ทันที
  useEffect(() => {
    setProfile((p) => ({
      ...p,
      username,
      email: localStorage.getItem("mb_email") || p.email || "",
      fullName: localStorage.getItem("mb_fullName") || localStorage.getItem("mb_name") || p.fullName || "",
      avatar: loadAvatarOf(username) || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const avatarFileRef = useRef(null);

  const openAvatarPicker = () => {
    if (avatarFileRef.current) avatarFileRef.current.click();
  };

  const onPickAvatar = (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      showToast("กรุณาเลือกไฟล์รูปภาพเท่านั้น", "error");
      return;
    }
    const maxMb = 2.5;
    if (file.size > maxMb * 1024 * 1024) {
      showToast(`รูปใหญ่เกินไป (เกิน ${maxMb}MB)`, "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const u = localStorage.getItem("mb_user") || "guest";

      saveAvatarOf(u, dataUrl);
      setProfile((p) => ({ ...p, avatar: dataUrl }));
      showToast("อัปเดตรูปโปรไฟล์แล้ว", "success");
    };
    reader.readAsDataURL(file);
  };

  // ====== DATA ======
  const [balance, setBalance] = useState(42350.5);
  const [transfers, setTransfers] = useState([]);
  const [bills, setBills] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [topups, setTopups] = useState([]);
  const [schedule, setSchedule] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showFullBalance, setShowFullBalance] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const db = await getDashboardData(username);
        if (!mounted) return;
        setBalance(Number(db.balance || 0));
        setTransfers(db.transfers || []);
        setBills(db.bills || []);
        setWithdrawals(db.withdrawals || []);
        setTopups(db.topups || []);
        setSchedule(db.schedule || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [username]);

  const [modal, setModal] = useState({ type: null, open: false });
  const openModal = (type) => setModal({ type, open: true });
  const closeModal = () => setModal({ type: null, open: false });

  const [form, setForm] = useState({
    to: "",
    note: "",
    amount: "",
    bill: "",
    provider: "",
    ref: "",
    channel: "",
  });

  const setF = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const fmt = (n) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);

  const fmtCompact = (n) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 2,
    }).format(Number(n || 0));

  const pad2 = (x) => String(x).padStart(2, "0");

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const endOfDayFix = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
  const startOfPrevMonth = (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1, 0, 0, 0);
  const endOfPrevMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59);

  const parseDateTime = (s) => {
    const safe = s.includes(" ") ? s.replace(" ", "T") : `${s}T00:00`;
    const d = new Date(safe);
    return isNaN(d.getTime()) ? null : d;
  };

  const inRange = (dateStr) => {
    const d = parseDateTime(dateStr);
    if (!d) return false;

    const now = new Date();
    if (range === "all") return true;

    if (range === "today") return d >= startOfDay(now) && d <= endOfDayFix(now);

    if (range === "yesterday") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return d >= startOfDay(y) && d <= endOfDayFix(y);
    }

    if (range === "this") return d >= startOfMonth(now);
    if (range === "last") return d >= startOfPrevMonth(now) && d <= endOfPrevMonth(now);

    if (range === "custom") {
      if (!from && !to) return true;
      const fromD = from ? new Date(`${from}T00:00`) : null;
      const toD = to ? new Date(`${to}T23:59`) : null;
      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;
      return true;
    }
    return true;
  };

  const inMonth = (dateStr, yyyyMm) => {
    const d = parseDateTime(dateStr);
    if (!d) return false;
    const m = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    return m === yyyyMm;
  };

  const textMatch = (hay) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return String(hay).toLowerCase().includes(needle);
  };

  const tagClass = (s) => {
    if (s === "สำเร็จ" || s === "จ่ายแล้ว") return "tag good";
    if (s === "แนะนำจ่ายก่อน") return "tag warn";
    return "tag";
  };

  const formatDateTH = (dateStr) => {
    const d = parseDateTime(dateStr);
    if (!d) return dateStr;
    const yy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    if (dateStr.length === 10) return `${dd}/${mm}/${yy}`;
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  };

  const byDateAsc = (aStr, bStr) => {
    const a = parseDateTime(aStr);
    const b = parseDateTime(bStr);
    const at = a ? a.getTime() : 0;
    const bt = b ? b.getTime() : 0;
    return at - bt;
  };

  const filteredTransfers = useMemo(() => {
    return transfers
      .filter((t) => inRange(t.date))
      .filter((t) => textMatch(`${t.to} ${t.note} ${t.amount} ${t.status} ${t.date}`))
      .slice()
      .sort((a, b) => byDateAsc(a.date, b.date));
  }, [transfers, range, q, from, to]);

  const filteredBills = useMemo(() => {
    return bills
      .filter((b) => inRange(b.date))
      .filter((b) => textMatch(`${b.bill} ${b.provider} ${b.ref} ${b.amount} ${b.status} ${b.date}`))
      .slice()
      .sort((a, b) => byDateAsc(a.date, b.date));
  }, [bills, range, q, from, to]);

  const filteredSchedule = useMemo(() => {
    return schedule
      .filter((s) => inRange(s.due))
      .filter((s) => textMatch(`${s.bill} ${s.provider} ${s.amount} ${s.status} ${s.due}`))
      .slice()
      .sort((a, b) => byDateAsc(a.due, b.due));
  }, [schedule, range, q, from, to]);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals
      .filter((w) => inRange(w.date))
      .filter((w) => textMatch(`${w.channel} ${w.note} ${w.amount} ${w.fee} ${w.status} ${w.date}`))
      .slice()
      .sort((a, b) => byDateAsc(a.date, b.date));
  }, [withdrawals, range, q, from, to]);

  const filteredTopups = useMemo(() => {
    return topups
      .filter((p) => inRange(p.date))
      .filter((p) => textMatch(`${p.channel} ${p.note} ${p.amount} ${p.fee} ${p.status} ${p.date}`))
      .slice()
      .sort((a, b) => byDateAsc(a.date, b.date));
  }, [topups, range, q, from, to]);

  const activeRowsCount =
    activeTab === "transfers"
      ? filteredTransfers.length
      : activeTab === "bills"
      ? filteredBills.length
      : activeTab === "schedule"
      ? filteredSchedule.length
      : activeTab === "withdrawals"
      ? filteredWithdrawals.length
      : filteredTopups.length;

  const thisMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  }, []);

  const incomeThisMonth = useMemo(() => {
    const rows = topups.filter((r) => inMonth(r.date, thisMonthKey));
    const sum = rows.reduce((a, r) => a + Math.max(0, Number(r.amount || 0)), 0);
    return { sum, count: rows.length };
  }, [topups, thisMonthKey]);

  const expenseThisMonth = useMemo(() => {
    const t = transfers.filter((r) => inMonth(r.date, thisMonthKey));
    const b = bills.filter((r) => inMonth(r.date, thisMonthKey));
    const w = withdrawals.filter((r) => inMonth(r.date, thisMonthKey));
    const sum =
      t.reduce((a, r) => a + Math.abs(Number(r.amount || 0)), 0) +
      b.reduce((a, r) => a + Math.abs(Number(r.amount || 0)), 0) +
      w.reduce((a, r) => a + Math.abs(Number(r.amount || 0)), 0);
    return { sum, count: t.length + b.length + w.length };
  }, [transfers, bills, withdrawals, thisMonthKey]);

  const chartSeries = useMemo(() => {
    const pickRows =
      activeTab === "transfers"
        ? filteredTransfers
        : activeTab === "withdrawals"
        ? filteredWithdrawals
        : activeTab === "topups"
        ? filteredTopups
        : activeTab === "bills"
        ? filteredBills
        : filteredSchedule;

    const sumMap = new Map();

    pickRows.forEach((row) => {
      const dateStr = row.date || row.due;
      const d = parseDateTime(dateStr);
      if (!d) return;

      const yyyy = d.getFullYear();
      const mm = pad2(d.getMonth() + 1);
      const dd = pad2(d.getDate());
      const key = `${yyyy}-${mm}-${dd}`;

      const amount = Number(row.amount || 0);
      const signed = Math.abs(amount);

      sumMap.set(key, (sumMap.get(key) || 0) + signed);
    });

    const toLabel = (yyyyMMdd) => {
      const d = parseDateTime(yyyyMMdd);
      if (!d) return yyyyMMdd;
      return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
    };

    const sorted = Array.from(sumMap.entries())
      .sort(([a], [b]) => byDateAsc(a, b))
      .map(([key, value]) => ({
        label: toLabel(key),
        value,
        fullDate: key,
      }));

    const lastN = 14;
    return sorted.slice(Math.max(0, sorted.length - lastN));
  }, [activeTab, filteredTransfers, filteredWithdrawals, filteredTopups, filteredBills, filteredSchedule]);

  const guardAmount = (x) => {
    const n = Number(x);
    if (!isFinite(n) || n <= 0) return null;
    return n;
  };

  const submitTransfer = async () => {
    const amount = guardAmount(form.amount);
    if (!amount) return showToast("กรอกจำนวนเงินให้ถูกต้อง", "error");
    if (!form.to.trim()) return showToast("กรอกปลายทาง", "error");
    if (amount > balance) return showToast("ยอดเงินไม่พอ", "error");

    const { row, balance: newBal } = await createTransfer(username, {
      to: form.to.trim(),
      note: form.note.trim(),
      amount,
    });

    setTransfers((s) => [...s, row]);
    setBalance(Number(newBal));
    closeModal();
    setForm({ to: "", note: "", amount: "", bill: "", provider: "", ref: "", channel: "" });
    setActiveTab("transfers");
    setRange("today");
    showToast("โอนเงินสำเร็จ", "success");
  };

  const submitBill = async () => {
    const amount = guardAmount(form.amount);
    if (!amount) return showToast("กรอกจำนวนเงินให้ถูกต้อง", "error");
    if (!form.bill.trim()) return showToast("กรอกชื่อบิล", "error");
    if (!form.provider.trim()) return showToast("กรอกผู้ให้บริการ", "error");
    if (amount > balance) return showToast("ยอดเงินไม่พอ", "error");

    const { row, balance: newBal } = await createBillPayment(username, {
      bill: form.bill.trim(),
      provider: form.provider.trim(),
      ref: form.ref.trim(),
      amount,
    });

    setBills((s) => [...s, row]);
    setBalance(Number(newBal));
    closeModal();
    setForm({ to: "", note: "", amount: "", bill: "", provider: "", ref: "", channel: "" });
    setActiveTab("bills");
    setRange("today");
    showToast("จ่ายบิลสำเร็จ", "success");
  };

  const TOPUP_LIMIT = 100_000_000;

  const submitTopup = async () => {
    const amount = guardAmount(form.amount);
    if (!amount) return showToast("กรอกจำนวนเงินให้ถูกต้อง", "error");
    if (!form.channel.trim()) return showToast("กรอกช่องทางเติมเงิน", "error");

    if (amount > TOPUP_LIMIT) {
      return showToast(`ห้ามเติมเงินเกิน ${TOPUP_LIMIT.toLocaleString("th-TH")} บาท`, "error");
    }

    const { row, balance: newBal } = await createTopup(username, {
      channel: form.channel.trim(),
      note: form.note.trim(),
      amount,
    });

    setTopups((s) => [...s, row]);
    setBalance(Number(newBal));
    closeModal();
    setForm({ to: "", note: "", amount: "", bill: "", provider: "", ref: "", channel: "" });
    setActiveTab("topups");
    setRange("today");
    showToast("เติมเงินสำเร็จ", "success");
  };

  const submitWithdrawal = async () => {
    const amount = guardAmount(form.amount);
    if (!amount) return showToast("กรอกจำนวนเงินให้ถูกต้อง", "error");
    if (!form.channel.trim()) return showToast("กรอกช่องทางถอนเงิน", "error");
    if (amount > balance) return showToast("ยอดเงินไม่พอ", "error");

    const { row, balance: newBal } = await createWithdrawal(username, {
      channel: form.channel.trim(),
      note: form.note.trim(),
      amount,
    });

    setWithdrawals((s) => [...s, row]);
    setBalance(Number(newBal));
    closeModal();
    setForm({ to: "", note: "", amount: "", bill: "", provider: "", ref: "", channel: "" });
    setActiveTab("withdrawals");
    setRange("today");
    showToast("ถอนเงินสำเร็จ", "success");
  };

  const deleteRow = (tab, id) => {
    if (!id) return;

    if (tab === "transfers") {
      setTransfers((s) => s.filter((x) => x.id !== id));
      showToast("ลบรายการโอนเงินสำเร็จ", "success");
      return;
    }
    if (tab === "withdrawals") {
      setWithdrawals((s) => s.filter((x) => x.id !== id));
      showToast("ลบรายการถอนเงินสำเร็จ", "success");
      return;
    }
    if (tab === "topups") {
      setTopups((s) => s.filter((x) => x.id !== id));
      showToast("ลบรายการเติมเงินสำเร็จ", "success");
      return;
    }
    if (tab === "bills") {
      setBills((s) => s.filter((x) => x.id !== id));
      showToast("ลบรายการจ่ายบิลสำเร็จ", "success");
      return;
    }
    if (tab === "schedule") {
      setSchedule((s) => s.filter((x) => x.id !== id));
      showToast("ลบรายการกำหนดชำระสำเร็จ", "success");
      return;
    }
  };

  const confirmDelete = () => {
    deleteRow(confirmDel.tab, confirmDel.id);
    closeConfirmDelete();
  };

  // ===== ตารางรายรับ/รายจ่าย (ของเดิม) =====
  const [tableView, setTableView] = useState({
    open: false,
    kind: "income",
    month: "",
  });

  const openIncomeTable = () => setTableView((s) => ({ ...s, open: true, kind: "income" }));
  const openExpenseTable = () => setTableView((s) => ({ ...s, open: true, kind: "expense" }));
  const closeTableView = () => setTableView((s) => ({ ...s, open: false }));

  const availableMonths = useMemo(() => {
    const months = new Map();

    const add = (yyyyMm, type) => {
      if (!months.has(yyyyMm)) months.set(yyyyMm, { incomeCount: 0, expenseCount: 0 });
      const m = months.get(yyyyMm);
      if (type === "income") m.incomeCount += 1;
      if (type === "expense") m.expenseCount += 1;
    };

    topups.forEach((r) => {
      const d = parseDateTime(r.date);
      if (!d) return;
      const yyyyMm = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      add(yyyyMm, "income");
    });

    transfers.forEach((r) => {
      const d = parseDateTime(r.date);
      if (!d) return;
      const yyyyMm = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      add(yyyyMm, "expense");
    });
    bills.forEach((r) => {
      const d = parseDateTime(r.date);
      if (!d) return;
      const yyyyMm = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      add(yyyyMm, "expense");
    });
    withdrawals.forEach((r) => {
      const d = parseDateTime(r.date);
      if (!d) return;
      const yyyyMm = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      add(yyyyMm, "expense");
    });

    return Array.from(months.entries())
      .map(([month, meta]) => ({ month, ...meta }))
      .sort((a, b) => (a.month < b.month ? 1 : -1));
  }, [topups, transfers, bills, withdrawals]);

  const availableIncomeMonths = useMemo(
    () => availableMonths.filter((m) => m.incomeCount > 0).map((m) => m.month),
    [availableMonths]
  );
  const availableExpenseMonths = useMemo(
    () => availableMonths.filter((m) => m.expenseCount > 0).map((m) => m.month),
    [availableMonths]
  );

  useEffect(() => {
    if (!tableView.open) return;
    const list = tableView.kind === "income" ? availableIncomeMonths : availableExpenseMonths;
    const fallback = list[0] || "";
    if (!tableView.month || !list.includes(tableView.month)) {
      setTableView((s) => ({ ...s, month: fallback }));
    }
  }, [tableView.open, tableView.kind, tableView.month, availableIncomeMonths, availableExpenseMonths]);

  const tableMonth = tableView.month;

  const modalIncomeRows = useMemo(() => {
    if (!tableMonth) return [];
    return topups
      .filter((r) => inMonth(r.date, tableMonth))
      .map((r) => ({
        id: r.id,
        date: r.date,
        desc: r.channel,
        note: r.note,
        amount: Number(r.amount || 0),
        tab: "topups",
      }))
      .sort((a, b) => byDateAsc(a.date, b.date));
  }, [topups, tableMonth]);

  const modalExpenseRows = useMemo(() => {
    if (!tableMonth) return [];
    const rows = [];

    transfers
      .filter((r) => inMonth(r.date, tableMonth))
      .forEach((r) =>
        rows.push({
          id: r.id,
          date: r.date,
          type: "โอนเงิน",
          desc: r.to,
          note: r.note,
          amount: -Math.abs(Number(r.amount || 0)),
          tab: "transfers",
        })
      );

    bills
      .filter((r) => inMonth(r.date, tableMonth))
      .forEach((r) =>
        rows.push({
          id: r.id,
          date: r.date,
          type: "จ่ายบิล",
          desc: `${r.bill}  ${r.provider}`,
          note: r.ref,
          amount: -Math.abs(Number(r.amount || 0)),
          tab: "bills",
        })
      );

    withdrawals
      .filter((r) => inMonth(r.date, tableMonth))
      .forEach((r) =>
        rows.push({
          id: r.id,
          date: r.date,
          type: "ถอนเงิน",
          desc: r.channel,
          note: r.note,
          amount: -Math.abs(Number(r.amount || 0)),
          tab: "withdrawals",
        })
      );

    return rows.sort((a, b) => byDateAsc(a.date, b.date));
  }, [transfers, bills, withdrawals, tableMonth]);

  const modalIncomeSum = useMemo(
    () => modalIncomeRows.reduce((a, r) => a + Math.max(0, r.amount), 0),
    [modalIncomeRows]
  );
  const modalExpenseSum = useMemo(
    () => Math.abs(modalExpenseRows.reduce((a, r) => a + Math.min(0, r.amount), 0)),
    [modalExpenseRows]
  );

  // ====== โปรไฟล์ + รหัสผ่าน (ย้ายไปอยู่ในโปรไฟล์) ======
  const [profileModal, setProfileModal] = useState({ open: false });
  const openProfile = () => setProfileModal({ open: true });
  const closeProfile = () => setProfileModal({ open: false });

  const CHANGE_PASSWORD_URL = "/api/change-password"; // backend (Spring Boot) @ 8080

  const [pwdModal, setPwdModal] = useState({ open: false });
  const [pwdForm, setPwdForm] = useState({ oldPass: "", newPass: "", newPass2: "" });

  const openPwd = () => {
    setPwdForm({ oldPass: "", newPass: "", newPass2: "" });
    setPwdModal({ open: true });
  };
  const closePwd = () => setPwdModal({ open: false });

  const [confirmPwd, setConfirmPwd] = useState({ open: false, message: "" });
  const openConfirmPwd = (message) =>
    setConfirmPwd({ open: true, message: message || "ยืนยันการทำรายการนี้ใช่ไหม?" });
  const closeConfirmPwd = () => setConfirmPwd({ open: false, message: "" });

  const callChangePasswordApi = async ({ oldPassword, newPassword }) => {
    // ✅ ใช้ helper api() เพื่อแนบ Bearer token อัตโนมัติ
    return api(CHANGE_PASSWORD_URL, {
      method: "POST",
      body: { oldPassword, newPassword },
    });
  };

  const requestChangePassword = () => {
    const oldPass = pwdForm.oldPass.trim();
    const newPass = pwdForm.newPass.trim();
    const newPass2 = pwdForm.newPass2.trim();

    if (!oldPass) return showToast("กรอกรหัสเดิม", "error");
    if (!newPass) return showToast("กรอกรหัสใหม่", "error");
    if (newPass.length < 6) return showToast("รหัสใหม่ต้องอย่างน้อย 6 ตัวอักษร", "error");
    if (newPass !== newPass2) return showToast("รหัสใหม่และยืนยันรหัสไม่ตรงกัน", "error");

    openConfirmPwd("ยืนยันการอัปเดตรหัสผ่านใช่ไหม?");
  };

  const confirmChangePassword = async () => {
    try {
      closeConfirmPwd();
      await callChangePasswordApi({
        oldPassword: pwdForm.oldPass.trim(),
        newPassword: pwdForm.newPass.trim(),
      });
      closePwd();
      showToast("อัปเดตรหัสผ่านสำเร็จ", "success");
    } catch (err) {
      showToast(err?.message || "อัปเดตรหัสผ่านไม่สำเร็จ", "error");
    }
  };

  // ====== LOGOUT ======
  const doLogout = () => {
    localStorage.removeItem("mb_user");
    localStorage.removeItem("mb_email");
    localStorage.removeItem("mb_fullName");
    localStorage.removeItem("mb_name");
    localStorage.removeItem("mb_token");
    localStorage.removeItem("token");
    // ไม่ลบ avatar ก็ได้ (เพราะเป็น per-user)
    // ถ้าจะล้างของ guest โดยเฉพาะ:
    // removeAvatarOf("guest");
    window.location.href = "/login";
  };

  // ====== UI Helpers ======
  const avatarLetter = (profile?.username || "U").slice(0, 1).toUpperCase();
  const avatarView = profile.avatar ? (
    <img
      src={profile.avatar}
      alt="avatar"
      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }}
    />
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 16,
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
        fontSize: 18,
        color: "rgba(234,240,255,0.95)",
        background: "rgba(110,231,255,0.14)",
        border: "1px solid rgba(110,231,255,0.25)",
      }}
    >
      {avatarLetter}
    </div>
  );

  return (
    <div className="dash">
      <div className="bgGlow" />

      {/* TOPBAR */}
      <div className="topbar">
        <div className="brand">
          <div className="logoMark" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"
                stroke="rgba(234,240,255,0.9)"
                strokeWidth="1.6"
              />
              <path
                d="M8.8 12.2l2.2 2.2 4.6-4.8"
                stroke="rgba(110,231,255,0.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="brandTitle">
            <b>MINIBANK</b>
            <span>Dashboard Activity Center</span>
          </div>
        </div>

        {/* เมนูหลัก responsive */}
        <nav className="topMenu topMenuResponsive">
          <button
            className={`topMenuBtn ${activeTab === "transfers" ? "active" : ""}`}
            onClick={() => setActiveTab("transfers")}
            type="button"
          >
            ประวัติการโอนเงิน
          </button>
          <button
            className={`topMenuBtn ${activeTab === "withdrawals" ? "active" : ""}`}
            onClick={() => setActiveTab("withdrawals")}
            type="button"
          >
            ประวัติการถอนเงิน
          </button>
          <button
            className={`topMenuBtn ${activeTab === "topups" ? "active" : ""}`}
            onClick={() => setActiveTab("topups")}
            type="button"
          >
            ประวัติเติมเงิน
          </button>
          <button
            className={`topMenuBtn ${activeTab === "bills" ? "active" : ""}`}
            onClick={() => setActiveTab("bills")}
            type="button"
          >
            ประวัติการจ่ายบิล
          </button>
        </nav>

        <div className="topbarRight" style={{ gap: 10 }}>
          {/* โปรไฟล์ (คลิกได้) */}
          <button
            type="button"
            onClick={openProfile}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "8px 10px",
              borderRadius: 14,
              cursor: "pointer",
              color: "rgba(234,240,255,0.9)",
            }}
            title="เปิดโปรไฟล์"
          >
            <div style={{ width: 34, height: 34, borderRadius: 12, overflow: "hidden" }}>{avatarView}</div>
            <div style={{ textAlign: "left", lineHeight: 1.1 }}>
              <div style={{ fontWeight: 900, fontSize: 12 }}>{profile.username}</div>
              <div style={{ fontSize: 11, color: "rgba(234,240,255,0.7)" }}>{profile.fullName || "Profile"}</div>
            </div>
          </button>

          <button className="logoutBtn" type="button" onClick={doLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid">
        {/* LEFT SUMMARY */}
        <div className="card">
          <div className="cardHeader">
            {/* <h3>สรุปบัญชี</h3> */}
            {/* <p>ภาพรวมของคุณแบบสั้นๆ</p> */}
          </div>

          <div className="cardBody">
            <div className="balance">
              <div
                className="balanceLabel"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
              >
                ยอดเงินคงเหลือ
                <button
                  type="button"
                  className="miniGhost"
                  onClick={() => setShowFullBalance((v) => !v)}
                  style={{ padding: "6px 10px", borderRadius: 10, fontSize: 12 }}
                  title={showFullBalance ? "แสดงแบบย่อ" : "แสดงตัวเลขเต็ม"}
                >
                  {showFullBalance ? "ย่อ" : "ดูเต็ม"}
                </button>
              </div>

              <div
                className="balanceValue"
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
                title={loading ? "" : fmt(balance)}
              >
                {loading ? "กำลังโหลด..." : showFullBalance ? fmt(balance) : fmtCompact(balance)}
              </div>

              <div className="quickRow">
                <button className="qbtn primary" onClick={() => openModal("transfer")} type="button">
                  โอนเงิน
                </button>
                <button className="qbtn" onClick={() => openModal("bill")} type="button">
                  จ่ายบิล
                </button>
                <button className="qbtn success" onClick={() => openModal("topup")} type="button">
                  เติมเงิน
                </button>
                <button className="qbtn danger" onClick={() => openModal("withdraw")} type="button">
                  ถอนเงิน
                </button>
              </div>
            </div>

            <div className="kpis">
              <div className="kpi">
                <span className="kpiLabel">รายรับเดือนนี้</span>
                <strong>{fmt(incomeThisMonth.sum)}</strong>
                <small>+{incomeThisMonth.count} รายการ</small>
              </div>
              <div className="kpi">
                <span className="kpiLabel">รายจ่ายเดือนนี้</span>
                <strong>{fmt(expenseThisMonth.sum)}</strong>
                <small>-{expenseThisMonth.count} รายการ</small>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="miniGhost"
                onClick={openIncomeTable}
                disabled={availableIncomeMonths.length === 0}
                style={{ flex: 1, borderRadius: 14, padding: "10px 12px", fontWeight: 900 }}
                title={availableIncomeMonths.length === 0 ? "ยังไม่มีข้อมูลรายรับ" : "ดูตารางรายรับ"}
              >
                ดูตารางรายรับ
              </button>

              <button
                type="button"
                className="miniGhost"
                onClick={openExpenseTable}
                disabled={availableExpenseMonths.length === 0}
                style={{ flex: 1, borderRadius: 14, padding: "10px 12px", fontWeight: 900 }}
                title={availableExpenseMonths.length === 0 ? "ยังไม่มีข้อมูลรายจ่าย" : "ดูตารางรายจ่าย"}
              >
                ดูตารางรายจ่าย
              </button>
            </div>
            <button
              type="button"
              className="miniGhost"
              onClick={openProfile}
              style={{
                marginTop: 12,
                width: "100%",
                borderRadius: 16,
                padding: "12px 14px",
                fontWeight: 900,
              }}
              title="เปิดหน้าโปรไฟล์"
            >
              เปิดโปรไฟล์
            </button>
          </div>
        </div>

        {/* RIGHT MAIN */}
        <div className="card">
          <div className="cardBody">
            <div className="sectionTitle">
              <h2>รายการของคุณ</h2>
              <span>{activeRowsCount} รายการ</span>
            </div>

            {/* ✅ ปรับ Tabs + Toolbar ให้สวยและ responsive */}
            <div className="tabsBar tabsBarV2">
              <div className="tabs tabsScroll">
                <button className={activeTab === "transfers" ? "tab active" : "tab"} onClick={() => setActiveTab("transfers")}>
                  Transfers
                </button>
                <button className={activeTab === "withdrawals" ? "tab active" : "tab"} onClick={() => setActiveTab("withdrawals")}>
                  Withdrawals
                </button>
                <button className={activeTab === "topups" ? "tab active" : "tab"} onClick={() => setActiveTab("topups")}>
                  Topups
                </button>
                <button className={activeTab === "bills" ? "tab active" : "tab"} onClick={() => setActiveTab("bills")}>
                  Bills
                </button>
                <button className={activeTab === "schedule" ? "tab active" : "tab"} onClick={() => setActiveTab("schedule")}>
                  Schedule
                </button>
              </div>

              <div className="toolbar toolbarV2">
                <div className="seg segScroll">
                  <button className={range === "today" ? "segBtn active" : "segBtn"} onClick={() => setRange("today")}>
                    วันนี้
                  </button>
                  <button className={range === "yesterday" ? "segBtn active" : "segBtn"} onClick={() => setRange("yesterday")}>
                    เมื่อวาน
                  </button>
                  <button className={range === "this" ? "segBtn active" : "segBtn"} onClick={() => setRange("this")}>
                    เดือนนี้
                  </button>
                  <button className={range === "last" ? "segBtn active" : "segBtn"} onClick={() => setRange("last")}>
                    เดือนก่อน
                  </button>
                  <button className={range === "all" ? "segBtn active" : "segBtn"} onClick={() => setRange("all")}>
                    ทั้งหมด
                  </button>
                  <button className={range === "custom" ? "segBtn active" : "segBtn"} onClick={() => setRange("custom")}>
                    เลือกช่วง
                  </button>
                </div>

                {range === "custom" && (
                  <div className="datePick datePickV2">
                    <div className="dateField">
                      <label>From</label>
                      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div className="dateField">
                      <label>To</label>
                      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <button
                      className="miniGhost"
                      onClick={() => {
                        setFrom("");
                        setTo("");
                      }}
                      type="button"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div className="search searchV2">
                  <span className="searchIcon" aria-hidden>
                    ⌕
                  </span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ค้นหารายการ... (ชื่อ/ผู้ให้บริการ/เลขอ้างอิง/หมายเหตุ)"
                  />
                  {q ? (
                    <button className="clearBtn" onClick={() => setQ("")} title="Clear" type="button">
                      ✕
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <MiniAreaChart
              title={
                activeTab === "topups"
                  ? "กราฟเติมเงินรายวัน"
                  : activeTab === "withdrawals"
                  ? "กราฟถอนเงินรายวัน"
                  : activeTab === "transfers"
                  ? "กราฟโอนเงินรายวัน"
                  : activeTab === "bills"
                  ? "กราฟจ่ายบิลรายวัน"
                  : "กราฟกำหนดชำระรายวัน"
              }
              series={chartSeries}
              emptyMeta={{
                verb:
                  activeTab === "topups"
                    ? "การเติมเงิน"
                    : activeTab === "withdrawals"
                    ? "การถอนเงิน"
                    : activeTab === "transfers"
                    ? "การโอนเงิน"
                    : activeTab === "bills"
                    ? "การจ่ายบิล"
                    : "กำหนดชำระ",
                unit:
                  activeTab === "topups"
                    ? "เติมเงิน"
                    : activeTab === "withdrawals"
                    ? "ถอนเงิน"
                    : activeTab === "transfers"
                    ? "โอนเงิน"
                    : activeTab === "bills"
                    ? "จ่ายบิล"
                    : "กำหนดชำระ",
              }}
            />

            <div style={{ height: 14 }} />

            {/* CONTENT BY TAB */}
            {activeTab === "transfers" && (
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>วันเวลา</th>
                      <th>ปลายทาง</th>
                      <th>หมายเหตุ</th>
                      <th>ยอดโอน</th>
                      <th>สถานะ</th>
                      <th>ลบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransfers.map((t) => (
                      <tr key={t.id}>
                        <td>{formatDateTH(t.date)}</td>
                        <td style={{ fontWeight: 800 }}>{t.to}</td>
                        <td style={{ color: "rgba(234,240,255,0.75)" }}>{t.note}</td>
                        <td style={{ fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>-{fmt(t.amount)}</td>
                        <td>
                          <span className={tagClass(t.status)}>{t.status}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="miniBtn danger"
                            onClick={() => openConfirmDelete("transfers", t.id, `ต้องการลบรายการโอนเงินไปที่ (${t.to}) ใช่ไหม?`)}
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTransfers.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ padding: 16, color: "rgba(234,240,255,0.7)" }}>
                          ไม่พบรายการตามเงื่อนไขที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "withdrawals" && (
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>วันเวลา</th>
                      <th>ช่องทาง</th>
                      <th>รายละเอียด</th>
                      <th>ยอดถอน</th>
                      <th>ค่าธรรมเนียม</th>
                      <th>สถานะ</th>
                      <th>ลบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWithdrawals.map((w) => (
                      <tr key={w.id}>
                        <td>{formatDateTH(w.date)}</td>
                        <td style={{ fontWeight: 800 }}>{w.channel}</td>
                        <td style={{ color: "rgba(234,240,255,0.75)" }}>{w.note}</td>
                        <td style={{ fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>-{fmt(w.amount)}</td>
                        <td style={{ fontWeight: 800 }}>{fmt(w.fee)}</td>
                        <td>
                          <span className={tagClass(w.status)}>{w.status}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="miniBtn danger"
                            onClick={() => openConfirmDelete("withdrawals", w.id, `ต้องการลบรายการถอนเงิน (${w.channel}) ใช่ไหม?`)}
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredWithdrawals.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ padding: 16, color: "rgba(234,240,255,0.7)" }}>
                          ไม่พบรายการตามเงื่อนไขที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "topups" && (
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>วันเวลา</th>
                      <th>ช่องทาง</th>
                      <th>รายละเอียด</th>
                      <th>ยอดเติม</th>
                      <th>ค่าธรรมเนียม</th>
                      <th>สถานะ</th>
                      <th>ลบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTopups.map((p) => (
                      <tr key={p.id}>
                        <td>{formatDateTH(p.date)}</td>
                        <td style={{ fontWeight: 800 }}>{p.channel}</td>
                        <td style={{ color: "rgba(234,240,255,0.75)" }}>{p.note}</td>
                        <td style={{ fontWeight: 900, color: "rgba(110,231,255,0.95)" }}>+{fmt(p.amount)}</td>
                        <td style={{ fontWeight: 800 }}>{fmt(p.fee)}</td>
                        <td>
                          <span className={tagClass(p.status)}>{p.status}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="miniBtn danger"
                            onClick={() => openConfirmDelete("topups", p.id, `ต้องการลบรายการเติมเงิน (${p.channel}) ใช่ไหม?`)}
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTopups.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ padding: 16, color: "rgba(234,240,255,0.7)" }}>
                          ไม่พบรายการตามเงื่อนไขที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "bills" && (
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>วันเวลา</th>
                      <th>ค่าอะไร</th>
                      <th>ผู้ให้บริการ</th>
                      <th>เลขอ้างอิง</th>
                      <th>ยอดจ่าย</th>
                      <th>สถานะ</th>
                      <th>ลบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((b) => (
                      <tr key={b.id}>
                        <td>{formatDateTH(b.date)}</td>
                        <td style={{ fontWeight: 900 }}>{b.bill}</td>
                        <td>{b.provider}</td>
                        <td style={{ color: "rgba(234,240,255,0.75)" }}>{b.ref}</td>
                        <td style={{ fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>-{fmt(b.amount)}</td>
                        <td>
                          <span className={tagClass(b.status)}>{b.status}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="miniBtn danger"
                            onClick={() => openConfirmDelete("bills", b.id, `ต้องการลบรายการจ่ายบิล (${b.bill}) ใช่ไหม?`)}
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredBills.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ padding: 16, color: "rgba(234,240,255,0.7)" }}>
                          ไม่พบรายการตามเงื่อนไขที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "schedule" && (
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>วันครบกำหนด</th>
                      <th>ค่าอะไร</th>
                      <th>ผู้ให้บริการ</th>
                      <th>ยอดชำระ</th>
                      <th>สถานะ</th>
                      <th>Action</th>
                      <th>ลบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedule.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 800 }}>{formatDateTH(s.due)}</td>
                        <td style={{ fontWeight: 900 }}>{s.bill}</td>
                        <td>{s.provider}</td>
                        <td style={{ fontWeight: 900 }}>{fmt(s.amount)}</td>
                        <td>
                          <span className={tagClass(s.status)}>{s.status}</span>
                        </td>
                        <td>
                          <button className="miniBtn" type="button" onClick={() => showToast("ตัวอย่าง: ไปหน้าจ่ายบิล", "success")}>
                            Pay
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="miniBtn danger"
                            onClick={() => openConfirmDelete("schedule", s.id, `ต้องการลบรายการกำหนดชำระ (${s.bill}) ใช่ไหม?`)}
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredSchedule.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ padding: 16, color: "rgba(234,240,255,0.7)" }}>
                          ไม่พบรายการตามเงื่อนไขที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================== MODALS ================== */}

      <Modal open={modal.open && modal.type === "transfer"} title="โอนเงิน " onClose={closeModal} width={520} zIndex={1100}>
        <div className="datePick" style={{ alignItems: "stretch" }}>
          <div className="dateField" style={{ flex: 1 }}>
            <label>ปลายทาง</label>
            <input value={form.to} onChange={(e) => setF("to", e.target.value)} placeholder="เขียนอะไรก็ได้" />
          </div>
          <div className="dateField" style={{ width: 140 }}>
            <label>จำนวน</label>
            <input value={form.amount} onChange={(e) => setF("amount", e.target.value)} placeholder="1000" />
          </div>
        </div>
        <div style={{ height: 10 }} />
        <div className="datePick">
          <div className="dateField" style={{ flex: 1 }}>
            <label>หมายเหตุ</label>
            <input value={form.note} onChange={(e) => setF("note", e.target.value)} placeholder="เช่น ค่าอาหาร" />
          </div>
          <button className="btn" onClick={submitTransfer} type="button">
            ยืนยันโอน
          </button>
        </div>
      </Modal>

      <Modal open={modal.open && modal.type === "bill"} title="จ่ายบิล " onClose={closeModal} width={720} zIndex={1100}>
        <div className="datePick" style={{ alignItems: "stretch" }}>
          <div className="dateField" style={{ flex: 1 }}>
            <label>รายการบิล</label>
            <input value={form.bill} onChange={(e) => setF("bill", e.target.value)} placeholder="เช่น ไฟฟ้า" />
          </div>
          <div className="dateField" style={{ flex: 1 }}>
            <label>ผู้ให้บริการ</label>
            <input value={form.provider} onChange={(e) => setF("provider", e.target.value)} placeholder="เช่น MEA" />
          </div>
        </div>
        <div style={{ height: 10 }} />
        <div className="datePick" style={{ alignItems: "stretch" }}>
          <div className="dateField" style={{ flex: 1 }}>
            <label>เลขอ้างอิง</label>
            <input value={form.ref} onChange={(e) => setF("ref", e.target.value)} placeholder="เช่น MEA-10293" />
          </div>
          <div className="dateField" style={{ width: 140 }}>
            <label>จำนวน</label>
            <input value={form.amount} onChange={(e) => setF("amount", e.target.value)} placeholder="599" />
          </div>
          <button className="btn" onClick={submitBill} type="button">
            ยืนยันจ่าย
          </button>
        </div>
      </Modal>

      <Modal open={modal.open && modal.type === "topup"} title="เติมเงิน " onClose={closeModal} width={720} zIndex={1100}>
        <div className="datePick" style={{ alignItems: "stretch" }}>
          <div className="dateField" style={{ flex: 1 }}>
            <label>ช่องทาง</label>
            <input value={form.channel} onChange={(e) => setF("channel", e.target.value)} placeholder="เขียนอะไรก็ได้" />
          </div>
          <div className="dateField" style={{ width: 140 }}>
            <label>จำนวน</label>
            <input value={form.amount} onChange={(e) => setF("amount", e.target.value)} placeholder="2000" />
          </div>
        </div>
        <div style={{ height: 10 }} />
        <div className="datePick">
          <div className="dateField" style={{ flex: 1 }}>
            <label>หมายเหตุ</label>
            <input value={form.note} onChange={(e) => setF("note", e.target.value)} placeholder="เช่น ฝากเงินเข้าบัญชี" />
          </div>
          <button className="btn" onClick={submitTopup} type="button">
            ยืนยันเติมเงิน
          </button>
        </div>
      </Modal>

      <Modal open={modal.open && modal.type === "withdraw"} title="ถอนเงิน " onClose={closeModal} width={720} zIndex={1100}>
        <div className="datePick" style={{ alignItems: "stretch" }}>
          <div className="dateField" style={{ flex: 1 }}>
            <label>ช่องทาง</label>
            <input value={form.channel} onChange={(e) => setF("channel", e.target.value)} placeholder="เช่น ATM KBank" />
          </div>
          <div className="dateField" style={{ width: 140 }}>
            <label>จำนวน</label>
            <input value={form.amount} onChange={(e) => setF("amount", e.target.value)} placeholder="1000" />
          </div>
        </div>
        <div style={{ height: 10 }} />
        <div className="datePick">
          <div className="dateField" style={{ flex: 1 }}>
            <label>หมายเหตุ</label>
            <input value={form.note} onChange={(e) => setF("note", e.target.value)} placeholder="เช่น ถอนเงินสด" />
          </div>
          <button className="btn" onClick={submitWithdrawal} type="button">
            ยืนยันถอน
          </button>
        </div>
      </Modal>

      {/* ===== โปรไฟล์ ===== */}
      <Modal open={profileModal.open} title="โปรไฟล์" onClose={closeProfile} width={860} zIndex={2100}>
        <div className="profileModalGrid">
          {/* left profile card */}
          <div className="profileSideCard">
            <div className="profileTop">
              <button type="button" onClick={openAvatarPicker} className="profileAvatarBtn" title="กดเพื่อเปลี่ยนรูป">
                <div className="profileAvatarInner">{avatarView}</div>
              </button>

              <div className="profileMeta">
                <div className="profileName">{profile.fullName || "MiniBank User"}</div>
                <div className="profileHandle">@{profile.username}</div>
                <div className="profileEmail">{profile.email || "—"}</div>
              </div>
            </div>

            <input
              ref={avatarFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => onPickAvatar(e.target.files?.[0])}
            />

            <div style={{ height: 12 }} />

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 14, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontWeight: 900, color: "rgba(234,240,255,0.9)" }}>คำแนะนำ</div>
                <div style={{ marginTop: 6, color: "rgba(234,240,255,0.72)", lineHeight: 1.55 }}>
                   คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์ <br />
                   ปุ่ม (เปลี่ยนรหัสผ่าน) อยู่ด้านขวาในส่วนความปลอดภัย
                </div>
              </div>

              <button
                type="button"
                className="miniGhost"
                onClick={() => {
                  const u = localStorage.getItem("mb_user") || "guest";
                  removeAvatarOf(u);
                  setProfile((p) => ({ ...p, avatar: "" }));
                  showToast("ลบรูปโปรไฟล์แล้ว", "success");
                }}
                style={{ borderRadius: 14, padding: "10px 12px", fontWeight: 900 }}
              >
                ลบรูปโปรไฟล์
              </button>
            </div>
          </div>

          {/* right profile details */}
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 1000, color: "rgba(234,240,255,0.95)", fontSize: 14 }}>ข้อมูลผู้ใช้งาน</div>
              <div style={{ height: 10 }} />

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 900, color: "rgba(234,240,255,0.78)" }}>Username</div>
                  <div style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {profile.username}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 900, color: "rgba(234,240,255,0.78)" }}>Full name</div>
                  <div style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {profile.fullName || "—"}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 900, color: "rgba(234,240,255,0.78)" }}>Email</div>
                  <div style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {profile.email || "—"}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 1000, color: "rgba(234,240,255,0.95)", fontSize: 14 }}>ความปลอดภัย</div>
              <div style={{ marginTop: 8, color: "rgba(234,240,255,0.72)", lineHeight: 1.55 }}>
                คุณสามารถอัปเดตรหัสผ่านได้จากปุ่มด้านล่าง
              </div>

              <div style={{ height: 12 }} />

              <button
                type="button"
                className="btn"
                onClick={openPwd}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  padding: "12px 14px",
                  fontWeight: 1000,
                }}
              >
                เปลี่ยนรหัสผ่าน
              </button>

              <div style={{ height: 10 }} />

              <button
                type="button"
                className="miniGhost"
                onClick={doLogout}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  padding: "12px 14px",
                  fontWeight: 900,
                }}
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ตารางรายรับ/รายจ่าย */}
      <Modal
        open={tableView.open}
        title={tableView.kind === "income" ? "ตารางรายรับ" : "ตารางรายจ่าย"}
        onClose={closeTableView}
        width={1100}
        zIndex={1500}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 900, color: "rgba(234,240,255,0.9)" }}>เลือกเดือน</div>

          <select
            value={tableView.month}
            onChange={(e) => setTableView((s) => ({ ...s, month: e.target.value }))}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(0,0,0,0.15)",
              color: "#000",
              borderRadius: 12,
              padding: "10px 12px",
              outline: "none",
            }}
          >
            {(tableView.kind === "income" ? availableIncomeMonths : availableExpenseMonths).map((m) => (
              <option key={m} value={m} style={{ color: "#000", background: "#fff" }}>
                {m}
              </option>
            ))}
          </select>

          <span style={{ color: "rgba(234,240,255,0.7)", fontWeight: 800 }}>
            {tableView.kind === "income" ? `รวม: ${fmt(modalIncomeSum)}` : `รวม: ${fmt(modalExpenseSum)}`}
          </span>
        </div>

        <div style={{ height: 12 }} />

        {tableView.kind === "income" ? (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>วันเวลา</th>
                  <th>ช่องทาง</th>
                  <th>หมายเหตุ</th>
                  <th style={{ textAlign: "right" }}>จำนวนเงิน</th>
                  <th>ลบ</th>
                </tr>
              </thead>
              <tbody>
                {modalIncomeRows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateTH(r.date)}</td>
                    <td style={{ fontWeight: 900 }}>{r.desc}</td>
                    <td style={{ color: "rgba(234,240,255,0.75)" }}>{r.note || "-"}</td>
                    <td style={{ textAlign: "right", fontWeight: 900, color: "rgba(110,231,255,0.95)" }}>
                      +{fmt(Math.abs(r.amount))}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="miniBtn danger"
                        onClick={() => openConfirmDelete("topups", r.id, `ต้องการลบรายการเติมเงิน (${r.desc}) ใช่ไหม?`)}
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
                {modalIncomeRows.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: 16, color: "rgba(234,240,255,0.7)" }}>
                      เดือนนี้ไม่มีรายรับ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>วันเวลา</th>
                  <th>ประเภท</th>
                  <th>รายการ</th>
                  <th>หมายเหตุ/อ้างอิง</th>
                  <th style={{ textAlign: "right" }}>จำนวนเงิน</th>
                  <th>ลบ</th>
                </tr>
              </thead>
              <tbody>
                {modalExpenseRows.map((r) => (
                  <tr key={`${r.tab}-${r.id}`}>
                    <td>{formatDateTH(r.date)}</td>
                    <td style={{ fontWeight: 900 }}>{r.type}</td>
                    <td style={{ fontWeight: 800 }}>{r.desc}</td>
                    <td style={{ color: "rgba(234,240,255,0.75)" }}>{r.note || "-"}</td>
                    <td style={{ textAlign: "right", fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>
                      -{fmt(Math.abs(r.amount))}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="miniBtn danger"
                        onClick={() => {
                          const msg =
                            r.tab === "transfers"
                              ? `ต้องการลบรายการโอนเงิน (${r.desc}) ใช่ไหม?`
                              : r.tab === "withdrawals"
                              ? `ต้องการลบรายการถอนเงิน (${r.desc}) ใช่ไหม?`
                              : `ต้องการลบรายการจ่ายบิล (${r.desc}) ใช่ไหม?`;
                          openConfirmDelete(r.tab, r.id, msg);
                        }}
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
                {modalExpenseRows.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: 16, color: "rgba(234,240,255,0.7)" }}>
                      เดือนนี้ไม่มีรายจ่าย
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal open={confirmDel.open} title={confirmDel.title} onClose={closeConfirmDelete} width={520} zIndex={3000}>
        <div style={{ color: "rgba(234,240,255,0.85)", lineHeight: 1.6 }}>
          {confirmDel.message || "ต้องการลบรายการนี้ใช่ไหม?"}
        </div>
        <div style={{ height: 12 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="miniGhost" onClick={closeConfirmDelete}>
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn"
            onClick={confirmDelete}
            style={{
              borderRadius: 14,
              padding: "10px 14px",
              fontWeight: 900,
              background: "rgba(255,120,140,0.14)",
              border: "1px solid rgba(255,120,140,0.25)",
            }}
          >
            ยืนยันลบ
          </button>
        </div>
      </Modal>

      {/* อัปเดตรหัสผ่าน */}
      <Modal open={pwdModal.open} title="อัปเดตรหัสผ่าน" onClose={closePwd} width={720} zIndex={2200}>
        <div className="datePick" style={{ alignItems: "stretch" }}>
          <div className="dateField" style={{ flex: 1 }}>
            <label>รหัสเดิม</label>
            <input
              type="password"
              value={pwdForm.oldPass}
              onChange={(e) => setPwdForm((s) => ({ ...s, oldPass: e.target.value }))}
              placeholder="กรอกรหัสเดิม"
            />
          </div>
        </div>

        <div style={{ height: 10 }} />

        <div className="datePick" style={{ alignItems: "stretch" }}>
          <div className="dateField" style={{ flex: 1 }}>
            <label>รหัสใหม่</label>
            <input
              type="password"
              value={pwdForm.newPass}
              onChange={(e) => setPwdForm((s) => ({ ...s, newPass: e.target.value }))}
              placeholder="กรอกรหัสใหม่"
            />
          </div>
          <div className="dateField" style={{ flex: 1 }}>
            <label>ยืนยันรหัสใหม่</label>
            <input
              type="password"
              value={pwdForm.newPass2}
              onChange={(e) => setPwdForm((s) => ({ ...s, newPass2: e.target.value }))}
              placeholder="กรอกรหัสใหม่อีกครั้ง"
            />
          </div>
        </div>

        <div style={{ height: 12 }} />

        <button className="btn" type="button" onClick={requestChangePassword} style={{ width: "100%", borderRadius: 14, fontWeight: 900 }}>
          ยืนยันอัปเดต
        </button>
      </Modal>

      <Modal open={confirmPwd.open} title="ยืนยัน" onClose={closeConfirmPwd} width={520} zIndex={3500}>
        <div style={{ color: "rgba(234,240,255,0.85)", lineHeight: 1.6 }}>{confirmPwd.message}</div>
        <div style={{ height: 12 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="miniGhost" onClick={closeConfirmPwd}>
            ยกเลิก
          </button>
          <button type="button" className="btn" onClick={confirmChangePassword} style={{ borderRadius: 14, padding: "10px 14px", fontWeight: 900 }}>
            ยืนยัน
          </button>
        </div>
      </Modal>

      <Toast open={toast.open} type={toast.type} message={toast.message} onClose={() => setToast((s) => ({ ...s, open: false }))} />
    </div>
  );
}