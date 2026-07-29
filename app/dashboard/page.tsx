"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Member {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  extension: string;
  birthdate: string;
  address: string;
  photo: string;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
}

interface Loan {
  id: string;
  memberId: string;
  amount: number;
  borrowDate: string;
  interestStartDate: string;
  signature: string;
  status: string;
  payments: Payment[];
  months?: number;
  totalDue?: number;
  totalPaid?: number;
  balance?: number;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  date: string;
}

type Page = "dashboard" | "members" | "loans" | "accounting";

export default function DashboardPage() {
  const [page, setPage] = useState<Page>("dashboard");
  const [members, setMembers] = useState<Member[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Transaction state (client-side)
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "t1", type: "income", category: "Loan Payment", description: "Maria Dela Cruz - March payment", amount: 3000, date: "2025-03-15" },
    { id: "t2", type: "income", category: "Loan Payment", description: "Juan Garcia - April payment", amount: 5000, date: "2025-04-01" },
    { id: "t3", type: "expense", category: "Operating", description: "Office supplies and printing", amount: 1500, date: "2025-03-20" },
    { id: "t4", type: "income", category: "Interest", description: "Monthly interest collection", amount: 2500, date: "2025-04-15" },
    { id: "t5", type: "expense", category: "Transport", description: "Collection route gasoline", amount: 800, date: "2025-04-10" },
    { id: "t6", type: "income", category: "Loan Payment", description: "Ana Bautista - Final payment", amount: 4500, date: "2025-02-01" },
  ]);

  // Member modal
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [mForm, setMForm] = useState({ firstName: "", middleName: "", lastName: "", extension: "", birthdate: "", address: "", photo: "" });

  // Loan modal
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [lForm, setLForm] = useState({ memberId: "", amount: "", borrowDate: "", interestStartDate: "", signature: "" });

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payLoan, setPayLoan] = useState<Loan | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");

  // Transaction modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [txForm, setTxForm] = useState({ type: "income" as "income" | "expense", category: "", description: "", amount: "", date: "" });

  // Signature
  const sigCanvas = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [mRes, lRes] = await Promise.all([fetch("/api/members"), fetch("/api/loans")]);
      if (mRes.ok) setMembers(await mRes.json());
      if (lRes.ok) setLoans(await lRes.json());
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Photo handler
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMForm({ ...mForm, photo: reader.result as string });
    reader.readAsDataURL(file);
  };

  // Signature drawing
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const ctx = sigCanvas.current?.getContext("2d");
    if (ctx) { ctx.beginPath(); ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); }
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = sigCanvas.current?.getContext("2d");
    if (ctx) { ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.stroke(); }
  };
  const endDraw = () => setDrawing(false);
  const clearSig = () => {
    const ctx = sigCanvas.current?.getContext("2d");
    if (ctx && sigCanvas.current) ctx.clearRect(0, 0, sigCanvas.current.width, sigCanvas.current.height);
  };

  // Member CRUD
  const saveMember = async () => {
    const method = editMember ? "PUT" : "POST";
    const body = editMember ? { ...mForm, id: editMember.id } : mForm;
    await fetch("/api/members", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setShowMemberModal(false);
    setEditMember(null);
    setMForm({ firstName: "", middleName: "", lastName: "", extension: "", birthdate: "", address: "", photo: "" });
    fetchData();
  };
  const openEditMember = (m: Member) => {
    setEditMember(m);
    setMForm({ firstName: m.firstName, middleName: m.middleName, lastName: m.lastName, extension: m.extension, birthdate: m.birthdate, address: m.address, photo: m.photo });
    setShowMemberModal(true);
  };
  const deleteMember = async (id: string) => {
    if (!confirm("Delete this member?")) return;
    await fetch("/api/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchData();
  };

  // Loan CRUD
  const saveLoan = async () => {
    const sig = sigCanvas.current?.toDataURL() || "";
    await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lForm, signature: sig }),
    });
    setShowLoanModal(false);
    setLForm({ memberId: "", amount: "", borrowDate: "", interestStartDate: "", signature: "" });
    fetchData();
  };
  const makePayment = async () => {
    if (!payLoan) return;
    await fetch("/api/loans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: payLoan.id, action: "pay", paymentAmount: payAmount, paymentDate: payDate }),
    });
    setShowPayModal(false);
    setPayLoan(null);
    setPayAmount("");
    setPayDate("");
    fetchData();
  };
  const markPaid = async (id: string) => {
    if (!confirm("Mark this loan as fully paid?")) return;
    await fetch("/api/loans", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "markPaid" }) });
    fetchData();
  };
  const deleteLoan = async (id: string) => {
    if (!confirm("Delete this loan?")) return;
    await fetch("/api/loans", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchData();
  };

  // Accounting
  const saveTx = () => {
    const tx: Transaction = {
      id: Date.now().toString(36),
      type: txForm.type,
      category: txForm.category,
      description: txForm.description,
      amount: Number(txForm.amount),
      date: txForm.date,
    };
    setTransactions([tx, ...transactions]);
    setShowTxModal(false);
    setTxForm({ type: "income", category: "", description: "", amount: "", date: "" });
  };
  const deleteTx = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const getMemberName = (id: string) => {
    const m = members.find((x) => x.id === id);
    return m ? `${m.firstName} ${m.lastName}` : "Unknown";
  };

  const activeLoans = loans.filter((l) => l.status === "active");
  const totalLent = loans.reduce((s, l) => s + l.amount, 0);
  const totalBalance = activeLoans.reduce((s, l) => s + (l.balance || 0), 0);
  const totalCollected = loans.reduce((s, l) => s + (l.totalPaid || 0), 0);

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netIncome = totalIncome - totalExpense;

  const fmt = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

  return (
    <div>
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "show" : ""}`}>
        <div className="sidebar-brand">
          <i className="fas fa-hand-holding-usd"></i>LendingMahay
        </div>
        <nav className="nav flex-column mt-2">
          <a className={`nav-link ${page === "dashboard" ? "active" : ""}`} href="#" onClick={() => { setPage("dashboard"); setSidebarOpen(false); }}>
            <i className="fas fa-th-large"></i>Dashboard
          </a>
          <a className={`nav-link ${page === "members" ? "active" : ""}`} href="#" onClick={() => { setPage("members"); setSidebarOpen(false); }}>
            <i className="fas fa-users"></i>Members
          </a>
          <a className={`nav-link ${page === "loans" ? "active" : ""}`} href="#" onClick={() => { setPage("loans"); setSidebarOpen(false); }}>
            <i className="fas fa-file-invoice-dollar"></i>Loans
          </a>
          <a className={`nav-link ${page === "accounting" ? "active" : ""}`} href="#" onClick={() => { setPage("accounting"); setSidebarOpen(false); }}>
            <i className="fas fa-calculator"></i>Accounting
          </a>
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="top-bar">
          <div>
            <button className="btn btn-outline-secondary d-md-none me-2" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ border: "none", padding: "4px 8px" }}>
              <i className="fas fa-bars"></i>
            </button>
            <span className="section-title text-capitalize">{page}</span>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <i className="fas fa-circle me-1" style={{ fontSize: "8px", color: "var(--success)" }}></i>Online
          </div>
        </div>

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <div>
            <div className="row g-3 mb-4">
              {[
                { label: "Members", value: members.length, icon: "fas fa-users", cls: "icon-purple" },
                { label: "Active Loans", value: activeLoans.length, icon: "fas fa-file-invoice-dollar", cls: "icon-orange" },
                { label: "Total Balance", value: fmt(totalBalance), icon: "fas fa-peso-sign", cls: "icon-red" },
                { label: "Collected", value: fmt(totalCollected), icon: "fas fa-coins", cls: "icon-green" },
              ].map((s, i) => (
                <div className="col-md-3 col-6" key={i}>
                  <div className="card stat-card">
                    <div className="card-body d-flex align-items-center">
                      <div className={`icon-box ${s.cls} me-3`}>
                        <i className={s.icon}></i>
                      </div>
                      <div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 500 }}>{s.label}</div>
                        <div style={{ fontWeight: 700, fontSize: "1.15rem" }}>{s.value}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
     </div>

            <div className="row g-3">
              <div className="col-md-7">
                <div className="card table-card">
                  <div className="card-header">
                    <i className="fas fa-clock me-2" style={{ color: "var(--accent)" }}></i>Recent Active Loans
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table mb-0">
                        <thead><tr><th>Borrower</th><th>Principal</th><th>Balance</th><th>Months</th></tr></thead>
                        <tbody>
                          {activeLoans.slice(0, 5).map((l) => (
                            <tr key={l.id}>
                              <td style={{ fontWeight: 600 }}>{getMemberName(l.memberId)}</td>
                              <td>{fmt(l.amount)}</td>
                              <td style={{ color: "var(--danger)", fontWeight: 600 }}>{fmt(l.balance || 0)}</td>
                              <td><span className="badge-active">{l.months?.toFixed(1)} mo</span></td>
                            </tr>
                          ))}
                          {activeLoans.length === 0 && <tr><td colSpan={4} className="text-center py-4" style={{ color: "var(--text-muted)" }}>No active loans yet</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-5">
                <div className="card table-card">
                  <div className="card-header">
                    <i className="fas fa-chart-pie me-2" style={{ color: "var(--primary)" }}></i>Financial Summary
                  </div>
                  <div className="card-body">
                    {[
                      { label: "Total Lent Out", value: fmt(totalLent), color: "var(--text-primary)" },
                      { label: "Interest Earned", value: fmt(totalBalance - totalLent + totalCollected), color: "var(--success)" },
                      { label: "Total Collected", value: fmt(totalCollected), color: "var(--primary)" },
                      { label: "Outstanding", value: fmt(totalBalance), color: "var(--danger)" },
                    ].map((r, i) => (
                      <div className="summary-row" key={i}>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{r.label}</span>
                        <span style={{ fontWeight: 700, color: r.color }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS */}
        {page === "members" && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="section-title"><i className="fas fa-users me-2" style={{ color: "var(--primary)" }}></i>Members ({members.length})</span>
              <button className="btn btn-primary" onClick={() => { setEditMember(null); setMForm({ firstName: "", middleName: "", lastName: "", extension: "", birthdate: "", address: "", photo: "" }); setShowMemberModal(true); }}>
                <i className="fas fa-plus me-1"></i>Add Member
              </button>
            </div>
            <div className="card table-card">
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead><tr><th>Photo</th><th>Name</th><th>Birthdate</th><th>Address</th><th>Actions</th></tr></thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td>
                          {m.photo ? <img src={m.photo} className="profile-photo" alt="" /> :
                            <div className="profile-photo d-flex align-items-center justify-content-center" style={{ background: "var(--primary-soft)", color: "var(--primary)", fontSize: "1rem" }}>
                              <i className="fas fa-user"></i>
                            </div>}
                        </td>
                        <td style={{ fontWeight: 600 }}>{m.firstName} {m.middleName} {m.lastName} {m.extension}</td>
                        <td>{m.birthdate}</td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{m.address}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEditMember(m)} title="Edit">
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => deleteMember(m.id)} title="Delete">
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr><td colSpan={5}>
                        <div className="empty-state">
                          <div><i className="fas fa-user-plus"></i></div>
                          <p>No members yet. Click &quot;Add Member&quot; to get started.</p>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* LOANS */}
        {page === "loans" && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="section-title"><i className="fas fa-file-invoice-dollar me-2" style={{ color: "var(--accent)" }}></i>Loans ({loans.length})</span>
              <button className="btn btn-primary" onClick={() => {
                setLForm({ memberId: members[0]?.id || "", amount: "", borrowDate: new Date().toISOString().split("T")[0], interestStartDate: new Date().toISOString().split("T")[0], signature: "" });
                setShowLoanModal(true);
                setTimeout(() => { if (sigCanvas.current) { const ctx = sigCanvas.current.getContext("2d"); if (ctx) ctx.clearRect(0, 0, sigCanvas.current.width, sigCanvas.current.height); } }, 100);
              }}>
                <i className="fas fa-plus me-1"></i>New Loan
              </button>
            </div>
            <div className="card table-card">
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead><tr><th>Borrower</th><th>Principal</th><th>Date</th><th>Months</th><th>Total Due</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {loans.map((l) => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600 }}>{getMemberName(l.memberId)}</td>
                        <td>{fmt(l.amount)}</td>
                        <td>{l.borrowDate}</td>
                        <td>{l.months?.toFixed(1)}</td>
                        <td>{fmt(l.totalDue || 0)}</td>
                        <td style={{ color: "var(--success)" }}>{fmt(l.totalPaid || 0)}</td>
                        <td style={{ color: "var(--danger)", fontWeight: 600 }}>{fmt(l.balance || 0)}</td>
                        <td>
                          <span className={l.status === "paid" ? "badge-paid" : "badge-active"}>
                            {l.status === "paid" ? "Paid" : "Active"}
                          </span>
                        </td>
                        <td>
                          {l.status === "active" && <>
                            <button className="btn btn-sm btn-outline-success me-1" title="Record Payment" onClick={() => { setPayLoan(l); setPayAmount(""); setPayDate(new Date().toISOString().split("T")[0]); setShowPayModal(true); }}>
                              <i className="fas fa-money-bill-wave"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-primary me-1" title="Mark Paid" onClick={() => markPaid(l.id)}>
                              <i className="fas fa-check"></i>
                            </button>
                          </>}
                          {l.signature && (
                            <button className="btn btn-sm btn-outline-secondary me-1" title="View Signature" onClick={() => {
                              const w = window.open("", "_blank", "width=400,height=300");
                              if (w) { w.document.write(`<img src="${l.signature}" style="max-width:100%"/>`); }
                            }}>
                              <i className="fas fa-signature"></i>
                            </button>
                          )}
                          <button className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => deleteLoan(l.id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {loans.length === 0 && (
                      <tr><td colSpan={9}>
                        <div className="empty-state">
                          <div><i className="fas fa-file-invoice-dollar"></i></div>
                          <p>No loans yet.</p>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNTING */}
        {page === "accounting" && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="section-title"><i className="fas fa-calculator me-2" style={{ color: "var(--info)" }}></i>Accounting</span>
              <button className="btn btn-primary" onClick={() => { setTxForm({ type: "income", category: "", description: "", amount: "", date: new Date().toISOString().split("T")[0] }); setShowTxModal(true); }}>
                <i className="fas fa-plus me-1"></i>New Transaction
              </button>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="accounting-card">
                  <div className="d-flex align-items-center mb-2">
                    <div className="icon-box icon-green me-3"><i className="fas fa-arrow-down"></i></div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Total Income</div>
                      <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--success)" }}>{fmt(totalIncome)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="accounting-card">
                  <div className="d-flex align-items-center mb-2">
                    <div className="icon-box icon-red me-3"><i className="fas fa-arrow-up"></i></div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Total Expenses</div>
                      <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--danger)" }}>{fmt(totalExpense)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="accounting-card">
                  <div className="d-flex align-items-center mb-2">
                    <div className="icon-box icon-purple me-3"><i className="fas fa-wallet"></i></div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Net Income</div>
                      <div style={{ fontWeight: 700, fontSize: "1.2rem", color: netIncome >= 0 ? "var(--success)" : "var(--danger)" }}>{fmt(netIncome)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card table-card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span><i className="fas fa-list me-2" style={{ color: "var(--primary)" }}></i>Transactions</span>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead><tr><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th>Date</th><th>Action</th></tr></thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <span className={t.type === "income" ? "badge-paid" : "badge-active"}>
                              {t.type === "income" ? "Income" : "Expense"}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500 }}>{t.category}</td>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{t.description}</td>
                          <td style={{ fontWeight: 600, color: t.type === "income" ? "var(--success)" : "var(--danger)" }}>
                            {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                          </td>
                          <td>{t.date}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteTx(t.id)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr><td colSpan={6}>
                          <div className="empty-state">
                            <div><i className="fas fa-receipt"></i></div>
                            <p>No transactions yet.</p>
                          </div>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MEMBER MODAL */}
      {showMemberModal && (
        <div className="modal show d-block" style={{ background: "rgba(61,53,86,0.4)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-user-plus me-2"></i>{editMember ? "Edit" : "Add"} Member</h5>
                <button className="btn-close" onClick={() => setShowMemberModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">First Name *</label>
                    <input className="form-control" value={mForm.firstName} onChange={(e) => setMForm({ ...mForm, firstName: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Middle Name</label>
                    <input className="form-control" value={mForm.middleName} onChange={(e) => setMForm({ ...mForm, middleName: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Last Name *</label>
                    <input className="form-control" value={mForm.lastName} onChange={(e) => setMForm({ ...mForm, lastName: e.target.value })} />
                  </div>
                  <div className="col-md-1">
                    <label className="form-label">Ext.</label>
                    <input className="form-control" value={mForm.extension} onChange={(e) => setMForm({ ...mForm, extension: e.target.value })} placeholder="Jr." />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Birthdate</label>
                    <input type="date" className="form-control" value={mForm.birthdate} onChange={(e) => setMForm({ ...mForm, birthdate: e.target.value })} />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Address</label>
                    <input className="form-control" value={mForm.address} onChange={(e) => setMForm({ ...mForm, address: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Profile Photo</label>
                    <input type="file" className="form-control" accept="image/*" onChange={handlePhoto} />
                    {mForm.photo && <img src={mForm.photo} className="profile-photo-lg mt-2" alt="preview" />}
        </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveMember} disabled={!mForm.firstName || !mForm.lastName}>
                  <i className="fas fa-save me-1"></i>{editMember ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOAN MODAL */}
      {showLoanModal && (
        <div className="modal show d-block" style={{ background: "rgba(61,53,86,0.4)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-file-invoice-dollar me-2"></i>New Loan</h5>
                <button className="btn-close" onClick={() => setShowLoanModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Borrower *</label>
                    <select className="form-select" value={lForm.memberId} onChange={(e) => setLForm({ ...lForm, memberId: e.target.value })}>
                      <option value="">Select member...</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Amount (PHP) *</label>
                    <input type="number" className="form-control" value={lForm.amount} onChange={(e) => setLForm({ ...lForm, amount: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Borrow Date</label>
                    <input type="date" className="form-control" value={lForm.borrowDate} onChange={(e) => setLForm({ ...lForm, borrowDate: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Interest Start Date</label>
                    <input type="date" className="form-control" value={lForm.interestStartDate} onChange={(e) => setLForm({ ...lForm, interestStartDate: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Digital Signature</label>
                    <canvas ref={sigCanvas} width={500} height={150} className="signature-pad w-100"
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} />
                    <button className="btn btn-sm btn-outline-secondary mt-1" onClick={clearSig}>
                      <i className="fas fa-eraser me-1"></i>Clear
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setShowLoanModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveLoan} disabled={!lForm.memberId || !lForm.amount}>
                  <i className="fas fa-save me-1"></i>Create Loan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPayModal && payLoan && (
        <div className="modal show d-block" style={{ background: "rgba(61,53,86,0.4)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-money-bill-wave me-2"></i>Record Payment</h5>
                <button className="btn-close" onClick={() => setShowPayModal(false)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Borrower:</strong> {getMemberName(payLoan.memberId)}</p>
                <p><strong>Balance:</strong> <span style={{ color: "var(--danger)", fontWeight: 600 }}>{fmt(payLoan.balance || 0)}</span></p>
                <div className="mb-3">
                  <label className="form-label">Payment Amount (PHP)</label>
                  <input type="number" className="form-control" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Payment Date</label>
                  <input type="date" className="form-control" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={makePayment} disabled={!payAmount}>
                  <i className="fas fa-check me-1"></i>Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION MODAL */}
      {showTxModal && (
        <div className="modal show d-block" style={{ background: "rgba(61,53,86,0.4)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-receipt me-2"></i>New Transaction</h5>
                <button className="btn-close" onClick={() => setShowTxModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value as "income" | "expense" })}>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Category</label>
                    <input className="form-control" value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                      placeholder={txForm.type === "income" ? "e.g. Loan Payment, Interest" : "e.g. Operating, Transport"} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <input className="form-control" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Amount (PHP)</label>
                    <input type="number" className="form-control" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-control" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setShowTxModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveTx} disabled={!txForm.category || !txForm.amount}>
                  <i className="fas fa-save me-1"></i>Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
