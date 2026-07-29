"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("auth", "true");
        router.push("/dashboard");
      } else {
        setError("Invalid username or password");
      }
    } catch {
      setError("Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card card">
        <div className="card-header">
          <i className="fas fa-hand-holding-usd fa-3x mb-2"></i>
          <h3 className="mb-0">LendingMahay</h3>
          <small className="opacity-75">Loan Management System</small>
        </div>
        <div className="card-body p-4">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label">Username</label>
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-user"></i></span>
                <input type="text" className="form-control" value={username}
                  onChange={(e) => setUsername(e.target.value)} required />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-lock"></i></span>
                <input type="password" className="form-control" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin me-2"></i>Logging in...</> : <>
                <i className="fas fa-sign-in-alt me-2"></i>Login</>}
            </button>
          </form>
        </div>
        <div className="card-footer text-center text-muted small">
          Default: admin / mahay2024
        </div>
      </div>
    </div>
  );
}
