import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Function to update auth state from localStorage
  const updateAuthState = () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      setIsAuthenticated(!!token);
      setUserName(user?.username || "User");
      setUserRole(user?.role || "");
    } catch (error) {
      console.error("Error parsing localStorage:", error);
      setIsAuthenticated(false);
      setUserName("User");
      setUserRole("");
    }
  };

  // Initial load and listen for auth changes
  useEffect(() => {
    updateAuthState();

    // Optional: Listen for storage changes (e.g., login/logout in another tab)
    const handleStorageChange = () => updateAuthState();
    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUserName("User");
    setUserRole("");
    setIsMenuOpen(false);
    navigate("/login");
  };

  const renderNavLinks = () => {
    if (!isAuthenticated) return null;

    const commonLinks = (
      <>
        <Link to="/dashboard" style={navLinkStyle}>
          Dashboard
        </Link>
        <Link to="/profile" style={navLinkStyle}>
          Profile
        </Link>
      </>
    );

    switch (userRole) {
      case "Admin":
        return (
          <div style={navLinksStyle}>
            {commonLinks}
            <Link to="/admin/users" style={navLinkStyle}>
              Manage Users
            </Link>
            <Link to="/admin/settings" style={navLinkStyle}>
              Settings
            </Link>
          </div>
        );
      case "Others":
        return (
          <div style={navLinksStyle}>
            {commonLinks}
            <Link to="/tasks" style={navLinkStyle}>
              Tasks
            </Link>
          </div>
        );
      default:
        return <div style={navLinksStyle}>{commonLinks}</div>;
    }
  };

  // Inline styles (move to CSS file for production)
  const navLinksStyle = {
    display: "flex",
    gap: "1rem",
    transition: "all 0.3s ease",
  };

  const navLinkStyle = {
    color: "white",
    textDecoration: "none",
    fontSize: "1rem",
    fontWeight: "500",
    padding: "0.5rem",
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .navbar {
            animation: fadeIn 0.5s ease-out;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            width: 100%;
            box-sizing: border-box;
            background: #2b6cb0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .menu-toggle {
            display: none;
            cursor: pointer;
            padding: 0.25rem;
          }
          .menu-toggle svg {
            width: 20px;
            height: 20px;
            fill: white;
          }
          .navbar-logo img {
            width: 130px;
            height: auto;
            transition: transform 0.3s ease;
          }
          .navbar-logo img:hover {
            transform: scale(1.05);
          }
          .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid #90cdf4;
            transition: transform 0.3s ease, border-color 0.3s ease;
            cursor: pointer;
          }
          .user-avatar:hover {
            transform: scale(1.1);
            border-color: #e2e8f0;
          }
          .logout-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            font-size: 1rem;
            color: white;
            background: #c53030;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            transition: background 0.3s ease;
          }
          .logout-btn:hover {
            background: #e53e3e;
          }
          .logout-btn svg {
            width: 16px;
            height: 16px;
          }
          @media (max-width: 767px) {
            .navbar {
              flex-direction: column;
              align-items: stretch;
              padding: 0.5rem;
            }
            .navbar-logo {
              display: flex;
              justify-content: center;
              align-items: center;
              margin-bottom: 0.25rem;
            }
            .navbar-logo img {
              width: 160px !important;
              height: 65px !important;
            }
            .menu-toggle {
              display: block;
              position: absolute;
              right: 0.5rem;
              top: 1rem;
            }
            .navbar-links {
              flex-direction: column;
              width: 100%;
              padding: 0.5rem;
              margin-top: 0.25rem;
              gap: 0.5rem;
              display: ${isMenuOpen ? "flex" : "none"};
            }
            .navbar-user {
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              width: 100%;
              padding: 0.25rem 0.5rem;
              gap: 0.5rem;
            }
            .user-avatar {
              width: 28px !important;
              height: 28px !important;
              border-width: 1px !important;
            }
            .logout-btn {
              padding: 0.25rem 0.5rem !important;
              font-size: 0.75rem !important;
              height: 28px !important;
            }
            .navbar-user.auth-buttons .btn {
              padding: 0.25rem 0.5rem !important;
              font-size: 0.75rem !important;
              min-width: 80px !important;
              height: 28px !important;
            }
          }
        `}
      </style>
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar-logo">
          <img
            src="logo.png"
            alt="Company Logo"
            onError={(e) =>
              (e.target.src = "https://via.placeholder.com/130x40?text=Logo")
            }
          />
          <button
            className="menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <svg viewBox="0 0 24 24">
              <path
                d={
                  isMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>

        <div className="navbar-links">{renderNavLinks()}</div>

        <div className={`navbar-user ${isAuthenticated ? "" : "auth-buttons"}`}>
          {isAuthenticated ? (
            <>
              <div
                className="user-profile"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                aria-label={`User profile for ${userName}`}
              >
                <img
                  src="avtar.jpg"
                  alt={`Avatar for ${userName}`}
                  className="user-avatar"
                  onError={(e) =>
                    (e.target.src = "https://via.placeholder.com/40?text=User")
                  }
                />
                <span style={{ color: "white", fontSize: "1rem" }}>
                  Hello, {userName}
                </span>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                <svg viewBox="0 0 512 512">
                  <path
                    d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"
                    fill="white"
                  />
                </svg>
                Logout
              </button>
            </>
          ) : (
            <>
              <Button
                as={Link}
                to="/login"
                variant="outline-light"
                style={{
                  borderRadius: "20px",
                  padding: "5px 15px",
                  minWidth: "100px",
                  height: "38px",
                  border: "1px solid white",
                  color: "white",
                  margin: "0 0.5rem",
                }}
                aria-label="Log in"
              >
                Login
              </Button>
              <Button
                as={Link}
                to="/signup"
                variant="outline-warning"
                style={{
                  borderRadius: "20px",
                  padding: "5px 15px",
                  minWidth: "100px",
                  height: "38px",
                  border: "1px solid #ecc94b",
                  color: "#ecc94b",
                  margin: "0 0.5rem",
                }}
                aria-label="Sign up"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
