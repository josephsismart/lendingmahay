"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string; firstName: string; middleName: string; lastName: string;
  extension: string; birthdate: string; address: string; photo: string; createdAt: string;
}
interface Loan {
  id: string; memberId: string; amount: number; borrowDate: string;
  interestStartDate: string; signature: string; status: string;
  payments: { id: string; amount: number; date: string }[];
  totalDue?: number; interestAmount?: number; months?: number; totalPaid?: number; balance?: number;
}

type Page = "dashboard" | "members" | "loans";

export default function Dashboard() {
  const router = useRouter();
  const [page, setPage] = useState<Page>("dashboard");
  const [members, setMembers] = useState<Member[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [payLoan, setPayLoan] = useState<Loan | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Member form
  const [mForm, setMForm] = useState({ firstName: "", middleName: "", lastName: "", extension: "", birthdate: "", address: "", photo: "" });
  // Loan form
  const [lForm, setLForm] = useState({ memberId: "", amount: "", borrowDate: "", interestStartDate: "", signature: "" });
  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");

  // Signature canvas
  const sigCanvas = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const fetchData = useCallback(async () => {
    const [mRes, lRes] = await Promise.all([fetch("/api/members"), fetch("/api/loans")]);
    setMembers(await mRes.json());
    setLoans(await lRes.json());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("auth") !== "true") {
      router.push("/");
      return;
    }
    fetchData();
  }, [router, fetchData]);

  const handleLogout = () => { sessionStorage.removeItem("auth"); router.push("/"); };

  // Photo upload (compress to ~50kb)
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 200;
        let w = img.width, h = img.height;
        if (w > h) { h = (h / w) * max; w = max; } else { w = (w / h) * max; h = max; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        setMForm((f) => ({ ...f, photo: canvas.toDataURL("image/jpeg", 0.6) }));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Signature drawing
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = sigCanvas.current!.getContext("2d")!;
    const rect = sigCanvas.current!.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = sigCanvas.current!.getContext("2d")!;
    const rect = sigCanvas.current!.getBoundingClientRect();
    ctx.lineWidth = 2; ctx.strokeStyle = "#000"; ctx.lineCap = "round";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  const endDraw = () => {
    setIsDrawing(false);
    if (sigCanvas.current) {
      setLForm((f) => ({ ...f, signature: sigCanvas.current!.toDataURL() }));
    }
  };
  const clearSig = () => {
    const c = sigCanvas.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setLForm((f) => ({ ...f, signature: "" }));
  };

  // CRUD Members
  const saveMember = async () => {
    const method = editMember ? "PUT" : "POST";
    const body = editMember ? { ...mForm, id: editMember.id } : mForm;
    await fetch("/api/members", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setShowMemberModal(false);
    setEditMember(null);
    setMForm({ firstName: "", middleName: "", lastName: "", extension: "", birthdate: "", address: "", photo: "" });
    fetchData();
  };
  const deleteMember = async (id: string) => {
    if (!confirm("Delete this member?")) return;
    await fetch("/api/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchData();
  };
  const openEditMember = (m: Member) => {
    setEditMember(m);
    setMForm({ firstName: m.firstName, middleName: m.middleName, lastName: m.lastName, extension: m.extension, birthdate: m.birthdate, address: m.address, photo: m.photo });
    setShowMemberModal(true);
  };

  // CRUD Loans
  const saveLoan = async () => {
    await fetch("/api/loans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lForm) });
    setShowLoanModal(false);
    setLForm({ memberId: "", amount: "", borrowDate: "", interestStartDate: "", signature: "" });
    fetchData();
  };
  const makePayment = async () => {
    if (!payLoan) return;
    await fetch("/api/loans", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: payLoan.id, action: "pay", paymentAmount: payAmount, paymentDate: payDate }),
    });
    setShowPayModal(false); setPayLoan(null); setPayAmount(""); setPayDate("");
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

  const getMemberName = (id: string) => {
    const m = members.find((m) => m.id === id);
    return m ? `${m.firstName} ${m.lastName}` : "Unknown";
  };

  const activeLoans = loans.filter((l) => l.status === "active");
  const totalLent = loans.reduce((s, l) => s + l.amount, 0);
  const totalBalance = activeLoans.reduce((s, l) => s + (l.balance || 0), 0);
  const totalCollected = loans.reduce((s, l) => s + (l.totalPaid || 0), 0);

  const fmt = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

  return (
    <div>
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "show" : ""}`}>
        <div className="sidebar-brand">
          <i className="fas fa-hand-holding-usd me-2"></i>LendingMahay
        </div>
        <nav className="nav flex-column mt-3">
          <a className={`nav-link ${page === "dashboard" ? "active" : ""}`} href="#" onClick={() => { setPage("dashboard"); setSidebarOpen(false); }}>
            <i className="fas fa-tachometer-alt"></i>Dashboard
          </a>
          <a className={`nav-link ${page === "members" ? "active" : ""}`} href="#" onClick={() => { setPage("members"); setSidebarOpen(false); }}>
            <i className="fas fa-users"></i>Members
          </a>
          <a className={`nav-link ${page === "loans" ? "active" : ""}`} href="#" onClick={() => { setPage("loans"); setSidebarOpen(false); }}>
            <i className="fas fa-file-invoice-dollar"></i>Loans
          </a>
          <hr className="border-secondary mx-3" />
          <a className="nav-link" href="#" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>Logout
          </a>
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <div className="top-bar d-flex justify-content-between align-items-center">
          <div>
            <button className="btn btn-outline-secondary d-md-none me-2" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <i className="fas fa-bars"></i>
            </button>
            <strong className="text-capitalize">{page}</strong>
          </div>
          <div className="text-muted small">
            <i className="fas fa-user-shield me-1"></i>Admin
          </div>
        </div>

        {/* DASHBOARD PAGE */}
        {page === "dashboard" && (
          <div>
            <div className="row g-3 mb-4">
              <div className="col-md-3 col-6">
                <div className="card stat-card">
                  <div className="card-body d-flex align-items-center">
                    <div className="icon-box bg-primary bg-opacity-10 text-primary me-3">
                      <i className="fas fa-users"></i>
                    </div>
                    <div>
                      <div className="text-muted small">Members</div>
                      <div className="fw-bold fs-5">{members.length}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-6">
                <div className="card stat-card">
                  <div className="card-body d-flex align-items-center">
                    <div className="icon-box bg-warning bg-opacity-10 text-warning me-3">
                      <i className="fas fa-file-invoice-dollar"></i>
                    </div>
                    <div>
                      <div className="text-muted small">Active Loans</div>
                      <div className="fw-bold fs-5">{activeLoans.length}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-6">
                <div className="card stat-card">
                  <div className="card-body d-flex align-items-center">
                    <div className="icon-box bg-danger bg-opacity-10 text-danger me-3">
                      <i className="fas fa-peso-sign"></i>
                    </div>
                    <div>
                      <div className="text-muted small">Total Balance</div>
                      <div className="fw-bold fs-6">{fmt(totalBalance)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-6">
                <div className="card stat-card">
                  <div className="card-body d-flex align-items-center">
                    <div className="icon-box bg-success bg-opacity-10 text-success me-3">
                      <i className="fas fa-coins"></i>
                    </div>
                    <div>
                      <div className="text-muted small">Collected</div>
                      <div className="fw-bold fs-6">{fmt(totalCollected)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <div className="card table-card">
                  <div className="card-header bg-white border-bottom">
                    <i className="fas fa-clock me-2 text-warning"></i>Recent Loans
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr><th>Borrower</th><th>Amount</th><th>Balance</th></tr>
                        </thead>
                        <tbody>
                          {activeLoans.slice(0, 5).map((l) => (
                            <tr key={l.id}>
                              <td>{getMemberName(l.memberId)}</td>
                              <td>{fmt(l.amount)}</td>
                              <td className="text-danger fw-bold">{fmt(l.balance || 0)}</td>
                            </tr>
                          ))}
                          {activeLoans.length === 0 && <tr><td colSpan={3} className="text-center text-muted py-3">No active loans</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card table-card">
                  <div className="card-header bg-white border-bottom">
                    <i className="fas fa-chart-pie me-2 text-primary"></i>Summary
                  </div>
                  <div className="card-body">
                    <div className="d-flex justify-content-between mb-3">
                      <span className="text-muted">Total Lent Out</span>
                      <span className="fw-bold">{fmt(totalLent)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <span className="text-muted">Total Interest Earned</span>
                      <span className="fw-bold text-success">{fmt(totalBalance - totalLent + totalCollected)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <span className="text-muted">Total Collected</span>
                      <span className="fw-bold text-primary">{fmt(totalCollected)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Outstanding Balance</span>
                      <span className="fw-bold text-danger">{fmt(totalBalance)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS PAGE */}
        {page === "members" && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0"><i className="fas fa-users me-2"></i>Members ({members.length})</h5>
              <button className="btn btn-primary" onClick={() => { setEditMember(null); setMForm({ firstName: "", middleName: "", lastName: "", extension: "", birthdate: "", address: "", photo: "" }); setShowMemberModal(true); }}>
                <i className="fas fa-plus me-1"></i>Add Member
              </button>
            </div>
            <div className="card table-card">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>Photo</th><th>Name</th><th>Birthdate</th><th>Address</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td>
                          {m.photo ? <img src={m.photo} className="profile-photo" alt="" /> :
                            <div className="profile-photo bg-secondary d-flex align-items-center justify-content-center text-white">
                              <i className="fas fa-user"></i>
                            </div>}
                        </td>
                        <td>
                          <strong>{m.firstName} {m.middleName} {m.lastName} {m.extension}</strong>
                        </td>
                        <td>{m.birthdate}</td>
                        <td className="small">{m.address}</td>
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
                    {members.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">No members yet. Click &quot;Add Member&quot; to get started.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* LOANS PAGE */}
        {page === "loans" && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0"><i className="fas fa-file-invoice-dollar me-2"></i>Loans ({loans.length})</h5>
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
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>Borrower</th><th>Principal</th><th>Borrow Date</th><th>Months</th><th>Total Due</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {loans.map((l) => (
                      <tr key={l.id}>
                        <td className="fw-bold">{getMemberName(l.memberId)}</td>
                        <td>{fmt(l.amount)}</td>
                        <td>{l.borrowDate}</td>
                        <td>{l.months?.toFixed(1)}</td>
                        <td>{fmt(l.totalDue || 0)}</td>
                        <td className="text-success">{fmt(l.totalPaid || 0)}</td>
                        <td className="text-danger fw-bold">{fmt(l.balance || 0)}</td>
                        <td>
                          <span className={`badge ${l.status === "paid" ? "bg-success" : "bg-warning text-dark"}`}>
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
                    {loans.length === 0 && <tr><td colSpan={9} className="text-center text-muted py-4">No loans yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MEMBER MODAL */}
      {showMemberModal && (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
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
                    <input className="form-control" value={mForm.firstName} onChange={(e) => setMForm({ ...mForm, firstName: e.target.value })} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Middle Name</label>
                    <input className="form-control" value={mForm.middleName} onChange={(e) => setMForm({ ...mForm, middleName: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Last Name *</label>
                    <input className="form-control" value={mForm.lastName} onChange={(e) => setMForm({ ...mForm, lastName: e.target.value })} required />
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
                    <label className="form-label">Profile Photo (max ~50KB)</label>
                    <input type="file" className="form-control" accept="image/*" onChange={handlePhoto} />
                    {mForm.photo && <img src={mForm.photo} className="profile-photo-lg mt-2" alt="preview" />}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
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
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
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
                    <label className="form-label">Borrower&apos;s Digital Signature</label>
                    <canvas ref={sigCanvas} width={500} height={150} className="signature-pad w-100"
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} />
                    <button className="btn btn-sm btn-outline-secondary mt-1" onClick={clearSig}>
                      <i className="fas fa-eraser me-1"></i>Clear Signature
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowLoanModal(false)}>Cancel</button>
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
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-money-bill-wave me-2"></i>Record Payment</h5>
                <button className="btn-close" onClick={() => setShowPayModal(false)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Borrower:</strong> {getMemberName(payLoan.memberId)}</p>
                <p><strong>Balance:</strong> <span className="text-danger">{fmt(payLoan.balance || 0)}</span></p>
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
                <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={makePayment} disabled={!payAmount}>
                  <i className="fas fa-check me-1"></i>Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
      }
