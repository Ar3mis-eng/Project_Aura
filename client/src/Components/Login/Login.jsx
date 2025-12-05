import React, { useState } from "react";
import { MdOutlineLogin } from "react-icons/md";
import logo from "./media/logo.png";
import MainForm from "../Main Form/MainForm";
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showMain, setShowMain] = useState(false);

  // For now the login button simply reveals the MainForm (both panels)
  const handleShowMain = (e) => {
    e.preventDefault();
    setError("");
    setShowMain(true);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {!showMain && (
          <div className="login-header">
            <img src={logo} alt="logo" className="login-logo" />
            <div className="login-title">F. Bangoy National High School<br/> Abuse Report Form</div>
          </div>
        )}

        {/* If showMain is true, render the MainForm (both panels) instead of the login form */}
        {!showMain ? (
          <div className="login-wrapper">
            <h1 className="login-heading">Login Form</h1>
            {error && <p className="error-message">{error}</p>}
            <form className="login-form">
              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button id="login-submit" type="button" className="login-btn" onClick={handleShowMain}>
                <span className="login-label">Login</span>
                <MdOutlineLogin className="login-icon" aria-hidden="true" />
              </button>
            </form>
          </div>
        ) : (
          <div className="login-wrapper">
            <MainForm role="student" header={{ logo, title: 'F. Bangoy National High School\nAbuse Report Form' }} onLogout={() => setShowMain(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;

