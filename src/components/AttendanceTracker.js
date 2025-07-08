import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Drawer,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  CircularProgress,
  Alert,
  Pagination,
} from "@mui/material";
import { FaClock, FaFileExcel } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

const AttendanceTracker = ({ open, onClose, userId, role }) => {
  const [auth, setAuth] = useState({
    status: "idle",
    error: null,
  });
  const [attendance, setAttendance] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(10); // Records per page
  const navigate = useNavigate();

  const apiUrl =
    process.env.REACT_APP_API_URL || "https://crm-server-lhtq.onrender.com/api";

  // Retry utility for API calls
  const withRetry = async (fn, retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === retries || error.response?.status === 401) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  const verifyToken = async (token) => {
    const response = await axios.get(`${apiUrl}/verify-token`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000,
    });
    return response.data.success;
  };

  const refreshToken = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No token available for refresh");
    }
    const response = await axios.post(
      `${apiUrl}/refresh-token`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      }
    );
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to refresh token");
    }
    const newToken = response.data.token;
    localStorage.setItem("token", newToken);
    return newToken;
  };

  // Clear error after 5 seconds
  useEffect(() => {
    if (auth.error) {
      const timer = setTimeout(() => {
        setAuth((prev) => ({ ...prev, error: null }));
      }, 5000); // Match toast autoClose duration
      return () => clearTimeout(timer);
    }
  }, [auth.error]);

  const checkAuthStatus = useCallback(async () => {
    setAuth((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      let isValid = await withRetry(() => verifyToken(token));
      if (!isValid) {
        const newToken = await withRetry(refreshToken);
        isValid = await withRetry(() => verifyToken(newToken));
        if (!isValid) {
          throw new Error("Session expired after refresh attempt.");
        }
      }
      setAuth({ status: "authenticated", error: null });
    } catch (error) {
      const errorMessage =
        error.message || "Authentication failed. Please log in.";
      setAuth({ status: "unauthenticated", error: errorMessage });
      toast.error(errorMessage, { autoClose: 5000 });
    }
  }, []);

  useEffect(() => {
    if (open && auth.status === "idle") {
      checkAuthStatus();
    }
  }, [open, auth.status, checkAuthStatus]);

  const getLocation = useCallback(() => {
    setLocationStatus("fetching");
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errorMessage = "Geolocation is not supported by your browser.";
        setLocationStatus("error");
        toast.error(errorMessage, { autoClose: 5000 });
        reject(new Error(errorMessage));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (isNaN(latitude) || isNaN(longitude)) {
            const errorMessage = "Invalid location coordinates.";
            setLocationStatus("error");
            toast.error(errorMessage, { autoClose: 5000 });
            reject(new Error(errorMessage));
            return;
          }

          const location = { latitude, longitude };
          setLocationStatus("fetched");
          toast.success("Location fetched successfully!", { autoClose: 3000 });
          resolve(location);
        },
        (err) => {
          let message;
          switch (err.code) {
            case err.PERMISSION_DENIED:
              message =
                "Location access denied. Please enable location services.";
              break;
            case err.POSITION_UNAVAILABLE:
              message = "Location information is unavailable.";
              break;
            case err.TIMEOUT:
              message = "Location request timed out.";
              break;
            default:
              message = "An error occurred while retrieving location.";
              break;
          }
          setLocationStatus("error");
          toast.error(message, { autoClose: 5000 });
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  const getGoogleMapsUrl = (latitude, longitude) => {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  };

  const fetchAttendance = useCallback(async () => {
    if (auth.status !== "authenticated") return;

    setLoadingAction("fetch");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setAuth({
          status: "unauthenticated",
          error: "No authentication token found. Please log in.",
        });
        return;
      }

      const response = await withRetry(() =>
        axios.get(`${apiUrl}/attendance`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
          params: { page: currentPage, limit },
        })
      ).catch(async (error) => {
        if (error.response?.status === 401) {
          const newToken = await withRetry(refreshToken);
          return await withRetry(() =>
            axios.get(`${apiUrl}/attendance`, {
              headers: { Authorization: `Bearer ${newToken}` },
              timeout: 5000,
              params: { page: currentPage, limit },
            })
          );
        }
        throw error;
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch attendance");
      }

      // Sort attendance by checkIn timestamp in descending order (newest first)
      const sortedAttendance = (response.data.data || []).sort((a, b) => {
        const checkInA =
          a.checkIn && !isNaN(new Date(a.checkIn))
            ? new Date(a.checkIn)
            : new Date(0);
        const checkInB =
          b.checkIn && !isNaN(new Date(b.checkIn))
            ? new Date(b.checkIn)
            : new Date(0);
        return checkInB - checkInA; // Newest check-in first
      });

      console.log("Raw API data:", response.data.data); // Debug: Log raw data
      console.log(
        "Sorted attendance by checkIn:",
        sortedAttendance.map((record) => ({
          checkIn: record.checkIn,
          formatted: record.checkIn
            ? new Date(record.checkIn).toLocaleString()
            : "N/A",
        }))
      ); // Debug: Log sorted check-in timestamps

      setAttendance(sortedAttendance);
      setTotalPages(response.data.pagination.totalPages || 1);
      setTotalRecords(response.data.pagination.totalRecords || 0);
    } catch (error) {
      const errorMessage = error.message || "Failed to fetch attendance";
      setAuth((prev) => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage, { autoClose: 5000 });
    } finally {
      setLoadingAction(null);
    }
  }, [auth.status, currentPage, limit]);

  useEffect(() => {
    if (open && auth.status === "authenticated") {
      fetchAttendance();
    }
  }, [open, auth.status, fetchAttendance, currentPage]);

  const handleAction = async (type) => {
    if (auth.status !== "authenticated") {
      const errorMessage = "Please log in to perform this action.";
      setAuth((prev) => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage, { autoClose: 5000 });
      return;
    }

    setLoadingAction(type);
    setAuth((prev) => ({ ...prev, error: null })); // Clear previous error
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setAuth({
          status: "unauthenticated",
          error: "No authentication token found. Please log in.",
        });
        toast.error("No authentication token found. Please log in.", {
          autoClose: 5000,
        });
        return;
      }

      const location = await getLocation();
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error("Location coordinates must be valid numbers.");
      }

      const payload = {
        remarks: remarks?.trim() || "",
        [type === "check-in" ? "checkInLocation" : "checkOutLocation"]: {
          latitude,
          longitude,
        },
      };

      const response = await withRetry(() =>
        axios.post(`${apiUrl}/${type}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        })
      ).catch(async (error) => {
        if (error.response?.status === 401) {
          const newToken = await withRetry(refreshToken);
          return await withRetry(() =>
            axios.post(`${apiUrl}/${type}`, payload, {
              headers: { Authorization: `Bearer ${newToken}` },
              timeout: 10000,
            })
          );
        }
        throw error;
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || `Failed to ${type.replace("-", " ")}`
        );
      }

      toast.success(
        `${type === "check-in" ? "Checked in" : "Checked out"} successfully!`,
        { autoClose: 3000 }
      );
      setRemarks("");
      setLocationStatus("idle");
      setAuth((prev) => ({ ...prev, error: null })); // Clear error on success
      await fetchAttendance();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        `Failed to ${type.replace("-", " ")}`;
      setAuth((prev) => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage, { autoClose: 5000 });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExport = useCallback(async () => {
    if (auth.status !== "authenticated") {
      toast.error("Please log in to export attendance.", { autoClose: 5000 });
      return;
    }

    setLoadingAction("export");
    setAuth((prev) => ({ ...prev, error: null }));
    try {
      // Prepare data for Excel
      const exportData = attendance.map((record) => ({
        Date: new Date(record.date).toLocaleDateString(),
        Employee: record.user?.username || "Unknown",
        "Check In": record.checkIn
          ? new Date(record.checkIn).toLocaleTimeString()
          : "N/A",
        "Check Out": record.checkOut
          ? new Date(record.checkOut).toLocaleTimeString()
          : "N/A",
        Status: record.status || "N/A",
        Remarks: record.remarks || "N/A",
        "Check In Location": record.checkInLocation
          ? `${record.checkInLocation.latitude}, ${record.checkInLocation.longitude}`
          : "N/A",
        "Check Out Location": record.checkOutLocation
          ? `${record.checkOutLocation.latitude}, ${record.checkOutLocation.longitude}`
          : "N/A",
      }));

      // Create a new workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      // Generate Excel file and trigger download
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Attendance_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Attendance exported successfully!", { autoClose: 3000 });
      setAuth((prev) => ({ ...prev, error: null }));
    } catch (error) {
      const errorMessage = error.message || "Failed to export attendance";
      setAuth((prev) => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage, { autoClose: 5000 });
    } finally {
      setLoadingAction(null);
    }
  }, [auth.status, attendance]);

  const handleLoginRedirect = () => {
    navigate("/login");
    onClose();
  };

  // Clear error when drawer closes
  const handleClose = () => {
    setAuth((prev) => ({ ...prev, error: null }));
    setRemarks("");
    setLocationStatus("idle");
    setCurrentPage(1);
    onClose();
  };

  // Handle page change
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    setAuth((prev) => ({ ...prev, error: null })); // Clear error on page change
  };

  // Memoize table rows
  const tableRows = useMemo(() => {
    return attendance.map((record) => (
      <TableRow key={record._id} hover>
        <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
        <TableCell>{record.user?.username || "Unknown"}</TableCell>
        <TableCell>
          {record.checkIn
            ? new Date(record.checkIn).toLocaleTimeString()
            : "N/A"}
        </TableCell>
        <TableCell>
          {record.checkOut
            ? new Date(record.checkOut).toLocaleTimeString()
            : "N/A"}
        </TableCell>
        <TableCell>{record.status || "N/A"}</TableCell>
        <TableCell>{record.remarks || "N/A"}</TableCell>
        <TableCell>
          {record.checkInLocation &&
          !isNaN(record.checkInLocation.latitude) &&
          !isNaN(record.checkInLocation.longitude) ? (
            <Button
              variant="text"
              size="small"
              href={getGoogleMapsUrl(
                record.checkInLocation.latitude,
                record.checkInLocation.longitude
              )}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                textTransform: "none",
                color: "#1976d2",
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: "12px",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.1)",
                  color: "#1565c0",
                  transform: "translateY(-1px)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                },
              }}
              aria-label={`View check-in location at latitude ${record.checkInLocation.latitude}, longitude ${record.checkInLocation.longitude} on Google Maps`}
            >
              View Location
            </Button>
          ) : (
            "N/A"
          )}
        </TableCell>
        <TableCell>
          {record.checkOutLocation &&
          !isNaN(record.checkOutLocation.latitude) &&
          !isNaN(record.checkOutLocation.longitude) ? (
            <Button
              variant="text"
              size="small"
              href={getGoogleMapsUrl(
                record.checkOutLocation.latitude,
                record.checkOutLocation.longitude
              )}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                textTransform: "none",
                color: "#1976d2",
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: "12px",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.1)",
                  color: "#1565c0",
                  transform: "translateY(-1px)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                },
              }}
              aria-label={`View check-out location at latitude ${record.checkOutLocation.latitude}, longitude ${record.checkOutLocation.longitude} on Google Maps`}
            >
              View Location
            </Button>
          ) : (
            "N/A"
          )}
        </TableCell>
      </TableRow>
    ));
  }, [attendance]);

  return (
    <Drawer
      anchor="top"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          background: "transparent",
          boxShadow: "none",
        },
      }}
    >
      <Box
        sx={{
          width: "90%",
          maxWidth: "1200px",
          mx: "auto",
          p: 4,
          borderRadius: 4,
          backdropFilter: "blur(12px)",
          color: "white",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
      >
        {auth.status === "loading" && (
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <CircularProgress color="inherit" />
            <Typography>Checking authentication...</Typography>
          </Box>
        )}

        {auth.error && auth.status !== "loading" && (
          <Alert
            severity="error"
            sx={{ mb: 2, color: "white", bgcolor: "rgba(255, 82, 82, 0.8)" }}
            action={
              auth.status === "unauthenticated" ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleLoginRedirect}
                >
                  Log In
                </Button>
              ) : (
                locationStatus === "error" && (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => handleAction(loadingAction || "check-in")}
                  >
                    Retry
                  </Button>
                )
              )
            }
          >
            {auth.error}
          </Alert>
        )}

        {auth.status === "authenticated" && (
          <>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                label="Remarks (Optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                size="small"
                fullWidth
                variant="outlined"
                sx={{
                  background: "white",
                  borderRadius: 1,
                  flex: 1,
                }}
                inputProps={{ maxLength: 200 }}
              />
              <Button
                onClick={() => handleAction("check-in")}
                variant="contained"
                startIcon={<FaClock />}
                disabled={
                  loadingAction === "check-in" || locationStatus === "fetching"
                }
                sx={{
                  bgcolor: "#43e97b",
                  color: "black",
                  fontWeight: "bold",
                  "&:hover": { bgcolor: "#38d476" },
                  minWidth: "120px",
                }}
              >
                {loadingAction === "check-in" ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Check In"
                )}
              </Button>
              <Button
                onClick={() => handleAction("check-out")}
                variant="contained"
                startIcon={<FaClock />}
                disabled={
                  loadingAction === "check-out" || locationStatus === "fetching"
                }
                sx={{
                  bgcolor: "#ff6a00",
                  color: "white",
                  fontWeight: "bold",
                  "&:hover": { bgcolor: "#e65c00" },
                  minWidth: "120px",
                }}
              >
                {loadingAction === "check-out" ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Check Out"
                )}
              </Button>
              <Button
                onClick={handleExport}
                startIcon={<FaFileExcel />}
                variant="contained"
                disabled={loadingAction !== null}
                sx={{
                  bgcolor: "#33cabb",
                  color: "white",
                  fontWeight: "bold",
                  "&:hover": { bgcolor: "#2db7aa" },
                  minWidth: "120px",
                }}
              >
                {loadingAction === "export" ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Export"
                )}
              </Button>
            </Box>

            <Box
              sx={{
                maxHeight: "400px",
                overflowY: "auto",
                background: "#fff",
                borderRadius: 2,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#6a11cb" }}>
                    {[
                      "Date",
                      "Employee",
                      "Check In",
                      "Check Out",
                      "Status",
                      "Remarks",
                      "Check In Location",
                      "Check Out Location",
                    ].map((header) => (
                      <TableCell
                        key={header}
                        sx={{
                          fontWeight: "bold",
                          color: "white",
                          backgroundColor: "#6a11cb",
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance.length === 0 && !loadingAction ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows
                  )}
                </TableBody>
              </Table>
            </Box>

            {totalRecords > 0 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      color: "white",
                      "&.Mui-selected": {
                        backgroundColor: "#1976d2",
                        color: "white",
                      },
                      "&:hover": {
                        backgroundColor: "rgba(25, 118, 210, 0.1)",
                      },
                    },
                  }}
                />
              </Box>
            )}
            <Typography sx={{ color: "white", mt: 1, textAlign: "center" }}>
              Showing {attendance.length} of {totalRecords} records
            </Typography>
          </>
        )}

        <Box sx={{ textAlign: "right", mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handleClose}
            sx={{
              color: "white",
              borderColor: "white",
              "&:hover": {
                backgroundColor: "#ffffff20",
              },
            }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default AttendanceTracker;
