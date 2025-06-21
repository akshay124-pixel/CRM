import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Drawer, Box, Typography, IconButton } from "@mui/material";
import { FaTimes } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import DOMPurify from "dompurify";

const AdminDrawer = ({ entries, isOpen, onClose, role, userId, dateRange }) => {
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setDebugInfo(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      let allUsers = [];
      const apiUrl =
        role === "superadmin"
          ? "https://crm-server-amz7.onrender.com/api/allusers"
          : "https://crm-server-amz7.onrender.com/api/users";
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await axios.get(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100, page },
        });
        console.log(`API Response (Page ${page}):`, response.data);

        const normalizedPage = response.data.map((user) => ({
          _id:
            user._id?.$oid?.toString() ||
            user._id?.toString() ||
            user.id?.toString() ||
            "",
          username: DOMPurify.sanitize(user.username || "Unknown"),
          role:
            typeof user.role === "string" ? user.role.toLowerCase() : "unknown",
          assignedAdmins: Array.isArray(user.assignedAdmins)
            ? user.assignedAdmins.map(
                (id) => id?.$oid?.toString() || id?.toString() || id
              )
            : [],
        }));

        allUsers = [...allUsers, ...normalizedPage];
        hasMore = response.data.length === 100;
        page += 1;
      }

      console.log("Normalized Users:", allUsers);
      console.log(`Total Users Fetched: ${allUsers.length}`);

      // Filter users based on role
      let relevantUsers;
      if (role === "superadmin") {
        relevantUsers = allUsers.filter(
          (u) => u.role === "admin" || u.role === "others"
        );
      } else if (role === "admin") {
        relevantUsers = allUsers.filter(
          (user) =>
            user._id === userId ||
            (user.assignedAdmins?.includes(userId) && user.role === "others")
        );
      } else {
        relevantUsers = allUsers.filter((user) => user._id === userId);
      }

      console.log("Relevant Users:", relevantUsers);

      if (relevantUsers.length === 0) {
        setDebugInfo("No relevant users found for the given role");
      }

      return relevantUsers;
    } catch (error) {
      console.error("Error fetching users:", error);
      setDebugInfo(error.message || "Failed to fetch users");
      toast.error("Failed to load team analytics!");
      return [];
    } finally {
      setLoading(false);
    }
  }, [role, userId]);

  useEffect(() => {
    if (!isOpen) return;

    const calculateStats = async () => {
      const users = await fetchUsers();
      if (!users.length) {
        setUserStats([]);
        return;
      }

      const statsMap = {};
      const filteredEntries = entries.filter((entry) => {
        const createdAt = new Date(entry.createdAt);
        return (
          !dateRange[0]?.startDate ||
          !dateRange[0]?.endDate ||
          (createdAt >= new Date(dateRange[0].startDate) &&
            createdAt <= new Date(dateRange[0].endDate))
        );
      });

      console.log("Filtered Entries Count:", filteredEntries.length);
      filteredEntries.forEach((entry, index) => {
        console.log(`Entry ${index + 1}:`, {
          id: entry._id,
          createdBy: entry.createdBy,
          assignedTo: entry.assignedTo,
          status: entry.status,
          closetype: entry.closetype,
          createdAt: entry.createdAt,
        });
      });

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      filteredEntries.forEach((entry) => {
        // Process createdBy
        const creatorId = entry.createdBy
          ? entry.createdBy._id?.toString() ||
            entry.createdBy.$oid?.toString() ||
            entry.createdBy.toString()
          : null;
        if (creatorId) {
          const creator = users.find((user) => user._id === creatorId);
          if (creator) {
            processUserStats(
              creator,
              entry,
              statsMap,
              role,
              userId,
              currentMonth,
              currentYear
            );
          } else {
            console.warn(
              `Creator ${creatorId} not found in relevant users for entry:`,
              entry._id
            );
          }
        }

        // Process assignedTo
        const assignedTo = Array.isArray(entry.assignedTo)
          ? entry.assignedTo
          : [];
        assignedTo.forEach((user) => {
          const assignedUserId =
            user._id?.toString() || user.$oid?.toString() || user.toString();
          const assignedUser = users.find((u) => u._id === assignedUserId);
          if (assignedUser) {
            processUserStats(
              assignedUser,
              entry,
              statsMap,
              role,
              userId,
              currentMonth,
              currentYear
            );
          } else {
            console.warn(
              `Assigned user ${assignedUserId} not found for entry:`,
              entry._id
            );
          }
        });
      });

      const result = Object.values(statsMap);
      console.log("Calculated User Stats:", result);
      setUserStats(result);

      if (result.length === 0 && filteredEntries.length > 0) {
        setDebugInfo("No matching stats generated; check user IDs in entries");
      }
    };

    const processUserStats = (
      user,
      entry,
      statsMap,
      role,
      userId,
      currentMonth,
      currentYear
    ) => {
      const uId = user._id;
      if (!statsMap[uId]) {
        let displayName = user.username;
        if (role === "superadmin" && user.role === "admin") {
          displayName = `${user.username} (Admin)`;
        } else if (role === "superadmin" && user.role === "others") {
          displayName = user.username;
        } else if (uId === userId && role === "admin") {
          displayName = `${user.username} (Admin)`;
        }
        statsMap[uId] = {
          _id: uId,
          username: displayName,
          allTimeEntries: 0,
          monthEntries: 0,
          cold: 0,
          warm: 0,
          hot: 0,
          closedWon: 0,
          closedLost: 0,
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
          } else if (entry.closetype === "Closed Lost") {
            statsMap[uId].closedLost += 1;
          }
          break;
        default:
          break;
      }
    };

    calculateStats();
  }, [isOpen, entries, dateRange, fetchUsers, role, userId]);

  // Calculate overall statistics
  const overallStats = userStats.reduce(
    (acc, user) => ({
      total: acc.total + user.allTimeEntries,
      monthTotal: acc.monthTotal + user.monthEntries,
      cold: acc.cold + user.cold,
      warm: acc.warm + user.warm,
      hot: acc.hot + user.hot,
      closedWon: acc.closedWon + user.closedWon,
      closedLost: acc.closedLost + user.closedLost,
    }),
    {
      total: 0,
      monthTotal: 0,
      cold: 0,
      warm: 0,
      hot: 0,
      closedWon: 0,
      closedLost: 0,
    }
  );

  console.log("Overall Analytics Stats:", overallStats);

  // Handle export to Excel
  const handleExport = () => {
    try {
      const exportData = [
        {
          Section: "Overall Statistics",
          Username: "",
          "Total Entries": overallStats.total,
          "This Month": overallStats.monthTotal,
          Cold: overallStats.cold,
          Warm: overallStats.warm,
          Hot: overallStats.hot,
          Won: overallStats.closedWon,
          Lost: overallStats.closedLost,
        },
        {
          Section: "",
          Username: "",
          "Total Entries": "",
          "This Month": "",
          Cold: "",
          Warm: "",
          Hot: "",
          Won: "",
          Lost: "",
        },
        ...userStats.map((user) => ({
          Section: "User Statistics",
          Username: user.username,
          "Total Entries": user.allTimeEntries,
          "This Month": user.monthEntries,
          Cold: user.cold,
          Warm: user.warm,
          Hot: user.hot,
          Won: user.closedWon,
          Lost: user.closedLost,
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
      console.error("Error exporting analytics:", error);
      toast.error("Failed to export analytics!");
    }
  };

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
            fontWeight: 700,
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
                fontWeight: 400,
                fontStyle: "italic",
                textAlign: "center",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              Loading Analytics...
            </Typography>
          </Box>
        ) : debugInfo || userStats.length === 0 ? (
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
                fontWeight: 400,
                fontStyle: "italic",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              }}
            >
              {debugInfo || "No Team Data Available"}
            </Typography>
          </Box>
        ) : (
          <>
            {/* Overall Statistics Section */}
            <Box sx={{ mb: 3 }}>
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
                    fontWeight: 700,
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
                    display: "flex",
                    gap: "12px",
                    mb: 2,
                    flexWrap: "wrap",
                    justifyContent: "center",
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
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      sx={{
                        flex: "1 0 120px",
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
                          fontWeight: 600,
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
                          fontWeight: 700,
                          color: stat.color,
                          textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        {stat.value}
                      </Typography>
                    </motion.div>
                  ))}
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "12px",
                    justifyItems: "center",
                    alignItems: "stretch",
                  }}
                >
                  {[
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
                    { label: "Hot", value: overallStats.hot, color: "yellow" },
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
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (index + 2) * 0.1, duration: 0.3 }}
                      sx={{
                        width: "100%",
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        p: 1,
                        textAlign: "center",
                        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                        minHeight: "60px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
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
                          fontSize: "1rem",
                          fontWeight: 700,
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

            {/* Individual User Stats */}
            {userStats.map((user, index) => (
              <Box key={user._id || user.username + index} sx={{ mb: 3 }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  sx={{
                    background: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    p: 2,
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
                        fontSize: "1.3rem",
                        fontWeight: 600,
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
                          fontWeight: 600,
                          color: "lightgreen",
                          textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        Total: {user.allTimeEntries}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: 600,
                          color: "yellow",
                        }}
                      >
                        This Month: {user.monthEntries}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
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
                    ].map((stat) => (
                      <Box
                        key={stat.label}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "5px",
                          px: 2,
                          py: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            color: "rgba(255, 255, 255, 0.85)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {stat.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            color: stat.color,
                          }}
                        >
                          {stat.value}
                        </Typography>
                      </Box>
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
            padding: "10px",
            background: "linear-gradient(90deg, #34d399, #10b981)",
            color: "white",
            borderRadius: 5,
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            letterSpacing: "0.5",
            cursor: "pointer",
            textTransform: "uppercase",
            marginBottom: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
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
            padding: "10px",
            background: "linear-gradient(90deg, #ff6b6b, #ff8e53)",
            color: "white",
            borderRadius: 5,
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            letterSpacing: "0.5",
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          Close
        </motion.button>
      </Box>
    </Drawer>
  );
};

export default AdminDrawer;
