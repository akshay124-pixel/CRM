import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styled from "styled-components";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "react-bootstrap";

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const { login, loading } = useAuth(); // Assuming useAuth exposes loading state for the action if customized, or we manage local loading
  const [localLoading, setLocalLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = credentials;

    if (email && password) {
      setLocalLoading(true);
      const result = await login(email, password);
      setLocalLoading(false);

      if (result.success) {
        toast.success("Login successful!", {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
        navigate("/dashboard");
      } else {
        toast.error(result.message, {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
      }
    } else {
      toast.warning("Please enter both email and password.", {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
      });
    }
  };

  return (
    <div
      className="login-container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <div className="form-box" style={{ width: "500px" }}>
        <form className="form" onSubmit={handleSubmit}>
          <h2 className="title">Login</h2>
          <p className="subtitle">Access your account.</p>

          <div className="form-inputs">
            <input
              autoComplete="off"
              style={{ backgroundColor: "white" }}
              className="input"
              type="email"
              name="email"
              placeholder="Email"
              value={credentials.email}
              onChange={handleChange}
              required
              aria-label="Email Address"
            />
            <div style={{ position: "relative" }}>
              <input
                className="input"
                style={{ backgroundColor: "white" }}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={credentials.password}
                onChange={handleChange}
                required
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#333",
                  fontSize: "14px",
                  cursor: "pointer",
                  padding: "0",
                  zIndex: 1,
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="button1"
            disabled={localLoading}
            aria-label="Login"
          >
            {localLoading ? <Spinner animation="border" size="sm" /> : "Login"}
          </button>
        </form>

        <div className="form-section">
          <p>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
