import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Drawer, Box, Typography, IconButton } from "@mui/material";
import { FaTimes } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";

const AdminDrawer = ({ entries, isOpen, onClose, role, userId }) => {
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAssignedUsersAndCalculateStats = async () => {
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

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

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
                cold: 0,
                warm: 0,
                hot: 0,
                closedWon: 0,
                closedLost: 0,
                allTimeEntries: 0,
                monthEntries: 0,
              };
            }
            statsMap[uId].allTimeEntries += 1;

            const entryDate = new Date(entry.createdAt);
            if (
              entryDate.getMonth() === currentMonth &&
              entryDate.getFullYear() === currentYear
            ) {
              statsMap[uId].monthEntries += 1;
            }

            switch (entry.status) {
              case "Not Interested":
                statsMap[uId].cold += 1;
                break;
              case "Maybe":
                statsMap[uId].warm += 1;
                break;
              case "Interested":
                statsMap[uId].hot += 1;
                break;
              case "Closed":
                if (entry.closetype === "Closed Won")
                  statsMap[uId].closedWon += 1;
                else if (entry.closetype === "Closed Lost")
                  statsMap[uId].closedLost += 1;
                break;
              default:
                break;
            }
          }
        });

        setUserStats(Object.values(statsMap));
      } catch (error) {
        console.error("Error fetching assigned users:", error);
        toast.error("Failed to load team analytics!");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) fetchAssignedUsersAndCalculateStats();
  }, [entries, isOpen, role, userId]);

  return (
    <Drawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "350px",
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
          borderRadius: "0 20px 20px 0",
          boxShadow: "4px 0 30px rgba(0, 0, 0, 0.4)",
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
          variant="h5"
          sx={{
            fontWeight: "700",
            fontSize: "1.6rem",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
          }}
        >
          Team Analytics
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: "white",
            "&:hover": { background: "rgba(255, 255, 255, 0.2)" },
          }}
        >
          <FaTimes size={22} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 4 }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Typography
              sx={{
                fontSize: "1.2rem",
                fontWeight: "400",
                fontStyle: "italic",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              Loading Analytics...
            </Typography>
          </Box>
        ) : userStats.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "1.2rem",
                fontWeight: "400",
                fontStyle: "italic",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              }}
            >
              No Team Data Available
            </Typography>
          </Box>
        ) : (
          userStats.map((user, index) => (
            <Box key={user.username + index} sx={{ mb: 3 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                sx={{
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  p: 3,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  "&:hover": {
                    background: "rgba(255, 255, 255, 0.15)",
                    transform: "translateY(-2px)",
                    transition: "all 0.2s ease",
                  },
                }}
              >
                {/* User Header */}
                <Box sx={{ mb: 2 }}>
                  <Typography
                    sx={{
                      fontSize: "1.4rem",
                      fontWeight: "600",
                      letterSpacing: "0.4px",
                      textTransform: "capitalize",
                      textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                      mb: 1,
                    }}
                  >
                    {user.username}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 3 }}>
                    <Typography
                      sx={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "lightgreen",
                        textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      Total: {user.allTimeEntries}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "yellow",
                        textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      This Month: {user.monthEntries}
                    </Typography>
                  </Box>
                </Box>

                {/* Status Metrics */}
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                  {[
                    { label: "Cold", value: user.cold, color: "orange" },
                    { label: "Warm", value: user.warm, color: "lightgreen" },
                    { label: "Hot", value: user.hot, color: "yellow" },
                    {
                      label: "Won",
                      value: user.closedWon,
                      color: "lightgrey",
                    },
                    { label: "Lost", value: user.closedLost, color: "#e91e63" },
                  ].map((stat) => (
                    <Box
                      key={stat.label}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "6px",
                        px: 2,
                        py: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: "500",
                          color: "rgba(255, 255, 255, 0.9)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: stat.color,
                          textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        {stat.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </motion.div>
            </Box>
          ))
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 3,
          borderTop: "1px solid rgba(255, 255, 255, 0.2)",
          background: "rgba(255, 255, 255, 0.05)",
        }}
      >
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

export default AdminDrawer;
