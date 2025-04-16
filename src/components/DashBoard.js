import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { jwtDecode } from "jwt-decode";
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
import {
  FaEye,
  FaPlus,
  FaFileExcel,
  FaUpload,
  FaUsers,
  FaChartBar,
} from "react-icons/fa";
import axios from "axios";
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

const CallTrackingDashboard = ({
  entries,
  role,
  onFilterChange,
  selectedCategory,
  userId,
}) => {
  const callStats = useMemo(() => {
    const stats = { cold: 0, warm: 0, hot: 0, closedWon: 0, closedLost: 0 };
    const filteredEntries =
      role === "superadmin" || role === "admin"
        ? entries
        : entries.filter((entry) => entry.createdBy?._id === userId);
    filteredEntries.forEach((entry) => {
      switch (entry.status) {
        case "Not Interested":
          stats.cold += 1;
          break;
        case "Maybe":
          stats.warm += 1;
          break;
        case "Interested":
          stats.hot += 1;
          break;
        case "Closed":
          if (entry.closetype === "Closed Won") stats.closedWon += 1;
          else if (entry.closetype === "Closed Lost") stats.closedLost += 1;
          break;
        default:
          break;
      }
    });
    return stats;
  }, [entries, role, userId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ mb: 4 }}>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
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
            <Grid item xs={12} sm={2.4} key={stat.title}>
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
                  }}
                  onClick={() => onFilterChange(stat.border)}
                >
                  <CardContent>
                    <Typography variant="h6" color="textSecondary">
                      {stat.title}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: "bold", color: stat.color }}
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
  const [entries, setEntries] = useState([]);
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [userId, setUserId] = useState(localStorage.getItem("userId") || "");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isTeamBuilderOpen, setIsTeamBuilderOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
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

  const debouncedSearchChange = useMemo(
    () => debounce((value) => setSearchTerm(value), 300),
    []
  );

  const statesAndCities = {
    "Andhra Pradesh": [
      "Visakhapatnam",
      "Vijayawada",
      "Guntur",
      "Tirupati",
      "Kurnool",
    ],
    "Arunachal Pradesh": ["Itanagar", "Tawang", "Ziro", "Pasighat", "Bomdila"],
    Assam: ["Guwahati", "Dibrugarh", "Jorhat", "Silchar", "Tezpur"],
    Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga"],
    Chhattisgarh: ["Raipur", "Bilaspur", "Durg", "Korba", "Bhilai"],
    Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
    Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
    Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar"],
    "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Kullu"],
    Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar"],
    Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"],
    Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kannur", "Alappuzha"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
    Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
    Manipur: ["Imphal", "Churachandpur", "Thoubal", "Bishnupur", "Kakching"],
    Meghalaya: ["Shillong", "Tura", "Nongpoh", "Cherrapunjee", "Jowai"],
    Mizoram: ["Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib"],
    Nagaland: ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"],
    Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri", "Sambalpur"],
    Punjab: ["Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda"],
    Rajasthan: ["Jaipur", "Udaipur", "Jodhpur", "Kota", "Ajmer"],
    Sikkim: ["Gangtok", "Namchi", "Pelling", "Geyzing", "Mangan"],
    "Tamil Nadu": [
      "Chennai",
      "Coimbatore",
      "Madurai",
      "Tiruchirappalli",
      "Salem",
    ],
    Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
    Tripura: ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar", "Belonia"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj"],
    Uttarakhand: ["Dehradun", "Haridwar", "Nainital", "Rishikesh", "Mussoorie"],
    "West Bengal": ["Kolkata", "Darjeeling", "Siliguri", "Howrah", "Asansol"],
  };

  const fetchUserDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");
      const decoded = jwtDecode(token);
      const response = await axios.get(
        "https://crm-server-amz7.onrender.com/api/user-role",
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );
      const { role, userId } = response.data;
      if (!role || !userId) throw new Error("Invalid user details");
      setRole(role);
      setUserId(userId);
      localStorage.setItem("role", role);
      localStorage.setItem("userId", userId);
    } catch (error) {
      console.error("Fetch user details error:", error.message);
      setError("Session verification failed. Please log in again.");
      toast.error("Session verification failed. Please log in again.");
      localStorage.clear();
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");
      const response = await axios.get(
        "https://crm-server-amz7.onrender.com/api/fetch-entry",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      setEntries(data);
      if (role === "superadmin" || role === "admin") {
        const usernamesSet = new Set();
        data.forEach((entry) => {
          if (entry.createdBy?.username)
            usernamesSet.add(entry.createdBy.username);
          if (entry.assignedTo?.username)
            usernamesSet.add(entry.assignedTo.username);
        });
        setUsernames([...usernamesSet]);
      }
    } catch (error) {
      console.error("Fetch entries error:", error.message);
      setError("Failed to load entries.");
      toast.error("Failed to fetch entries!");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  useEffect(() => {
    if (!authLoading && role && userId) fetchEntries();
  }, [authLoading, role, userId, fetchEntries]);

  const filteredData = useMemo(() => {
    return entries.filter((row) => {
      const createdAt = new Date(row.createdAt);
      return (
        (!searchTerm ||
          row.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.mobileNumber?.includes(searchTerm)) &&
        (!selectedUsername ||
          row.createdBy?.username === selectedUsername ||
          row.assignedTo?.username === selectedUsername) &&
        (!selectedState || row.state === selectedState) &&
        (!selectedCity || row.city === selectedCity) &&
        (dashboardFilter === "total" ||
          (dashboardFilter === "Closed Won" &&
            row.status === "Closed" &&
            row.closetype === "Closed Won") ||
          (dashboardFilter === "Closed Lost" &&
            row.status === "Closed" &&
            row.closetype === "Closed Lost") ||
          row.status === dashboardFilter) &&
        (!dateRange[0].startDate ||
          !dateRange[0].endDate ||
          (createdAt >= new Date(dateRange[0].startDate) &&
            createdAt <= new Date(dateRange[0].endDate)))
      );
    });
  }, [
    entries,
    searchTerm,
    selectedUsername,
    selectedState,
    selectedCity,
    dashboardFilter,
    dateRange,
  ]);

  const handleEntryAdded = useCallback(
    (newEntry) => {
      const completeEntry = {
        _id: newEntry._id || Date.now().toString(),
        customerName: newEntry.customerName || "",
        mobileNumber: newEntry.mobileNumber || "",
        contactperson: newEntry.contactperson || "",
        products: newEntry.products || [],
        type: newEntry.type || "",
        address: newEntry.address || "",
        state: newEntry.state || "",
        city: newEntry.city || "",
        organization: newEntry.organization || "",
        category: newEntry.category || "",
        createdAt: newEntry.createdAt || new Date().toISOString(),
        status: newEntry.status || "Not Found",
        expectedClosingDate: newEntry.expectedClosingDate || "",
        followUpDate: newEntry.followUpDate || "",
        remarks: newEntry.remarks || "",
        firstdate: newEntry.firstdate || "",
        estimatedValue: newEntry.estimatedValue || "",
        nextAction: newEntry.nextAction || "",
        closetype:
          newEntry.status === "Closed" &&
          ["Closed Won", "Closed Lost"].includes(newEntry.closetype)
            ? newEntry.closetype
            : "",
        priority: newEntry.priority || "",
        updatedAt: newEntry.updatedAt || new Date().toISOString(),
        createdBy: {
          _id: userId,
          username: newEntry.createdBy?.username || "",
        },
        assignedTo: newEntry.assignedTo || null,
        history: newEntry.history || [],
      };
      setEntries((prev) => [completeEntry, ...prev]);
      toast.success("Entry added successfully!");
      if (
        (role === "superadmin" || role === "admin") &&
        newEntry.createdBy?.username &&
        !usernames.includes(newEntry.createdBy.username)
      ) {
        setUsernames((prev) => [...prev, newEntry.createdBy.username]);
      }
      if (
        newEntry.assignedTo?.username &&
        !usernames.includes(newEntry.assignedTo.username)
      ) {
        setUsernames((prev) => [...prev, newEntry.assignedTo.username]);
      }
    },
    [role, userId, usernames]
  );

  const handleEntryUpdated = useCallback(
    (updatedEntry) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry._id === updatedEntry._id ? updatedEntry : entry
        )
      );
      setIsEditModalOpen(false);
      toast.success("Entry updated successfully!");
      if (
        updatedEntry.assignedTo?.username &&
        !usernames.includes(updatedEntry.assignedTo.username)
      ) {
        setUsernames((prev) => [...prev, updatedEntry.assignedTo.username]);
      }
    },
    [usernames]
  );

  const handleDelete = useCallback((deletedIds) => {
    setEntries((prev) =>
      prev.filter((entry) => !deletedIds.includes(entry._id))
    );
    setSelectedEntries((prev) => prev.filter((id) => !deletedIds.includes(id)));
    setIsDeleteModalOpen(false);
    toast.success("Entry deleted successfully!");
  }, []);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://crm-server-amz7.onrender.com/api/export",
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "arraybuffer",
        }
      );
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "entries.xlsx";
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Entries exported successfully!");
    } catch (error) {
      console.error("Export error:", error.message);
      toast.error("Failed to export entries!");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(worksheet);
        const newEntries = parsedData.map((item) => ({
          customerName: item.customerName?.trim() || "",
          mobileNumber: item.mobileNumber?.trim() || "",
          contactperson: item.contactperson?.trim() || "",
          firstdate: item.firstdate ? new Date(item.firstdate) : undefined,
          address: item.address?.trim() || "",
          state: item.state?.trim() || "",
          city: item.city?.trim() || "",
          products: item.products
            ? item.products.split("; ").map((p) => {
                const [name, rest] = p.split(" (");
                const [spec, sizeQty] = rest?.split(", ") || ["", ""];
                const size = sizeQty?.split(", Qty: ")[0] || "";
                const quantity = parseInt(sizeQty?.split(", Qty: ")[1]) || 1;
                return { name, specification: spec, size, quantity };
              })
            : [],
          type: item.type?.trim() || "Customer",
          organization: item.organization?.trim() || "",
          category: item.category?.trim() || "",
          remarks: item.remarks?.trim() || "",
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          status: item.status?.trim() || "Not Found",
          expectedClosingDate: item.expectedClosingDate
            ? new Date(item.expectedClosingDate)
            : undefined,
          followUpDate: item.followUpDate
            ? new Date(item.followUpDate)
            : undefined,
          estimatedValue: item.estimatedValue
            ? Number(item.estimatedValue)
            : undefined,
          closetype:
            item.status === "Closed" &&
            ["Closed Won", "Closed Lost"].includes(item.closetype?.trim())
              ? item.closetype.trim()
              : "",
          nextAction: item.nextAction?.trim() || "",
          createdBy: { username: item.createdBy?.trim() || "" },
          assignedTo: item.assignedTo
            ? { username: item.assignedTo?.trim() || "" }
            : null,
        }));
        const validEntries = newEntries.filter((entry) => {
          const requiredFields = [
            "customerName",
            "mobileNumber",
            "contactperson",
            "address",
            "products",
            "organization",
            "category",
            "state",
            "city",
          ];
          return (
            requiredFields.every(
              (field) =>
                entry[field] &&
                entry[field] !== "" &&
                (field !== "mobileNumber" || /^\d{10}$/.test(entry[field]))
            ) &&
            ["Partner", "Customer"].includes(entry.type) &&
            ["Private", "Government"].includes(entry.category) &&
            (!entry.estimatedValue || entry.estimatedValue >= 0) &&
            (entry.status !== "Closed" ||
              ["Closed Won", "Closed Lost"].includes(entry.closetype))
          );
        });
        if (validEntries.length === 0) {
          toast.error("All records are invalid or incomplete.");
          return;
        }
        const token = localStorage.getItem("token");
        const response = await axios.post(
          "https://crm-server-amz7.onrender.com/api/entries",
          validEntries,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.status === 200 || response.status === 201) {
          setEntries((prev) => [...validEntries, ...prev]);
          toast.success("Entries uploaded successfully!");
          fetchEntries();
        }
      } catch (error) {
        console.error("Upload error:", error.message);
        toast.error("Failed to upload entries!");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleReset = () => {
    setSearchTerm("");
    setSelectedUsername("");
    setSelectedState("");
    setSelectedCity("");
    setSelectedEntries([]);
    setIsSelectionMode(false);
    setDoubleClickInitiated(false);
    setDashboardFilter("total");
    setDateRange([{ startDate: null, endDate: null, key: "selection" }]);
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
    return (
      <div
        key={key}
        style={{ ...style, cursor: "pointer" }}
        className={`virtual-row ${isSelected ? "selected" : ""}`}
        onDoubleClick={() => handleDoubleClick(row._id)}
        onClick={() => handleSingleClick(row._id)}
      >
        <div className="virtual-cell">{index + 1}</div>
        <div className="virtual-cell">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "N/A"}
        </div>
        <div className="virtual-cell">{row.customerName}</div>
        <div className="virtual-cell">{row.mobileNumber}</div>
        <div className="virtual-cell">{row.address}</div>
        <div className="virtual-cell">{row.city}</div>
        <div className="virtual-cell">{row.state}</div>
        <div className="virtual-cell">{row.organization}</div>
        <div className="virtual-cell">{row.category}</div>
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
              borderRadius: "22px",
              padding: "0",
            }}
          >
            <FaEye style={{ marginBottom: "3px" }} />
          </Button>
          <button
            onClick={() => {
              setEntryToEdit(row);
              setIsEditModalOpen(true);
            }}
            className="editBtn"
            style={{ width: "40px", height: "40px", padding: "0" }}
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
            style={{ width: "40px", height: "40px", padding: "0" }}
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

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
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

  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <>
      <div className="enhanced-search-bar-container">
        <input
          style={{ width: "30%" }}
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
            {usernames.map((username) => (
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
            placeholder="-- Select date range -- "
            readOnly
            className="cursor-pointer border p-2"
          />
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            <DateRangePicker
              ranges={dateRange}
              onChange={(item) => setDateRange([item.selection])}
              moveRangeOnFirstSelection={false}
              showSelectionPreview={true}
              rangeColors={["#2575fc"]}
              editableDateInputs={true}
              months={1}
              direction="horizontal"
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

      <div
        className="dashboard-container"
        style={{ width: "90%", margin: "auto", padding: "20px" }}
      >
        <CallTrackingDashboard
          entries={entries}
          role={role}
          onFilterChange={setDashboardFilter}
          selectedCategory={dashboardFilter}
          userId={userId}
        />

        <div style={{ textAlign: "center" }}>
          <label
            style={{
              padding: "12px 20px",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              color: "white",
              borderRadius: "12px",
              margin: "0 10px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            <FaUpload style={{ marginRight: "8px", verticalAlign: "middle" }} />
            Bulk Upload via Excel
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              style={{ display: "none" }}
            />
          </label>
          <button
            className="button mx-3"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              margin: "0 10px",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            <FaPlus style={{ marginRight: "8px", verticalAlign: "middle" }} />
            Add New Entry
          </button>
          {(role === "superadmin" || role === "admin") && (
            <>
              <button
                className="button mx-1"
                onClick={() => setIsTeamBuilderOpen(true)}
                style={{
                  padding: "12px 20px",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  color: "white",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  border: "none",
                  fontSize: "1rem",
                  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  margin: "0 10px",
                  display: "inline-block",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
                }}
              >
                <FaUsers style={{ marginRight: "8px" }} />
                Team Builder
              </button>
              <button
                className="button mx-1"
                onClick={() => setIsAnalyticsOpen(true)}
                style={{
                  padding: "12px 20px",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  color: "white",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  border: "none",
                  fontSize: "1rem",
                  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  margin: "0 10px",
                  display: "inline-block",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
                }}
              >
                <FaChartBar style={{ marginRight: "8px" }} />
                Team Analytics
              </button>
              <button
                className="button mx-1"
                onClick={handleExport}
                style={{
                  padding: "12px 20px",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  color: "white",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  border: "none",
                  fontSize: "1rem",
                  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  margin: "0 10px",
                  display: "inline-block",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
                }}
              >
                <FaFileExcel
                  style={{ marginRight: "8px", verticalAlign: "middle" }}
                />
                Export To Excel
              </button>
            </>
          )}
          {(role === "superadmin" || role === "admin") &&
            filteredData.length > 0 && (
              <div style={{ marginTop: "10px", marginLeft: "50px" }}>
                {isSelectionMode && (
                  <Button
                    variant="info"
                    className="select mx-3"
                    onClick={handleSelectAll}
                    style={{
                      marginRight: "10px",
                      background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                      border: "none",
                      color: "white",
                      padding: "10px 20px",
                      borderRadius: "12px",
                      fontWeight: "bold",
                      boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow =
                        "0px 6px 12px rgba(0, 0, 0, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow =
                        "0px 4px 6px rgba(0, 0, 0, 0.1)";
                    }}
                  >
                    Select All
                  </Button>
                )}
                {selectedEntries.length > 0 && (
                  <>
                    <Button
                      variant="primary"
                      onClick={handleCopySelected}
                      style={{
                        marginRight: "10px",
                        background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "12px",
                        fontWeight: "bold",
                        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = "translateY(-2px)";
                        e.target.style.boxShadow =
                          "0px 6px 12px rgba(0, 0, 0, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow =
                          "0px 4px 6px rgba(0, 0, 0, 0.1)";
                      }}
                    >
                      Copy Selected {selectedEntries.length}
                    </Button>
                    <Button
                      variant="danger"
                      className="copy mx-2"
                      onClick={handleDeleteSelected}
                      style={{
                        background: "linear-gradient(90deg, #ff4444, #cc0000)",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "12px",
                        fontWeight: "bold",
                        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = "translateY(-2px)";
                        e.target.style.boxShadow =
                          "0px 6px 12px rgba(0, 0, 0, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow =
                          "0px 4px 6px rgba(0, 0, 0, 0.1)";
                      }}
                    >
                      Delete Selected {selectedEntries.length}
                    </Button>
                  </>
                )}
              </div>
            )}
          <p
            style={{ fontSize: "0.9rem", color: "#6c757d", marginTop: "10px" }}
          >
            Upload a valid Excel file with columns:{" "}
            <strong>
              Customer Name, Mobile Number, Address, State, City, Organization,
              Category, Created At, Expected Closing Date, Follow-Up Date,
              Remarks, Products Description, Type, Close Type, Assigned To.
            </strong>
          </p>
        </div>

        <div
          style={{
            marginBottom: "10px",
            fontWeight: "600",
            fontSize: "1rem",
            color: "#fff",
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            padding: "5px 15px",
            borderRadius: "20px",
            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
            display: "inline-block",
            textAlign: "center",
            width: "auto",
            textTransform: "capitalize",
          }}
        >
          Total Results: {filteredData.length}
        </div>
        <div
          className="table-container"
          style={{
            width: "100%",
            height: "75vh",
            margin: "0 auto",
            overflowX: "hidden",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
            borderRadius: "15px",
            marginTop: "20px",
            backgroundColor: "#fff",
          }}
        >
          <div
            className="table-header"
            style={{
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              color: "white",
              fontSize: "1.1rem",
              padding: "15px 20px",
              textAlign: "center",
              position: "sticky",
              top: 0,
              zIndex: 2,
              display: "grid",
              gridTemplateColumns: "115px repeat(8, 1fr) 150px",
              fontWeight: "bold",
              borderBottom: "2px solid #ddd",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div>#</div>
            <div style={{ alignItems: "center", justifyContent: "center" }}>
              Date
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Customer
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Mobile
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Address
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              City
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              State
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Organization
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Category
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Actions
            </div>
          </div>
          {filteredData.length === 0 ? (
            <div
              style={{
                height: "calc(100% - 60px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "1.5rem",
                color: "#666",
                fontWeight: "bold",
                textAlign: "center",
                padding: "20px",
              }}
            >
              No Entries Available
            </div>
          ) : (
            <AutoSizer>
              {({ height, width }) => (
                <List
                  width={width}
                  height={height - 60}
                  rowCount={filteredData.length}
                  rowHeight={60}
                  rowRenderer={rowRenderer}
                  overscanRowCount={10}
                  style={{ outline: "none" }}
                />
              )}
            </AutoSizer>
          )}
        </div>

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
        />
        <TeamBuilder
          isOpen={isTeamBuilderOpen}
          onClose={() => setIsTeamBuilderOpen(false)}
          userRole={role}
          userId={userId}
        />
        <AdminDrawer
          entries={entries}
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          role={role}
          userId={userId}
        />
      </div>
      <footer className="footer-container">
        <p style={{ marginTop: "15px", color: "white", height: "10px" }}>
          © 2025 DataManagement. All rights reserved.
        </p>
      </footer>
    </>
  );
}

export default DashBoard;
