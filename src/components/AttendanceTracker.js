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
} from "@mui/material";
import { FaClock, FaFileExcel } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const AttendanceTracker = ({ open, onClose, userId, role }) => {
  const [attendance, setAttendance] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://crm-server-amz7.onrender.com/api/attendance",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAttendance(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch attendance!");
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
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://crm-server-amz7.onrender.com/api/attendance/check-in",
        { remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Checked in successfully!");
      setRemarks("");
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to check in!");
    }
  };

  const handleCheckOut = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://crm-server-amz7.onrender.com/api/attendance/check-out",
        { remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Checked out successfully!");
      setRemarks("");
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to check out!");
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
        sx: {
          height: "100%",
          padding: 2,
          background: "linear-gradient(180deg, #f5f7fa 0%, #e4e7eb 100%)",
        },
      }}
    >
      <Box sx={{ maxWidth: 800, mx: "auto", mt: 2 }}>
        <Typography variant="h5" gutterBottom>
          Attendance Tracker
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <TextField
            label="Remarks (Optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            size="small"
          />
          <Button
            variant="contained"
            startIcon={<FaClock />}
            onClick={handleCheckIn}
            disabled={loading}
          >
            Check In
          </Button>
          <Button
            variant="contained"
            startIcon={<FaClock />}
            onClick={handleCheckOut}
            disabled={loading}
          >
            Check Out
          </Button>
          {role === "superadmin" && (
            <Button
              variant="contained"
              startIcon={<FaFileExcel />}
              onClick={handleExport}
              disabled={loading}
            >
              Export
            </Button>
          )}
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Check In</TableCell>
              <TableCell>Check Out</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attendance.map((record) => (
              <TableRow key={record._id}>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button sx={{ mt: 2 }} onClick={onClose}>
          Close
        </Button>
      </Box>
    </Drawer>
  );
};

export default AttendanceTracker;
