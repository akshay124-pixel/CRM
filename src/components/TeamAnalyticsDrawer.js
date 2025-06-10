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

// Custom hook for API calls with pagination (unchanged)
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
          ...user,
          _id: user._id?.$oid || user._id || user.id || "",
          role:
            typeof user.role === "string" ? user.role.toLowerCase() : "unknown",
          assignedAdmin:
            user.assignedAdmin?.$oid ||
            user.assignedAdmin?._id ||
            user.assignedAdmin ||
            null,
          username: DOMPurify.sanitize(user.username || "Unknown"),
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

// Reusable StatCard component (unchanged)
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

  // Fetch users from API (unchanged)
  const {
    data: users,
    error,
    loading,
    retry,
  } = useCachedApi(
    "https://crm-server-amz7.onrender.com/api/allusers",
    localStorage.getItem("token")
  );

  // Log props for debugging (unchanged)
  useEffect(() => {
    if (isOpen) {
      console.log("TeamAnalytics Props:", { role, entries, dateRange });
      console.log("Sample Entries:", entries.slice(0, 5));
    }
  }, [isOpen, role, entries, dateRange]);

  // Calculate team stats
  const teamStatsMemo = useMemo(() => {
    if (role !== "superadmin" || !Array.isArray(users) || users.length === 0) {
      setDebugInfo("No superadmin role or no users found");
      return [];
    }

    // Filter admins by role
    const admins = users
      .filter((user) => {
        const userRole =
          typeof user.role === "string" ? user.role.toLowerCase() : "unknown";
        console.log(
          `User: ${user.username}, Role: ${userRole}, ID: ${user._id}`
        );
        return userRole === "admin";
      })
      .map((admin) => {
        const adminId = admin._id;
        const teamMembers = users
          .filter((u) => {
            const userRole =
              typeof u.role === "string" ? u.role.toLowerCase() : "unknown";
            if (userRole !== "others") return false;
            const assignedAdmin = u.assignedAdmin;
            console.log(
              `Checking team member: ${u.username}, AssignedAdmin: ${assignedAdmin}, AdminId: ${adminId}`
            );
            return assignedAdmin === adminId;
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

    const statsMap = {};
    const filteredEntries = entries.filter((entry) => {
      const createdAt = new Date(entry.createdAt);
      const isValidDate =
        !dateRange[0].startDate ||
        !dateRange[0].endDate ||
        (createdAt >= new Date(dateRange[0].startDate) &&
          createdAt <= new Date(dateRange[0].endDate));
      if (!isValidDate) {
        console.log(
          `Entry filtered out due to date range (ID: ${entry._id}):`,
          entry
        );
      }
      return isValidDate;
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

    // Initialize stats for all admins
    admins.forEach((admin) => {
      statsMap[admin._id] = {
        adminId: admin._id,
        adminName: admin.username,
        teamLeader: admin.username,
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
          totalClosingAmount: 0,
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
          totalClosingAmount: 0,
        },
      };
    });

    filteredEntries.forEach((entry, index) => {
      const creatorId =
        entry.createdBy?._id ||
        entry.createdBy?.$oid ||
        entry.createdBy ||
        null;
      if (!creatorId) {
        console.warn(
          `Entry ${index} (ID: ${entry._id}) has no valid creatorId:`,
          entry
        );
        return;
      }

      const creator = users.find((user) => user._id === creatorId);
      if (!creator) {
        console.warn(
          `Creator not found for entry ${index} (ID: ${entry._id}):`,
          entry
        );
        return;
      }

      const creatorRole =
        typeof creator.role === "string"
          ? creator.role.toLowerCase()
          : "unknown";
      const adminId =
        creatorRole === "admin" ? creator._id : creator.assignedAdmin || null;

      const admin = admins.find((a) => a._id === adminId);
      if (!admin || !adminId) {
        console.warn(
          `Admin not found for creator in entry ${index} (ID: ${entry._id}):`,
          creator
        );
        return;
      }

      if (!statsMap[adminId]) {
        console.warn(`Stats map not initialized for admin ${adminId}`);
        return;
      }

      const memberId = creator._id;
      const memberName = creator.username;
      let targetAnalytics;

      if (creatorRole === "admin") {
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
            totalClosingAmount: 0,
          };
        }
        targetAnalytics = statsMap[adminId].membersAnalytics[memberId];
      }

      targetAnalytics.allTimeEntries += 1;
      statsMap[adminId].teamTotal.allTimeEntries += 1;

      const entryDate = new Date(entry.createdAt);
      if (
        !isNaN(entryDate) &&
        entryDate.getMonth() === currentMonth &&
        entryDate.getFullYear() === currentYear
      ) {
        targetAnalytics.monthEntries += 1;
        statsMap[adminId].teamTotal.monthEntries += 1;
      }

      const status = entry.status ? entry.status.toLowerCase() : null;
      const closetype = entry.closetype ? entry.closetype.toLowerCase() : null;

      switch (status) {
        case "not interested":
          targetAnalytics.cold += 1;
          statsMap[adminId].teamTotal.cold += 1;
          break;
        case "maybe":
          targetAnalytics.warm += 1;
          statsMap[adminId].teamTotal.warm += 1;
          break;
        case "interested":
          targetAnalytics.hot += 1;
          statsMap[adminId].teamTotal.hot += 1;
          break;
        case "closed":
          if (closetype === "closed won") {
            targetAnalytics.closedWon += 1;
            statsMap[adminId].teamTotal.closedWon += 1;
            const closeAmount =
              typeof entry.closeamount === "number" && !isNaN(entry.closeamount)
                ? entry.closeamount
                : 0;
            if (closeAmount > 0) {
              console.log(
                `Adding closeamount for entry ${index} (ID: ${entry._id}) by ${creator.username}: ₹${closeAmount}`
              );
              targetAnalytics.totalClosingAmount += closeAmount;
              statsMap[adminId].teamTotal.totalClosingAmount += closeAmount;
            } else {
              console.warn(
                `Invalid or zero closeamount for entry ${index} (ID: ${entry._id}):`,
                entry
              );
            }
          } else if (closetype === "closed lost") {
            targetAnalytics.closedLost += 1;
            statsMap[adminId].teamTotal.closedLost += 1;
          } else {
            console.warn(
              `Invalid closetype for closed entry ${index} (ID: ${entry._id}): ${closetype}`,
              entry
            );
          }
          break;
        default:
          console.warn(
            `Invalid status for entry ${index} (ID: ${entry._id}): ${status}`,
            entry
          );
          break;
      }
    });

    console.log("Stats Map:", statsMap);

    const result = admins.map((admin) => {
      const teamData = statsMap[admin._id] || {
        adminAnalytics: {
          username: admin.username,
          allTimeEntries: 0,
          monthEntries: 0,
          cold: 0,
          warm: 0,
          hot: 0,
          closedWon: 0,
          closedLost: 0,
          totalClosingAmount: 0,
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
          totalClosingAmount: 0,
        },
      };

      // Calculate teamTotal.totalClosingAmount as sum of admin and members' closure amounts
      const membersTotalClosingAmount = Object.values(
        teamData.membersAnalytics
      ).reduce((sum, member) => sum + (member.totalClosingAmount || 0), 0);
      teamData.teamTotal.totalClosingAmount =
        teamData.adminAnalytics.totalClosingAmount + membersTotalClosingAmount;

      return {
        adminId: admin._id,
        adminName: admin.username,
        teamMembers: admin.teamMembers,
        teamMembersCount: admin.teamMembers.length,
        adminAnalytics: teamData.adminAnalytics,
        membersAnalytics: Object.values(teamData.membersAnalytics),
        teamTotal: teamData.teamTotal,
      };
    });

    setDebugInfo(
      `Found ${result.length} admin teams with ${users.length} total users`
    );
    console.log("Team Stats Result:", result);

    return result;
  }, [users, entries, role, dateRange]);

  // Modified useEffect to prevent multiple openings (unchanged)
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

  // Calculate overall stats (unchanged)
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

  // Export analytics to Excel (unchanged)
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
            "Team Total Closure": team.teamTotal.totalClosingAmount,
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
      valueFormatter: ({ value }) =>
        value != null ? `₹${value.toLocaleString("en-IN")}` : "₹0",
    },
    {
      field: "teamTotalClosingAmount",
      headerName: "Team Total Closure (₹)",
      width: 150,
      valueFormatter: ({ value }) =>
        value != null ? `₹${value.toLocaleString("en-IN")}` : "₹0",
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
      teamTotalClosingAmount: team.teamTotal.totalClosingAmount || 0,
    }));
    console.log("Summary Rows:", rows);
    return rows;
  }, [teamStats]);

  // Lazy-loaded team member list (unchanged)
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
                        {
                          label: "Team Total Closure",
                          value: `₹${(
                            team.teamTotal.totalClosingAmount || 0
                          ).toLocaleString("en-IN")}`,
                          color: "cyan",
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
