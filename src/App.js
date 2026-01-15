import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import DashBoard from "./components/DashBoard";
import ChangePassword from "./Auth/ChangePassword";
import Login from "./Auth/Login";
import SignUp from "./Auth/SignUp";
import Navbar from "./components/Navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Loading Overlay - Prevents blank screens during auth transitions
const LoadingOverlay = () => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      transition: "opacity 0.2s ease-in-out",
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: "50px",
          height: "50px",
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #2575fc",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  </div>
);

// Persistent Navbar - Always mounted, visibility controlled by CSS
const PersistentNavbar = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/change-password";

  const shouldShow = !isAuthPage && isAuthenticated;

  return (
    <div
      style={{
        display: shouldShow ? "block" : "none",
        transition: "opacity 0.2s ease-in-out",
        opacity: shouldShow ? 1 : 0,
      }}
    >
      <Navbar />
    </div>
  );
};

// Private Route - Smooth redirect without component destruction
const PrivateRoute = ({ element }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [loading, isAuthenticated, navigate, location]);

  if (loading) {
    return <LoadingOverlay />;
  }

  return isAuthenticated ? element : null;
};

// Public Route - Smooth redirect without component destruction
const PublicRoute = ({ element }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return <LoadingOverlay />;
  }

  return !isAuthenticated ? element : null;
};

const AppContent = () => {
  return (
    <div className="App">
      {/* Persistent App Shell - Never unmounts */}
      <PersistentNavbar />
      <ToastContainer />
      
      {/* Routes - Components transition smoothly */}
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={<PublicRoute element={<Login />} />}
        />
        <Route
          path="/signup"
          element={<PublicRoute element={<SignUp />} />}
        />

        <Route
          path="/dashboard"
          element={<PrivateRoute element={<DashBoard />} />}
        />
        <Route
          path="/change-password"
          element={<PrivateRoute element={<ChangePassword />} />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
