import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Drawer, Box, Typography, IconButton } from "@mui/material";
import { FaTimes } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import DOMPurify from "dompurify";

// Custom hook for API calls with pagination
const useCachedApi = (url, token) => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!token) {
      setError("No authentication token found");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let allUsers = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100, page },
        });
        const normalizedPage = response.data.map((user) => ({
          ...user,
          _id: user._id?.$oid || user._id || user.id || "",
          username: DOMPurify.sanitize(user.username || "Unknown"),
          role:
            typeof user.role === "string" ? user.role.toLowerCase() : "unknown",
          assignedAdmin:
            user.assignedAdmin?.$oid ||
            user.assignedAdmin?._id ||
            user.assignedAdmin ||
            null,
        }));
        allUsers = [...allUsers, ...normalizedPage];
        hasMore = response.data.length === 100;
        page += 1;
      }
      setData(allUsers);
      setError(null);
    } catch (err) {
      setError(
        err.response
          ? `API error: ${err.response.status} ${err.response.statusText}`
          : `Network error: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [url, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData, retryCount]);

  return {
    data,
    error,
    loading,
    retry: () => setRetryCount((prev) => prev + 1),
  };
};

// Reusable StatCard component
const StatCard = ({ label, value, color }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "rgba(255, 255, 255, 0.08)",
      borderRadius: "6px",
      px: 2,
      py: 1,
    }}
  >
    <Typography
      sx={{
        fontSize: "0.9rem",
        fontWeight: 500,
        color: "rgba(255, 255, 255, 0.9)",
        textTransform: "uppercase",
      }}
    >
      {label}
    </Typography>
    <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color }}>
      {value}
    </Typography>
  </Box>
);

const AdminDrawer = ({
  entries = [],
  isOpen,
  onClose,
  role,
  userId,
  dateRange,
}) => {
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  // Fetch users from API
  const {
    data: users,
    error,
    loading: apiLoading,
  } = useCachedApi(
    "https://crm-server-amz7.onrender.com/api/users",
    localStorage.getItem("token")
  );

  // Log props for debugging
  useEffect(() => {
    if (isOpen) {
      console.log("AdminDrawer Props:", { role, userId, entries, dateRange });
    }
  }, [isOpen, role, userId, entries, dateRange]);

  // Calculate user stats
  const userStatsMemo = useMemo(() => {
    if (!Array.isArray(users) || users.length === 0) {
      setDebugInfo("No users found");
      return [];
    }

    // Determine relevant users based on role
    let relevantUserIds = [];
    if (role === "superadmin") {
      relevantUserIds = users.map((user) => ({
        _id: user._id,
        username: user.username,
        role: user.role,
        assignedAdmin: user.assignedAdmin,
      }));
    } else if (role === "admin") {
      relevantUserIds = users
        .filter((user) => user.assignedAdmin === userId || user._id === userId)
        .map((user) => ({
          _id: user._id,
          username: user.username,
          role: user.role,
          assignedAdmin: user.assignedAdmin,
        }));
    } else {
      relevantUserIds = [
        { _id: userId, username: "Self", role: "others", assignedAdmin: null },
      ];
    }

    const statsMap = {};
    // Filter entries by date range and role
    const filteredEntries = entries.filter((entry) => {
      const createdAt = new Date(entry.createdAt);
      const startDate = dateRange[0].startDate
        ? new Date(dateRange[0].startDate).setHours(0, 0, 0, 0)
        : null;
      const endDate = dateRange[0].endDate
        ? new Date(dateRange[0].endDate).setHours(23, 59, 59, 999)
        : null;
      return (
        (!startDate ||
          !endDate ||
          (createdAt >= startDate && createdAt <= endDate)) &&
        (role === "superadmin" ||
          relevantUserIds.some(
            (user) =>
              user._id === (entry.createdBy?._id || entry.createdBy) ||
              user._id === (entry.assignedTo?._id || entry.assignedTo)
          ))
      );
    });

    console.log("Filtered Entries:", filteredEntries);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    filteredEntries.forEach((entry) => {
      const user = entry.assignedTo || entry.createdBy;
      const uId = user?._id || user || "unknown";
      const creator = users.find((u) => u._id === uId);
      if (!creator) {
        console.warn(`User not found for entry:`, entry);
        return;
      }

      const username = creator.username;
      const userRole = creator.role;
      const assignedAdmin = creator.assignedAdmin;

      if (
        (role === "superadmin" && uId !== "unknown") ||
        relevantUserIds.some((u) => u._id === uId)
      ) {
        if (!statsMap[uId]) {
          let displayName = username;
          if (userRole === "superadmin") {
            displayName = `${username} (Superadmin)`;
          } else if (userRole === "admin") {
            displayName = `${username} (Admin)`;
          } else if (assignedAdmin) {
            const admin = users.find((u) => u._id === assignedAdmin);
            displayName = `${username} (Team: ${admin?.username || "Unknown"})`;
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
            totalClosingAmount: 0,
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
            if (entry.closetype === "Closed Won") {
              statsMap[uId].closedWon += 1;
              if (
                entry.closeamount != null &&
                typeof entry.closeamount === "number" &&
                !isNaN(entry.closeamount)
              ) {
                console.log(
                  `AdminDrawer: Adding closeamount for entry ${entry._id} by ${username}: ₹${entry.closeamount}`
                );
                statsMap[uId].totalClosingAmount += entry.closeamount;
              }
            } else if (entry.closetype === "Closed Lost") {
              statsMap[uId].closedLost += 1;
            }
            break;
          default:
            break;
        }
      }
    });

    console.log("Stats Map:", statsMap);

    const result = Object.values(statsMap);
    setDebugInfo(`Found ${result.length} users with analytics`);
    return result;
  }, [entries, users, role, userId, dateRange]);

  // Update userStats when drawer opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setUserStats(userStatsMemo);
      setLoading(false);
    }
  }, [isOpen, userStatsMemo]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const stats = userStats.reduce(
      (acc, user) => ({
        total: acc.total + user.allTimeEntries,
        monthTotal: acc.monthTotal + user.monthEntries,
        hot: acc.hot + user.hot,
        cold: acc.cold + user.cold,
        warm: acc.warm + user.warm,
        closedWon: acc.closedWon + user.closedWon,
        closedLost: acc.closedLost + user.closedLost,
        totalClosingAmount:
          acc.totalClosingAmount + (user.totalClosingAmount || 0),
      }),
      {
        total: 0,
        monthTotal: 0,
        hot: 0,
        cold: 0,
        warm: 0,
        closedWon: 0,
        closedLost: 0,
        totalClosingAmount: 0,
      }
    );
    console.log("Overall Stats:", stats);
    return stats;
  }, [userStats]);

  // Handle export to Excel
  const handleExport = useCallback(() => {
    try {
      const exportData = [
        {
          Section: "Overall Statistics",
          Username: "",
          "Total Entries": overallStats.total,
          "This Month": overallStats.monthTotal,
          Hot: overallStats.hot,
          Cold: overallStats.cold,
          Warm: overallStats.warm,
          Won: overallStats.closedWon,
          Lost: overallStats.closedLost,
          "Total Closing Amount": overallStats.totalClosingAmount,
        },
        {
          Section: "",
          Username: "",
          "Total Entries": "",
          "This Month": "",
          Hot: "",
          Cold: "",
          Warm: "",
          Won: "",
          Lost: "",
          "Total Closing Amount": "",
        },
        ...userStats.map((user) => ({
          Section: "User Statistics",
          Username: user.username,
          "Total Entries": user.allTimeEntries,
          "This Month": user.monthEntries,
          Hot: user.hot,
          Cold: user.cold,
          Warm: user.warm,
          Won: user.closedWon,
          Lost: user.closedLost,
          "Total Closing Amount": user.totalClosingAmount,
        })),
      ];

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Team Analytics");

      worksheet["!cols"] = Object.keys(exportData[0]).map((key) => ({
        wch: Math.min(Math.max(key.length, 15) + 2, 50),
      }));

      const dateStr = dateRange[0]?.startDate
        ? `${new Date(dateRange[0].startDate)
            .toISOString()
            .slice(0, 10)}_to_${new Date(dateRange[0].endDate)
            .toISOString()
            .slice(0, 10)}`
        : new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `team_analytics_${dateStr}.xlsx`);
      toast.success("Analytics exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export analytics!");
    }
  }, [userStats, overallStats, dateRange]);

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
        {loading || apiLoading ? (
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
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              Loading Analytics...
            </Typography>
          </Box>
        ) : error ? (
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
              {error}
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
          <>
            {/* Overall Statistics Section */}
            <Box sx={{ mb: 4 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                sx={{
                  background:
                    "linear-gradient(135deg, rgba(37, 117, 252, 0.9), rgba(106, 17, 203, 0.9))",
                  borderRadius: "16px",
                  p: 3,
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.6rem",
                    fontWeight: "700",
                    background: "linear-gradient(135deg, #ffffff, #e0e7ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "0.5px",
                    textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                    mb: 2.5,
                    textAlign: "center",
                  }}
                >
                  📊 Overall Statistics
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    gap: "12px",
                    justifyItems: "center",
                    alignItems: "stretch",
                  }}
                >
                  {[
                    {
                      label: "Total Entries",
                      value: overallStats.total,
                      color: "lightgreen",
                    },
                    {
                      label: "This Month",
                      value: overallStats.monthTotal,
                      color: "yellow",
                    },
                    { label: "Hot", value: overallStats.hot, color: "yellow" },
                    {
                      label: "Cold",
                      value: overallStats.cold,
                      color: "orange",
                    },
                    {
                      label: "Warm",
                      value: overallStats.warm,
                      color: "lightgreen",
                    },
                    {
                      label: "Won",
                      value: overallStats.closedWon,
                      color: "lightgrey",
                    },
                    {
                      label: "Lost",
                      value: overallStats.closedLost,
                      color: "#e91e63",
                    },
                    {
                      label: "Total Closure",
                      value: `₹${(
                        overallStats.totalClosingAmount || 0
                      ).toLocaleString("en-IN")}`,
                      color: "lightgreen",
                    },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      sx={{
                        width: "100%",
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        p: 1.5,
                        textAlign: "center",
                        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                        minHeight: "80px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: "600",
                          color: "rgba(255, 255, 255, 0.9)",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                          mb: 0.5,
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1.3rem",
                          fontWeight: "700",
                          color: stat.color,
                          textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        {stat.value}
                      </Typography>
                    </motion.div>
                  ))}
                </Box>
              </motion.div>
            </Box>

            {/* Individual User Statistics */}
            {userStats.map((user, index) => (
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
                      {
                        label: "Lost",
                        value: user.closedLost,
                        color: "#e91e63",
                      },
                      {
                        label: "Total Closure",
                        value: `₹${(
                          user.totalClosingAmount || 0
                        ).toLocaleString("en-IN")}`,
                        color: "lightgreen",
                      },
                    ].map((stat) => (
                      <StatCard
                        key={stat.label}
                        label={stat.label}
                        value={stat.value}
                        color={stat.color}
                      />
                    ))}
                  </Box>
                </motion.div>
              </Box>
            ))}
          </>
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

export default AdminDrawer;
