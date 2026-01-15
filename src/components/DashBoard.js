import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";
import { statesAndCities } from "./Options.js";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import TeamAnalyticsDrawer from "./TeamAnalyticsDrawer.js";
import { jwtDecode } from "jwt-decode";
import { validatePhoneNumber } from "../utils/phoneValidation";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import AttendanceTracker from "./AttendanceTracker";
import {
  FaClock,
  FaEye,
  FaPlus,
  FaFileExcel,
  FaUpload,
  FaUsers,
  FaChartBar,
  FaCheckCircle,
} from "react-icons/fa";
import api, { getAccessToken } from "../utils/api";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import { AutoSizer, List } from "react-virtualized";
import debounce from "lodash/debounce";
import { motion } from "framer-motion";
import AddEntry from "./AddEntry";
import EditEntry from "./EditEntry";
import DeleteModal from "./Delete";
import ViewEntry from "./ViewEntry";
import TeamBuilder from "./TeamBuilder";
import AdminDrawer from "./AdminDrawer";
import ValueAnalyticsDrawer from "./ValueAnalyticsDrawer.js";
import { FixedSizeList } from "react-window";
import TablePagination from "./TablePagination";
import io from "socket.io-client";

// Custom hook for mobile detection
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

const useClickDebounce = (delay = 300) => {
  const isDebouncingRef = useRef(false);
  const [isDebouncingState, setIsDebouncingState] = useState(false);

  const clickDebounce = useCallback(
    (callback) => {
      if (isDebouncingRef.current) return;

      isDebouncingRef.current = true;
      setIsDebouncingState(true);

      callback();

      setTimeout(() => {
        isDebouncingRef.current = false;
        setIsDebouncingState(false);
      }, delay);
    },
    [delay]
  );

  return { clickDebounce, isDebouncing: isDebouncingState };
};

