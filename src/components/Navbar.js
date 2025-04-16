import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";
import { Button } from "react-bootstrap";
const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    setIsAuthenticated(!!token);
    setUserName(user?.username || "User");
    setUserRole(user?.role || "");
  }, []);

  const handleLogout = () => {
    // Remove user-related data from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Reset authentication state and user details
    setIsAuthenticated(false);
    setUserName("User");
    setUserRole("");

    // Navigate to the login page
    navigate("/login");
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isDropdownOpen && !e.target.closest(".user-profile")) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isDropdownOpen]);

  const renderNavLinks = () => {
    if (!isAuthenticated) return null;

    switch (userRole) {
      case "Admin":
        return (
          <>
            {/* <Link to="/entry" className="nav-link">
              Entry
            </Link>
            <Link to="/stockdashboard" className="nav-link">
              Stock Dashboard
            </Link> */}
          </>
        );
      case "Others":
        return (
          <>
            {/* <Link to="/outstock" className="nav-link">
              OutStock
            </Link>
            <Link to="/outdashboard" className="nav-link">
              OutStock Dashboard
            </Link> */}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <img
          src="logo.png"
          alt="Logo"
          className="logo-image"
          style={{
            width: "120px",
            height: "auto",
            marginLeft: "20px",
          }}
        />
      </div>

      <div className="navbar-links">{renderNavLinks()}</div>

      <div className="navbar-user">
        {isAuthenticated ? (
          <>
            <div className="user-profile">
              <img src="avtar.jpg" alt="User" className="user-avatar" />
              {/* <span className="user-name">Hello, {userName}!</span>{" "} */}
            </div>

            <button class="Btn mx-3" onClick={handleLogout}>
              <div class="sign">
                <svg viewBox="0 0 512 512">
                  <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                </svg>
              </div>

              <div class="text">Logout</div>
            </button>
          </>
        ) : (
          <>
            <Button
              as={Link}
              to="/login"
              variant="outline-light"
              className="mx-2"
              style={{
                borderRadius: "20px",
                padding: "5px 15px",
                fontWeight: "bold",
                minWidth: "100px",
                height: "38px",
              }}
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
                fontWeight: "bold",
                minWidth: "100px",
                height: "38px",
              }}
            >
              Sign Up
            </Button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
