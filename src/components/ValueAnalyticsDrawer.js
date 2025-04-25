import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Drawer, Box, Typography, IconButton } from "@mui/material";
import { FaTimes } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";

const ValueAnalyticsDrawer = ({ entries, isOpen, onClose, role, userId }) => {
  const [valueStats, setValueStats] = useState([]);
  const [totalClosingAmount, setTotalClosingAmount] = useState(0);
  const [totalEstimatedValue, setTotalEstimatedValue] = useState(0);
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
          relevantUserIds = response.data.map((user) => ({
            _id: user._id,
            username: user.username,
            role: user.role,
          }));
          if (!relevantUserIds.some((user) => user._id === userId)) {
            relevantUserIds.push({
              _id: userId,
              username: "Superadmin",
              role: "superadmin",
            });
          }
        } else if (role === "admin") {
          const response = await axios.get(
            "https://crm-server-amz7.onrender.com/api/users",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          relevantUserIds = response.data
            .filter((user) => user.assignedAdmin === userId)
            .map((user) => ({
              _id: user._id,
              username: user.username,
              role: user.role,
            }));
        }

        const statsMap = {};
        let totalClose = 0;
        let totalEst = 0;

        const filteredEntries =
          role === "superadmin"
            ? entries
            : entries.filter(
                (entry) =>
                  relevantUserIds.some(
                    (user) =>
                      user._id === entry.createdBy?._id ||
                      user._id === entry.assignedTo?._id
                  ) || entry.createdBy?._id === userId
              );

        filteredEntries.forEach((entry) => {
          const user = entry.assignedTo || entry.createdBy;
          const uId = user?._id || "unknown";
          const username = user?.username || "Unknown";
          const userRole =
            relevantUserIds.find((u) => u._id === uId)?.role || "user";

          if (
            (role === "superadmin" && uId !== "unknown") ||
            (role === "admin" &&
              (relevantUserIds.some((u) => u._id === uId) || uId === userId))
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
                totalEstimatedValue: 0,
              };
            }
            if (entry.closeamount && entry.closetype === "Closed Won") {
              statsMap[uId].totalClosingAmount += entry.closeamount;
              totalClose += entry.closeamount;
            }
            if (entry.estimatedValue) {
              statsMap[uId].totalEstimatedValue += entry.estimatedValue;
              totalEst += entry.estimatedValue;
            }
          }
        });

        setValueStats(Object.values(statsMap));
        setTotalClosingAmount(totalClose);
        setTotalEstimatedValue(totalEst);
      } catch (error) {
        console.error("Error fetching value analytics:", error);
        toast.error("Failed to load value analytics!");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) fetchAssignedUsersAndCalculateValueStats();
  }, [entries, isOpen, role, userId]);

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
          padding: "20px",
          background: "rgba(255, 255, 255, 0.05)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
                    Total Closing Amount:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "#2196f3",
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
                    Total Estimated Value:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "#e91e63",
                      textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    ₹{totalEstimatedValue.toLocaleString("en-IN")}
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
                        Total Closing Amount:
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: "700",
                          color: "#2196f3",
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
                        Total Estimated Value:
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: "700",
                          color: "#e91e63",
                          textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        ₹{user.totalEstimatedValue.toLocaleString("en-IN")}
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
