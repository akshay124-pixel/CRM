import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from "react";
import api, { setAccessToken, refreshAccessToken } from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingTimeout, setLoadingTimeout] = useState(false);

    const initialized = React.useRef(false);

    // Initial Session Check (Silent Login) - Runs ONCE
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        // Set timeout for loading state
        const timeoutId = setTimeout(() => {
            if (loading) {
                setLoadingTimeout(true);
                console.warn("Session check taking longer than expected");
            }
        }, 5000); // 5 second timeout

        const initSession = async () => {
            let authStatus = false;
            let userData = null;
            try {
                // Use coordinated refresh to prevent duplicate attempts
                const result = await refreshAccessToken();

                if (result.success) {
                    userData = result.user;
                    authStatus = true;
                }
            } catch (error) {
                // Differentiate between error types
                if (error.response?.status === 401 || error.response?.status === 403) {
                    // Expired or invalid token - this is expected
                    console.log("No active session found");
                } else if (error.message === "Network Error") {
                    // Network error - don't log out, just log
                    console.warn("Network error during session check");
                } else {
                    // Other errors
                    console.error("Session check error:", error);
                }
            } finally {
                setUser(userData);
                setIsAuthenticated(authStatus);
                setLoading(false);
                setLoadingTimeout(false);
                clearTimeout(timeoutId);
            }
        };

        initSession();

        // Listen for axios logout event
        const handleLogoutEvent = () => {
            setIsAuthenticated(false);
            setUser(null);
            setAccessToken(null);
        };

        window.addEventListener("auth:logout", handleLogoutEvent);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener("auth:logout", handleLogoutEvent);
        };
    }, []);

    // Memoized login to prevent re-creation
    const login = useCallback(async (email, password) => {
        try {
            const response = await api.post("/auth/login", { email, password });
            if (response.data.success) {
                const { accessToken, user } = response.data;
                setAccessToken(accessToken);
                setUser(user);
                setIsAuthenticated(true);
                return { success: true };
            }
        } catch (error) {
            console.error("Login failed:", error);
            return {
                success: false,
                message: error.response?.data?.message || "Login failed"
            };
        }
    }, []);

    // Memoized signup to prevent re-creation
    const signup = useCallback(async (userData) => {
        try {
            const response = await api.post("/user/signup", userData);
            if (response.data.success) {
                const { accessToken, user } = response.data;
                setAccessToken(accessToken);
                setUser(user);
                setIsAuthenticated(true);
                return { success: true };
            }
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Signup failed"
            };
        }
    }, []);

    // Memoized logout - NO window.location.href, returns callback for navigation
    const logout = useCallback(async () => {
        try {
            await api.post("/auth/logout");
        } catch (error) {
            console.error("Logout error", error);
        } finally {
            setAccessToken(null);
            setUser(null);
            setIsAuthenticated(false);
            // Return control to caller for navigation
        }
    }, []);

    const role = user?.role || null;
    const userId = user?._id || user?.id || null;

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(
        () => ({
            isAuthenticated,
            loading,
            loadingTimeout,
            user,
            role,
            userId,
            login,
            logout,
            signup
        }),
        [isAuthenticated, loading, loadingTimeout, user, role, userId, login, logout, signup]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
