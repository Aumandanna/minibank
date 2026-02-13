// src/mockBankApi.js

const pad2 = (x) => String(x).padStart(2, "0");

function nowStr() {
  const d = new Date();
  return dtStr(d);
}

function dtStr(d) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function ymdStr(d) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function keyOf(username) {
  const u = (username || "guest").trim() || "guest";
  return `mb_db_${u}`;
}

function readDb(username) {
  const raw = localStorage.getItem(keyOf(username));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  // default db ของ user ใหม่ (ยังไม่ seed)
  return {
    balance: 42350.5,
    transfers: [],
    bills: [],
    withdrawals: [],
    topups: [],
    schedule: [],
  };
}

function writeDb(username, db) {
  localStorage.setItem(keyOf(username), JSON.stringify(db));
  return db;
}

function makeId(prefix = "x") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}


function seedDb() {
  const now = new Date();

  const today = new Date(now);
  today.setHours(10, 20, 0, 0);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(16, 35, 0, 0);

  const thisMonthDay = new Date(now);
  thisMonthDay.setDate(Math.min(8, Math.max(2, now.getDate() - 2))); // ให้มีวันในเดือนนี้แน่ๆ
  thisMonthDay.setHours(12, 5, 0, 0);

  const lastMonthDay = new Date(now.getFullYear(), now.getMonth() - 1, 20, 14, 10, 0, 0);

  const topups = [
    {
      id: makeId("p"),
      date: dtStr(lastMonthDay),
      channel: "PromptPay",
      note: "เติมเงินตัวอย่าง (เดือนก่อน)",
      amount: 35000,
      fee: 0,
      status: "สำเร็จ",
    },
    {
      id: makeId("p"),
      date: dtStr(thisMonthDay),
      channel: "K PLUS",
      note: "เติมเงินตัวอย่าง (เดือนนี้)",
      amount: 18000,
      fee: 0,
      status: "สำเร็จ",
    },
    {
      id: makeId("p"),
      date: dtStr(yesterday),
      channel: "PromptPay",
      note: "เติมเงินตัวอย่าง (เมื่อวาน)",
      amount: 12000,
      fee: 0,
      status: "สำเร็จ",
    },
    {
      id: makeId("p"),
      date: dtStr(today),
      channel: "ATM",
      note: "เติมเงินตัวอย่าง (วันนี้)",
      amount: 9000,
      fee: 0,
      status: "สำเร็จ",
    },
  ];

  const transfers = [
    { id: makeId("t"), date: dtStr(yesterday), to: "KBANK 888-xxxxxx", note: "ค่าอาหาร", amount: 520, status: "สำเร็จ" },
    { id: makeId("t"), date: dtStr(today), to: "SCB 111-xxxxxx", note: "ค่าเดินทาง", amount: 180, status: "สำเร็จ" },
  ];

  const withdrawals = [
    { id: makeId("w"), date: dtStr(lastMonthDay), channel: "ATM KBank", note: "ถอนเงินสด", amount: 2000, fee: 0, status: "สำเร็จ" },
    { id: makeId("w"), date: dtStr(thisMonthDay), channel: "ATM SCB", note: "ถอนเงินสด", amount: 1500, fee: 0, status: "สำเร็จ" },
  ];

  const bills = [
    { id: makeId("b"), date: dtStr(thisMonthDay), bill: "ค่าไฟฟ้า", provider: "MEA", ref: "MEA-10293", amount: 860, status: "สำเร็จ" },
    { id: makeId("b"), date: dtStr(today), bill: "ค่าน้ำ", provider: "MWA", ref: "MWA-55661", amount: 320, status: "สำเร็จ" },
  ];

  const schedule = [
    {
      id: makeId("s"),
      due: ymdStr(new Date(now.getFullYear(), now.getMonth(), Math.min(28, now.getDate() + 7))),
      bill: "อินเทอร์เน็ต",
      provider: "TRUE",
      amount: 599,
      status: "แนะนำจ่ายก่อน",
    },
  ];

  const income = topups.reduce((a, x) => a + Number(x.amount || 0), 0);
  const expense =
    transfers.reduce((a, x) => a + Number(x.amount || 0), 0) +
    withdrawals.reduce((a, x) => a + Number(x.amount || 0), 0) +
    bills.reduce((a, x) => a + Number(x.amount || 0), 0);

  const balance = Math.max(0, 25000 + income - expense);

  return { balance, transfers, bills, withdrawals, topups, schedule };
}

// ---------- Public API ----------

export async function getDashboardData(username) {
 
  const k = keyOf(username);
  const raw = localStorage.getItem(k);

  const db = raw ? readDb(username) : seedDb();
  writeDb(username, db);
  return db;
}

export async function createTransfer(username, payload) {
  const db = readDb(username);

  const row = {
    id: makeId("t"),
    date: nowStr(),
    to: payload.to,
    note: payload.note || "",
    amount: Number(payload.amount || 0),
    status: "สำเร็จ",
  };

  db.transfers.push(row);
  db.balance = Number(db.balance || 0) - row.amount;

  writeDb(username, db);
  return { row, balance: db.balance };
}

export async function createBillPayment(username, payload) {
  const db = readDb(username);

  const row = {
    id: makeId("b"),
    date: nowStr(),
    bill: payload.bill,
    provider: payload.provider,
    ref: payload.ref || "-",
    amount: Number(payload.amount || 0),
    status: "สำเร็จ",
  };

  db.bills.push(row);
  db.balance = Number(db.balance || 0) - row.amount;

  writeDb(username, db);
  return { row, balance: db.balance };
}

export async function createTopup(username, payload) {
  const db = readDb(username);

  const row = {
    id: makeId("p"),
    date: nowStr(),
    channel: payload.channel,
    note: payload.note || "",
    amount: Number(payload.amount || 0),
    fee: 0,
    status: "สำเร็จ",
  };

  db.topups.push(row);
  db.balance = Number(db.balance || 0) + row.amount;

  writeDb(username, db);
  return { row, balance: db.balance };
}

export async function createWithdrawal(username, payload) {
  const db = readDb(username);

  const row = {
    id: makeId("w"),
    date: nowStr(),
    channel: payload.channel,
    note: payload.note || "",
    amount: Number(payload.amount || 0),
    fee: 0,
    status: "สำเร็จ",
  };

  db.withdrawals.push(row);
  db.balance = Number(db.balance || 0) - row.amount;

  writeDb(username, db);
  return { row, balance: db.balance };
}
