import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Collapse,
  Button,
  Skeleton,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  FaTimes,
  FaUsers,
  FaChevronDown,
  FaChevronUp,
  FaDownload,
} from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import DOMPurify from "dompurify";
import { FixedSizeList } from "react-window";

// Custom hook for API calls with caching
const useCachedApi = (url, token) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const url = "https://crm-server-amz7.onrender.com/api/users";
  const fetchData = useCallback(async () => {
    if (!token) {
      setError("No authentication token found");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
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
      background: "rgba(255, 255, 255, 0.05)",
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

const TeamAnalyticsDrawer = ({
  entries = [],
  isOpen = false,
  onClose = () => {},
  role = "",
  dateRange = [{ startDate: null, endDate: null }],
}) => {
  const [teamStats, setTeamStats] = useState([]);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [showZeroEntries, setShowZeroEntries] = useState(true);

  // Fetch users from API
  const {
    data: users,
    error,
    loading,
    retry,
  } = useCachedApi("/api/users", localStorage.getItem("token"));

  // Calculate team stats
  const teamStatsMemo = useMemo(() => {
    if (role !== "superadmin" || !Array.isArray(users) || users.length === 0)
      return [];

    // Filter admins
    const admins = users
      .filter((user) => user.role === "admin")
      .map((admin) => ({
        _id: admin._id,
        username: DOMPurify.sanitize(admin.username),
        teamMembers: users
          .filter(
            (u) =>
              u.role === "others" &&
              (typeof u.assignedAdmin === "string"
                ? u.assignedAdmin === admin._id
                : u.assignedAdmin?.$oid === admin._id)
          )
          .map((u) => ({
            _id: u._id,
            username: DOMPurify.sanitize(u.username),
          })),
      }));

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

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    filteredEntries.forEach((entry) => {
      const creator = users.find((user) => user._id === entry.createdBy?._id);
      if (!creator) return;

      const adminId =
        creator.role === "admin"
          ? creator._id
          : typeof creator.assignedAdmin === "string"
          ? creator.assignedAdmin
          : creator.assignedAdmin?.$oid;
      const admin = admins.find((a) => a._id === adminId);

      if (!admin || !adminId) return;

      if (!statsMap[adminId]) {
        statsMap[adminId] = {
          adminId,
          adminName: admin.username,
          teamMembers: admin.teamMembers,
          adminAnalytics: {
            username: admin.username,
            allTimeEntries: 0,
            monthEntries: 0,
            cold: 0,
            warm: 0,
            hot: 0,
            closedWon: 0,
            closedLost: 0,
          },
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

      const memberId = creator._id;
      const memberName = creator.username;
      let targetAnalytics;

      if (creator.role === "admin") {
        targetAnalytics = statsMap[adminId].adminAnalytics;
      } else {
        if (!statsMap[adminId].membersAnalytics[memberId]) {
          statsMap[adminId].membersAnalytics[memberId] = {
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
        targetAnalytics = statsMap[adminId].membersAnalytics[memberId];
      }

      targetAnalytics.allTimeEntries += 1;
      statsMap[adminId].teamTotal.allTimeEntries += 1;

      const entryDate = new Date(entry.createdAt);
      if (
        entryDate.getMonth() === currentMonth &&
        entryDate.getFullYear() === currentYear
      ) {
        targetAnalytics.monthEntries += 1;
        statsMap[adminId].teamTotal.monthEntries += 1;
      }

      switch (entry.status) {
        case "Not Interested":
          targetAnalytics.cold += 1;
          statsMap[adminId].teamTotal.cold += 1;
          break;
        case "Maybe":
          targetAnalytics.warm += 1;
          statsMap[adminId].teamTotal.warm += 1;
          break;
        case "Interested":
          targetAnalytics.hot += 1;
          statsMap[adminId].teamTotal.hot += 1;
          break;
        case "Closed":
          if (entry.closetype === "Closed Won") {
            targetAnalytics.closedWon += 1;
            statsMap[adminId].teamTotal.closedWon += 1;
          } else if (entry.closetype === "Closed Lost") {
            targetAnalytics.closedLost += 1;
            statsMap[adminId].teamTotal.closedLost += 1;
          }
          break;
        default:
          break;
      }
    });

    return admins.map((admin) => ({
      adminId: admin._id,
      adminName: admin.username,
      teamMembers: admin.teamMembers,
      adminAnalytics: statsMap[admin._id]?.adminAnalytics || {
        username: admin.username,
        allTimeEntries: 0,
        monthEntries: 0,
        cold: 0,
        warm: 0,
        hot: 0,
        closedWon: 0,
        closedLost: 0,
      },
      membersAnalytics: statsMap[admin._id]?.membersAnalytics
        ? Object.values(statsMap[admin._id].membersAnalytics)
        : [],
      teamTotal: statsMap[admin._id]?.teamTotal || {
        allTimeEntries: 0,
        monthEntries: 0,
        cold: 0,
        warm: 0,
        hot: 0,
        closedWon: 0,
        closedLost: 0,
      },
    }));
  }, [users, entries, role, dateRange]);

  useEffect(() => {
    if (isOpen && role === "superadmin") {
      setTeamStats(teamStatsMemo);
    } else if (isOpen && role !== "superadmin") {
      toast.error("Access restricted to superadmins only");
      onClose();
    }
  }, [isOpen, role, teamStatsMemo, onClose]);

  // Calculate overall stats
  const overallStats = useMemo(
    () =>
      teamStats.reduce(
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
      ),
    [teamStats]
  );

  // Export analytics to Excel
  const handleExport = useCallback(() => {
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
        ...teamStats.flatMap((team) => [
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
          ...team.membersAnalytics
            .filter((m) => showZeroEntries || m.allTimeEntries > 0)
            .map((member) => ({
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
      toast.success("Team analytics exported successfully!");
    } catch (error) {
      toast.error("Failed to export team analytics!");
    }
  }, [teamStats, overallStats, dateRange, showZeroEntries]);

  const toggleTeamMembers = useCallback((adminId) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [adminId]: !prev[adminId],
    }));
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // DataGrid columns for summary table
  const summaryColumns = [
    { field: "adminName", headerName: "Team", width: 150 },
    { field: "totalEntries", headerName: "Total Entries", width: 120 },
    { field: "monthEntries", headerName: "This Month", width: 120 },
    { field: "hot", headerName: "Hot", width: 100 },
    { field: "cold", headerName: "Cold", width: 100 },
    { field: "warm", headerName: "Warm", width: 100 },
    { field: "closedWon", headerName: "Won", width: 100 },
    { field: "closedLost", headerName: "Lost", width: 100 },
  ];

  const summaryRows = teamStats.map((team) => ({
    id: team.adminId,
    adminName: team.adminName,
    totalEntries: team.teamTotal.allTimeEntries,
    monthEntries: team.teamTotal.monthEntries,
    hot: team.teamTotal.hot,
    cold: team.teamTotal.cold,
    warm: team.teamTotal.warm,
    closedWon: team.teamTotal.closedWon,
    closedLost: team.teamTotal.closedLost,
  }));

  // Lazy-loaded team member list
  const MemberRow = ({ index, style, data }) => {
    const member = data.members[index];
    if (!member) return null;
    return (
      <Box style={style} sx={{ pl: 2, mb: 2 }}>
        <Typography
          sx={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.95)",
            mb: 1,
          }}
        >
          {member.username} {member.allTimeEntries === 0 && "(No Entries)"}
        </Typography>
        {member.allTimeEntries > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
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
              { label: "Cold", value: member.cold, color: "orange" },
              { label: "Warm", value: member.warm, color: "lightgreen" },
              { label: "Hot", value: member.hot, color: "yellow" },
              { label: "Won", value: member.closedWon, color: "lightgrey" },
              { label: "Lost", value: member.closedLost, color: "#e91e63" },
            ].map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                color={stat.color}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Drawer
      anchor="bottom"
      open={isOpen}
      onClose={onClose}
      onKeyDown={handleKeyDown}
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
        role: "dialog",
        "aria-label": "Team Analytics Dashboard",
      }}
    >
      <Box
        sx={{
          padding: 3,
          background: "rgba(255, 255, 255, 0.1)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontSize: "1.6rem",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
          }}
        >
          Team Analytics
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ color: "white" }}
          aria-label="Close analytics dashboard"
        >
          <FaTimes size={22} />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 4 }}>
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={100}
                sx={{ borderRadius: 2 }}
              />
            ))}
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              py: 4,
            }}
          >
            <Typography sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
              {error}
            </Typography>
            <Button
              onClick={retry}
              variant="contained"
              sx={{ backgroundColor: "#34d399" }}
            >
              Retry
            </Button>
          </Box>
        ) : !users || users.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              py: 4,
            }}
          >
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "1.2rem",
                textAlign: "center",
              }}
            >
              No user data available. Please check the API endpoint (/api/users)
              or contact support.
            </Typography>
          </Box>
        ) : teamStats.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              py: 4,
            }}
          >
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "1.2rem",
                textAlign: "center",
              }}
            >
              No team data available. Ensure users with 'admin' role exist and
              entries are created.
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 4 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                sx={{
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "16px",
                  p: 3,
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.6rem",
                    fontWeight: 700,
                    mb: 2.5,
                    textAlign: "center",
                  }}
                >
                  📊 Overall Statistics
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, 1fr)",
                      sm: "repeat(4, 1fr)",
                    },
                    gap: 1,
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

            <Box sx={{ mb: 4 }}>
              <Typography sx={{ fontSize: "1.4rem", fontWeight: 700, mb: 2 }}>
                Team Summary
              </Typography>
              <Box sx={{ height: 300, width: "100%" }}>
                <DataGrid
                  rows={summaryRows}
                  columns={summaryColumns}
                  pageSizeOptions={[5, 10]}
                  sx={{
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    "& .MuiDataGrid-cell": { color: "white" },
                    "& .MuiDataGrid-columnHeader": { color: "white" },
                  }}
                />
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={showZeroEntries}
                  onChange={() => setShowZeroEntries((prev) => !prev)}
                  color="primary"
                />
              }
              label="Show Zero-Entry Members"
              sx={{ mb: 2, color: "rgba(255, 255, 255, 0.9)" }}
            />

            {teamStats.map((team, index) => (
              <Box key={team.adminId} sx={{ mb: 3 }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  sx={{
                    background: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    p: 3,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
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
                    <Typography
                      sx={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        textTransform: "capitalize",
                      }}
                    >
                      {team.adminName}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        sx={{ fontSize: "1.1rem", color: "lightgreen" }}
                      >
                        Total: {team.teamTotal.allTimeEntries}
                      </Typography>
                      <IconButton
                        onClick={() => toggleTeamMembers(team.adminId)}
                        sx={{ color: "white" }}
                        aria-label={`Toggle team members for ${team.adminName}`}
                      >
                        {expandedTeams[team.adminId] ? (
                          <FaChevronUp size={16} />
                        ) : (
                          <FaChevronDown size={16} />
                        )}
                      </IconButton>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
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
                        <StatCard
                          key={stat.label}
                          label={stat.label}
                          value={stat.value}
                          color={stat.color}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Collapse in={expandedTeams[team.adminId]}>
                    <Box sx={{ pl: 2 }}>
                      <Typography
                        sx={{
                          fontSize: "1.1rem",
                          fontWeight: 500,
                          color: "rgba(255, 255, 255, 0.9)",
                          mb: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <FaUsers /> Team Members
                        {team.teamMembers.length === 0 && (
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
                      {team.teamMembers.length > 0 ? (
                        <FixedSizeList
                          height={Math.min(team.teamMembers.length * 150, 300)}
                          width="100%"
                          itemCount={
                            showZeroEntries
                              ? team.membersAnalytics.length
                              : team.membersAnalytics.filter(
                                  (m) => m.allTimeEntries > 0
                                ).length
                          }
                          itemSize={150}
                          itemData={{
                            members: showZeroEntries
                              ? team.membersAnalytics
                              : team.membersAnalytics.filter(
                                  (m) => m.allTimeEntries > 0
                                ),
                          }}
                        >
                          {MemberRow}
                        </FixedSizeList>
                      ) : null}
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
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <FaDownload size={16} /> Export Analytics
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
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Close Dashboard
        </motion.button>
      </Box>
    </Drawer>
  );
};

export default TeamAnalyticsDrawer;
