import React, { useState } from "react";
import { MdOutlineLogin } from "react-icons/md";
import logo from "./media/logo.png";
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }
    setError("");
    console.log("Login attempt:", { username, password });
    // TODO: Add login logic here
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="logo" className="login-logo" />
          <div className="login-title">F. Bangoy National High School<br/> Abuse Report Forum</div>
        </div>
        <div className="login-wrapper">
          <h1 className="login-heading">Login Form</h1>
        {error && <p className="error-message">{error}</p>}
        <form className="login-form" onSubmit={handleSubmit}>
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
          <button type="submit" className="login-btn">
            <span className="login-label">Login</span>
            <MdOutlineLogin className="login-icon" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  </div>
  );
}

export default Login;