const CallTrackingDashboard = ({ stats, onFilterChange, selectedCategory }) => {
  const callStats = stats || {
    cold: 0,
    warm: 0,
    hot: 0,
    closedWon: 0,
    closedLost: 0,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ mb: 4 }}>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2} justifyContent="center">
          {[
            {
              title: "Closed Won",
              value: callStats.closedWon,
              color: "#0288d1",
              chip: "Won",
              border: "Closed Won",
            },
            {
              title: "Closed Lost",
              value: callStats.closedLost,
              color: "#d32f2f",
              chip: "Lost",
              border: "Closed Lost",
            },
            {
              title: "Hot Calls",
              value: callStats.hot,
              color: "#d81b60",
              chip: "Interested",
              border: "Interested",
            },
            {
              title: "Warm Calls",
              value: callStats.warm,
              color: "#f57c00",
              chip: "Maybe",
              border: "Maybe",
            },
            {
              title: "Cold Calls",
              value: callStats.cold,
              color: "#388e3c",
              chip: "Not Interested",
              border: "Not Interested",
            },
          ].map((stat) => (
            <Grid item xs={12} sm={6} md={2.4} key={stat.title}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  sx={{
                    backgroundColor: stat.title.includes("Closed Won")
                      ? "#e3f2fd"
                      : stat.title.includes("Closed Lost")
                      ? "#ffebee"
                      : stat.title.includes("Hot")
                      ? "#ffcdd2"
                      : stat.title.includes("Warm")
                      ? "#fff3e0"
                      : "#e8f5e9",
                    boxShadow: 3,
                    border:
                      selectedCategory === stat.border
                        ? `2px solid ${stat.color}`
                        : "none",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onClick={() => onFilterChange(stat.border)}
                >
                  <CardContent>
                    <Typography
                      variant="h6"
                      color="textSecondary"
                      sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                    >
                      {stat.title}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: "bold",
                        color: stat.color,
                        fontSize: { xs: "1.5rem", sm: "2rem" },
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Chip
                      label={stat.chip}
                      size="small"
                      color={
                        stat.title.includes("Closed Won")
                          ? "primary"
                          : stat.title.includes("Closed Lost")
                          ? "error"
                          : stat.title.includes("Hot")
                          ? "secondary"
                          : stat.title.includes("Warm")
                          ? "warning"
                          : "success"
                      }
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>
    </motion.div>
  );
};
function DashBoard() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const {
    user,
    role,
    userId,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isTeamBuilderOpen, setIsTeamBuilderOpen] = useState(false);
  const [drawerState, setDrawerState] = useState({
    isOpen: false,
    type: null, // 'admin', 'team', 'value', 'attendance', 'analyticsModal'
    isTransitioning: false,
  });
  const { clickDebounce, isDebouncing } = useClickDebounce(300);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [entryToView, setEntryToView] = useState(null);
  const [itemIdToDelete, setItemIdToDelete] = useState(null);
  const [itemIdsToDelete, setItemIdsToDelete] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsername, setSelectedUsername] = useState("");
  const [usernames, setUsernames] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [dashboardFilter, setDashboardFilter] = useState("total");
  const [dateRange, setDateRange] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [doubleClickInitiated, setDoubleClickInitiated] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const id = open ? "date-range-popover" : undefined;
  const recentOpsRef = useRef(new Map());
  const wasRecent = useCallback((id, type, windowMs = 3000) => {
    const key = `${id}:${type}`;
    const t = recentOpsRef.current.get(key);
    return t ? Date.now() - t < windowMs : false;
  }, []);
  const recordOp = useCallback((id, type) => {
    recentOpsRef.current.set(`${id}:${type}`, Date.now());
  }, []);

  const handleDrawerOpen = useCallback(
    (drawerType, event) => {
      if (event) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
      }

      clickDebounce(() => {
        // Atomic state update
        setDrawerState({
          isOpen: true,
          type: drawerType,
          isTransitioning: false,
        });
      });
    },
    [clickDebounce]
  );

  const handleDrawerClose = useCallback(
    (event) => {
      if (event) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
      }

      clickDebounce(() => {
        setDrawerState({
          isOpen: false,
          type: null,
          isTransitioning: false,
        });
      });
    },
    [clickDebounce]
  );

  const handleDateClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDateClose = () => {
    setAnchorEl(null);
  };

  const handleDateSelect = (ranges) => {
    setDateRange([ranges.selection]);
    // Optional: Close on selection or keep open
    // setAnchorEl(null);
  };

  // Static ranges configuration
  const staticRanges = [
    {
      label: "Today",
      range: () => ({
        startDate: new Date(),
        endDate: new Date(),
      }),
    },
    {
      label: "Yesterday",
      range: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          startDate: yesterday,
          endDate: yesterday,
        };
      },
    },
    {
      label: "Last 7 Days",
      range: () => {
        const start = new Date();
        start.setDate(start.getDate() - 6);
        return {
          startDate: start,
          endDate: new Date(),
        };
      },
    },
    {
      label: "Last 30 Days",
      range: () => {
        const start = new Date();
        start.setDate(start.getDate() - 29);
        return {
          startDate: start,
          endDate: new Date(),
        };
      },
    },
    {
      label: "This Month",
      range: () => {
        const now = new Date();
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
      },
    },
    {
      label: "Last Month",
      range: () => {
        const now = new Date();
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          endDate: new Date(now.getFullYear(), now.getMonth(), 0),
        };
      },
    },
  ];

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    pages: 1,
  });
  const [backendStats, setBackendStats] = useState({
    cold: 0,
    warm: 0,
    hot: 0,
    closedWon: 0,
    closedLost: 0,
    totalVisits: 0,
    monthlyVisits: 0,
  });
  const [analyticsEntries, setAnalyticsEntries] = useState([]);
  const [drawerUsers, setDrawerUsers] = useState([]);
  const analyticsLock = useRef(false);

  // Fetch Full Entries for Analytics (Drawers)
  const fetchUsersForDropdown = useCallback(async () => {
    try {
      const response = await api.get("/api/users");

      if (Array.isArray(response.data)) {
        const uniqueUsernames = [
          ...new Set(
            response.data.map((user) => user.username).filter((name) => name)
          ),
        ];
        setUsernames(uniqueUsernames.sort((a, b) => a.localeCompare(b)));
      }
    } catch (error) {
      console.error("Error fetching users for dropdown:", error);
    }
  }, []);

  const fetchAnalyticsEntries = useCallback(async () => {
    try {
      const params = { type: "analytics" };

      // if (selectedUsername) params.username = selectedUsername;
      // if (selectedState) params.state = selectedState;
      // if (selectedCity) params.city = selectedCity;
      // if (dashboardFilter && dashboardFilter !== "total") params.status = dashboardFilter;
      // Pass date filters if they exist (to match dashboard filters)
      if (dateRange[0].startDate && dateRange[0].endDate) {
        const start = new Date(dateRange[0].startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(dateRange[0].endDate);
        end.setHours(23, 59, 59, 999);

        params.fromDate = start.toISOString();
        params.toDate = end.toISOString();
      }

      const response = await api.get("/api/fetch-entry", {
        params: params,
      });

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];
      setAnalyticsEntries(data);
      return data;
    } catch (error) {
      console.error("Fetch analytics entries error:", error);
      throw error;
    }
  }, [dashboardFilter, dateRange]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        status: dashboardFilter,
        username: selectedUsername,
        state: selectedState,
        city: selectedCity,
      };

      if (dateRange[0].startDate && dateRange[0].endDate) {
        const start = new Date(dateRange[0].startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(dateRange[0].endDate);
        end.setHours(23, 59, 59, 999);

        params.fromDate = start.toISOString();
        params.toDate = end.toISOString();
      }

      const response = await api.get("/api/fetch-entry", {
        params: params,
      });

      if (response.data.success && response.data.pagination) {
        const sorted = [...response.data.data].sort((a, b) => {
          const aU = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bU = new Date(b.updatedAt || b.createdAt || 0).getTime();
          if (bU !== aU) return bU - aU;
          const aC = new Date(a.createdAt || 0).getTime();
          const bC = new Date(b.createdAt || 0).getTime();
          return bC - aC;
        });
        setEntries(sorted);
        setPagination((prev) => ({
          ...prev,
          ...response.data.pagination,
        }));
        setBackendStats(response.data.stats);

        // Populate usernames for dropdown from the current page (or separate API?)
        // The original code populated from ALL entries.
        // If we only have 10 entries, dropdown will be incomplete.
        // Ideally, we should fetch users separately.
        // But for now, let's keep it as is or rely on what we have.
        // If role is superadmin/admin, we might need to fetch all users differently.
        // The backend logic for 'fetchEntries' populates createdBy/assignedTo.
      } else {
        // Fallback
        const data = Array.isArray(response.data) ? response.data : [];
        setEntries(data);
      }
    } catch (error) {
      console.error("Fetch entries error:", error.message);
      const message =
        error.message === "Network Error"
          ? "Network problem detected. Please check your internet connection."
          : "Sorry, we couldn't load the entries right now. Please try again later.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    dashboardFilter,
    selectedUsername,
    selectedState,
    selectedCity,
    dateRange,
    role,
  ]);

  useEffect(() => {
    // fetchUserDetails is no longer needed
  }, []);

  useEffect(() => {
    if (!authLoading && role && userId) {
      fetchEntries();
      // Only fetch users for dropdown if role is superadmin or admin
      if (role === "superadmin" || role === "admin") {
        fetchUsersForDropdown();
      }
    }
  }, [authLoading, role, userId, fetchEntries, fetchUsersForDropdown]);

  const matchesContext = useCallback(
    (entry) => {
      if (!entry) return false;

      // 1. Status Filter (dashboardFilter)
      if (dashboardFilter && dashboardFilter !== "total") {
        if (dashboardFilter === "Closed Won") {
          if (entry.status !== "Closed" || entry.closetype !== "Closed Won")
            return false;
        } else if (dashboardFilter === "Closed Lost") {
          if (entry.status !== "Closed" || entry.closetype !== "Closed Lost")
            return false;
        } else {
          if (entry.status !== dashboardFilter) return false;
        }
      }

      // 2. Date Range Filter
      const { startDate, endDate } = dateRange[0];
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const created = new Date(entry.createdAt || 0);
        const updated = new Date(entry.updatedAt || 0);

        // Backend logic: match if EITHER createdAt OR updatedAt is in range
        const inRange =
          (created >= start && created <= end) ||
          (updated >= start && updated <= end);
        if (!inRange) return false;
      }

      // 3. Search Term
      const term = (searchTerm || "").trim().toLowerCase();
      if (term) {
        const fields = [
          entry.customerName,
          entry.mobileNumber,
          entry.contactperson,
          entry.address,
          entry.state,
          entry.city,
          entry.organization,
          entry.category,
          entry.type,
          entry.remarks,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase());
        const productsText = Array.isArray(entry.products)
          ? entry.products
              .map((p) =>
                `${p.name} ${p.specification} ${p.size} ${p.quantity}`.toLowerCase()
              )
              .join(" ")
          : "";
        const userText = [
          entry.createdBy?.username,
          ...(Array.isArray(entry.assignedTo)
            ? entry.assignedTo.map((u) => u.username)
            : entry.assignedTo?.username
            ? [entry.assignedTo.username]
            : []),
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(" ");
        const haystack = fields.join(" ") + " " + productsText + " " + userText;
        if (!haystack.includes(term)) return false;
      }

      // 4. Username Filter
      if (selectedUsername) {
        const usernames = [
          entry.createdBy?.username,
          ...(Array.isArray(entry.assignedTo)
            ? entry.assignedTo.map((u) => u.username)
            : entry.assignedTo?.username
            ? [entry.assignedTo.username]
            : []),
        ].filter(Boolean);
        if (!usernames.includes(selectedUsername)) return false;
      }

      // 5. State & City Filters
      if (selectedState && entry.state !== selectedState) return false;
      if (selectedCity && entry.city !== selectedCity) return false;

      return true;
    },
    [
      searchTerm,
      selectedUsername,
      selectedState,
      selectedCity,
      dashboardFilter,
      dateRange,
    ]
  );

  const categorizeStatus = (entry) => {
    const st = entry?.status;
    const ct = entry?.closetype;
    if (st === "Not Interested") return "cold";
    if (st === "Maybe") return "warm";
    if (st === "Interested") return "hot";
    if (st === "Closed") {
      if (ct === "Closed Won") return "closedWon";
      if (ct === "Closed Lost") return "closedLost";
    }
    return null;
  };

  const shouldCountVisitInRange = (ts) => {
    if (!ts) return false;
    const date = new Date(ts);
    const hasRange = dateRange[0].startDate && dateRange[0].endDate;
    if (hasRange) {
      const start = new Date(dateRange[0].startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange[0].endDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return true;
  };

  const shouldCountMonthlyVisit = (ts) => {
    if (!ts) return false;
    const date = new Date(ts);
    const now = new Date();
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const applyStatsDelta = useCallback((prevEntry, nextEntry) => {
    const prevBucket = prevEntry ? categorizeStatus(prevEntry) : null;
    const nextBucket = nextEntry ? categorizeStatus(nextEntry) : null;
    setBackendStats((prev) => {
      let s = { ...prev };

      // Handle status count changes
      if (prevBucket && (!nextBucket || prevBucket !== nextBucket)) {
        s[prevBucket] = Math.max(0, (s[prevBucket] || 0) - 1);
      }
      if (nextBucket && (!prevBucket || prevBucket !== nextBucket)) {
        s[nextBucket] = (s[nextBucket] || 0) + 1;
      }

      // FIXED: Handle visit count changes properly
      const prevHistLen = Array.isArray(prevEntry?.history)
        ? prevEntry.history.length
        : 0;
      const nextHistLen = Array.isArray(nextEntry?.history)
        ? nextEntry.history.length
        : 0;

      // Case 1: Entry deleted (nextEntry is null)
      if (!nextEntry && prevEntry) {
        // Decrement all visits from the deleted entry
        for (const h of prevEntry.history || []) {
          const ts = h.timestamp;
          if (ts) {
            s.totalVisits = Math.max(0, (s.totalVisits || 0) - 1);
            if (shouldCountMonthlyVisit(ts)) {
              s.monthlyVisits = Math.max(0, (s.monthlyVisits || 0) - 1);
            }
          }
        }
      }
      // Case 2: Entry added or updated with new history items
      else if (nextHistLen > prevHistLen) {
        const newItems = nextEntry.history.slice(prevHistLen);
        for (const h of newItems) {
          const ts = h.timestamp;
          if (ts) {
            s.totalVisits = (s.totalVisits || 0) + 1;
            if (shouldCountMonthlyVisit(ts)) {
              s.monthlyVisits = (s.monthlyVisits || 0) + 1;
            }
          }
        }
      }

      return s;
    });
  }, []);

  const filteredData = entries; // Backend handles filtering

  const matchesRoleAccess = useCallback(
    (entry) => {
      const uid = userId;
      if (!entry) return false;
      if (role === "superadmin" || role === "admin") return true;
      const createdById = entry.createdBy?._id?.toString?.() || entry.createdBy;
      const assignedIds = Array.isArray(entry.assignedTo)
        ? entry.assignedTo.map((u) => u._id?.toString?.() || u._id)
        : entry.assignedTo?._id
        ? [entry.assignedTo._id]
        : [];
      return createdById === uid || assignedIds.includes(uid);
    },
    [role, userId]
  );

  const getId = useCallback((e) => {
    if (!e) return "";
    const id = e._id;
    try {
      if (id && typeof id.toString === "function") return id.toString();
      return String(id || "");
    } catch {
      return String(id || "");
    }
  }, []);

  // Optimized handleEntryAdded - Refresh to get correct stats and order
  const handleEntryAdded = useCallback(
    (newEntry) => {
      if (newEntry) {
        const idStr = getId(newEntry);

        // DEDUPLICATION: Check if this entry was already processed (e.g. via Code/Socket)
        if (wasRecent(idStr, "created")) {
          toast.success("Entry added successfully!");
          return;
        }

        // Strict Context Check - only show if matches current filters
        if (!matchesContext(newEntry)) {
          // FIXED: Refresh stats even if entry doesn't match filters (it still affects totals)
          fetchEntries();
          fetchAnalyticsEntries();
          return;
        }

        // Mark as processed immediately
        recordOp(idStr, "created");

        setEntries((prev) => {
          const filtered = prev.filter((e) => getId(e) !== idStr);
          const next = [newEntry, ...filtered];
          return next.sort((a, b) => {
            // Strict Latest-First Sort
            const aU = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bU = new Date(b.updatedAt || b.createdAt || 0).getTime();
            if (bU !== aU) return bU - aU;
            const aC = new Date(a.createdAt || 0).getTime();
            const bC = new Date(b.createdAt || 0).getTime();
            return bC - aC;
          });
        });

        applyStatsDelta(null, newEntry);
        if (matchesRoleAccess(newEntry)) {
          setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
        }

        // FIXED: Refresh backend stats after add to ensure accuracy
        setTimeout(() => {
          fetchEntries();
          fetchAnalyticsEntries();
        }, 500);
      } else {
        // Fallback if no entry returned
        fetchEntries();
      }

      toast.success("Entry added successfully!");
    },
    [
      fetchEntries,
      fetchAnalyticsEntries,
      applyStatsDelta,
      matchesContext,
      matchesRoleAccess,
      wasRecent,
      recordOp,
      getId,
    ]
  );

  // Optimized handleEntryUpdated - instant local state update without refetch
  const handleEntryUpdated = useCallback(
    (updatedEntry) => {
      // update usernames dropdown logic
      const newUsernames = new Set(usernames);
      if (Array.isArray(updatedEntry.assignedTo)) {
        updatedEntry.assignedTo.forEach((user) => {
          if (user.username) newUsernames.add(user.username);
        });
      } else if (updatedEntry.assignedTo?.username) {
        newUsernames.add(updatedEntry.assignedTo.username);
      }
      if (newUsernames.size > usernames.length) {
        setUsernames([...newUsernames]);
      }

      // Check visibility against filters
      const isVisible = matchesContext(updatedEntry);

      setEntries((prev) => {
        const prevEntry = prev.find((e) => getId(e) === getId(updatedEntry));
        let next;

        if (isVisible) {
          // Update logic: Replace existing or Add if newly visible
          // Ensure nested objects are properly structure for display if needed
          const processedEntry = {
            ...updatedEntry,
            assignedTo: Array.isArray(updatedEntry.assignedTo)
              ? updatedEntry.assignedTo.map((user) => ({
                  _id: user._id,
                  username: user.username || "",
                }))
              : updatedEntry.assignedTo
              ? [
                  {
                    _id: updatedEntry.assignedTo._id,
                    username: updatedEntry.assignedTo.username || "",
                  },
                ]
              : [],
          };

          const filtered = prev.filter((e) => getId(e) !== getId(updatedEntry));
          next = [processedEntry, ...filtered];
        } else {
          // Remove if no longer matches filter
          next = prev.filter((e) => getId(e) !== getId(updatedEntry));
        }

        recordOp(getId(updatedEntry), "updated");
        applyStatsDelta(prevEntry, updatedEntry);

        return next.sort((a, b) => {
          // Strict Latest-First Sort
          const aU = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bU = new Date(b.updatedAt || b.createdAt || 0).getTime();
          if (bU !== aU) return bU - aU;
          const aC = new Date(a.createdAt || 0).getTime();
          const bC = new Date(b.createdAt || 0).getTime();
          return bC - aC;
        });
      });

      // Refresh analytics data in background
      fetchAnalyticsEntries();

      setIsEditModalOpen(false);
      toast.success("Entry updated successfully!");
    },
    [usernames, fetchAnalyticsEntries, applyStatsDelta, matchesContext]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = getAccessToken();
    if (!token) return;
    let socket;
    try {
      const baseOrigin = (() => {
        try {
          return new URL(process.env.REACT_APP_URL).origin;
        } catch {
          return process.env.REACT_APP_URL;
        }
      })();
      socket = io(baseOrigin, {
        auth: { token: `Bearer ${token}` },
        path: "/crm/socket.io",
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      const handleCreated = (entry) => {
        const idStr = getId(entry);

        // DEDUPLICATION: Check if this entry was already processed (by local handleEntryAdded)
        if (wasRecent(idStr, "created")) return;

        if (!matchesRoleAccess(entry)) return;
        if (!matchesContext(entry)) return; // Strict Context Check

        // Mark as processed immediately
        recordOp(idStr, "created");

        let existed = false;
        setEntries((prev) => {
          existed = prev.some((e) => getId(e) === idStr);
          const filtered = prev.filter((e) => getId(e) !== idStr);
          const next = [entry, ...filtered].sort((a, b) => {
            // Force latest first
            const aU = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bU = new Date(b.updatedAt || b.createdAt || 0).getTime();
            if (bU !== aU) return bU - aU;
            const aC = new Date(a.createdAt || 0).getTime();
            const bC = new Date(b.createdAt || 0).getTime();
            return bC - aC;
          });
          return next;
        });

        // Consistent handling: apply stats delta regardless of existing check in list
        // (List check is for rendering, stats logic here should assume new event)
        // However, if we want to be super safe about not counting if it truly was in list:
        if (!existed) {
          applyStatsDelta(null, entry);
          setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
        }
      };

      const handleUpdated = (entry) => {
        const passesRole = matchesRoleAccess(entry);
        const isVisible = passesRole && matchesContext(entry); // Strict Visibility Check
        const idStr = getId(entry);

        setEntries((prev) => {
          const prevEntry = prev.find((e) => getId(e) === getId(entry));
          let arr = prev;

          if (isVisible) {
            // Update or Add (if newly matching filter)
            const filtered = prev.filter((e) => getId(e) !== getId(entry));
            arr = [entry, ...filtered];
          } else {
            // Remove (if no longer matching filter or role)
            arr = prev.filter((e) => getId(e) !== getId(entry));
          }

          if (!wasRecent(idStr, "updated")) {
            applyStatsDelta(prevEntry, entry);
          }

          return arr.sort((a, b) => {
            // Force latest first
            const aU = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bU = new Date(b.updatedAt || b.createdAt || 0).getTime();
            if (bU !== aU) return bU - aU;
            const aC = new Date(a.createdAt || 0).getTime();
            const bC = new Date(b.createdAt || 0).getTime();
            return bC - aC;
          });
        });
      };

      socket.on("entryCreated", handleCreated);
      socket.on("entryUpdated", handleUpdated);
      socket.on("entryDeleted", ({ _id }) => {
        const idStr = getId({ _id });
        let existed = false;
        let deletedEntry = null;

        setEntries((prev) => {
          const prevEntry = prev.find((e) => getId(e) === idStr);
          existed = Boolean(prevEntry);
          deletedEntry = prevEntry;

          // FIXED: Apply stats delta for socket delete (if not already processed locally)
          if (prevEntry && !wasRecent(idStr, "deleted")) {
            applyStatsDelta(prevEntry, null);
          }

          return prev
            .filter((e) => getId(e) !== idStr)
            .sort((a, b) => {
              const aU = new Date(a.updatedAt || a.createdAt || 0).getTime();
              const bU = new Date(b.updatedAt || b.createdAt || 0).getTime();
              if (bU !== aU) return bU - aU;
              const aC = new Date(a.createdAt || 0).getTime();
              const bC = new Date(b.createdAt || 0).getTime();
              return bC - aC;
            });
        });

        if (existed) {
          setPagination((prev) => ({
            ...prev,
            total: Math.max(0, prev.total - 1),
          }));
        }
      });
    } catch (err) {}
    return () => {
      try {
        socket && socket.disconnect();
      } catch {}
    };
  }, [matchesContext, matchesRoleAccess, applyStatsDelta]);

  const handleDelete = useCallback(
    (deletedIds) => {
      // Optimistic update
      setEntries((prev) => {
        let next = prev;
        for (const id of deletedIds) {
          const prevEntry = prev.find((e) => getId(e) === getId({ _id: id }));
          if (prevEntry) {
            recordOp(getId(prevEntry), "deleted");
            applyStatsDelta(prevEntry, null);
            next = next.filter((e) => getId(e) !== getId(prevEntry));
          }
        }
        return next;
      });
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - deletedIds.length),
      }));
      setSelectedEntries((prev) =>
        prev.filter((id) => !deletedIds.includes(id))
      );

      // FIXED: Refresh backend stats after delete to ensure accuracy
      setTimeout(() => {
        fetchEntries();
        fetchAnalyticsEntries();
      }, 500);

      setIsDeleteModalOpen(false);
    },
    [fetchEntries, fetchAnalyticsEntries]
  );

  // Calculate stats exactly as AdminDrawer does to ensure consistency
  const displayedStats = useMemo(() => {
    if (role !== "superadmin" && role !== "admin") {
      if (!analyticsEntries || !analyticsEntries.length) {
        return {
          total: backendStats.totalVisits || 0,
          monthTotal: backendStats.monthlyVisits || 0,
        };
      }
    }

    if (!analyticsEntries || !analyticsEntries.length) {
      return { total: 0, monthTotal: 0 };
    }

    let totalVisitsCount = 0;
    let monthlyVisitsCount = 0;

    analyticsEntries.forEach((entry) => {
      // Backend aggregated result for type="analytics" provides these fields
      totalVisitsCount += entry.totalVisits || 0;
      monthlyVisitsCount += entry.monthEntries || 0;
    });

    return { total: totalVisitsCount, monthTotal: monthlyVisitsCount };
  }, [role, analyticsEntries, backendStats]);

  const handleReset = () => {
    // IDEMPOTENT RESET: Check if already in default state
    const isDefault =
      !searchTerm &&
      !selectedUsername &&
      !selectedState &&
      !selectedCity &&
      selectedEntries.length === 0 &&
      !isSelectionMode &&
      dashboardFilter === "total" &&
      (!dateRange[0].startDate || !dateRange[0].endDate);

    if (isDefault) return;

    setSearchTerm("");
    setSelectedUsername("");
    setSelectedState("");
    setSelectedCity("");
    setSelectedEntries([]);
    setIsSelectionMode(false);
    setDoubleClickInitiated(false);
    setDashboardFilter("total");
    setDateRange([{ startDate: null, endDate: null, key: "selection" }]);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
    // fetchAnalyticsEntries(); // REMOVED: Effect will handle this due to dashboardFilter change
  };

  const debouncedSearchChange = useMemo(
    () =>
      debounce((val) => {
        setSearchTerm(val);
        setPagination((prev) => ({ ...prev, page: 1 }));
      }, 500),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSearchChange.cancel();
    };
  }, [debouncedSearchChange]);

  useEffect(() => {
    fetchAnalyticsEntries();
  }, [
    dateRange,
    searchTerm,
    selectedUsername,
    selectedState,
    selectedCity,
    dashboardFilter,
    fetchAnalyticsEntries,
  ]);

  const handleExport = async () => {
    try {
      // Build query params from current filters using state variables
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      // Remove specific mobileNumber append, as it's now handled in general search
      if (dashboardFilter !== "total") {
        params.append("status", dashboardFilter);
      }
      // No category filter in frontend, skip
      if (selectedState) params.append("state", selectedState);
      if (selectedCity) params.append("city", selectedCity);
      if (selectedUsername) params.append("username", selectedUsername);
      const fromDate = dateRange[0]?.startDate
        ? new Date(dateRange[0].startDate).setHours(0, 0, 0, 0)
        : null;
      const toDate = dateRange[0]?.endDate
        ? new Date(dateRange[0].endDate).setHours(23, 59, 59, 999)
        : null;

      if (fromDate && toDate) {
        params.append("fromDate", new Date(fromDate).toISOString());
        params.append("toDate", new Date(toDate).toISOString());
      }

      const response = await api.get(`/api/export?${params.toString()}`, {
        responseType: "blob",
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "entries.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Entries exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export entries: ${error.message}`);
    }
  };
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("No file selected!");
      return;
    }

    // Token check removed as api interceptor handles auth

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        console.log("Parsing file...");
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          blankrows: false,
        });
        console.log("Parsed data:", JSON.stringify(parsedData, null, 2));

        if (!parsedData.length) {
          toast.error("No data found in file!");
          return;
        }

        // Parse Products string into structured object
        const parseProducts = (productsStr) => {
          if (!productsStr || typeof productsStr !== "string") return [];
          const items = productsStr
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean);

          const results = [];
          for (const item of items) {
            // 1) Preferred format: Name (Spec: SPEC, SIZE, Qty: N)
            let m = item.match(
              /^(.+?)\s*\(\s*Spec:\s*(.+?)\s*,\s*(.+?)\s*,\s*Qty:\s*(\d+)\s*\)$/i
            );
            if (m) {
              const [, name, spec, size, qty] = m;
              results.push({
                name: String(name).trim(),
                specification: String(spec).trim(),
                size: String(size).trim(),
                quantity: Number(qty),
              });
              continue;
            }

            // 2) Legacy format without 'Spec:' label: Name (SPEC, SIZE, Qty: N)
            m = item.match(
              /^(.+?)\s*\(\s*(.+?)\s*,\s*(.+?)\s*,\s*Qty:\s*(\d+)\s*\)$/i
            );
            if (m) {
              const [, name, spec, size, qty] = m;
              results.push({
                name: String(name).trim(),
                specification: String(spec).trim(),
                size: String(size).trim(),
                quantity: Number(qty),
              });
              continue;
            }

            // 3) Minimal fallback: Name (SPEC, SIZE) => quantity defaults to 1
            m = item.match(/^(.+?)\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i);
            if (m) {
              const [, name, spec, size] = m;
              results.push({
                name: String(name).trim(),
                specification: String(spec).trim(),
                size: String(size).trim(),
                quantity: 1,
              });
              continue;
            }

            // 4) If nothing matches, treat whole token as name
            results.push({
              name: item,
              specification: "",
              size: "",
              quantity: 1,
            });
          }

          return results;
        };

        // CHANGE: Prevent user from entering their own mobile number
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        const newEntries = parsedData.map((item) => {
          const parseArrayField = (value) => {
            if (Array.isArray(value)) return value;
            if (value == null || value === "") return [];
            const strValue = String(value).trim();
            if (!strValue) return [];
            try {
              const parsed = JSON.parse(strValue);
              if (Array.isArray(parsed)) return parsed;
            } catch {
              // Not a valid JSON array, treat as single item
            }
            return [strValue];
          };

          // Parse dates safely
          const parseDate = (dateStr) => {
            if (!dateStr) return null;

            // Handle DD/MM/YYYY explicitly (Excel common format)
            const parts = String(dateStr).trim().split("/");
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1; // JS months: 0-11
              const year = parseInt(parts[2], 10);
              if (
                !isNaN(day) &&
                !isNaN(month) &&
                !isNaN(year) &&
                month >= 0 &&
                month < 12
              ) {
                // Fix: Use Date.UTC to avoid local timezone shift
                const date = new Date(Date.UTC(year, month, day));
                return date.toISOString(); // Now correctly "2025-06-13T00:00:00.000Z"
              }
            }

            // Fallback for other formats (e.g., YYYY-MM-DD) - also use UTC if possible
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              // Adjust to UTC midnight to avoid time shifts
              return new Date(
                Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
              ).toISOString();
            }
            return null;
          };

          const createdAtStr = parseDate(item.CreatedAt); // Already correct
          return {
            customerName: item.Customer_Name || "",
            customerEmail: item.Customer_Email || "",
            mobileNumber: item.Mobile_Number ? String(item.Mobile_Number) : "",
            contactperson: item.Contact_Person || "",
            address: item.Address || "",
            state: item.State || "",
            city: item.City || "",
            organization: item.Organization || "",
            category: item.Category || "",
            type: item.Type || "",
            status: item.Status || "Not Found",
            closetype: item.Close_Type || "",
            estimatedValue: item.Estimated_Value
              ? Number(item.Estimated_Value)
              : 0,
            closeamount: item.Close_Amount ? Number(item.Close_Amount) : 0,
            remarks: item.Remarks || "",
            liveLocation: item.Live_Location || "",
            nextAction: item.Next_Action || "",
            firstPersonMeet: item.First_Person_Met || "",
            secondPersonMeet: item.Second_Person_Met || "",
            thirdPersonMeet: item.Third_Person_Met || "",
            fourthPersonMeet: item.Fourth_Person_Met || "",
            expectedClosingDate: parseDate(item.Expected_Closing_Date),
            followUpDate: parseDate(item.Follow_Up_Date),
            products: parseProducts(item.Products),
            assignedTo: parseArrayField(item.Assigned_To),
            createdAt: createdAtStr,
          };
        });

        console.log("Mapped entries:", JSON.stringify(newEntries, null, 2));

        // CHANGE: Prevent user from entering their own mobile number
        // Validate all phone numbers before sending to API
        const invalidEntries = [];
        newEntries.forEach((entry, index) => {
          if (entry.mobileNumber) {
            const phoneValidation = validatePhoneNumber(
              entry.mobileNumber,
              user.username
            );
            if (!phoneValidation.isValid) {
              invalidEntries.push({
                row: index + 2, // +2 because Excel is 1-indexed and has header row
                customerName: entry.customerName,
                mobileNumber: entry.mobileNumber,
              });
            }
          }
        });

        if (invalidEntries.length > 0) {
          const errorMsg =
            `Cannot upload: ${invalidEntries.length} row(s) contain your own mobile number. Please update these entries:\n` +
            invalidEntries
              .map((e) => `Row ${e.row}: ${e.customerName} (${e.mobileNumber})`)
              .join("\n");
          toast.error(errorMsg, { autoClose: 10000 });
          return;
        }

        console.log(`Sending ${newEntries.length} entries to API`);
        const response = await api.post("/api/entries", newEntries);

        console.log("API response:", response.data);
        toast.success(`Uploaded ${response.data.count} entries!`);
        setEntries((prev) => {
          const next = [...newEntries, ...prev];
          return next.sort((a, b) => {
            const aU = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bU = new Date(b.updatedAt || b.createdAt || 0).getTime();
            if (bU !== aU) return bU - aU;
            const aC = new Date(a.createdAt || 0).getTime();
            const bC = new Date(b.createdAt || 0).getTime();
            return bC - aC;
          });
        });
        fetchEntries();
      } catch (error) {
        console.error("Upload error:", error.message, error.response?.data);
        if (error.response?.status === 401) {
          toast.error("Authentication failed. Please log in again.");
        } else if (error.response?.data?.message) {
          toast.error(`Upload failed: ${error.response.data.message}`);
        } else if (error.message === "Network Error") {
          toast.error(
            "Network issue detected. Please check your internet connection and try again."
          );
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
      }
    };
    reader.onerror = () => {
      console.error("File read error");
      toast.error(
        "Error reading the file. Please try again with a valid file."
      );
    };

    reader.readAsArrayBuffer(file);
  };

  // Helper to fetch all users with pagination
  const fetchAllUsers = async (role) => {
    let allUsers = [];
    const apiUrl = role === "superadmin" ? "/api/allusers" : "/api/users";
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await api.get(apiUrl, {
          params: { limit: 100, page },
        });

        const data = Array.isArray(response.data) ? response.data : [];
        // Normalize users if needed (basic normalization)
        const normalizedPage = data.map((user) => ({
          ...user,
          _id: user._id?.$oid || user._id || user.id || "",
          username: user.username || "Unknown",
        }));

        allUsers = [...allUsers, ...normalizedPage];
        hasMore = data.length === 100;
        page += 1;
      }
      return allUsers;
    } catch (error) {
      console.error("Error fetching users for analytics:", error);
      // Return empty or throw? If we throw, the drawer won't open, which matches "Drawer opens ONLY ONCE after data is fully loaded"
      // But we should probably allow opening with partial data or show error.
      // For now, allow throwing to be caught by handleAnalyticsOpen
      throw error;
    }
  };

  const handleAnalyticsOpen = async (drawerType) => {
    if (analyticsLock.current) return;
    analyticsLock.current = true;

    const toastId = toast.loading("Fetching Analytics Data...");
    try {
      // Parallel fetch for speed
      const [entriesData, usersData] = await Promise.all([
        fetchAnalyticsEntries(),
        fetchAllUsers(role),
      ]);

      setDrawerUsers(usersData);

      toast.update(toastId, {
        render: "Analytics Data Loaded",
        type: "success",
        isLoading: false,
        autoClose: 1000,
      });
      // Strict Sequence: Data Loaded -> Transition to Drawer
      setDrawerState({ isOpen: false, type: null, isTransitioning: true });

      // Delay opening the target drawer to ensure modal closing animation clears
      setTimeout(() => {
        setDrawerState({
          isOpen: true,
          type: drawerType,
          isTransitioning: false,
        });
        analyticsLock.current = false;
      }, 300);
    } catch (error) {
      console.error("Analytics load error:", error);
      analyticsLock.current = false;
      toast.update(toastId, {
        render: "Failed to load data. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const handleDoubleClick = (id) => {
    if (!doubleClickInitiated && (role === "superadmin" || role === "admin")) {
      setIsSelectionMode(true);
      setDoubleClickInitiated(true);
      setSelectedEntries([id]);
    }
  };

  const handleSingleClick = (id) => {
    if (isSelectionMode && (role === "superadmin" || role === "admin")) {
      setSelectedEntries((prev) =>
        prev.includes(id)
          ? prev.filter((entryId) => entryId !== id)
          : [...prev, id]
      );
    }
  };

  const handleSelectAll = () => {
    if (isSelectionMode && (role === "superadmin" || role === "admin")) {
      const allFilteredIds = filteredData.map((entry) => entry._id);
      setSelectedEntries(allFilteredIds);
    }
  };

  const handleCopySelected = () => {
    const selectedData = entries.filter((entry) =>
      selectedEntries.includes(entry._id)
    );
    const textToCopy = selectedData
      .map((entry) =>
        [
          entry.customerName,
          entry.mobileNumber,
          entry.contactperson,
          entry.products
            ?.map(
              (p) =>
                `${p.name} (${p.specification}, ${p.size}, Qty: ${p.quantity})`
            )
            .join("; "),
          entry.type,
          entry.address,
          entry.state,
          entry.city,
          entry.organization,
          entry.category,
          new Date(entry.createdAt).toLocaleDateString(),
          entry.closetype || "",
          entry.assignedTo?.username || "",
        ].join("\t")
      )
      .join("\n");
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => toast.success("Selected entries copied to clipboard!"))
      .catch((err) => toast.error("Failed to copy: " + err.message));
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedEntries.length === 0) {
      toast.error("No entries selected!");
      return;
    }
    setItemIdsToDelete(selectedEntries);
    setItemIdToDelete(null);
    setIsDeleteModalOpen(true);
  }, [selectedEntries]);

  const rowRenderer = ({ index, key, style }) => {
    const row = filteredData[index];
    const isSelected = selectedEntries.includes(row._id);

    const isAssigned = Array.isArray(row.assignedTo)
      ? row.assignedTo.length > 0
      : !!row.assignedTo;
    const serialNumber = (pagination.page - 1) * pagination.limit + index + 1;
    return (
      <div
        key={key}
        style={{
          ...style,
          cursor: "pointer",
          backgroundColor: isSelected
            ? "rgba(37, 117, 252, 0.1)"
            : isAssigned
            ? "rgba(200, 230, 255, 0.3)"
            : "#fff",
          border: isSelected ? "2px solid #2575fc" : "none",
        }}
        className={`virtual-row ${isSelected ? "selected" : ""}`}
        onDoubleClick={() => handleDoubleClick(row._id)}
        onClick={() => handleSingleClick(row._id)}
      >
        <div className="virtual-cell">{serialNumber}</div>
        <div className="virtual-cell">
          {row.updatedAt
            ? new Date(row.updatedAt).toLocaleDateString("en-GB")
            : "N/A"}
        </div>
        <div className="virtual-cell">{row.customerName}</div>
        <div className="virtual-cell">{row.mobileNumber}</div>
        <div className="virtual-cell">{row.address}</div>
        <div className="virtual-cell">{row.city}</div>
        <div className="virtual-cell">{row.state}</div>
        <div className="virtual-cell">{row.organization}</div>
        <div className="virtual-cell">{row.createdBy?.username}</div>
        <div
          className="virtual-cell actions-cell"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "150px",
            padding: "0 5px",
          }}
        >
          <Button
            variant="primary"
            onClick={() => {
              setEntryToView(row);
              setIsViewModalOpen(true);
            }}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaEye />
          </Button>
          <button
            onClick={() => {
              setEntryToEdit(row);
              setIsEditModalOpen(true);
            }}
            className="editBtn"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg height="1em" viewBox="0 0 512 512">
              <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
            </svg>
          </button>
          <button
            className="bin-button"
            onClick={() => {
              setItemIdToDelete(row._id);
              setIsDeleteModalOpen(true);
            }}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              className="bin-top"
              viewBox="0 0 39 7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4"></line>
              <line
                x1="12"
                y1="1.5"
                x2="26.0357"
                y2="1.5"
                stroke="white"
                strokeWidth="3"
              ></line>
            </svg>
            <svg
              className="bin-bottom"
              viewBox="0 0 33 39"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <mask id="path-1-inside-1_8_19" fill="white">
                <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"></path>
              </mask>
              <path
                d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
                fill="white"
                mask="url(#path-1-inside-1_8_19)"
              ></path>
              <path d="M12 6L12 29" stroke="white" strokeWidth="4"></path>
              <path d="M21 6V29" stroke="white" strokeWidth="4"></path>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const renderMobileCard = ({ index, style }) => {
    const row = filteredData[index];
    const isSelected = selectedEntries.includes(row._id);

    const isAssigned = Array.isArray(row.assignedTo)
      ? row.assignedTo.length > 0
      : !!row.assignedTo;
    const serialNumber = (pagination.page - 1) * pagination.limit + index + 1;
    return (
      <motion.div
        key={row._id}
        className={`mobile-card ${isSelected ? "selected" : ""}`}
        onClick={() => handleSingleClick(row._id)}
        onDoubleClick={() => handleDoubleClick(row._id)}
        style={{
          ...style,
          padding: "0 10px 24px 10px",
          boxSizing: "border-box",
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: "12px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            backgroundColor: isSelected
              ? "rgba(37, 117, 252, 0.1)"
              : isAssigned
              ? "rgba(200, 230, 255, 0.3)" // Light blue for assigned entries
              : "#fff",
            border: isSelected ? "2px solid #2575fc" : "1px solid #ddd",
            cursor: "pointer",
            transition: "all 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "linear-gradient(135deg, #f5f7fa, #e4e7eb)",
              borderRadius: "8px 8px 0 0",
              padding: "8px 12px",
              margin: "-16px -16px 12px -16px",
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: "bold", fontSize: "0.85rem", color: "#333" }}
            >
              Entry #{serialNumber}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: "0.8rem", color: "#555" }}
            >
              {row.updatedAt
                ? new Date(row.updatedAt).toLocaleDateString()
                : "N/A"}
            </Typography>
          </Box>

          {isSelected && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                color: "#2575fc",
              }}
            >
              <FaCheckCircle size={20} />
            </motion.div>
          )}

          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              mb: 1,
              fontSize: "1.1rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            {row.customerName}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 0.5, fontSize: "0.9rem", color: "#555" }}
          >
            <strong>Mobile:</strong> {row.mobileNumber}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              mb: 0.5,
              fontSize: "0.9rem",
              color: "#555",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            <strong>Address:</strong> {row.address}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 0.5, fontSize: "0.9rem", color: "#555" }}
          >
            <strong>City:</strong> {row.city}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 0.5, fontSize: "0.9rem", color: "#555" }}
          >
            <strong>State:</strong> {row.state}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 0.5, fontSize: "0.9rem", color: "#555" }}
          >
            <strong>Organization:</strong> {row.organization}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 1, fontSize: "0.9rem", color: "#555" }}
          >
            <strong>Category:</strong> {row.category}
          </Typography>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              marginTop: "12px",
            }}
          >
            <Button
              variant="primary"
              className="viewBtn"
              onClick={() => {
                setEntryToView(row);
                setIsViewModalOpen(true);
              }}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              role="button"
              tabIndex={0}
              aria-label={`View entry for ${row.customerName}`}
            >
              <FaEye />
            </Button>
            <button
              className="editBtn"
              onClick={() => {
                setEntryToEdit(row);
                setIsEditModalOpen(true);
              }}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              role="button"
              tabIndex={0}
              aria-label={`Edit entry for ${row.customerName}`}
            >
              <svg height="1em" viewBox="0 0 512 512">
                <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
              </svg>
            </button>
            <button
              className="bin-button"
              onClick={() => {
                setItemIdToDelete(row._id);
                setIsDeleteModalOpen(true);
              }}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              role="button"
              tabIndex={0}
              aria-label={`Delete entry for ${row.customerName}`}
            >
              <svg
                className="bin-top"
                viewBox="0 0 39 7"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line
                  y1="5"
                  x2="39"
                  y2="5"
                  stroke="white"
                  strokeWidth="4"
                ></line>
                <line
                  x1="12"
                  y1="1.5"
                  x2="26.0357"
                  y2="1.5"
                  stroke="white"
                  strokeWidth="3"
                ></line>
              </svg>
              <svg
                className="bin-bottom"
                viewBox="0 0 33 39"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <mask id="path-1-inside-1_8_19" fill="white">
                  <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"></path>
                </mask>
                <path
                  d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
                  fill="white"
                  mask="url(#path-1-inside-1_8_19)"
                ></path>
                <path d="M12 6L12 29" stroke="white" strokeWidth="4"></path>
                <path d="M21 6V29" stroke="white" strokeWidth="4"></path>
              </svg>
            </button>
          </Box>
        </Box>
      </motion.div>
    );
  };

  const actionButtonStyle = {
    padding: isMobile ? "8px 15px" : "10px 20px",
    background: "linear-gradient(135deg, #2575fc, #6a11cb)",
    color: "white",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
    border: "none",
    fontSize: isMobile ? "0.9rem" : "1rem",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  };

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f5f7fa",
        }}
      >
        <div className="loading-wave">
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <div className="enhanced-search-bar-container">
        <input
          type="text"
          className="enhanced-search-bar"
          placeholder="🔍 Search..."
          onChange={(e) => debouncedSearchChange(e.target.value)}
        />
        {(role === "superadmin" || role === "admin") && (
          <select
            className="enhanced-filter-dropdown"
            value={selectedUsername}
            onChange={(e) => setSelectedUsername(e.target.value)}
          >
            <option value="">-- Select User --</option>
            {usernames
              .slice() // create a shallow copy to avoid mutating the original array
              .sort((a, b) => a.localeCompare(b))
              .map((username) => (
                <option key={username} value={username}>
                  {username}
                </option>
              ))}
          </select>
        )}
        <div>
          <input
            type="text"
            style={{ borderRadius: "9999px" }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            value={
              dateRange[0]?.startDate && dateRange[0]?.endDate
                ? `${dateRange[0].startDate.toLocaleDateString()} - ${dateRange[0].endDate.toLocaleDateString()}`
                : ""
            }
            placeholder="-- Select date range --"
            readOnly
            className="cursor-pointer border p-2"
            aria-label="Select date range"
          />
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            PaperProps={{
              sx: {
                width: isMobile ? "100vw" : "600px",
                maxWidth: isMobile ? "100vw" : "600px",
                maxHeight: isMobile ? "80vh" : "500px",
                overflowY: "auto",
                overflowX: "hidden",
                padding: isMobile ? "5px" : "10px",
                boxSizing: "border-box",
                borderRadius: isMobile ? "0" : "8px",
                marginTop: isMobile ? "0" : "8px",
                background: "#fff",
              },
            }}
          >
            <DateRangePicker
              ranges={dateRange}
              onChange={(item) => setDateRange([item.selection])}
              moveRangeOnFirstSelection={false}
              showSelectionPreview={true}
              rangeColors={["#2575fc"]}
              editableDateInputs={true}
              months={1}
              direction="vertical"
              className={isMobile ? "mobile-date-picker" : ""}
              calendarFocus="forwards"
              staticRanges={
                isMobile
                  ? []
                  : [
                      {
                        label: "Today",
                        range: () => ({
                          startDate: new Date(),
                          endDate: new Date(),
                          key: "selection",
                        }),
                        isSelected: (range) => {
                          const today = new Date();
                          return (
                            range.startDate.toDateString() ===
                              today.toDateString() &&
                            range.endDate.toDateString() ===
                              today.toDateString()
                          );
                        },
                      },
                      {
                        label: "Yesterday",
                        range: () => ({
                          startDate: new Date(
                            new Date().setDate(new Date().getDate() - 1)
                          ),
                          endDate: new Date(
                            new Date().setDate(new Date().getDate() - 1)
                          ),
                          key: "selection",
                        }),
                        isSelected: (range) => {
                          const yesterday = new Date(
                            new Date().setDate(new Date().getDate() - 1)
                          );
                          return (
                            range.startDate.toDateString() ===
                              yesterday.toDateString() &&
                            range.endDate.toDateString() ===
                              yesterday.toDateString()
                          );
                        },
                      },
                      {
                        label: "Last 7 Days",
                        range: () => ({
                          startDate: new Date(
                            new Date().setDate(new Date().getDate() - 6)
                          ),
                          endDate: new Date(),
                          key: "selection",
                        }),
                        isSelected: (range) => {
                          const start = new Date(
                            new Date().setDate(new Date().getDate() - 6)
                          );
                          const end = new Date();
                          return (
                            range.startDate.toDateString() ===
                              start.toDateString() &&
                            range.endDate.toDateString() === end.toDateString()
                          );
                        },
                      },
                      {
                        label: "Last 30 Days",
                        range: () => ({
                          startDate: new Date(
                            new Date().setDate(new Date().getDate() - 29)
                          ),
                          endDate: new Date(),
                          key: "selection",
                        }),
                        isSelected: (range) => {
                          const start = new Date(
                            new Date().setDate(new Date().getDate() - 29)
                          );
                          const end = new Date();
                          return (
                            range.startDate.toDateString() ===
                              start.toDateString() &&
                            range.endDate.toDateString() === end.toDateString()
                          );
                        },
                      },
                    ]
              }
              inputRanges={isMobile ? [] : undefined}
              weekStartsOn={1}
            />
          </Popover>
        </div>

        <select
          className="enhanced-filter-dropdown"
          value={selectedState}
          onChange={(e) => {
            setSelectedState(e.target.value);
            setSelectedCity("");
          }}
        >
          <option value="">-- Select State --</option>
          {Object.keys(statesAndCities).map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <select
          className="enhanced-filter-dropdown"
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          disabled={!selectedState}
        >
          <option value="">-- Select City --</option>
          {selectedState &&
            statesAndCities[selectedState].map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
        </select>
        <button
          className="reset adapts-button"
          onClick={handleReset}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 16px",
            borderRadius: "20px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            transition: "all 0.3s ease",
          }}
        >
          <span style={{ fontWeight: "bold" }}>Reset</span>
          <span
            className="rounded-arrow"
            style={{
              marginLeft: "8px",
              display: "inline-flex",
              alignItems: "center",
              transition: "transform 0.3s ease",
            }}
          >
            →
          </span>
        </button>
      </div>

      <Box sx={{ minHeight: "100vh", pb: 10 }}>
        {/* Dashboard Content */}
        <Box
          sx={{
            maxWidth: isMobile ? "100%" : "90%",
            mx: "auto",
            p: isMobile ? 2 : 3,
          }}
        >
          <CallTrackingDashboard
            stats={backendStats}
            onFilterChange={setDashboardFilter}
            selectedCategory={dashboardFilter}
          />

          {/* Action Buttons */}
          <Box
            sx={{
              textAlign: "center",
              my: 3,
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              justifyContent: "center",
            }}
          >
            {" "}
            <motion.button
              onClick={(e) => handleDrawerOpen("attendance", e)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={actionButtonStyle}
              disabled={isDebouncing}
            >
              <FaClock size={16} />
              Attendance
            </motion.button>
            <motion.label
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={actionButtonStyle}
            >
              <FaUpload size={16} />
              Bulk Upload
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                style={{ display: "none" }}
              />
            </motion.label>
            <motion.button
              onClick={() => setIsAddModalOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={actionButtonStyle}
            >
              <FaPlus size={16} />
              Add New Entry
            </motion.button>
            <motion.button
              onClick={(e) => handleDrawerOpen("analyticsModal", e)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ ...actionButtonStyle, width: "166px", gap: "11px" }}
              disabled={isDebouncing}
            >
              <FaChartBar size={16} />
              Analytics
            </motion.button>
            {(role === "superadmin" || role === "admin") && (
              <>
                <motion.button
                  onClick={() => setIsTeamBuilderOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={actionButtonStyle}
                >
                  <FaUsers size={16} />
                  Team Builder
                </motion.button>

                <motion.button
                  onClick={handleExport}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={actionButtonStyle}
                >
                  <FaFileExcel size={16} />
                  Export to Excel
                </motion.button>
              </>
            )}
          </Box>

          {/* Selection Controls */}
          {(role === "superadmin" || role === "admin") &&
            filteredData.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  justifyContent: "center",
                  my: 2,
                }}
              >
                {isSelectionMode && (
                  <motion.button
                    onClick={handleSelectAll}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={actionButtonStyle}
                  >
                    Select All
                  </motion.button>
                )}
                {selectedEntries.length > 0 && (
                  <>
                    <motion.button
                      onClick={handleCopySelected}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={actionButtonStyle}
                    >
                      Copy Selected ({selectedEntries.length})
                    </motion.button>
                    <motion.button
                      onClick={handleDeleteSelected}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        ...actionButtonStyle,
                        background: "linear-gradient(90deg, #ff4444, #cc0000)",
                      }}
                    >
                      Delete Selected ({selectedEntries.length})
                    </motion.button>
                  </>
                )}
              </Box>
            )}

          {/* Instructions */}

          <p
            style={{
              fontSize: isMobile ? "0.8rem" : "0.9rem",
              color: "#6c757d",

              textAlign: isMobile ? "center" : "center",
            }}
          >
            Upload a valid Excel file with columns:{" "}
            <strong>
              Customer_Name, Customer_Email, Mobile_Number, Contact_Person,
              Address, City, State, Organization, Category, Type, Products,
              Status, Close Type, Remarks, CreatedAt, Created By
            </strong>
          </p>
          {/* Stats */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,

              mb: 3,
            }}
          >
            {[
              { label: "Total Results", value: pagination.total },
              { label: "Total Visits", value: displayedStats.total },
              { label: "Monthly Visits", value: displayedStats.monthTotal },
            ].map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  color: "white",
                  padding: isMobile ? "8px 12px" : "10px 15px",
                  borderRadius: "20px",
                  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
                  fontWeight: "600",
                  fontSize: isMobile ? "0.9rem" : "1rem",
                  textTransform: "capitalize",
                }}
              >
                {stat.label}: {stat.value}
              </Box>
            ))}
          </Box>

          {/* Data Table/Cards */}
          <Box
            sx={{
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
              height: isMobile ? "auto" : "75vh",
              display: isMobile ? "block" : "flex",
              flexDirection: "column",
            }}
          >
            {isMobile ? (
              <Box
                sx={{
                  maxHeight: "75vh",
                  overflowY: "auto",
                  overflowX: "hidden",
                  p: 2,
                  scrollBehavior: "smooth",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {loading ? (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      p: 4,
                    }}
                  >
                    <div className="loading-wave">
                      <div className="loading-bar"></div>
                      <div className="loading-bar"></div>
                      <div className="loading-bar"></div>
                      <div className="loading-bar"></div>
                    </div>
                  </Box>
                ) : filteredData.length === 0 ? (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: "1.2rem",
                      color: "#666",
                      fontWeight: "bold",
                      textAlign: "center",
                      p: 4,
                    }}
                  >
                    No Entries Available
                  </Box>
                ) : (
                  <FixedSizeList
                    height={window.innerHeight * 0.75}
                    width="100%"
                    itemCount={filteredData.length}
                    itemSize={280}
                    overscanCount={5}
                  >
                    {renderMobileCard}
                  </FixedSizeList>
                )}
                <Box
                  sx={{
                    position: "sticky",
                    bottom: 0,
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(8px)",
                    p: 2,
                    boxShadow: "0 -2px 4px rgba(0, 0, 0, 0.1)",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 2,
                    zIndex: 10,
                  }}
                >
                  {" "}
                  <motion.button
                    onClick={(e) => handleDrawerOpen("attendance", e)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={actionButtonStyle}
                    disabled={isDebouncing}
                  >
                    <FaClock size={16} />
                    Attendance
                  </motion.button>
                  <motion.button
                    onClick={() => setIsAddModalOpen(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={actionButtonStyle}
                  >
                    <FaPlus size={16} />
                    Add New
                  </motion.button>
                  <motion.label
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={actionButtonStyle}
                  >
                    <FaUpload size={16} />
                    Bulk Upload
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".xlsx, .xls"
                      style={{ display: "none" }}
                    />
                  </motion.label>
                </Box>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                    color: "white",
                    fontSize: "1.1rem",
                    p: "15px 20px",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    display: "grid",
                    gridTemplateColumns: "115px repeat(8, 1fr) 150px",
                    fontWeight: "bold",
                    borderBottom: "2px solid #ddd",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div>SNo.</div>
                  <div>Date</div>
                  <div>Customer</div>
                  <div>Mobile</div>
                  <div>Address</div>
                  <div>City</div>
                  <div>State</div>
                  <div>Organization</div>
                  <div>Users</div>
                  <div>Actions</div>
                </Box>
                {loading ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "65vh",
                    }}
                  >
                    <div className="loading-wave">
                      <div className="loading-bar"></div>
                      <div className="loading-bar"></div>
                      <div className="loading-bar"></div>
                      <div className="loading-bar"></div>
                    </div>
                  </div>
                ) : filteredData.length === 0 ? (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: "1.2rem",
                      color: "#666",
                      fontWeight: "bold",
                      textAlign: "center",
                      p: 4,
                    }}
                  >
                    No Entries Available
                  </Box>
                ) : (
                  <Box sx={{ flex: 1, minHeight: 0 }}>
                    <AutoSizer>
                      {({ height, width }) => (
                        <List
                          height={height}
                          rowCount={filteredData.length}
                          rowHeight={60}
                          rowRenderer={rowRenderer}
                          width={width}
                          overscanRowCount={10}
                        />
                      )}
                    </AutoSizer>
                  </Box>
                )}
              </>
            )}
            <TablePagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              onPageChange={(newPage) =>
                setPagination((prev) => ({ ...prev, page: newPage }))
              }
              isLoading={loading}
            />
          </Box>
        </Box>
        {/* Modals and Drawers */}
        <AddEntry
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onEntryAdded={handleEntryAdded}
        />
        <EditEntry
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          entry={entryToEdit}
          onEntryUpdated={handleEntryUpdated}
        />
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          itemId={itemIdToDelete}
          itemIds={itemIdsToDelete}
          onDelete={handleDelete}
        />
        <ViewEntry
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          entry={entryToView}
          role={role}
        />{" "}
        <AttendanceTracker
          key={`drawer-attendance-${
            drawerState.isOpen && drawerState.type === "attendance"
          }`}
          open={drawerState.isOpen && drawerState.type === "attendance"}
          onClose={handleDrawerClose}
          userId={userId}
          role={role}
        />{" "}
        <AdminDrawer
          key={`drawer-admin-${
            drawerState.isOpen && drawerState.type === "admin"
          }`}
          entries={analyticsEntries}
          isOpen={drawerState.isOpen && drawerState.type === "admin"}
          onClose={handleDrawerClose}
          role={role}
          userId={userId}
          dateRange={dateRange}
          drawerUsers={drawerUsers}
        />
        <ValueAnalyticsDrawer
          key={`drawer-value-${
            drawerState.isOpen && drawerState.type === "value"
          }`}
          entries={analyticsEntries}
          isOpen={drawerState.isOpen && drawerState.type === "value"}
          onClose={handleDrawerClose}
          role={role}
          userId={userId}
          dateRange={dateRange}
          drawerUsers={drawerUsers}
        />
        {(role === "superadmin" || role === "admin") && (
          <>
            <TeamBuilder
              key="team-builder-unique"
              isOpen={isTeamBuilderOpen}
              onClose={() => setIsTeamBuilderOpen(false)}
              userRole={role}
              userId={userId}
            />

            {role === "superadmin" && (
              <TeamAnalyticsDrawer
                key={`drawer-team-${
                  drawerState.isOpen && drawerState.type === "team"
                }`}
                entries={analyticsEntries}
                isOpen={drawerState.isOpen && drawerState.type === "team"}
                onClose={handleDrawerClose}
                role={role}
                userId={userId}
                dateRange={dateRange}
                drawerUsers={drawerUsers}
              />
            )}
          </>
        )}
        {/* Analytics Modal */}
        {drawerState.isOpen && drawerState.type === "analyticsModal" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
            onClick={handleDrawerClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                background: "white",
                borderRadius: "16px",
                width: isMobile ? "90%" : "400px",
                maxWidth: "400px",
                boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.2)",
                position: "relative",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box
                sx={{
                  p: isMobile ? 2 : 3,
                  borderBottom: "1px solid #e0e0e0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "600", color: "#333" }}
                >
                  Analytics Options
                </Typography>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    color: "#666",
                    transition: "color 0.2s ease",
                  }}
                  onClick={handleDrawerClose}
                  onMouseEnter={(e) => (e.target.style.color = "#2575fc")}
                  onMouseLeave={(e) => (e.target.style.color = "#666")}
                >
                  ✕
                </button>
              </Box>
              <Box
                sx={{
                  p: isMobile ? 2 : 3,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <motion.button
                  onClick={() => handleAnalyticsOpen("admin")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={actionButtonStyle}
                  disabled={isDebouncing}
                >
                  <FaChartBar size={16} />
                  Team Analytics
                </motion.button>
                <motion.button
                  onClick={() => handleAnalyticsOpen("value")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={actionButtonStyle}
                  disabled={isDebouncing}
                >
                  <FaChartBar size={16} />
                  Value Analytics
                </motion.button>
                {role === "superadmin" && (
                  <motion.button
                    onClick={() => handleAnalyticsOpen("team")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={actionButtonStyle}
                    disabled={isDebouncing}
                  >
                    <FaChartBar size={16} />
                    Team-Wise Analytics
                  </motion.button>
                )}
              </Box>
            </motion.div>
          </motion.div>
        )}
      </Box>
      {/* Footer */}
      <footer className="footer-container">
        <p style={{ marginTop: "10px", color: "white", height: "10px" }}>
          © 2025 CRM. All rights reserved.
        </p>
      </footer>
    </>
  );
}

export default DashBoard;
