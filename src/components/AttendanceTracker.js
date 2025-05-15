import React, { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import { FaClock, FaFileExcel } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const AttendanceTracker = ({ open, onClose, userId, role }) => {
  const [attendance, setAttendance] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude });
        },
        (err) =>
          reject(new Error("Unable to retrieve location: " + err.message)),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  const fetchAttendance = useCallback(async (retryCount = 3) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(
        "https://crm-server-amz7.onrender.com/api/attendance",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data.success) {
        setAttendance(response.data.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      if (retryCount > 0) {
        setTimeout(() => fetchAttendance(retryCount - 1), 1000);
      } else {
        setError("Failed to fetch attendance: " + error.message);
        toast.error("Failed to fetch attendance!");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchAttendance();
    }
  }, [open, fetchAttendance]);

  const handleCheckIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const { latitude, longitude } = await getLocation();
      await axios.post(
        "https://crm-server-amz7.onrender.com/api/check-in",
        { remarks, checkInLocation: { latitude, longitude } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Checked in successfully!");
      setRemarks("");
      fetchAttendance();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to check in!");
      toast.error(error.response?.data?.message || "Failed to check in!");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const { latitude, longitude } = await getLocation();
      await axios.post(
        "https://crm-server-amz7.onrender.com/api/check-out",
        { remarks, checkOutLocation: { latitude, longitude } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Checked out successfully!");
      setRemarks("");
      fetchAttendance();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to check out!");
      toast.error(error.response?.data?.message || "Failed to check out!");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = attendance.map((record) => ({
      Date: new Date(record.date).toLocaleDateString(),
      User: record.user?.username || "Unknown",
      CheckIn: record.checkIn
        ? new Date(record.checkIn).toLocaleTimeString()
        : "N/A",
      CheckOut: record.checkOut
        ? new Date(record.checkOut).toLocaleTimeString()
        : "N/A",
      Status: record.status,
      Remarks: record.remarks || "N/A",
      CheckInLocation: record.checkInLocation
        ? `${record.checkInLocation.latitude}, ${record.checkInLocation.longitude}`
        : "N/A",
      CheckOutLocation: record.checkOutLocation
        ? `${record.checkOutLocation.latitude}, ${record.checkOutLocation.longitude}`
        : "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "Attendance.xlsx");
    toast.success("Attendance exported successfully!");
  };

  return (
    <Drawer
      anchor="top"
      open={open}
      onClose={onClose}
      PaperProps={{
        className:
          "max-w-4xl mx-auto mt-4 p-6 bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg shadow-lg",
      }}
    >
      <Box>
        <Typography variant="h4" className="font-bold text-gray-800 mb-4">
          Attendance Tracker
        </Typography>
        {error && (
          <Typography className="text-red-600 mb-4">{error}</Typography>
        )}
        <Box className="flex flex-col sm:flex-row gap-4 mb-6">
          <TextField
            label="Remarks (Optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            size="small"
            className="flex-1"
            variant="outlined"
          />
          <Button
            variant="contained"
            startIcon={<FaClock />}
            onClick={handleCheckIn}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <CircularProgress size={24} /> : "Check In"}
          </Button>
          <Button
            variant="contained"
            startIcon={<FaClock />}
            onClick={handleCheckOut}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? <CircularProgress size={24} /> : "Check Out"}
          </Button>
          {role === "superadmin" && (
            <Button
              variant="contained"
              startIcon={<FaFileExcel />}
              onClick={handleExport}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Export
            </Button>
          )}
        </Box>
        {loading && (
          <Box className="flex justify-center mb-4">
            <CircularProgress />
          </Box>
        )}
        <Table className="bg-white rounded-lg shadow">
          <TableHead>
            <TableRow className="bg-gray-200">
              <TableCell className="font-semibold">Date</TableCell>
              <TableCell className="font-semibold">User</TableCell>
              <TableCell className="font-semibold">Check In</TableCell>
              <TableCell className="font-semibold">Check Out</TableCell>
              <TableCell className="font-semibold">Status</TableCell>
              <TableCell className="font-semibold">Remarks</TableCell>
              <TableCell className="font-semibold">Check In Location</TableCell>
              <TableCell className="font-semibold">
                Check Out Location
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attendance.map((record) => (
              <TableRow key={record._id} className="hover:bg-gray-50">
                <TableCell>
                  {new Date(record.date).toLocaleDateString()}
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
                <TableCell>{record.status}</TableCell>
                <TableCell>{record.remarks || "N/A"}</TableCell>
                <TableCell>
                  {record.checkInLocation
                    ? `${record.checkInLocation.latitude}, ${record.checkInLocation.longitude}`
                    : "N/A"}
                </TableCell>
                <TableCell>
                  {record.checkOutLocation
                    ? `${record.checkOutLocation.latitude}, ${record.checkOutLocation.longitude}`
                    : "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button
          onClick={onClose}
          className="mt-4 bg-gray-500 hover:bg-gray-600 text-white"
        >
          Close
        </Button>
      </Box>
    </Drawer>
  );
};

export default AttendanceTracker;
