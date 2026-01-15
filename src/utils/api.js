import axios from "axios";
import { toast } from "react-toastify";

// Create Axios instance
const api = axios.create({
    baseURL: process.env.REACT_APP_URL || "http://localhost:5001",
    withCredentials: true, // Important for Cookies
});

// Memory Storage for Access Token and Refresh Logic
let accessToken = null;
let isRefreshing = false;
let refreshSubscribers = [];

export const setAccessToken = (token) => {
    accessToken = token;
};

const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
    refreshSubscribers.map((cb) => cb(token));
    refreshSubscribers = [];
};

export const getAccessToken = () => accessToken;

// Request Interceptor
api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loops and only handle 401s
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If a refresh is already in progress, queue this request
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt Silent Refresh
                // Use absolute path or default baseURL
                const response = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                if (response.data.success && response.data.accessToken) {
                    const newAccessToken = response.data.accessToken;
                    setAccessToken(newAccessToken);
                    isRefreshing = false;
                    onRefreshed(newAccessToken);

                    // Update header for the original request
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                isRefreshing = false;
                onRefreshed(null);

                console.error("Session expired:", refreshError);
                setAccessToken(null);

                // Avoid toast loop on startup check or specific endpoints
                if (!originalRequest.url.includes("/auth/refresh")) {
                    toast.error("Session expired. Please log in again.", {
                        position: "top-right",
                        autoClose: 3000,
                        theme: "colored",
                    });
                }

                window.dispatchEvent(new Event("auth:logout"));
            }
        }

        // Handle Network Errors (unchanged)
        if (error.message === "Network Error" && !originalRequest._retry) {
            toast.error("Network problem. Please check your connection.", {
                position: "top-right",
                autoClose: 3000,
                theme: "colored",
            });
        }

        return Promise.reject(error);
    }
);

export default api;
