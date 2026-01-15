import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
} from "@mui/material";
import { FaTimes, FaSearch } from "react-icons/fa";
import api from "../utils/api";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const ValueAnalyticsDrawer = ({
  entries,
  isOpen,
  onClose,
  role,
  userId,
  dateRange,
  drawerUsers,
}) => {
  const [valueStats, setValueStats] = useState([]);
  const [totalClosingAmount, setTotalClosingAmount] = useState(0);
  const [totalHotValue, setTotalHotValue] = useState(0);
  const [totalWarmValue, setTotalWarmValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchAssignedUsersAndCalculateValueStats = useCallback(async () => {
    // If we already have users from parent, don't set global loading or fetch
    let usersData = [];

    if (drawerUsers && drawerUsers.length > 0) {
      usersData = drawerUsers;
    } else {
      setLoading(true);
      try {
        const response = await api.get("/api/users");
        usersData = response.data;
      } catch (error) {
        console.error("Error loading value analytics:", error);
        toast.error("Unable to load value analytics. Please try again later.");
        setLoading(false);
        return;
      }
    }

    try {
      let relevantUserIds = [];

      if (role === "superadmin") {
        const admins = usersData.filter(
          (user) =>
            typeof user.role === "string" && user.role.toLowerCase() === "admin"
        );
        const teamMembers = usersData.filter(
          (user) =>
            typeof user.role === "string" &&
            user.role.toLowerCase() === "others"
        );
        relevantUserIds = [...admins, ...teamMembers].map((user) => ({
          _id: user._id,
          username: user.username,
          role: user.role,
          assignedAdmins: user.assignedAdmins || [],
        }));
      } else if (role === "admin") {
        relevantUserIds = usersData
          .filter(
            (user) =>
              (user.assignedAdmins && user.assignedAdmins.includes(userId)) ||
              user._id === userId
          )
          .map((user) => ({
            _id: user._id,
            username: user.username,
            role: user.role,
            assignedAdmins: user.assignedAdmins || [],
          }));
      } else {
        const currentUser = usersData.find((user) => user._id === userId);

        relevantUserIds = [
          {
            _id: userId,
            username: currentUser?.username || "Unknown",
            role: currentUser?.role || "others",
            assignedAdmins: currentUser?.assignedAdmins || [],
          },
        ];
      }

      const statsMap = {};
      const totals = { totalClose: 0, totalHot: 0, totalWarm: 0 };

      const statsLookup = {};
      if (Array.isArray(entries)) {
        entries.forEach((stat) => {
          if (stat && stat._id) {
            const key =
              (stat._id && stat._id.$oid) ||
              (typeof stat._id === "object" && stat._id.toString
                ? stat._id.toString()
                : String(stat._id));
            statsLookup[key] = stat;
          }
        });
      }

      relevantUserIds.forEach((user) => {
        const uId = user._id.toString();
        const username = user.username;
        const userRole = user.role;

        let displayName = username;
        if (userRole === "superadmin") displayName = `${username} (Superadmin)`;
        else if (userRole === "admin") displayName = `${username} (Admin)`;

        statsMap[uId] = {
          username: displayName,
          totalClosingAmount: 0,
          hotValue: 0,
          warmValue: 0,
        };

        if (statsLookup[uId]) {
          const s = statsLookup[uId];
          statsMap[uId].totalClosingAmount = s.totalClosingAmount || 0;
          statsMap[uId].hotValue = s.hotValue || 0;
          statsMap[uId].warmValue = s.warmValue || 0;

          totals.totalClose += s.totalClosingAmount || 0;
          totals.totalHot += s.hotValue || 0;
          totals.totalWarm += s.warmValue || 0;
        }
      });

      setValueStats(Object.values(statsMap));
      setTotalClosingAmount(totals.totalClose);
      setTotalHotValue(totals.totalHot);
      setTotalWarmValue(totals.totalWarm);
    } catch (error) {
      console.error("Error processing value analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [entries, role, userId, drawerUsers]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    if (isOpen) {
      if (!isInitialized) {
        setIsInitialized(true);
        fetchAssignedUsersAndCalculateValueStats();
        setSearchTerm("");
      }
    } else {
      timeoutId = setTimeout(() => {
        if (isMounted && isInitialized) {
          setValueStats([]);
          setSearchTerm("");
          setIsInitialized(false);
        }
      }, 100);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, isInitialized, fetchAssignedUsersAndCalculateValueStats]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const filteredValueStats = useMemo(() => {
    if (role !== "superadmin" && role !== "admin") return valueStats;
    if (!searchTerm.trim()) return valueStats;
    return valueStats.filter((user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [valueStats, searchTerm, role]);

  const handleExport = () => {
    try {
      const exportData = [
        {
          Section: "Overall Totals",
          Username: "",
          "Total Closing Amount": totalClosingAmount,
          "Hot Value": totalHotValue,
          "Warm Value": totalWarmValue,
        },
        ...filteredValueStats.map((user) => ({
          Section: "User Statistics",
          Username: user.username,
          "Total Closing Amount": user.totalClosingAmount,
          "Hot Value": user.hotValue,
          "Warm Value": user.warmValue,
        })),
      ];

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Value Analytics");
      XLSX.writeFile(
        workbook,
        `value_analytics_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      toast.success("Value analytics exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export value analytics!");
    }
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "350px",
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
          borderRadius: "0 15px 15px 0",
          boxShadow: "2px 0 20px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          padding: "24px",
          background: "rgba(255, 255, 255, 0.1)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: "700",
            fontSize: "1.5rem",
            letterSpacing: "1px",
            textTransform: "uppercase",
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
          }}
        >
          Value Analytics
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ color: "white", "&:hover": { color: "#ff8e53" } }}
        >
          <FaTimes size={20} />
        </IconButton>
      </Box>

      {(role === "superadmin" || role === "admin") && (
        <Box sx={{ px: 2, py: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <FaSearch
                  style={{
                    color: "rgba(255, 255, 255, 0.7)",
                    marginRight: "8px",
                  }}
                />
              ),
              sx: {
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                color: "white",
                "& .MuiInputBase-input::placeholder": {
                  color: "rgba(255, 255, 255, 0.6)",
                  opacity: 1,
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  border: "1px solid rgba(255, 255, 255, 0.5)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  border: "1px solid #2575fc",
                },
              },
            }}
            sx={{
              "& .MuiInputBase-input": {
                padding: "10px 12px",
                fontSize: "0.9rem",
              },
            }}
          />
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 3 }}>
        {loading ? (
          <Typography
            sx={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "1.1rem",
              fontWeight: "400",
              fontStyle: "italic",
              py: 4,
              letterSpacing: "0.5px",
            }}
          >
            Loading...
          </Typography>
        ) : filteredValueStats.length === 0 ? (
          <Typography
            sx={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "1.1rem",
              fontWeight: "400",
              fontStyle: "italic",
              py: 4,
              letterSpacing: "0.5px",
            }}
          >
            No Value Data Available
          </Typography>
        ) : (
          <>
            <Box
              sx={{
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                p: 2,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  mb: 1.5,
                  letterSpacing: "0.3px",
                  textTransform: "uppercase",
                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
                }}
              >
                Overall Totals
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      opacity: 0.9,
                      letterSpacing: "0.2px",
                      textTransform: "uppercase",
                    }}
                  >
                    Total Closure:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "lightgreen",
                      textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    ₹{totalClosingAmount.toLocaleString("en-IN")}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      opacity: 0.9,
                      letterSpacing: "0.2px",
                      textTransform: "uppercase",
                    }}
                  >
                    Hot Value:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "yellow",
                      textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    ₹{totalHotValue.toLocaleString("en-IN")}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      opacity: 0.9,
                      letterSpacing: "0.2px",
                      textTransform: "uppercase",
                    }}
                  >
                    Warm Value:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "orange",
                      textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    ₹{totalWarmValue.toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                height: "1px",
                background: "rgba(255, 255, 255, 0.2)",
                my: 1,
              }}
            />
            {filteredValueStats.map((user, index) => (
              <Box key={user.username + index}>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  sx={{
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    p: 2,
                    mb: 2,
                    "&:hover": { background: "rgba(255, 255, 255, 0.12)" },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "1.2rem",
                      fontWeight: "600",
                      mb: 1.5,
                      letterSpacing: "0.3px",
                      textTransform: "capitalize",
                      textShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
                    }}
                  >
                    {user.username}
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          opacity: 0.9,
                          letterSpacing: "0.2px",
                          textTransform: "uppercase",
                        }}
                      >
                        Total Closure:
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: "700",
                          color: "lightgreen",
                          textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        ₹{user.totalClosingAmount.toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          opacity: 0.9,
                          letterSpacing: "0.2px",
                          textTransform: "uppercase",
                        }}
                      >
                        Hot Value:
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: "700",
                          color: "yellow",
                          textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        ₹{user.hotValue.toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          opacity: 0.9,
                          letterSpacing: "0.2px",
                          textTransform: "uppercase",
                        }}
                      >
                        Warm Value:
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: "700",
                          color: "orange",
                          textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        ₹{user.warmValue.toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
                {index < filteredValueStats.length - 1 && (
                  <Box
                    sx={{
                      height: "1px",
                      background: "rgba(255, 255, 255, 0.2)",
                      my: 1,
                    }}
                  />
                )}
              </Box>
            ))}
          </>
        )}
      </Box>

      <Box sx={{ p: 2, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExport}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(90deg, #34d399, #10b981)",
            color: "white",
            borderRadius: "8px",
            border: "none",
            fontSize: "1.1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>⬇</span> Export Analytics
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(90deg, #ff6b6b, #ff8e53)",
            color: "white",
            borderRadius: "8px",
            border: "none",
            fontSize: "1.1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          Close Dashboard
        </motion.button>
      </Box>
    </Drawer>
  );
};

export default ValueAnalyticsDrawer;
