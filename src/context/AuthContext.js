import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from "react";
import api, { setAccessToken } from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const initialized = React.useRef(false);

    // Initial Session Check (Silent Login) - Runs ONCE
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const initSession = async () => {
            try {
                const response = await api.post("/auth/refresh");

                if (response.data.success) {
                    const { accessToken, user } = response.data;
                    setAccessToken(accessToken);
                    setUser(user);
                    setIsAuthenticated(true);
                }
            } catch (error) {
                console.log("No active session found");
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setLoading(false);
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
        return () => window.removeEventListener("auth:logout", handleLogoutEvent);
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
            user, 
            role, 
            userId, 
            login, 
            logout, 
            signup 
        }),
        [isAuthenticated, loading, user, role, userId, login, logout, signup]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
