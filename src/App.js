import React, { useState, useEffect } from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import DashBoard from "./components/DashBoard";
import Login from "./Auth/Login";
import SignUp from "./Auth/SignUp";
import Navbar from "./components/Navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";

const ConditionalNavbar = ({ isAuthenticated }) => {
  const location = useLocation();
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  return !isAuthPage && isAuthenticated ? <Navbar /> : null;
};

const PrivateRoute = ({ element, isAuthenticated }) => {
  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );
  const navigate = useNavigate();

  const handleAuthSuccess = ({ token, userId, role, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userId", userId);
    localStorage.setItem("role", role);
    localStorage.setItem("user", JSON.stringify(user));
    setIsAuthenticated(true);
    window.dispatchEvent(new Event("authChange"));
    navigate("/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    navigate("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && ["superadmin", "admin", "others"].includes(role)) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      if (window.location.pathname !== "/signup") {
        navigate("/login");
      }
    }
  }, [navigate]);

  return (
    <>
      <ToastContainer />
      <ConditionalNavbar isAuthenticated={isAuthenticated} />
      <Routes>
        <Route
          path="/login"
          element={<Login onAuthSuccess={handleAuthSuccess} />}
        />
        <Route
          path="/signup"
          element={<SignUp onAuthSuccess={handleAuthSuccess} />}
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute
              element={<DashBoard />}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
