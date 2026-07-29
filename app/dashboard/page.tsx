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
  shares: number;
  createdAt: string;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
}

interface Loan {
  id: string;
  memberId: string;
  borrowerType: "member" | "non-member";
  borrowerName: string;
  taggedMemberId: string;
  amount: number;
  borrowDate: string;
  interestStartDate: string;
  signature: string;
  status: "active" | "paid";
  payments: Payment[];
  totalDue: number;
  interestAmount: number;
  months: number;
  balance: number;
  totalPaid: number;
  createdAt: string;
}

type Page = "dashboard" | "shareholders" | "loans" | "accounting";

const SHARE_VALUE = 1000;

function formatPeso(amount: number): string {
  return "₱" + amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [members, setMembers] = useState<Member[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Member modal state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberForm, setMemberForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    extension: "",
    birthdate: "",
    address: "",
    photo: "",
    shares: 1,
  });

  // Loan modal state
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanForm, setLoanForm] = useState({
    borrowerType: "member" as "member" | "non-member",
    memberId: "",
    borrowerName: "",
    taggedMemberId: "",
    amount: 0,
    borrowDate: new Date().toISOString().split("T")[0],
    interestStartDate: new Date().toISOString().split("T")[0],
    signature: "",
  });

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoanId, setPaymentLoanId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Signature pad state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, loansRes] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/loans"),
      ]);
      const membersData = await membersRes.json();
      const loansData = await loansRes.json();
      setMembers(Array.isArray(membersData) ? membersData : []);
      setLoans(Array.isArray(loansData) ? loansData : []);
    } catch (err) {
      console.error("FAILED TO FETCH DATA:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("CAMERA ERROR:", err);
      alert("FAILED TO ACCESS CAMERA. PLEASE ALLOW CAMERA PERMISSIONS.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setMemberForm((prev) => ({ ...prev, photo: dataUrl }));
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  // Signature pad functions
  const initSignaturePad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    initSignaturePad();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setLoanForm((prev) => ({ ...prev, signature: dataUrl }));
  };

  // Member CRUD
  const openAddMember = () => {
    setEditingMember(null);
    setMemberForm({ firstName: "", middleName: "", lastName: "", extension: "", birthdate: "", address: "", photo: "", shares: 1 });
    setShowMemberModal(true);
  };

  const openEditMember = (member: Member) => {
    setEditingMember(member);
    setMemberForm({
      firstName: member.firstName,
      middleName: member.middleName,
      lastName: member.lastName,
      extension: member.extension,
      birthdate: member.birthdate,
      address: member.address,
      photo: member.photo,
      shares: member.shares,
    });
    setShowMemberModal(true);
  };

  const saveMember = async () => {
    try {
      if (editingMember) {
        await fetch("/api/members", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingMember.id, ...memberForm }),
        });
      } else {
        await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(memberForm),
        });
      }
      setShowMemberModal(false);
      stopCamera();
      await fetchData();
    } catch (err) {
      console.error("SAVE MEMBER ERROR:", err);
      alert("FAILED TO SAVE MEMBER");
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm("ARE YOU SURE YOU WANT TO DELETE THIS SHAREHOLDER?")) return;
    try {
      await fetch("/api/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchData();
    } catch (err) {
      console.error("DELETE MEMBER ERROR:", err);
      alert("FAILED TO DELETE MEMBER");
    }
  };

  // Loan CRUD
  const openAddLoan = () => {
    setEditingLoan(null);
    setLoanForm({
      borrowerType: "member",
      memberId: "",
      borrowerName: "",
      taggedMemberId: "",
      amount: 0,
      borrowDate: new Date().toISOString().split("T")[0],
      interestStartDate: new Date().toISOString().split("T")[0],
      signature: "",
    });
    setShowLoanModal(true);
  };

  const openEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setLoanForm({
      borrowerType: loan.borrowerType,
      memberId: loan.memberId,
      borrowerName: loan.borrowerName,
      taggedMemberId: loan.taggedMemberId,
      amount: loan.amount,
      borrowDate: loan.borrowDate,
      interestStartDate: loan.interestStartDate,
      signature: loan.signature,
    });
    setShowLoanModal(true);
  };

  const saveLoan = async () => {
    saveSignature();
    try {
      const payload = { ...loanForm };
      if (loanForm.borrowerType === "member") {
        const member = members.find((m) => m.id === loanForm.memberId);
        if (member) {
          payload.borrowerName = `${member.firstName} ${member.middleName} ${member.lastName} ${member.extension}`.trim();
        }
      }
      if (editingLoan) {
        await fetch("/api/loans", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingLoan.id, ...payload }),
        });
      } else {
        await fetch("/api/loans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowLoanModal(false);
      await fetchData();
    } catch (err) {
      console.error("SAVE LOAN ERROR:", err);
      alert("FAILED TO SAVE LOAN");
    }
  };

  const deleteLoan = async (id: string) => {
    if (!confirm("ARE YOU SURE YOU WANT TO DELETE THIS LOAN?")) return;
    try {
      await fetch("/api/loans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchData();
    } catch (err) {
      console.error("DELETE LOAN ERROR:", err);
      alert("FAILED TO DELETE LOAN");
    }
  };

  const recordPayment = async () => {
    if (paymentAmount <= 0) {
      alert("PLEASE ENTER A VALID PAYMENT AMOUNT");
      return;
    }
    try {
      await fetch("/api/loans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: paymentLoanId, action: "pay", amount: paymentAmount }),
      });
      setShowPaymentModal(false);
      setPaymentAmount(0);
      await fetchData();
    } catch (err) {
      console.error("PAYMENT ERROR:", err);
      alert("FAILED TO RECORD PAYMENT");
    }
  };

  const markLoanPaid = async (id: string) => {
    if (!confirm("MARK THIS LOAN AS FULLY PAID?")) return;
    try {
      await fetch("/api/loans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "markPaid" }),
      });
      await fetchData();
    } catch (err) {
      console.error("MARK PAID ERROR:", err);
      alert("FAILED TO MARK LOAN AS PAID");
    }
  };

  // Computed stats
  const totalShares = members.reduce((sum, m) => sum + m.shares, 0);
  const totalShareValue = totalShares * SHARE_VALUE;
  const activeLoans = loans.filter((l) => l.status === "active");
  const totalBalanceDue = activeLoans.reduce((sum, l) => sum + l.balance, 0);
  const totalCollected = loans.reduce((sum, l) => sum + l.totalPaid, 0);
  const totalLent = loans.reduce((sum, l) => sum + l.amount, 0);
  const totalInterestEarned = loans.reduce((sum, l) => sum + l.interestAmount, 0);
  const outstandingBalance = loans.filter((l) => l.status === "active").reduce((sum, l) => sum + l.balance, 0);

  const getMemberName = (id: string): string => {
    const m = members.find((mem) => mem.id === id);
    if (!m) return "UNKNOWN";
    return `${m.firstName} ${m.middleName} ${m.lastName} ${m.extension}`.trim().toUpperCase();
  };

  // Navigation items
  const navItems: { page: Page; icon: string; label: string }[] = [
    { page: "dashboard", icon: "fa-tachometer-alt", label: "DASHBOARD" },
    { page: "shareholders", icon: "fa-users", label: "SHAREHOLDERS" },
    { page: "loans", icon: "fa-hand-holding-usd", label: "LOANS" },
    { page: "accounting", icon: "fa-calculator", label: "ACCOUNTING" },
  ];

  // Render sidebar
  const renderSidebar = () => (
    <div className={`sidebar ${sidebarOpen ? "" : "collapsed"}`} style={{ width: sidebarOpen ? 250 : 0, minHeight: "100vh", position: "fixed", left: 0, top: 0, zIndex: 1000, transition: "width 0.3s", overflow: "hidden" }}>
      <div className="sidebar-brand p-3 text-center">
        <h4 className="text-white mb-0">
          <i className="fas fa-landmark me-2"></i>
          LENDINGMAHAY
        </h4>
        <small className="text-white-50">LENDING MANAGEMENT SYSTEM</small>
      </div>
      <hr className="bg-light mx-3 my-2" />
      <nav className="nav flex-column px-2">
        {navItems.map((item) => (
          <button
            key={item.page}
            className={`nav-link text-start border-0 rounded px-3 py-2 mb-1 ${currentPage === item.page ? "active bg-white bg-opacity-25 text-white fw-bold" : "text-white-50"}`}
            style={{ background: currentPage === item.page ? "rgba(255,255,255,0.15)" : "transparent", cursor: "pointer" }}
            onClick={() => setCurrentPage(item.page)}
          >
            <i className={`fas ${item.icon} me-2`} style={{ width: 20, textAlign: "center" }}></i>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );

  // Render top bar
  const renderTopBar = () => (
    <div className="top-bar d-flex align-items-center justify-content-between px-4 py-3 bg-white shadow-sm" style={{ marginLeft: sidebarOpen ? 250 : 0, transition: "margin-left 0.3s" }}>
      <div className="d-flex align-items-center">
        <button className="btn btn-outline-secondary me-3 d-md-none" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <i className="fas fa-bars"></i>
        </button>
        <h5 className="mb-0 fw-bold text-uppercase">
          {currentPage === "shareholders" ? "SHAREHOLDERS" : currentPage.toUpperCase()}
        </h5>
      </div>
      <div className="d-flex align-items-center">
        <span className="text-muted me-3">
          <i className="fas fa-calendar me-1"></i>
          {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }).toUpperCase()}
        </span>
        <div className="d-flex align-items-center">
          <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white" style={{ width: 36, height: 36 }}>
            <i className="fas fa-user"></i>
          </div>
          <span className="ms-2 fw-semibold">ADMIN</span>
        </div>
      </div>
    </div>
  );

  // Render Dashboard
  const renderDashboard = () => (
    <div>
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="stat-card card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="icon-box icon-purple me-3">
                <i className="fas fa-users"></i>
              </div>
              <div>
                <div className="text-muted small">SHAREHOLDERS</div>
                <h3 className="mb-0 fw-bold">{members.length}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="stat-card card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="icon-box icon-orange me-3">
                <i className="fas fa-coins"></i>
              </div>
              <div>
                <div className="text-muted small">TOTAL SHARES</div>
                <h3 className="mb-0 fw-bold">{totalShares} ({formatPeso(totalShareValue)})</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="stat-card card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="icon-box icon-green me-3">
                <i className="fas fa-hand-holding-usd"></i>
              </div>
              <div>
                <div className="text-muted small">ACTIVE LOANS</div>
                <h3 className="mb-0 fw-bold">{activeLoans.length}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="stat-card card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="icon-box icon-red me-3">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div>
                <div className="text-muted small">TOTAL BALANCE DUE</div>
                <h3 className="mb-0 fw-bold">{formatPeso(totalBalanceDue)}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row g-4">
        <div className="col-md-6 col-lg-3">
          <div className="stat-card card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="icon-box icon-blue me-3">
                <i className="fas fa-check-circle"></i>
              </div>
              <div>
                <div className="text-muted small">TOTAL COLLECTED</div>
                <h3 className="mb-0 fw-bold">{formatPeso(totalCollected)}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-2">
        <div className="col-lg-6">
          <div className="table-card card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pt-3 px-3">
              <h6 className="fw-bold mb-0">RECENT SHAREHOLDERS</h6>
            </div>
            <div className="card-body p-0">
              {members.length === 0 ? (
                <div className="empty-state text-center py-5 text-muted">
                  <i className="fas fa-users fa-3x mb-3"></i>
                  <p>NO SHAREHOLDERS YET</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="border-0">NAME</th>
                        <th className="border-0">SHARES</th>
                        <th className="border-0">VALUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.slice(0, 5).map((m) => (
                        <tr key={m.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              {m.photo ? (
                                <img src={m.photo} className="profile-photo rounded-circle me-2" alt="" style={{ width: 32, height: 32, objectFit: "cover" }} />
                              ) : (
                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white me-2" style={{ width: 32, height: 32, fontSize: 14 }}>
                                  <i className="fas fa-user"></i>
                                </div>
                              )}
                              {`${m.firstName} ${m.lastName}`.toUpperCase()}
                            </div>
                          </td>
                          <td>{m.shares}</td>
                          <td>{formatPeso(m.shares * SHARE_VALUE)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="table-card card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pt-3 px-3">
              <h6 className="fw-bold mb-0">RECENT ACTIVE LOANS</h6>
            </div>
            <div className="card-body p-0">
              {activeLoans.length === 0 ? (
                <div className="empty-state text-center py-5 text-muted">
                  <i className="fas fa-hand-holding-usd fa-3x mb-3"></i>
                  <p>NO ACTIVE LOANS</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="border-0">BORROWER</th>
                        <th className="border-0">AMOUNT</th>
                        <th className="border-0">BALANCE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeLoans.slice(0, 5).map((l) => (
                        <tr key={l.id}>
                          <td>{l.borrowerName.toUpperCase()}</td>
                          <td>{formatPeso(l.amount)}</td>
                          <td className="text-danger fw-bold">{formatPeso(l.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Shareholders
  const renderShareholders = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h6 className="section-title fw-bold mb-0">ALL SHAREHOLDERS</h6>
        <button className="btn btn-primary" onClick={openAddMember}>
          <i className="fas fa-plus me-2"></i>ADD SHAREHOLDER
        </button>
      </div>
      <div className="table-card card border-0 shadow-sm">
        <div className="card-body p-0">
          {members.length === 0 ? (
            <div className="empty-state text-center py-5 text-muted">
              <i className="fas fa-users fa-3x mb-3"></i>
              <p>NO SHAREHOLDERS FOUND. ADD YOUR FIRST SHAREHOLDER.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0">PHOTO</th>
                    <th className="border-0">NAME</th>
                    <th className="border-0">ADDRESS</th>
                    <th className="border-0">BIRTHDATE</th>
                    <th className="border-0">SHARES</th>
                    <th className="border-0">SHARE VALUE</th>
                    <th className="border-0">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.photo ? (
                          <img src={m.photo} className="profile-photo rounded-circle" alt="" style={{ width: 40, height: 40, objectFit: "cover" }} />
                        ) : (
                          <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" style={{ width: 40, height: 40 }}>
                            <i className="fas fa-user"></i>
                          </div>
                        )}
                      </td>
                      <td className="fw-semibold">
                        {`${m.firstName} ${m.middleName} ${m.lastName} ${m.extension}`.trim().toUpperCase()}
                      </td>
                      <td>{m.address.toUpperCase()}</td>
                      <td>{m.birthdate ? new Date(m.birthdate).toLocaleDateString("en-PH").toUpperCase() : "N/A"}</td>
                      <td>{m.shares}</td>
                      <td className="fw-bold">{formatPeso(m.shares * SHARE_VALUE)}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEditMember(m)} title="EDIT">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteMember(m.id)} title="DELETE">
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Loans
  const renderLoans = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h6 className="section-title fw-bold mb-0">ALL LOANS</h6>
        <button className="btn btn-primary" onClick={openAddLoan}>
          <i className="fas fa-plus me-2"></i>ADD LOAN
        </button>
      </div>
      <div className="table-card card border-0 shadow-sm">
        <div className="card-body p-0">
          {loans.length === 0 ? (
            <div className="empty-state text-center py-5 text-muted">
              <i className="fas fa-hand-holding-usd fa-3x mb-3"></i>
              <p>NO LOANS FOUND. ADD YOUR FIRST LOAN.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0">BORROWER</th>
                    <th className="border-0">AMOUNT</th>
                    <th className="border-0">BORROW DATE</th>
                    <th className="border-0">INTEREST</th>
                    <th className="border-0">TOTAL DUE</th>
                    <th className="border-0">PAID</th>
                    <th className="border-0">BALANCE</th>
                    <th className="border-0">STATUS</th>
                    <th className="border-0">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((l) => {
                    const borrowerDisplay =
                      l.borrowerType === "non-member"
                        ? `(NON-MEMBER) ${l.borrowerName.toUpperCase()} - TAGGED TO: ${getMemberName(l.taggedMemberId)}`
                        : l.borrowerName.toUpperCase();
                    return (
                      <tr key={l.id}>
                        <td className="fw-semibold">{borrowerDisplay}</td>
                        <td>{formatPeso(l.amount)}</td>
                        <td>{new Date(l.borrowDate).toLocaleDateString("en-PH").toUpperCase()}</td>
                        <td>{formatPeso(l.interestAmount)}</td>
                        <td className="fw-bold">{formatPeso(l.totalDue)}</td>
                        <td className="text-success">{formatPeso(l.totalPaid)}</td>
                        <td className="text-danger fw-bold">{formatPeso(l.balance)}</td>
                        <td>
                          <span className={l.status === "active" ? "badge badge-active" : "badge badge-paid"}>
                            {l.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            {l.status === "active" && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => {
                                    setPaymentLoanId(l.id);
                                    setPaymentAmount(0);
                                    setShowPaymentModal(true);
                                  }}
                                  title="RECORD PAYMENT"
                                >
                                  <i className="fas fa-money-bill"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => markLoanPaid(l.id)} title="MARK AS PAID">
                                  <i className="fas fa-check"></i>
                                </button>
                              </>
                            )}
                            <button className="btn btn-sm btn-outline-primary" onClick={() => openEditLoan(l)} title="EDIT">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteLoan(l.id)} title="DELETE">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Accounting
  const renderAccounting = () => (
    <div>
      <h6 className="section-title fw-bold mb-4">FINANCIAL SUMMARY</h6>
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="accounting-card card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="icon-box icon-purple mx-auto mb-3">
                <i className="fas fa-coins"></i>
              </div>
              <div className="text-muted small mb-1">SHARE CAPITAL</div>
              <h4 className="fw-bold">{formatPeso(totalShareValue)}</h4>
              <small className="text-muted">{totalShares} SHARES x {formatPeso(SHARE_VALUE)}</small>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="accounting-card card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="icon-box icon-orange mx-auto mb-3">
                <i className="fas fa-hand-holding-usd"></i>
              </div>
              <div className="text-muted small mb-1">TOTAL LENT</div>
              <h4 className="fw-bold">{formatPeso(totalLent)}</h4>
              <small className="text-muted">{loans.length} TOTAL LOANS</small>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="accounting-card card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="icon-box icon-green mx-auto mb-3">
                <i className="fas fa-percentage"></i>
              </div>
              <div className="text-muted small mb-1">TOTAL INTEREST EARNED</div>
              <h4 className="fw-bold">{formatPeso(totalInterestEarned)}</h4>
              <small className="text-muted">10% MONTHLY COMPOUND</small>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="accounting-card card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="icon-box icon-blue mx-auto mb-3">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="text-muted small mb-1">TOTAL COLLECTED</div>
              <h4 className="fw-bold">{formatPeso(totalCollected)}</h4>
              <small className="text-muted">FROM ALL PAYMENTS</small>
            </div>
          </div>
        </div>
      </div>
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="accounting-card card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="icon-box icon-red mx-auto mb-3">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="text-muted small mb-1">OUTSTANDING BALANCE</div>
              <h4 className="fw-bold text-danger">{formatPeso(outstandingBalance)}</h4>
              <small className="text-muted">{activeLoans.length} ACTIVE LOANS</small>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="accounting-card card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="icon-box icon-green mx-auto mb-3">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="text-muted small mb-1">NET POSITION</div>
              <h4 className="fw-bold">{formatPeso(totalCollected - totalLent + outstandingBalance)}</h4>
              <small className="text-muted">COLLECTED - LENT + OUTSTANDING</small>
            </div>
          </div>
        </div>
      </div>

      <h6 className="section-title fw-bold mb-3 mt-4">SUMMARY BREAKDOWN</h6>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="summary-row d-flex justify-content-between py-2 border-bottom">
            <span>TOTAL SHARE CAPITAL ({members.length} SHAREHOLDERS)</span>
            <span className="fw-bold">{formatPeso(totalShareValue)}</span>
          </div>
          <div className="summary-row d-flex justify-content-between py-2 border-bottom">
            <span>TOTAL AMOUNT LENT ({loans.length} LOANS)</span>
            <span className="fw-bold">{formatPeso(totalLent)}</span>
          </div>
          <div className="summary-row d-flex justify-content-between py-2 border-bottom">
            <span>TOTAL INTEREST EARNED</span>
            <span className="fw-bold text-success">{formatPeso(totalInterestEarned)}</span>
          </div>
          <div className="summary-row d-flex justify-content-between py-2 border-bottom">
            <span>TOTAL AMOUNT DUE (PRINCIPAL + INTEREST)</span>
            <span className="fw-bold">{formatPeso(loans.reduce((s, l) => s + l.totalDue, 0))}</span>
          </div>
          <div className="summary-row d-flex justify-content-between py-2 border-bottom">
            <span>TOTAL COLLECTED</span>
            <span className="fw-bold text-success">{formatPeso(totalCollected)}</span>
          </div>
          <div className="summary-row d-flex justify-content-between py-2">
            <span className="fw-bold">OUTSTANDING BALANCE</span>
            <span className="fw-bold text-danger">{formatPeso(outstandingBalance)}</span>
          </div>
        </div>
      </div>

      <h6 className="section-title fw-bold mb-3 mt-4">RECENT TRANSACTIONS</h6>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {loans.length === 0 ? (
            <div className="empty-state text-center py-4 text-muted">
              <p>NO TRANSACTIONS YET</p>
            </div>
          ) : (
            loans
              .flatMap((l) =>
                l.payments.map((p) => ({
                  ...p,
                  borrowerName: l.borrowerName,
                  loanId: l.id,
                }))
              )
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10)
              .map((t, idx) => (
                <div key={idx} className="transaction-item d-flex align-items-center justify-content-between py-2 border-bottom">
                  <div className="d-flex align-items-center">
                    <div className="transaction-icon me-3">
                      <i className="fas fa-money-bill text-success"></i>
                    </div>
                    <div>
                      <div className="fw-semibold">{t.borrowerName.toUpperCase()}</div>
                      <small className="text-muted">{new Date(t.date).toLocaleDateString("en-PH").toUpperCase()}</small>
                    </div>
                  </div>
                  <span className="fw-bold text-success">{formatPeso(t.amount)}</span>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );

  // Member Modal
  const renderMemberModal = () => {
    if (!showMemberModal) return null;
    return (
      <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => { setShowMemberModal(false); stopCamera(); }}>
        <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">{editingMember ? "EDIT SHAREHOLDER" : "ADD SHAREHOLDER"}</h5>
              <button className="btn-close" onClick={() => { setShowMemberModal(false); stopCamera(); }}></button>
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label fw-semibold">FIRST NAME</label>
                  <input
                    type="text"
                    className="form-control text-uppercase"
                    value={memberForm.firstName}
                    onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">MIDDLE NAME</label>
                  <input
                    type="text"
                    className="form-control text-uppercase"
                    value={memberForm.middleName}
                    onChange={(e) => setMemberForm({ ...memberForm, middleName: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">LAST NAME</label>
                  <input
                    type="text"
                    className="form-control text-uppercase"
                    value={memberForm.lastName}
                    onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">EXTENSION (JR, SR, III)</label>
                  <input
                    type="text"
                    className="form-control text-uppercase"
                    value={memberForm.extension}
                    onChange={(e) => setMemberForm({ ...memberForm, extension: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">BIRTHDATE</label>
                  <input
                    type="date"
                    className="form-control"
                    value={memberForm.birthdate}
                    onChange={(e) => setMemberForm({ ...memberForm, birthdate: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">SHARES</label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    value={memberForm.shares}
                    onChange={(e) => setMemberForm({ ...memberForm, shares: parseInt(e.target.value) || 1 })}
                  />
                  <small className="text-muted">{formatPeso((memberForm.shares || 0) * SHARE_VALUE)}</small>
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">ADDRESS</label>
                  <textarea
                    className="form-control text-uppercase"
                    rows={2}
                    value={memberForm.address}
                    onChange={(e) => setMemberForm({ ...memberForm, address: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">PHOTO</label>
                  <div className="d-flex align-items-start gap-3">
                    {memberForm.photo && (
                      <img src={memberForm.photo} className="profile-photo-lg rounded" alt="" style={{ width: 120, height: 120, objectFit: "cover" }} />
                    )}
                    <div>
                      {cameraActive ? (
                        <div>
                          <video ref={videoRef} style={{ width: 240, height: 180, borderRadius: 8 }} autoPlay muted />
                          <div className="mt-2 d-flex gap-2">
                            <button className="btn btn-sm btn-primary" onClick={capturePhoto}>
                              <i className="fas fa-camera me-1"></i>CAPTURE
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={stopCamera}>
                              CANCEL
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn btn-outline-primary" onClick={startCamera}>
                          <i className="fas fa-camera me-2"></i>OPEN CAMERA
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={() => { setShowMemberModal(false); stopCamera(); }}>
                CANCEL
              </button>
              <button className="btn btn-primary" onClick={saveMember}>
                <i className="fas fa-save me-2"></i>{editingMember ? "UPDATE" : "SAVE"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loan Modal
  const renderLoanModal = () => {
    if (!showLoanModal) return null;
    return (
      <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setShowLoanModal(false)}>
        <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">{editingLoan ? "EDIT LOAN" : "ADD LOAN"}</h5>
              <button className="btn-close" onClick={() => setShowLoanModal(false)}></button>
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label fw-semibold">BORROWER TYPE</label>
                  <div className="btn-group w-100">
                    <button
                      className={`btn ${loanForm.borrowerType === "member" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setLoanForm({ ...loanForm, borrowerType: "member", borrowerName: "", taggedMemberId: "" })}
                    >
                      MEMBER
                    </button>
                    <button
                      className={`btn ${loanForm.borrowerType === "non-member" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setLoanForm({ ...loanForm, borrowerType: "non-member", memberId: "" })}
                    >
                      NON-MEMBER
                    </button>
                  </div>
                </div>

                {loanForm.borrowerType === "member" ? (
                  <div className="col-12">
                    <label className="form-label fw-semibold">SELECT MEMBER</label>
                    <select
                      className="form-select"
                      value={loanForm.memberId}
                      onChange={(e) => setLoanForm({ ...loanForm, memberId: e.target.value })}
                    >
                      <option value="">-- SELECT A MEMBER --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {`${m.firstName} ${m.middleName} ${m.lastName} ${m.extension}`.trim().toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">BORROWER NAME</label>
                      <input
                        type="text"
                        className="form-control text-uppercase"
                        value={loanForm.borrowerName}
                        onChange={(e) => setLoanForm({ ...loanForm, borrowerName: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">TAGGED TO MEMBER</label>
                      <select
                        className="form-select"
                        value={loanForm.taggedMemberId}
                        onChange={(e) => setLoanForm({ ...loanForm, taggedMemberId: e.target.value })}
                      >
                        <option value="">-- SELECT A MEMBER --</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {`${m.firstName} ${m.middleName} ${m.lastName} ${m.extension}`.trim().toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="col-md-4">
                  <label className="form-label fw-semibold">LOAN AMOUNT</label>
                  <div className="input-group">
                    <span className="input-group-text">₱</span>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      value={loanForm.amount}
                      onChange={(e) => setLoanForm({ ...loanForm, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">BORROW DATE</label>
                  <input
                    type="date"
                    className="form-control"
                    value={loanForm.borrowDate}
                    onChange={(e) => setLoanForm({ ...loanForm, borrowDate: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">INTEREST START DATE</label>
                  <input
                    type="date"
                    className="form-control"
                    value={loanForm.interestStartDate}
                    onChange={(e) => setLoanForm({ ...loanForm, interestStartDate: e.target.value })}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold">SIGNATURE</label>
                  <div className="border rounded p-2">
                    {loanForm.signature && !canvasRef.current ? (
                      <div className="text-center mb-2">
                        <img src={loanForm.signature} alt="SIGNATURE" style={{ maxHeight: 100 }} />
                      </div>
                    ) : null}
                    <canvas
                      ref={canvasRef}
                      className="signature-pad w-100"
                      width={600}
                      height={150}
                      style={{ border: "1px solid #dee2e6", borderRadius: 4, cursor: "crosshair", touchAction: "none" }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div className="mt-2 d-flex gap-2">
                      <button className="btn btn-sm btn-outline-secondary" onClick={clearSignature}>
                        <i className="fas fa-eraser me-1"></i>CLEAR
                      </button>
                      <button className="btn btn-sm btn-outline-primary" onClick={saveSignature}>
                        <i className="fas fa-save me-1"></i>SAVE SIGNATURE
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={() => setShowLoanModal(false)}>
                CANCEL
              </button>
              <button className="btn btn-primary" onClick={saveLoan}>
                <i className="fas fa-save me-2"></i>{editingLoan ? "UPDATE" : "SAVE"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Payment Modal
  const renderPaymentModal = () => {
    if (!showPaymentModal) return null;
    const loan = loans.find((l) => l.id === paymentLoanId);
    return (
      <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setShowPaymentModal(false)}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">RECORD PAYMENT</h5>
              <button className="btn-close" onClick={() => setShowPaymentModal(false)}></button>
            </div>
            <div className="modal-body">
              {loan && (
                <div className="mb-3 p-3 bg-light rounded">
                  <div className="fw-semibold">{loan.borrowerName.toUpperCase()}</div>
                  <div className="text-muted small">
                    BALANCE: <span className="text-danger fw-bold">{formatPeso(loan.balance)}</span>
                  </div>
                  <div className="text-muted small">
                    TOTAL DUE: {formatPeso(loan.totalDue)} | PAID: {formatPeso(loan.totalPaid)}
                  </div>
                </div>
              )}
              <label className="form-label fw-semibold">PAYMENT AMOUNT</label>
              <div className="input-group">
                <span className="input-group-text">₱</span>
                <input
                  type="number"
                  className="form-control"
                  min={0}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={() => setShowPaymentModal(false)}>
                CANCEL
              </button>
              <button className="btn btn-primary" onClick={recordPayment}>
                <i className="fas fa-check me-2"></i>RECORD PAYMENT
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Initialize signature pad when loan modal opens
  useEffect(() => {
    if (showLoanModal) {
      setTimeout(() => initSignaturePad(), 100);
    }
  }, [showLoanModal]);

  // Set video srcObject when camera becomes active
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraActive, cameraStream]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return renderDashboard();
      case "shareholders":
        return renderShareholders();
      case "loans":
        return renderLoans();
      case "accounting":
        return renderAccounting();
      default:
        return renderDashboard();
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">LOADING...</span>
          </div>
          <p className="text-muted">LOADING LENDINGMAHAY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {renderSidebar()}
      <div className="flex-grow-1" style={{ marginLeft: sidebarOpen ? 250 : 0, transition: "margin-left 0.3s" }}>
        {renderTopBar()}
        <div className="main-content p-4">
          {renderCurrentPage()}
        </div>
      </div>
      {renderMemberModal()}
      {renderLoanModal()}
      {renderPaymentModal()}
    </div>
  );
}
