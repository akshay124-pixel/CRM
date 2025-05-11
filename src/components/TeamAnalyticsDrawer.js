import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Drawer, Box, Typography, IconButton, Collapse } from "@mui/material";
import { FaTimes, FaUsers, FaChevronDown, FaChevronUp } from "react-icons/fa";
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
  const [expandedTeams, setExpandedTeams] = useState({});

  useEffect(() => {
    const fetchTeamStats = async () => {
      if (role !== "superadmin") return;
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "https://crm-server-amz7.onrender.com/api/users",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const users = response.data;

        // Build team structure with individual analytics
        const relevantAdmins = users
          .filter((user) => user.role === "admin")
          .map((admin) => ({
            _id: admin._id,
            username: admin.username,
            teamMembers: users
              .filter(
                (u) =>
                  u.role === "others" && u.assignedAdmin?.$oid === admin._id
              )
              .map((u) => ({ _id: u._id, username: u.username })),
          }));
        relevantAdmins.push({
          _id: null,
          username: "Unassigned",
          teamMembers: [],
        });

        const statsMap = {};
        const filteredEntries = entries.filter((entry) => {
          const createdAt = new Date(entry.createdAt);
          return (
            !dateRange[0].startDate ||
            !dateRange[0].endDate ||
            (createdAt >= new Date(dateRange[0].startDate) &&
              createdAt <= new Date(dateRange[0].endDate))
          );
        });

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        filteredEntries.forEach((entry) => {
          const creator = users.find(
            (user) => user._id === entry.createdBy?._id
          );
          if (!creator) return;

          const adminId =
            creator.role === "admin"
              ? creator._id
              : creator.assignedAdmin?.$oid || null;
          const admin = relevantAdmins.find((a) => a._id === adminId);

          if (admin || adminId === null) {
            const adminKey = adminId || "unassigned";
            if (!statsMap[adminKey]) {
              statsMap[adminKey] = {
                adminId: adminId,
                adminName: admin?.username || "Unassigned",
                teamMembers: admin?.teamMembers || [],
                adminAnalytics: adminId
                  ? {
                      username: admin.username,
                      allTimeEntries: 0,
                      monthEntries: 0,
                      cold: 0,
                      warm: 0,
                      hot: 0,
                      closedWon: 0,
                      closedLost: 0,
                    }
                  : null,
                membersAnalytics: {},
                teamTotal: {
                  allTimeEntries: 0,
                  monthEntries: 0,
                  cold: 0,
                  warm: 0,
                  hot: 0,
                  closedWon: 0,
                  closedLost: 0,
                },
              };
            }

            // Update analytics
            const memberId = creator._id;
            const memberName = creator.username;
            let targetAnalytics;

            if (creator.role === "admin" && adminId) {
              targetAnalytics = statsMap[adminKey].adminAnalytics;
            } else {
              if (!statsMap[adminKey].membersAnalytics[memberId]) {
                statsMap[adminKey].membersAnalytics[memberId] = {
                  username: memberName,
                  allTimeEntries: 0,
                  monthEntries: 0,
                  cold: 0,
                  warm: 0,
                  hot: 0,
                  closedWon: 0,
                  closedLost: 0,
                };
              }
              targetAnalytics = statsMap[adminKey].membersAnalytics[memberId];
            }

            targetAnalytics.allTimeEntries += 1;
            statsMap[adminKey].teamTotal.allTimeEntries += 1;

            const entryDate = new Date(entry.createdAt);
            if (
              entryDate.getMonth() === currentMonth &&
              entryDate.getFullYear() === currentYear
            ) {
              targetAnalytics.monthEntries += 1;
              statsMap[adminKey].teamTotal.monthEntries += 1;
            }

            switch (entry.status) {
              case "Not Interested":
                targetAnalytics.cold += 1;
                statsMap[adminKey].teamTotal.cold += 1;
                break;
              case "Maybe":
                targetAnalytics.warm += 1;
                statsMap[adminKey].teamTotal.warm += 1;
                break;
              case "Interested":
                targetAnalytics.hot += 1;
                statsMap[adminKey].teamTotal.hot += 1;
                break;
              case "Closed":
                if (entry.closetype === "Closed Won") {
                  targetAnalytics.closedWon += 1;
                  statsMap[adminKey].teamTotal.closedWon += 1;
                } else if (entry.closetype === "Closed Lost") {
                  targetAnalytics.closedLost += 1;
                  statsMap[adminKey].teamTotal.closedLost += 1;
                }
                break;
              default:
                break;
            }
          }
        });

        // Convert membersAnalytics to array
        const finalStats = Object.values(statsMap).map((team) => ({
          ...team,
          membersAnalytics: Object.values(team.membersAnalytics),
        }));

        setTeamStats(finalStats);
      } catch (error) {
        console.error("Error fetching team analytics:", error);
        toast.error("Failed to load team analytics!");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && role === "superadmin") fetchTeamStats();
  }, [entries, isOpen, role, dateRange]);

  const overallStats = teamStats.reduce(
    (acc, team) => ({
      total: acc.total + team.teamTotal.allTimeEntries,
      monthTotal: acc.monthTotal + team.teamTotal.monthEntries,
      hot: acc.hot + team.teamTotal.hot,
      cold: acc.cold + team.teamTotal.cold,
      warm: acc.warm + team.teamTotal.warm,
      closedWon: acc.closedWon + team.teamTotal.closedWon,
      closedLost: acc.closedLost + team.teamTotal.closedLost,
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

  const handleExport = () => {
    try {
      const exportData = [
        {
          Section: "Overall Statistics",
          Team: "",
          "Team Leader": "",
          Member: "",
          "Total Entries": overallStats.total,
          "This Month": overallStats.monthTotal,
          Hot: overallStats.hot,
          Cold: overallStats.cold,
          Warm: overallStats.warm,
          Won: overallStats.closedWon,
          Lost: overallStats.closedLost,
        },
        {
          Section: "",
          Team: "",
          "Team Leader": "",
          Member: "",
          "Total Entries": "",
          "This Month": "",
          Hot: "",
          Cold: "",
          Warm: "",
          Won: "",
          Lost: "",
        },
        ...teamStats.flatMap((team) => [
          ...(team.adminAnalytics
            ? [
                {
                  Section: "Admin Statistics",
                  Team: team.adminName,
                  "Team Leader": team.adminName,
                  Member: team.adminAnalytics.username,
                  "Total Entries": team.adminAnalytics.allTimeEntries,
                  "This Month": team.adminAnalytics.monthEntries,
                  Hot: team.adminAnalytics.hot,
                  Cold: team.adminAnalytics.cold,
                  Warm: team.adminAnalytics.warm,
                  Won: team.adminAnalytics.closedWon,
                  Lost: team.adminAnalytics.closedLost,
                },
              ]
            : []),
          ...team.membersAnalytics.map((member) => ({
            Section: "Member Statistics",
            Team: team.adminName,
            "Team Leader": team.adminName,
            Member: member.username,
            "Total Entries": member.allTimeEntries,
            "This Month": member.monthEntries,
            Hot: member.hot,
            Cold: member.cold,
            Warm: member.warm,
            Won: member.closedWon,
            Lost: member.closedLost,
          })),
          ...team.teamMembers
            .filter(
              (m) =>
                !team.membersAnalytics.some((ma) => ma.username === m.username)
            )
            .map((member) => ({
              Section: "Team Members (No Entries)",
              Team: team.adminName,
              "Team Leader": team.adminName,
              Member: member.username,
              "Total Entries": 0,
              "This Month": 0,
              Hot: 0,
              Cold: 0,
              Warm: 0,
              Won: 0,
              Lost: 0,
            })),
          {
            Section: "Team Total",
            Team: team.adminName,
            "Team Leader": team.adminName,
            Member: "",
            "Total Entries": team.teamTotal.allTimeEntries,
            "This Month": team.teamTotal.monthEntries,
            Hot: team.teamTotal.hot,
            Cold: team.teamTotal.cold,
            Warm: team.teamTotal.warm,
            Won: team.teamTotal.closedWon,
            Lost: team.teamTotal.closedLost,
          },
        ]),
      ];

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Team Analytics");

      const colWidths = Object.keys(exportData[0]).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...exportData.map((row) => String(row[key] || "").length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet["!cols"] = colWidths;

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

  const toggleTeamMembers = (adminId) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [adminId]: !prev[adminId],
    }));
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
                    display: "flex",
                    gap: 4,
                    mb: 2,
                    justifyContent: "center",
                    flexWrap: "wrap",
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
                        flex: "1 1 150px",
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
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, 1fr)",
                      sm: "repeat(3, 1fr)",
                    },
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

            {teamStats.map((team, index) => (
              <Box key={team.adminName + index} sx={{ mb: 3 }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  sx={{
                    background: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    p: 3,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    "&:hover": {
                      background: "rgba(255, 255, 255, 0.2)",
                      transform: "translateY(-2px)",
                      transition: "all 0.2s ease",
                    },
                  }}
                >
                  <Box
                    sx={{
                      mb: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        sx={{
                          fontSize: "1.5rem",
                          fontWeight: "700",
                          letterSpacing: "0.4px",
                          textTransform: "capitalize",
                          textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        {team.adminName} Team
                      </Typography>
                      <IconButton
                        onClick={() =>
                          toggleTeamMembers(team.adminId || "unassigned")
                        }
                        sx={{ color: "white", p: 0.5 }}
                      >
                        {expandedTeams[team.adminId || "unassigned"] ? (
                          <FaChevronUp size={16} />
                        ) : (
                          <FaChevronDown size={16} />
                        )}
                      </IconButton>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "1.1rem",
                        fontWeight: "600",
                        color: "lightgreen",
                        textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      Total: {team.teamTotal.allTimeEntries}
                    </Typography>
                  </Box>

                  {team.adminAnalytics && (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        sx={{
                          fontSize: "1.1rem",
                          fontWeight: "600",
                          color: "rgba(255, 255, 255, 0.95)",
                          mb: 1,
                        }}
                      >
                        Admin: {team.adminAnalytics.username}
                      </Typography>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, 1fr)",
                          },
                          gap: 1,
                        }}
                      >
                        {[
                          {
                            label: "Total Entries",
                            value: team.adminAnalytics.allTimeEntries,
                            color: "lightgreen",
                          },
                          {
                            label: "This Month",
                            value: team.adminAnalytics.monthEntries,
                            color: "yellow",
                          },
                          {
                            label: "Cold",
                            value: team.adminAnalytics.cold,
                            color: "orange",
                          },
                          {
                            label: "Warm",
                            value: team.adminAnalytics.warm,
                            color: "lightgreen",
                          },
                          {
                            label: "Hot",
                            value: team.adminAnalytics.hot,
                            color: "yellow",
                          },
                          {
                            label: "Won",
                            value: team.adminAnalytics.closedWon,
                            color: "lightgrey",
                          },
                          {
                            label: "Lost",
                            value: team.adminAnalytics.closedLost,
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
                                fontSize: "0.95rem",
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
                    </Box>
                  )}

                  <Collapse in={expandedTeams[team.adminId || "unassigned"]}>
                    <Box sx={{ mb: 2, pl: 2 }}>
                      <Typography
                        sx={{
                          fontSize: "1.1rem",
                          fontWeight: "500",
                          color: "rgba(255, 255, 255, 0.9)",
                          mb: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <FaUsers /> Team Members
                        {team.teamMembers.length === 0 &&
                          team.adminId !== null && (
                            <Typography
                              sx={{
                                fontSize: "0.9rem",
                                color: "rgba(255, 255, 255, 0.7)",
                                ml: 1,
                              }}
                            >
                              (None Assigned)
                            </Typography>
                          )}
                      </Typography>
                      {team.membersAnalytics.map((member, mIndex) => (
                        <Box key={mIndex} sx={{ mb: 2, ml: 2 }}>
                          <Typography
                            sx={{
                              fontSize: "1rem",
                              fontWeight: "600",
                              color: "rgba(255, 255, 255, 0.95)",
                              mb: 1,
                            }}
                          >
                            {member.username}
                          </Typography>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                              },
                              gap: 1,
                            }}
                          >
                            {[
                              {
                                label: "Total Entries",
                                value: member.allTimeEntries,
                                color: "lightgreen",
                              },
                              {
                                label: "This Month",
                                value: member.monthEntries,
                                color: "yellow",
                              },
                              {
                                label: "Cold",
                                value: member.cold,
                                color: "orange",
                              },
                              {
                                label: "Warm",
                                value: member.warm,
                                color: "lightgreen",
                              },
                              {
                                label: "Hot",
                                value: member.hot,
                                color: "yellow",
                              },
                              {
                                label: "Won",
                                value: member.closedWon,
                                color: "lightgrey",
                              },
                              {
                                label: "Lost",
                                value: member.closedLost,
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
                                    fontSize: "0.95rem",
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
                        </Box>
                      ))}
                      {team.teamMembers
                        .filter(
                          (m) =>
                            !team.membersAnalytics.some(
                              (ma) => ma.username === m.username
                            )
                        )
                        .map((member) => (
                          <Box key={member._id} sx={{ mb: 2, ml: 2 }}>
                            <Typography
                              sx={{
                                fontSize: "1rem",
                                fontWeight: "600",
                                color: "rgba(255, 255, 255, 0.95)",
                                mb: 1,
                              }}
                            >
                              {member.username} (No Entries)
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  </Collapse>
                </motion.div>
              </Box>
            ))}
          </>
        )}
      </Box>

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
