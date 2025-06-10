import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Drawer, Box, Typography, IconButton } from "@mui/material";
import { FaTimes } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const ValueAnalyticsDrawer = ({
  entries,
  isOpen,
  onClose,
  role,
  userId,
  dateRange,
}) => {
  const [valueStats, setValueStats] = useState([]);
  const [totalClosingAmount, setTotalClosingAmount] = useState(0);
  const [totalHotValue, setTotalHotValue] = useState(0);
  const [totalWarmValue, setTotalWarmValue] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAssignedUsersAndCalculateValueStats = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        let relevantUserIds = [];

        if (role === "superadmin") {
          const response = await axios.get(
            "https://crm-server-amz7.onrender.com/api/users",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const admins = response.data.filter(
            (user) =>
              typeof user.role === "string" &&
              user.role.toLowerCase() === "admin"
          );
          const teamMembers = response.data.filter(
            (user) =>
              typeof user.role === "string" &&
              user.role.toLowerCase() === "others"
          );
          relevantUserIds = [...admins, ...teamMembers].map((user) => ({
            _id: user._id,
            username: user.username,
            role: user.role,
            assignedAdmin: user.assignedAdmin,
          }));
        } else if (role === "admin") {
          // Admin sees their own data and assigned users' data
          const response = await axios.get(
            "https://crm-server-amz7.onrender.com/api/users",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          relevantUserIds = response.data
            .filter(
              (user) => user.assignedAdmin === userId || user._id === userId
            )
            .map((user) => ({
              _id: user._id,
              username: user.username,
              role: user.role,
              assignedAdmin: user.assignedAdmin,
            }));
        } else {
          // Role 'others' sees only their own data
          relevantUserIds = [{ _id: userId, username: "Self", role: "others" }];
        }

        const statsMap = {};
        let totalClose = 0;
        let totalHot = 0;
        let totalWarm = 0;

        // Filter entries by date range
        const filteredEntries = entries.filter((entry) => {
          const createdAt = new Date(entry.createdAt);
          return (
            !dateRange[0].startDate ||
            !dateRange[0].endDate ||
            (createdAt >= new Date(dateRange[0].startDate) &&
              createdAt <= new Date(dateRange[0].endDate))
          );
        });

        filteredEntries.forEach((entry) => {
          const creatorId =
            entry.createdBy?._id ||
            entry.createdBy?.$oid ||
            entry.createdBy ||
            null;
          const creator = relevantUserIds.find((u) => u._id === creatorId);
          if (!creator) {
            console.warn(
              `ValueAnalytics: Creator not found for entry ${entry._id}:`,
              entry
            );
            return;
          }

          const uId = creator._id;
          const username = creator.username;
          const userRole =
            typeof creator.role === "string"
              ? creator.role.toLowerCase()
              : "user";

          if (
            (role === "superadmin" &&
              (userRole === "admin" || userRole === "others")) ||
            (role === "admin" &&
              (uId === userId || creator.assignedAdmin === userId)) ||
            (role === "others" && uId === userId)
          ) {
            if (!statsMap[uId]) {
              let displayName = username;
              if (userRole === "superadmin") {
                displayName = `${username} (Superadmin)`;
              } else if (userRole === "admin") {
                displayName = `${username} (Admin)`;
              }
              statsMap[uId] = {
                username: displayName,
                totalClosingAmount: 0,
                hotValue: 0,
                warmValue: 0,
              };
            }
            if (
              entry.closeamount != null &&
              entry.closetype === "Closed Won" &&
              typeof entry.closeamount === "number" &&
              !isNaN(entry.closeamount)
            ) {
              console.log(
                `ValueAnalytics: Adding closeamount for entry ${entry._id} by ${username}: ₹${entry.closeamount}`
              );
              statsMap[uId].totalClosingAmount += entry.closeamount;
              totalClose += entry.closeamount;
            } else if (
              entry.closetype === "Closed Won" &&
              (entry.closeamount == null || isNaN(entry.closeamount))
            ) {
              console.warn(
                `ValueAnalytics: Invalid closeamount for entry ${entry._id}:`,
                entry
              );
            }
            if (
              entry.estimatedValue != null &&
              typeof entry.estimatedValue === "number" &&
              !isNaN(entry.estimatedValue)
            ) {
              if (entry.status === "Interested") {
                statsMap[uId].hotValue += entry.estimatedValue;
                totalHot += entry.estimatedValue;
              } else if (entry.status === "Maybe") {
                statsMap[uId].warmValue += entry.estimatedValue;
                totalWarm += entry.estimatedValue;
              }
            }
          }
        });

        setValueStats(Object.values(statsMap));
        setTotalClosingAmount(totalClose);
        setTotalHotValue(totalHot);
        setTotalWarmValue(totalWarm);
      } catch (error) {
        console.error("Error fetching value analytics:", error);
        toast.error("Failed to load value analytics!");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) fetchAssignedUsersAndCalculateValueStats();
  }, [entries, isOpen, role, userId, dateRange]);

  // Handle export to Excel
  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = [
        // Overall Statistics
        {
          Section: "Overall Totals",
          Username: "",
          "Total Closing Amount": totalClosingAmount,
          "Hot Value": totalHotValue,
          "Warm Value": totalWarmValue,
        },
        // Separator row
        {
          Section: "",
          Username: "",
          "Total Closing Amount": "",
          "Hot Value": "",
          "Warm Value": "",
        },
        // User Statistics
        ...valueStats.map((user) => ({
          Section: "User Statistics",
          Username: user.username,
          "Total Closing Amount": user.totalClosingAmount,
          "Hot Value": user.hotValue,
          "Warm Value": user.warmValue,
        })),
      ];

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Value Analytics");

      // Auto-size columns
      const colWidths = Object.keys(exportData[0]).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...exportData.map((row) => String(row[key] || "").length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet["!cols"] = colWidths;

      // Generate and download Excel file
      XLSX.writeFile(
        workbook,
        `value_analytics_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      toast.success("Value analytics exported successfully!");
    } catch (error) {
      console.error("Error exporting value analytics:", error);
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
      {/* Header */}
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

      {/* Content */}
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
        ) : valueStats.length === 0 ? (
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
            {/* Total Amounts Section */}
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
            {/* User Stats Section */}
            {valueStats.map((user, index) => (
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
                {index < valueStats.length - 1 && (
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

      {/* Footer */}
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
