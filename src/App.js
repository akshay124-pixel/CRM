import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useRef } from "react";
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
const LoadingOverlay = ({ showTimeout, onRetry }) => (
  <div
    style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontSize: "1rem",
      color: "#666",
      fontWeight: "bold",
      textAlign: "center",
      padding: "20px",
      minWidth: "1190px",
      flexDirection: "column",
      gap: "15px",
    }}
  >
    <div className="loading-wave">
      <div className="loading-bar"></div>
      <div className="loading-bar"></div>
      <div className="loading-bar"></div>
      <div className="loading-bar"></div>
    </div>

    {showTimeout && (
      <div style={{ marginTop: "15px" }}>
        <p style={{ color: "#666", marginBottom: "10px" }}>
          Taking longer than usual...
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: "8px 16px",
              background: "#2575fc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            Retry
          </button>
        )}
      </div>
    )}
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
  const { isAuthenticated, loading, loadingTimeout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectAttempted = useRef(false);

  useEffect(() => {
    // Only redirect once loading is complete and user is not authenticated
    if (!loading && !isAuthenticated && !redirectAttempted.current) {
      redirectAttempted.current = true;
      navigate("/login", { replace: true, state: { from: location } });
    }

    // Reset redirect flag if user becomes authenticated
    if (isAuthenticated) {
      redirectAttempted.current = false;
    }
  }, [loading, isAuthenticated, navigate, location]);

  if (loading) {
    return (
      <LoadingOverlay
        showTimeout={loadingTimeout}
        onRetry={() => window.location.reload()}
      />
    );
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
<style>
  {`
 .loading-wave {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }

  .loading-bar {
    width: 8px;
    height: 40px;
    background-color: #2575fc;
    animation: wave 1.2s infinite ease-in-out;
  }

  .loading-bar:nth-child(2) {
    animation-delay: -0.1s;
  }

  .loading-bar:nth-child(3) {
    animation-delay: -0.2s;
  }

  .loading-bar:nth-child(4) {
    animation-delay: -0.3s;
  }

  @keyframes wave {
    0%, 100% {
      transform: scaleY(0.4);
      background-color: #2575fc;
    }
    50% {
      transform: scaleY(1);
      background-color: #6a11cb;
    }
  }
 `}
</style>
export default App;
