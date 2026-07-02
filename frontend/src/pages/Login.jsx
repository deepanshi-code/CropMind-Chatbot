import React, { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    alert(`Logged in successfully as: ${email}`);
  };

  return (
    <div className="page login-page">
      <div className="login-container">
        <div className="card login-card animate-fade-in-up">
          <h1>Welcome Back</h1>
          <p className="login-subtitle">Access your farming portal and telemetry data</p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                placeholder="farmer@cropmind.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary btn-block">
              Authenticate Portal
            </button>
          </form>

          <div className="login-footer">
            <p>Demo Credentials: Any email and password will succeed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
