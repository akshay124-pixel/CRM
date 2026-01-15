import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styled from "styled-components";
import { useAuth } from "../context/AuthContext";

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "others",
  });
  const [showPassword, setShowPassword] = useState(false);
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, email, password, role } = formData;

    if (username && email && password && role) {
      setLoading(true);
      const result = await signup(formData);
      setLoading(false);

      if (result.success) {
        toast.success("Account created successfully!", {
          theme: "colored",
          autoClose: 2000,
        });
        navigate("/dashboard");
      } else {
        toast.error(result.message, {
          theme: "colored",
          autoClose: 3000,
        });
      }
    } else {
      toast.warn("Please fill in all fields.");
    }
  };

  return (
    <div
      className="container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <div className="form-box">
        <form className="form" onSubmit={handleSubmit}>
          <span className="title">Sign Up</span>
          <span className="subtitle">
            Create a free account with your email.
          </span>

          <div className="form-box">
            <input
              type="text"
              style={{ backgroundColor: "white" }}
              className="input"
              placeholder="Full Name"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              style={{ backgroundColor: "white" }}
              className="input"
              placeholder="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                style={{ backgroundColor: "white", width: "110%" }}
                className="input"
                placeholder="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
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
            <select
              name="role"
              style={{ backgroundColor: "white" }}
              value={formData.role}
              onChange={handleChange}
              className="input"
              required
            >
              {/* <option value="superadmin">Superadmin</option>
                <option value="admin">Admin</option> */}
              <option value="others">Others</option>
            </select>
          </div>
          <button
            type="submit"
            style={{ background: "linear-gradient(90deg, #6a11cb, #2575fc)" }}
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        <div className="form-section">
          <p>
            Have an account? <Link to="/login">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
