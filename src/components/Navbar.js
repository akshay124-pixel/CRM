import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    setIsAuthenticated(!!token);
    setUserName(user?.username || "User");
    setUserRole(user?.role || "");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUserName("User");
    setUserRole("");
    navigate("/login");
  };

  const handleOutsideClick = useCallback(
    (e) => {
      if (isDropdownOpen && !e.target.closest(".user-profile")) {
        setDropdownOpen(false);
      }
    },
    [isDropdownOpen]
  );

  useEffect(() => {
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [handleOutsideClick]);

  const renderNavLinks = () => {
    if (!isAuthenticated) return null;

    switch (userRole) {
      case "Admin":
        return (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              transition: "all 0.3s ease",
            }}
          >
            {/* Placeholder for nav links */}
          </div>
        );
      case "Others":
        return (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              transition: "all 0.3s ease",
            }}
          >
            {/* Placeholder for nav links */}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideInLeft {
            from { transform: translateX(-20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideInRight {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          .navbar {
            animation: fadeIn 0.5s ease-out;
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
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            .menu-toggle {
              display: block;
              position: absolute;
              right: 0.5rem;
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
              flex-wrap: nowrap;
              height: 32px;
            }
            .user-profile {
              animation: slideInLeft 0.3s ease-out;
              order: 1;
            
            }
            .user-avatar {
           
              width: 28px !important;
              height: 28px !important;
              border-width: 1px !important;
            }
            .logout-btn {
              animation: slideInRight 0.3s ease-out;
              order: 2;
              width: auto !important;
              padding: 0.25rem 0.5rem !important;
              font-size: 0.75rem !important;
              margin: 0 !important;
              gap: 0.25rem;
              min-width: 45px;
              
              height: 45px !important;
              line-height: 1;
            }
            .logout-btn svg {
              width: 12px !important;
              height: 12px !important;
            }
            .navbar-user.auth-buttons {
              justify-content: center;
              flex-wrap: wrap;
              gap: 0.5rem;
            }
            .navbar-user .btn {
              order: 3;
              width: auto !important;
              margin: 0 auto !important;
              padding: 0.25rem 0.5rem !important;
              font-size: 0.75rem !important;
              min-width: 80px !important;
              height: 28px !important;
              line-height: 1;
              display: inline-flex;
              justify-content: center;
              align-items: center;
            }
          }
        `}
      </style>
      <nav
        className="navbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          width: "100%",
          boxSizing: "border-box",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
        }}
        aria-label="Main navigation"
      >
        <div
          className="navbar-logo"
          style={{ display: "flex", alignItems: "center" }}
        >
          <img
            src="logo.png"
            alt="Company Logo"
            className="logo-image"
            style={{
              width: "130px",
              height: "auto",
              marginLeft: "20px",
              transition: "transform 0.3s ease",
            }}
            onError={(e) =>
              (e.target.src = "https://via.placeholder.com/130x40?text=Logo")
            }
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
          <button
            className="menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ display: "none" }}
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

        <div
          className="navbar-links"
          style={{
            display: "flex",
            gap: "1rem",
            transition: "all 0.3s ease",
          }}
        >
          {renderNavLinks()}
        </div>

        <div
          className={`navbar-user ${isAuthenticated ? "" : "auth-buttons"}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            paddingRight: "1rem",
          }}
        >
          {isAuthenticated ? (
            <>
              <div
                className="user-profile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                }}
                role="button"
                aria-label={`User profile for ${userName}`}
              >
                <img
                  src="avtar.jpg"
                  alt={`Avatar for ${userName}`}
                  className="user-avatar"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "2px solid #90cdf4",
                    transition: "transform 0.3s ease, border-color 0.3s ease",
                    cursor: "pointer",
                  }}
                  onError={(e) =>
                    (e.target.src = "https://via.placeholder.com/40?text=User")
                  }
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.borderColor = "#90cdf4";
                  }}
                />
              </div>
              <button className="Btn mx-3 logout-btn" onClick={handleLogout}>
                <div className="sign">
                  <svg viewBox="0 0 512 512">
                    <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                  </svg>
                </div>
                <div className="text">Logout</div>
              </button>
            </>
          ) : (
            <>
              <Button
                as={Link}
                to="/login"
                variant="outline-light"
                className="btn"
                style={{
                  borderRadius: "20px",
                  padding: "5px 15px",
                  fontWeight: "600",
                  minWidth: "100px",
                  height: "38px",
                  border: "1px solid white",
                  color: "white",
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 100%)",
                  margin: "0 0.5rem",
                  cursor: "pointer",
                  transition:
                    "transform 0.2s ease, background 0.3s ease, box-shadow 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  textAlign: "center",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.color = "#2b6cb0";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background =
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 100%)";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "2px solid #e2e8f0";
                  e.currentTarget.style.outlineOffset = "2px";
                }}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
                aria-label="Log in"
              >
                Login
              </Button>
              <Button
                as={Link}
                to="/signup"
                variant="outline-warning"
                className="btn"
                style={{
                  borderRadius: "20px",
                  padding: "5px 15px",
                  fontWeight: "600",
                  minWidth: "100px",
                  height: "38px",
                  border: "1px solid #ecc94b",
                  color: "#ecc94b",
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(236,201,75,0.2) 100%)",
                  margin: "0 0.5rem",
                  cursor: "pointer",
                  transition:
                    "transform 0.2s ease, background 0.3s ease, box-shadow 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  textAlign: "center",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.background = "#ecc94b";
                  e.currentTarget.style.color = "#2b6cb0";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background =
                    "linear-gradient(90deg, transparent 0%, rgba(236,201,75,0.2) 100%)";
                  e.currentTarget.style.color = "#ecc94b";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "2px solid #ecc94b";
                  e.currentTarget.style.outlineOffset = "2px";
                }}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
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
