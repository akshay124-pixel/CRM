import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Drawer, Box, Typography, IconButton } from "@mui/material";
import { FaTimes } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const TeamAnalyticsDrawer = ({
  entries,
  isOpen,
  onClose,
  role,
  userId,
  dateRange,
}) => {
  const [teamStats, setTeamStats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTeamStats = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        let relevantAdmins = [];

        // Fetch users to map admin teams
        const response = await axios.get(
          "https://crm-server-amz7.onrender.com/api/users",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const users = response.data;

        if (role === "superadmin") {
          // Superadmins see all admins
          relevantAdmins = users
            .filter((user) => user.role === "admin")
            .map((user) => ({
              _id: user._id,
              username: user.username,
            }));
          // Include unassigned entries (no assignedAdmin)
          relevantAdmins.push({ _id: null, username: "Unassigned" });
        } else if (role === "admin") {
          // Admins see only their own team
          relevantAdmins = [
            {
              _id: userId,
              username:
                users.find((user) => user._id === userId)?.username ||
                "Current Admin",
            },
          ];
        }

        const statsMap = {};
        // Filter entries by date range
        const filteredEntries = entries.filter((entry) => {
          const createdAt = new Date(entry.createdAt);
          return (
            (!dateRange[0].startDate ||
              !dateRange[0].endDate ||
              (createdAt >= new Date(dateRange[0].startDate) &&
                createdAt <= new Date(dateRange[0].endDate))) &&
            (role === "superadmin" ||
              entry.createdBy?._id === userId ||
              users.some(
                (user) =>
                  user.assignedAdmin === userId &&
                  (user._id === entry.createdBy?._id ||
                    user._id === entry.assignedTo?._id)
              ))
          );
        });

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        filteredEntries.forEach((entry) => {
          // Determine the admin team (based on createdBy's assignedAdmin)
          const creator = users.find(
            (user) => user._id === entry.createdBy?._id
          );
          const adminId = creator?.assignedAdmin || null; // null for unassigned
          const admin = relevantAdmins.find((a) => a._id === adminId);

          if (admin || adminId === null) {
            const adminKey = adminId || "unassigned";
            if (!statsMap[adminKey]) {
              statsMap[adminKey] = {
                adminId: adminId,
                adminName: admin?.username || "Unassigned",
                cold: 0,
                warm: 0,
                hot: 0,
                closedWon: 0,
                closedLost: 0,
                allTimeEntries: 0,
                monthEntries: 0,
              };
            }
            statsMap[adminKey].allTimeEntries += 1;

            const entryDate = new Date(entry.createdAt);
            if (
              entryDate.getMonth() === currentMonth &&
              entryDate.getFullYear() === currentYear
            ) {
              statsMap[adminKey].monthEntries += 1;
            }

            switch (entry.status) {
              case "Not Interested":
                statsMap[adminKey].cold += 1;
                break;
              case "Maybe":
                statsMap[adminKey].warm += 1;
                break;
              case "Interested":
                statsMap[adminKey].hot += 1;
                break;
              case "Closed":
                if (entry.closetype === "Closed Won")
                  statsMap[adminKey].closedWon += 1;
                else if (entry.closetype === "Closed Lost")
                  statsMap[adminKey].closedLost += 1;
                break;
              default:
                break;
            }
          }
        });

        setTeamStats(Object.values(statsMap));
      } catch (error) {
        console.error("Error fetching team analytics:", error);
        toast.error("Failed to load team analytics!");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) fetchTeamStats();
  }, [entries, isOpen, role, userId, dateRange]);

  // Calculate overall statistics
  const overallStats = teamStats.reduce(
    (acc, team) => ({
      total: acc.total + team.allTimeEntries,
      monthTotal: acc.monthTotal + team.monthEntries,
      hot: acc.hot + team.hot,
      cold: acc.cold + team.cold,
      warm: acc.warm + team.warm,
      closedWon: acc.closedWon + team.closedWon,
      closedLost: acc.closedLost + team.closedLost,
    }),
    {
      total: 0,
      monthTotal: 0,
      hot: 0,
      cold: 0,
      warm: 0,
      closedWon: 0,
      closedLost: 0,
    }
  );

  // Handle export to Excel
  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = [
        // Overall Statistics
        {
          Section: "Overall Statistics",
          Team: "",
          "Total Entries": overallStats.total,
          "This Month": overallStats.monthTotal,
          Hot: overallStats.hot,
          Cold: overallStats.cold,
          Warm: overallStats.warm,
          Won: overallStats.closedWon,
          Lost: overallStats.closedLost,
        },
        // Separator row
        {
          Section: "",
          Team: "",
          "Total Entries": "",
          "This Month": "",
          Hot: "",
          Cold: "",
          Warm: "",
          Won: "",
          Lost: "",
        },
        // Team Statistics
        ...teamStats.map((team) => ({
          Section: "Team Statistics",
          Team: team.adminName,
          "Total Entries": team.allTimeEntries,
          "This Month": team.monthEntries,
          Hot: team.hot,
          Cold: team.cold,
          Warm: team.warm,
          Won: team.closedWon,
          Lost: team.closedLost,
        })),
      ];

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Team Analytics");

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
        `team_analytics_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      toast.success("Team analytics exported successfully!");
    } catch (error) {
      console.error("Error exporting team analytics:", error);
      toast.error("Failed to export team analytics!");
    }
  };

  return (
    <Drawer
      anchor="bottom"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "100%",
          maxHeight: "80vh",
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -4px 30px rgba(0, 0, 0, 0.4)",
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
          Team-Wise Analytics
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
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              Loading Analytics...
            </Typography>
          </Box>
        ) : teamStats.length === 0 ? (
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
                text: "center",
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
                {/* Top Row: Total Entries and This Month */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 4,
                    mb: 2,
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
                        flex: 1,
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
                {/* Bottom Grid: Hot, Cold, Warm, Won, Lost */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "12px",
                    justifyItems: "center",
                    alignItems: "stretch",
                  }}
                >
                  {[
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

            {/* Individual Team Statistics */}
            {teamStats.map((team, index) => (
              <Box key={team.adminName + index} sx={{ mb: 3 }}>
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
                  {/* Team Header */}
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
                      {team.adminName} Team
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
                        Total: {team.allTimeEntries}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "yellow",
                          textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        This Month: {team.monthEntries}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Status Metrics */}
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    {[
                      { label: "Cold", value: team.cold, color: "orange" },
                      { label: "Warm", value: team.warm, color: "lightgreen" },
                      { label: "Hot", value: team.hot, color: "yellow" },
                      {
                        label: "Won",
                        value: team.closedWon,
                        color: "lightgrey",
                      },
                      {
                        label: "Lost",
                        value: team.closedLost,
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

export default TeamAnalyticsDrawer;
