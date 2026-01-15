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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { FaClock, FaFileExcel } from "react-icons/fa";
import api from "../utils/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Ye component attendance track karne ke liye hai, ab isme leave button bhi add kiya gaya hai
const AttendanceTracker = ({ open, onClose, userId, role }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [authError, setAuthError] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [limit] = useState(10); // Records per page
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();



  useEffect(() => {
    if (open && !isAuthenticated && !authLoading) {
      setAuthError("Please log in to track attendance.");
    } else {
      setAuthError(null);
    }
  }, [open, isAuthenticated, authLoading]);

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

  // Fetch users for filter, users ko fetch karta hai filter ke liye
  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingUsers(true);
    try {
      const response = await api.get("/api/users", {
        timeout: 5000,
      });

      setUsers(response.data || []);
    } catch (error) {
      // Error handling is mostly done by interceptor, but we catch specific UI needs here
      console.error("Failed to fetch users", error);
    } finally {
      setLoadingUsers(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (open && isAuthenticated) {
      fetchUsers();
    }
  }, [open, isAuthenticated, fetchUsers]);

  const fetchAttendance = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingAction("fetch");
    try {
      const params = { page: currentPage, limit };
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error("Invalid date format");
        }
        if (start > end) {
          throw new Error("Start date cannot be later than end date.");
        }
        params.startDate = startDate;
        params.endDate = endDate;
      }

      // Add selected user filter
      if (selectedUserId) {
        params.selectedUserId = selectedUserId;
        console.log("Adding selectedUserId to params:", selectedUserId);
      }

      console.log("Sending attendance request with params:", params);
      const response = await api.get("/api/attendance", {
        timeout: 5000,
        params,
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Could not retrieve attendance data."
        );
      }

      const { data, pagination } = response.data;
      setAttendance(data || []);
      setTotalPages(pagination.totalPages || 1);
      setTotalRecords(pagination.totalRecords || 0);
    } catch (error) {
      // Friendly error messages handled by interceptor for generic ones, specific here
      if (error.message.includes("date")) {
        toast.error(error.message);
      }
    } finally {
      setLoadingAction(null);
    }
  }, [isAuthenticated, currentPage, limit, startDate, endDate, selectedUserId]);

  useEffect(() => {
    if (open && isAuthenticated) {
      fetchAttendance();
    }
  }, [
    open,
    isAuthenticated,
    fetchAttendance,
    currentPage,
    startDate,
    endDate,
    selectedUserId,
  ]);

  // Handle action function update kiya gaya hai taaki leave bhi handle kare, leave ke liye location nahi mangta
  const handleAction = async (type) => {
    if (!isAuthenticated) {
      const errorMessage = "Please log in to perform this action.";
      setAuthError(errorMessage);
      toast.error(errorMessage, { autoClose: 5000 });
      return;
    }

    setLoadingAction(type);
    setAuthError(null);
    try {
      let payload = {
        remarks: remarks?.trim() || "",
      };

      if (type === "check-in" || type === "check-out") {
        const location = await getLocation();
        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);
        if (isNaN(latitude) || isNaN(longitude)) {
          throw new Error("Location coordinates must be valid numbers.");
        }

        payload[type === "check-in" ? "checkInLocation" : "checkOutLocation"] =
        {
          latitude,
          longitude,
        };
      }
      // Leave ke liye sirf remarks bhejte hain, location nahi

      const response = await api.post(`/api/${type}`, payload, {
        timeout: 10000,
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || `Failed to ${type.replace("-", " ")}`
        );
      }

      toast.success(
        `${type === "check-in"
          ? "Checked in"
          : type === "check-out"
            ? "Checked out"
            : "Leave marked"
        } successfully!`,
        { autoClose: 3000 }
      );
      setRemarks("");
      setLocationStatus("idle");
      setAuthError(null);
      await fetchAttendance();
    } catch (error) {
      let friendlyMessage = `Oops! Something went wrong while trying to ${type.replace(
        "-",
        " "
      )}. Please try again.`;

      if (error.message.includes("location")) {
        friendlyMessage =
          "We couldn't get your location. Please check your device settings and try again.";
      } else if (error.response?.data?.message) {
        friendlyMessage = error.response.data.message;
      } else if (error.message === "Network Error") {
        friendlyMessage =
          "Network issue detected. Please check your internet connection.";
      }

      setAuthError(friendlyMessage);
      toast.error(friendlyMessage, { autoClose: 5000 });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExport = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to export attendance.", { autoClose: 5000 });
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select a valid date range.", { autoClose: 5000 });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast.error("Invalid date format.", { autoClose: 5000 });
      return;
    }
    if (start > end) {
      toast.error("Start date cannot be later than end date.", {
        autoClose: 5000,
      });
      return;
    }

    setLoadingAction("export");
    setAuthError(null);
    try {
      const params = { startDate, endDate };
      if (selectedUserId) {
        params.selectedUserId = selectedUserId;
      }

      const response = await api.get("/api/export-attendance", {
        timeout: 10000,
        params,
        responseType: "arraybuffer", // Important for file download
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Attendance_${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Attendance exported successfully!", { autoClose: 3000 });
      setAuthError(null);
    } catch (error) {
      // generic errors handled by interceptor
      if (error.response?.status === 404) {
        toast.error("No attendance records found for the selected date range");
      }
    } finally {
      setLoadingAction(null);
    }
  }, [isAuthenticated, startDate, endDate, selectedUserId]);

  const handleLoginRedirect = () => {
    navigate("/login");
    onClose();
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    if (open) {
      if (!isInitialized) {
        setIsInitialized(true);
        // Load attendance when drawer opens for the first time
        fetchAttendance();
      }
    } else {
      timeoutId = setTimeout(() => {
        if (isMounted && isInitialized) {
          setAuthError(null);
          setRemarks("");
          setLocationStatus("idle");
          setCurrentPage(1);
          setStartDate("");
          setEndDate("");
          setSelectedUserId("");
          setAttendance([]);
          setIsInitialized(false);
        }
      }, 100);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open, isInitialized]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    setAuthError(null);
  };

  const handleUserFilterChange = (event) => {
    const newUserId = event.target.value;
    console.log("User filter changed to:", newUserId);
    setSelectedUserId(newUserId);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const tableRows = useMemo(() => {
    return attendance.map((record) => (
      <TableRow key={record._id} hover>
        <TableCell>
          {new Date(record.date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </TableCell>
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
      ModalProps={{
        onBackdropClick: handleClose,
      }}
      PaperProps={{
        sx: {
          background: "transparent",
          boxShadow: "none",
        },
      }}
    >
      <Box
        sx={{
          width: { xs: "100%", md: "90%" },
          maxWidth: { xs: "none", md: "1200px" },
          mx: "auto",
          p: { xs: 1, sm: 2, md: 4 },
          borderRadius: { xs: 0, md: 4 },
          backdropFilter: "blur(12px)",
          color: "white",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
      >
        {authLoading && (
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <CircularProgress color="inherit" />
            <Typography>Checking authentication...</Typography>
          </Box>
        )}

        {authError && !authLoading && (
          <Alert
            severity="error"
            sx={{ mb: 2, color: "white", bgcolor: "rgba(255, 82, 82, 0.8)" }}
            action={
              !isAuthenticated ? (
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
            {authError}
          </Alert>
        )}

        {isAuthenticated && (
          <>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                flexWrap: { sm: "wrap" },
                gap: { xs: 1, md: 1.5 },
                mb: { xs: 2, md: 3 },
                alignItems: { xs: "stretch", md: "center" },
                justifyContent: { xs: "stretch", md: "flex-start" },
              }}
            >
              <TextField
                label="Remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                size="small"
                variant="outlined"
                sx={{
                  background: "white",
                  borderRadius: 1,
                  flex: { xs: 1, md: "unset" },
                  minWidth: { xs: "auto", md: "150px" },
                  maxWidth: { xs: "none", md: "180px" },
                }}
                inputProps={{ maxLength: 200 }}
              />
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: { xs: 1, md: 1.5 },
                  flex: { xs: 1, md: "unset" },
                  justifyContent: { xs: "stretch", sm: "flex-start" },
                }}
              >
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
                    minWidth: { xs: "100%", md: "100px" },
                    height: "40px",
                    flex: { xs: 1, md: "unset" },
                  }}
                >
                  {loadingAction === "check-in" ? (
                    <CircularProgress size={18} color="inherit" />
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
                    minWidth: { xs: "100%", md: "100px" },
                    height: "40px",
                    flex: { xs: 1, md: "unset" },
                  }}
                >
                  {loadingAction === "check-out" ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    "Check Out"
                  )}
                </Button>
                {/* Naya Leave button add kiya gaya hai, jo leave mark karega */}
                <Button
                  onClick={() => handleAction("leave")}
                  variant="contained"
                  startIcon={<FaClock />}
                  disabled={loadingAction === "leave"}
                  sx={{
                    bgcolor: "#f44336",
                    color: "white",
                    fontWeight: "bold",
                    "&:hover": { bgcolor: "#d32f2f" },
                    minWidth: { xs: "100%", md: "100px" },
                    height: "40px",
                    flex: { xs: 1, md: "unset" },
                  }}
                >
                  {loadingAction === "leave" ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    "Leave"
                  )}
                </Button>
              </Box>
              {/* User Filter - Only for Admin and SuperAdmin */}
              {(role === "admin" || role === "superadmin") && (
                <FormControl
                  variant="outlined"
                  size="small"
                  sx={{
                    minWidth: { xs: "100%", md: 150 },
                    flex: { xs: 1, md: "unset" },
                  }}
                >
                  <InputLabel id="user-filter-label" sx={{ color: "black" }}>
                    Filter by User
                  </InputLabel>
                  <Select
                    labelId="user-filter-label"
                    value={selectedUserId}
                    onChange={handleUserFilterChange}
                    label="Filter by User"
                    sx={{
                      bgcolor: "white",
                      borderRadius: 1,
                      height: "40px",
                      flex: 1,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "transparent",
                      },
                      "& .MuiSvgIcon-root": {
                        color: "#333",
                      },
                      "& .MuiSelect-select": {
                        color: "#333",
                      },
                      "& .MuiInputLabel-root": {
                        color: "#333",
                      },
                    }}
                  >
                    <MenuItem value="">All Users</MenuItem>
                    {loadingUsers ? (
                      <MenuItem disabled>Loading users...</MenuItem>
                    ) : (
                      users.map((user) => (
                        <MenuItem key={user._id} value={user._id}>
                          {user.username}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              )}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: { xs: 1, md: 1.5 },
                  flex: { xs: 1, md: "unset" },
                  justifyContent: { xs: "stretch", sm: "flex-start" },
                }}
              >
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    bgcolor: "white",
                    borderRadius: 1,
                    flex: 1,
                    minWidth: { xs: "auto", md: "110px" },
                    height: "40px",
                  }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    bgcolor: "white",
                    borderRadius: 1,
                    flex: 1,
                    minWidth: { xs: "auto", md: "110px" },
                    height: "40px",
                  }}
                />
              </Box>
              <Button
                onClick={handleExport}
                startIcon={<FaFileExcel />}
                variant="contained"
                disabled={loadingAction !== null || !startDate || !endDate}
                sx={{
                  bgcolor: "#33cabb",
                  color: "white",
                  fontWeight: "bold",
                  "&:hover": { bgcolor: "#2db7aa" },
                  minWidth: { xs: "100%", md: "100px" },
                  height: "40px",
                  flex: { xs: 1, md: "unset" },
                }}
              >
                {loadingAction === "export" ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  "Export"
                )}
              </Button>
            </Box>

            <Box
              sx={{
                maxHeight: { xs: "300px", md: "400px" },
                overflowY: "auto",
                background: "#fff",
                borderRadius: 2,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                overflowX: "auto",
              }}
            >
              <Table stickyHeader size="small">
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
                          whiteSpace: "nowrap",
                          minWidth: { xs: 80, md: 120 },
                          padding: { xs: "8px 4px", md: "16px 16px" },
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
                        {startDate && endDate
                          ? "No attendance records found for the selected date range"
                          : "No attendance records found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows
                  )}
                </TableBody>
              </Table>
            </Box>

            {totalRecords > 0 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: { xs: 2, md: 3 } }}>
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

        <Box sx={{ textAlign: "right", mt: { xs: 2, md: 3 } }}>
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
