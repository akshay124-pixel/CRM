import React, { useState, useEffect, useMemo, useCallback } from "react";
import { m, motion } from "framer-motion";
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
        console.log(`API Response (Page ${page}):`, response.data);

        const normalizedPage = response.data.map((user) => ({
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

      console.log("Normalized Users:", allUsers);
      console.log(`Total Users Fetched: ${allUsers.length}`);
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
  const [debugInfo, setDebugInfo] = useState(null);

  // Fetch users from API
  const {
    data: users,
    error,
    loading,
    retry,
  } = useCachedApi(
    "https://crm-server-amz7.onrender.com/api/allusers",
    localStorage.getItem("token")
  );

  // Log props for debugging
  useEffect(() => {
    if (isOpen) {
      console.log("TeamAnalytics Props:", { role, entries, dateRange });
    }
  }, [isOpen, role, entries, dateRange]);

  // Calculate team stats
  const teamStatsMemo = useMemo(() => {
    if (role !== "superadmin" || !Array.isArray(users) || users.length === 0) {
      setDebugInfo("No superadmin role or no users found");
      return [];
    }

    // Filter admins and their team members
    const admins = users
      .filter((user) => {
        const userRole =
          typeof user.role === "string" ? user.role.toLowerCase() : "unknown";
        return userRole === "admin";
      })
      .map((admin) => {
        const adminId = admin._id;
        const teamMembers = users
          .filter((u) => {
            const userRole =
              typeof u.role === "string" ? u.role.toLowerCase() : "unknown";
            return userRole === "others" && u.assignedAdmin === adminId;
          })
          .map((u) => ({
            _id: u._id,
            username: DOMPurify.sanitize(u.username),
          }));
        return {
          _id: adminId,
          username: DOMPurify.sanitize(admin.username),
          teamMembers,
        };
      });

    console.log("Admins with Team Members:", admins);

    if (admins.length === 0) {
      setDebugInfo(
        "No users with 'admin' role found. Please ensure admin users exist in the database."
      );
      return [];
    }

    // Initialize stats map for users
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

    console.log("Filtered Entries:", filteredEntries);

    if (filteredEntries.length === 0) {
      setDebugInfo(
        "No entries found; displaying admins and their teams without entries"
      );
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate stats for each user (admin or team member)
    filteredEntries.forEach((entry) => {
      const creatorId =
        entry.createdBy?._id ||
        entry.createdBy?.$oid ||
        entry.createdBy ||
        null;
      if (!creatorId) {
        console.warn(`No creator found for entry:`, entry);
        return;
      }

      const creator = users.find((user) => user._id === creatorId);
      if (!creator) {
        console.warn(`Creator ${creatorId} not found in users:`, entry);
        return;
      }

      const creatorRole =
        typeof creator.role === "string"
          ? creator.role.toLowerCase()
          : "unknown";
      const adminId =
        creatorRole === "admin" ? creator._id : creator.assignedAdmin || null;

      // Only process users who are admins or assigned to an admin
      const admin = admins.find((a) => a._id === adminId);
      if (!admin && creatorRole !== "admin") {
        console.warn(`Admin not found for creator:`, creator);
        return;
      }

      // Initialize stats for the creator
      if (!statsMap[creatorId]) {
        statsMap[creatorId] = {
          _id: creatorId,
          username: DOMPurify.sanitize(creator.username),
          role: creatorRole,
          adminId:
            creatorRole === "admin" ? creator._id : creator.assignedAdmin,
          allTimeEntries: 0,
          monthEntries: 0,
          cold: 0,
          warm: 0,
          hot: 0,
          closedWon: 0,
          closedLost: 0,
          totalClosingAmount: 0,
        };
      }

      // Update stats
      statsMap[creatorId].allTimeEntries += 1;

      const entryDate = new Date(entry.createdAt);
      if (
        entryDate.getMonth() === currentMonth &&
        entryDate.getFullYear() === currentYear
      ) {
        statsMap[creatorId].monthEntries += 1;
      }

      const status = entry.status || null;
      const closetype = entry.closetype || null;

      switch (status) {
        case "Not Interested":
          statsMap[creatorId].cold += 1;
          break;
        case "Maybe":
          statsMap[creatorId].warm += 1;
          break;
        case "Interested":
          statsMap[creatorId].hot += 1;
          break;
        case "Closed":
          if (closetype === "open") {
            // Ignore entries with closetype "open"
          } else if (closetype === "Closed Won") {
            statsMap[creatorId].closedWon += 1;
            if (
              entry.closeamount != null &&
              typeof entry.closeamount === "number" &&
              !isNaN(entry.closeamount)
            ) {
              console.log(
                `TeamAnalytics: Adding closeamount for entry ${entry._id} by ${creator.username}: ₹${entry.closeamount}`
              );
              statsMap[creatorId].totalClosingAmount += entry.closeamount;
            } else {
              console.warn(
                `TeamAnalytics: Invalid closeamount for entry ${entry._id}:`,
                entry
              );
            }
          } else if (closetype === "Closed Lost") {
            statsMap[creatorId].closedLost += 1;
          } else {
            console.warn(
              `TeamAnalytics: Invalid closetype for closed entry ${entry._id}: ${closetype}`,
              entry
            );
          }
          break;
        default:
          console.warn(
            `TeamAnalytics: Invalid status for entry ${entry._id}: ${status}`,
            entry
          );
          break;
      }
    });

    // Aggregate stats into team structure
    const teamStatsResult = admins.map((admin) => {
      const adminStats = statsMap[admin._id] || {
        _id: admin._id,
        username: admin.username,
        role: "admin",
        adminId: admin._id,
        allTimeEntries: 0,
        monthEntries: 0,
        cold: 0,
        warm: 0,
        hot: 0,
        closedWon: 0,
        closedLost: 0,
        totalClosingAmount: 0,
      };

      const membersAnalytics = admin.teamMembers
        .map((member) => statsMap[member._id])
        .filter((stats) => stats); // Only include members with stats

      const teamTotal = membersAnalytics.reduce(
        (acc, member) => ({
          allTimeEntries: acc.allTimeEntries + member.allTimeEntries,
          monthEntries: acc.monthEntries + member.monthEntries,
          cold: acc.cold + member.cold,
          warm: acc.warm + member.warm,
          hot: acc.hot + member.hot,
          closedWon: acc.closedWon + member.closedWon,
          closedLost: acc.closedLost + member.closedLost,
          totalClosingAmount:
            acc.totalClosingAmount + (member.totalClosingAmount || 0),
        }),
        {
          allTimeEntries: adminStats.allTimeEntries,
          monthEntries: adminStats.monthEntries,
          cold: adminStats.cold,
          warm: adminStats.warm,
          hot: adminStats.hot,
          closedWon: adminStats.closedWon,
          closedLost: adminStats.closedLost,
          totalClosingAmount: adminStats.totalClosingAmount || 0,
        }
      );

      return {
        adminId: admin._id,
        adminName: admin.username,
        teamMembers: admin.teamMembers,
        teamMembersCount: admin.teamMembers.length,
        adminAnalytics: {
          username: adminStats.username,
          allTimeEntries: adminStats.allTimeEntries,
          monthEntries: adminStats.monthEntries,
          cold: adminStats.cold,
          warm: adminStats.warm,
          hot: adminStats.hot,
          closedWon: adminStats.closedWon,
          closedLost: adminStats.closedLost,
          totalClosingAmount: adminStats.totalClosingAmount || 0,
        },
        membersAnalytics,
        teamTotal,
      };
    });

    setDebugInfo(
      `Found ${teamStatsResult.length} admin teams with ${users.length} total users`
    );
    console.log("Team Stats Result:", teamStatsResult);

    return teamStatsResult;
  }, [users, entries, role, dateRange]);

  // Modified useEffect to prevent multiple openings
  useEffect(() => {
    let isMounted = true;

    if (isOpen && isMounted) {
      if (role !== "superadmin") {
        toast.error("Access restricted to superadmins only");
        onClose();
      } else if (teamStatsMemo.length > 0) {
        setTeamStats(teamStatsMemo);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, role, onClose, teamStatsMemo]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const stats = teamStats.reduce(
      (acc, team) => ({
        total: acc.total + team.teamTotal.allTimeEntries,
        monthTotal: acc.monthTotal + team.teamTotal.monthEntries,
        hot: acc.hot + team.teamTotal.hot,
        cold: acc.cold + team.teamTotal.cold,
        warm: acc.warm + team.teamTotal.warm,
        closedWon: acc.closedWon + team.teamTotal.closedWon,
        closedLost: acc.closedLost + team.teamTotal.closedLost,
        totalClosingAmount:
          acc.totalClosingAmount + (team.teamTotal.totalClosingAmount || 0),
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
    console.log("TeamAnalytics Overall Stats:", stats);
    return stats;
  }, [teamStats]);

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
          "Total Closing Amount": overallStats.totalClosingAmount,
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
            "Total Closing Amount": team.adminAnalytics.totalClosingAmount,
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
              "Total Closing Amount": member.totalClosingAmount,
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
            "Total Closing Amount": team.teamTotal.totalClosingAmount,
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
      console.error("Export error:", error);
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
    {
      field: "totalClosingAmount",
      headerName: "Total Closure (₹)",
      width: 150,
      valueFormatter: (params) =>
        params.value != null ? params.value.toLocaleString("en-IN") : "₹0",
    },
  ];

  const summaryRows = useMemo(() => {
    const rows = teamStats.map((team) => ({
      id: team.adminId,
      adminName: team.adminName,
      totalEntries: team.teamTotal.allTimeEntries,
      monthEntries: team.teamTotal.monthEntries,
      hot: team.teamTotal.hot,
      cold: team.teamTotal.cold,
      warm: team.teamTotal.warm,
      closedWon: team.teamTotal.closedWon,
      closedLost: team.teamTotal.closedLost,
      totalClosingAmount: team.teamTotal.totalClosingAmount || 0,
    }));
    console.log("Summary Rows:", rows);
    return rows;
  }, [teamStats]);

  // Lazy-loaded team member list
  const MemberRow = ({ index, style, data }) => {
    const member = data.members[index];
    if (!member) return null;
    return (
      <Box style={{ ...style, boxSizing: "border-box" }} sx={{ pl: 2, mb: 2 }}>
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
              {
                label: "Total Closure",
                value: `₹${(member.totalClosingAmount || 0).toLocaleString(
                  "en-IN"
                )}`,
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
          maxHeight: "90vh",
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
          sx={{ color: "white", "&:hover": { color: "#ff8e53" } }}
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
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "1.2rem",
                textAlign: "center",
              }}
            >
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
              py: 8,
            }}
          >
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "1.2rem",
                textAlign: "center",
              }}
            >
              No users found in the system. Please contact support.
            </Typography>
          </Box>
        ) : !teamStats.length ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              py: 8,
            }}
          >
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "1.2rem",
                textAlign: "center",
              }}
            >
              No admin teams found. Ensure users with admin role exist and have
              assigned team members.
            </Typography>
            <Button
              onClick={retry}
              variant="contained"
              sx={{ backgroundColor: "#34d399" }}
            >
              Refresh Data
            </Button>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 4 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.6rem",
                    fontWeight: 600,
                    mb: 2.5,
                    textAlign: "center",
                    textTransform: "uppercase",
                  }}
                >
                  📊 Overall Stats
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, 1fr)",
                      sm: "repeat(4, 1fr)",
                    },
                    gap: "8px",
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
                    {
                      label: "Hot",
                      value: overallStats.hot,
                      color: "yellow",
                    },
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
              <Typography
                sx={{
                  fontSize: "1.4rem",
                  fontWeight: 600,
                  mb: 2,
                  textTransform: "uppercase",
                }}
              >
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
                    "& .MuiDataGrid-columnHeader": {
                      color: "black",
                      background: "rgba(255, 255, 255, 0.2)",
                    },
                    "& .MuiDataGrid-columnHeaderTitle": {
                      fontWeight: "600",
                    },
                  }}
                />
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={showZeroEntries}
                  onChange={() => setShowZeroEntries(!showZeroEntries)}
                  sx={{ color: "#34d399" }}
                />
              }
              label="Show Zero-Entry Members"
              sx={{ mb: 2, color: "rgba(255, 255, 255, 0.9)" }}
            />

            {teamStats.map((team, index) => (
              <Box key={team.adminId} sx={{ mb: 4 }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                  style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    padding: "16px",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
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
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {team.adminName} (Admin)
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        sx={{ fontSize: "1rem", color: "lightgreen" }}
                      >
                        Total: {team.teamTotal.allTimeEntries} | Members:{" "}
                        {team.teamMembersCount}
                      </Typography>
                      <IconButton
                        onClick={() => toggleTeamMembers(team.adminId)}
                        sx={{ color: "white", "&:hover": { color: "#ff8e53" } }}
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
                    <Typography
                      sx={{
                        fontSize: "1.2rem",
                        fontWeight: 500,
                        mb: 1,
                        color: "rgba(255, 255, 255, 0.9)",
                      }}
                    >
                      Admin Analytics
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, 1fr)",
                        },
                        gap: "8px",
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
                        {
                          label: "Total Closure",
                          value: `₹${(
                            team.adminAnalytics.totalClosingAmount || 0
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
                            (No Team Members Assigned)
                          </Typography>
                        )}
                      </Typography>

                      {team.teamMembers.length > 0 ? (
                        <FixedSizeList
                          height={Math.min(
                            team.membersAnalytics.length * 240,
                            400
                          )}
                          width="100%"
                          itemCount={
                            showZeroEntries
                              ? team.membersAnalytics.length
                              : team.membersAnalytics.filter(
                                  (m) => m.allTimeEntries > 0
                                ).length
                          }
                          itemSize={240}
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
            textTransform: "uppercase",
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
