import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";
import { FaTimes } from "react-icons/fa";

function TeamBuilder({ isOpen, onClose, userRole, userId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://crm-server-amz7.onrender.com/api/fetch-team",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(response.data); // Backend handles all filtering
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && (userRole === "admin" || userRole === "superadmin")) {
      fetchUsers();
    }
  }, [isOpen, userRole]);

  const handleAssign = async (userIdToAssign) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "https://crm-server-amz7.onrender.com/api/assign-user",
        { userId: userIdToAssign },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      fetchUsers();
    } catch (error) {
      console.error("Error assigning user:", error);
      toast.error(error.response?.data?.message || "Failed to assign user!");
    }
  };

  const handleUnassign = async (userIdToUnassign) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "https://crm-server-amz7.onrender.com/api/unassign-user",
        { userId: userIdToUnassign },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      fetchUsers();
    } catch (error) {
      console.error("Error unassigning user:", error);
      toast.error(error.response?.data?.message || "Failed to unassign user!");
    }
  };

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        bgcolor: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1300,
        p: 2,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Paper
          sx={{
            width: { xs: "100%", sm: "95%", md: "85%", lg: "70%" },
            maxWidth: "1000px",
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: "15px",
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            color: "white",
            position: "relative",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                letterSpacing: "1px",
                textTransform: "uppercase",
                textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
              }}
            >
              Team Builder
            </Typography>
            <IconButton
              onClick={onClose}
              sx={{
                color: "white",
                "&:hover": { color: "#ff8e53" },
              }}
            >
              <FaTimes size={24} />
            </IconButton>
          </Box>

          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "200px",
              }}
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  opacity: 0.8,
                  fontStyle: "italic",
                }}
              >
                Loading...
              </Typography>
            </Box>
          ) : (
            <TableContainer
              sx={{
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                maxHeight: "60vh",
                overflowY: "auto",
                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "rgba(255, 255, 255, 0.3)",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  background: "rgba(255, 255, 255, 0.5)",
                },
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    {[
                      "Username",
                      "Email",
                      "Role",
                      "Assigned Admin",
                      "Actions",
                    ].map((header) => (
                      <TableCell
                        key={header}
                        sx={{
                          color: "white",
                          fontWeight: "bold",
                          fontSize: "1.1rem",
                          background: "#1a3c7a",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
                          textAlign: "center",
                          py: 2,
                          position: "sticky",
                          top: 0,
                          zIndex: 1,
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user, index) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <TableCell
                        sx={{
                          color: "white",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          textAlign: "center",
                          py: 1.5,
                        }}
                      >
                        {user.username}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "white",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          textAlign: "center",
                          py: 1.5,
                        }}
                      >
                        {user.email}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "white",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          textAlign: "center",
                          py: 1.5,
                        }}
                      >
                        {user.role}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "white",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          textAlign: "center",
                          py: 1.5,
                        }}
                      >
                        {user.assignedAdmin
                          ? `Assigned (ID: ${user.assignedAdmin})`
                          : "Unassigned"}
                      </TableCell>
                      <TableCell
                        sx={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          textAlign: "center",
                          py: 1.5,
                        }}
                      >
                        {user.assignedAdmin && user.assignedAdmin === userId ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleUnassign(user._id)}
                            style={{
                              padding: "8px 16px",
                              background:
                                "linear-gradient(90deg, #ff4444, #cc0000)",
                              color: "white",
                              borderRadius: "12px",
                              border: "none",
                              fontSize: "0.9rem",
                              fontWeight: "bold",
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                              transition: "all 0.2s ease",
                            }}
                          >
                            Unassign
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAssign(user._id)}
                            disabled={user.assignedAdmin}
                            style={{
                              padding: "8px 16px",
                              background: user.assignedAdmin
                                ? "linear-gradient(90deg, #cccccc, #999999)"
                                : "linear-gradient(135deg, #2575fc, #6a11cb)",
                              color: "white",
                              borderRadius: "12px",
                              border: "none",
                              fontSize: "0.9rem",
                              fontWeight: "bold",
                              cursor: user.assignedAdmin
                                ? "not-allowed"
                                : "pointer",
                              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                              transition: "all 0.2s ease",
                            }}
                          >
                            Assign to Me
                          </motion.button>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </motion.div>
    </Box>
  );
}

export default TeamBuilder;
