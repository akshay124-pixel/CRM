import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import TeamAnalyticsDrawer from "./TeamAnalyticsDrawer.js";
import { jwtDecode } from "jwt-decode";
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
import AttendanceTracker from "./AttendanceTracker";
import {
  FaSignOutAlt,
  FaClock,
  FaEye,
  FaPlus,
  FaFileExcel,
  FaUpload,
  FaUsers,
  FaChartBar,
  FaCheckCircle,
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
import ValueAnalyticsDrawer from "./ValueAnalyticsDrawer.js";
import { FixedSizeList } from "react-window";

// Custom hook for mobile detection
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

// Reusable ActionButton component
const ActionButton = ({
  onClick,
  icon,
  label,
  variant = "primary",
  disabled = false,
  style = {},
  ariaLabel,
}) => {
  const isMobile = useIsMobile();
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.05, boxShadow: "0 6px 12px rgba(0,0,0,0.2)" }}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: isMobile ? "8px 12px" : "10px 20px",
        background:
          variant === "danger"
            ? "linear-gradient(90deg, #ff4444, #cc0000)"
            : "linear-gradient(135deg, #2575fc, #6a11cb)",
        color: "white",
        borderRadius: "12px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: "bold",
        border: "none",
        fontSize: isMobile ? "0.9rem" : "1rem",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        ...style,
      }}
      aria-label={ariaLabel}
    >
      {icon}
      {label}
    </motion.button>
  );
};

// Call Tracking Dashboard Component
const CallTrackingDashboard = ({
  entries,
  role,
  onFilterChange,
  selectedCategory,
  userId,
  selectedUsername,
}) => {
  const callStats = useMemo(() => {
    const stats = { cold: 0, warm: 0, hot: 0, closedWon: 0, closedLost: 0 };
    const filteredEntries = entries.filter(
      (entry) =>
        (role === "superadmin" ||
          role === "admin" ||
          entry.createdBy?._id === userId) &&
        (!selectedUsername ||
          entry.createdBy?.username === selectedUsername ||
          entry.assignedTo?.username === selectedUsername)
    );
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
  }, [entries, role, userId, selectedUsername]);

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
  const [isValueAnalyticsOpen, setIsValueAnalyticsOpen] = useState(false);
  const [isTeamAnalyticsOpen, setIsTeamAnalyticsOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
  const [userRole, setUserRole] = useState("");
  const [totalVisits, setTotalVisits] = useState(0);
  const [monthlyVisits, setMonthlyVisits] = useState(0);

  // Placeholder states and cities
  const statesAndCities = {
    "Andhra Pradesh": [
      "Visakhapatnam",
      "Jaganathpuram",
      "Vijayawada",
      "Guntur",
      "Tirupati",
      "Kurnool",
      "Rajahmundry",
      "Nellore",
      "Anantapur",
      "Kadapa",
      "Srikakulam",
      "Eluru",
      "Ongole",
      "Chittoor",
      "Proddatur",
      "Machilipatnam",
    ],
    "Arunachal Pradesh": [
      "Itanagar",
      "Tawang",
      "Ziro",
      "Pasighat",
      "Bomdila",
      "Naharlagun",
      "Roing",
      "Aalo",
      "Tezu",
      "Changlang",
      "Khonsa",
      "Yingkiong",
      "Daporijo",
      "Seppa",
    ],
    Assam: [
      "Agartala",
      "Tripura",
      "Guwahati",
      "Dibrugarh",
      "Jorhat",
      "Silchar",
      "Tezpur",
      "Tinsukia",
      "Nagaon",
      "Sivasagar",
      "Barpeta",
      "Goalpara",
      "Karimganj",
      "Lakhimpur",
      "Diphu",
      "Golaghat",
      "Kamrup",
    ],
    Bihar: [
      "Patna",
      "Mirzapur",
      "Jehanabad",
      "Mithapur",
      "Gaya",
      "Bhagalpur",
      "Muzaffarpur",
      "Darbhanga",
      "Purnia",
      "Ara",
      "Begusarai",
      "Katihar",
      "Munger",
      "Chapra",
      "Sasaram",
      "Hajipur",
      "Bihar Sharif",
      "Sitamarhi",
    ],
    Chhattisgarh: [
      "Raipur",
      "Bilaspur",
      "Durg",
      "Korba",
      "Bhilai",
      "Rajnandgaon",
      "Jagdalpur",
      "Ambikapur",
      "Raigarh",
      "Dhamtari",
      "Kawardha",
      "Mahasamund",
      "Kondagaon",
      "Bijapur",
    ],
    Goa: [
      "Panaji",
      "Margao",
      "Vasco da Gama",
      "Mapusa",
      "Ponda",
      "Bicholim",
      "Sanguem",
      "Canacona",
      "Quepem",
      "Valpoi",
      "Sanquelim",
      "Curchorem",
    ],
    Gujarat: [
      "Ahmedabad",
      "Surat",
      "Vadodara",
      "Rajkot",
      "Bhavnagar",
      "Jamnagar",
      "Junagadh",
      "Gandhinagar",
      "Anand",
      "Morbi",
      "Nadiad",
      "Porbandar",
      "Mehsana",
      "Bharuch",
      "Navsari",
      "Surendranagar",
    ],
    Haryana: [
      "Bahadurgarh",
      "Gurugram",
      "Faridabad",
      "Panipat",
      "Ambala",
      "Hisar",
      "Rohtak",
      "Karnal",
      "Bhiwani",
      "Kaithal",
      "Kurukshetra",
      "Sonipat",
      "Jhajjar",
      "Jind",
      "Fatehabad",
      "Pehowa",
      "Pinjore",
      "Rewari",
      "Yamunanagar",
      "Sirsa",
      "Dabwali",
      "Narwana",
    ],
    "Himachal Pradesh": [
      "Nagrota Surian",
      "Shimla",
      "Dharamshala",
      "Solan",
      "Mandi",
      "Hamirpur",
      "Kullu",
      "Manali",
      "Nahan",
      "Palampur",
      "Baddi",
      "Sundarnagar",
      "Paonta Sahib",
      "Bilaspur",
      "Chamba",
      "Una",
      "Kangra",
      "Parwanoo",
      "Nalagarh",
      "Rohru",
      "Keylong",
    ],
    Jharkhand: [
      "Ranchi",
      "Jamshedpur",
      "Dhanbad",
      "Bokaro",
      "Deoghar",
      "Hazaribagh",
      "Giridih",
      "Ramgarh",
      "Chaibasa",
      "Palamu",
      "Gumla",
      "Lohardaga",
      "Dumka",
      "Chatra",
      "Pakur",
      "Jamtara",
      "Simdega",
      "Sahibganj",
      "Godda",
      "Latehar",
      "Khunti",
    ],
    Karnataka: [
      "Bengaluru",
      "Mysuru",
      "Mangaluru",
      "Hubballi",
      "Belagavi",
      "Kalaburagi",
      "Ballari",
      "Davangere",
      "Shivamogga",
      "Tumakuru",
      "Udupi",
      "Vijayapura",
      "Chikkamagaluru",
      "Hassan",
      "Mandya",
      "Raichur",
      "Bidar",
      "Bagalkot",
      "Chitradurga",
      "Kolar",
      "Gadag",
      "Yadgir",
      "Haveri",
      "Dharwad",
      "Ramanagara",
      "Chikkaballapur",
      "Kodagu",
      "Koppal",
    ],
    Kerala: [
      "Thiruvananthapuram",
      "Kochi",
      "Kozhikode",
      "Kannur",
      "Alappuzha",
      "Thrissur",
      "Kottayam",
      "Palakkad",
      "Ernakulam",
      "Malappuram",
      "Pathanamthitta",
      "Idukki",
      "Wayanad",
      "Kollam",
      "Kasaragod",
      "Punalur",
      "Varkala",
      "Changanassery",
      "Kayani",
      "Kizhakkambalam",
      "Perumbavoor",
      "Muvattupuzha",
      "Attingal",
      "Vypin",
      "North Paravur",
      "Adoor",
      "Cherthala",
      "Mattancherry",
      "Fort Kochi",
      "Munroe Island",
    ],
    "Madhya Pradesh": [
      "Bhopal",
      "Indore",
      "Gwalior",
      "Jabalpur",
      "Ujjain",
      "Sagar",
      "Ratlam",
      "Satna",
      "Dewas",
      "Murwara (Katni)",
      "Chhindwara",
      "Rewa",
      "Burhanpur",
      "Khandwa",
      "Bhind",
      "Shivpuri",
      "Vidisha",
      "Sehore",
      "Hoshangabad",
      "Itarsi",
      "Neemuch",
      "Chhatarpur",
      "Betul",
      "Mandsaur",
      "Damoh",
      "Singrauli",
      "Guna",
      "Ashok Nagar",
      "Datia",
      "Mhow",
      "Pithampur",
      "Shahdol",
      "Seoni",
      "Mandla",
      "Tikamgarh",
      "Raisen",
      "Narsinghpur",
      "Morena",
      "Barwani",
      "Rajgarh",
      "Khargone",
      "Anuppur",
      "Umaria",
      "Dindori",
      "Sheopur",
      "Alirajpur",
      "Jhabua",
      "Sidhi",
      "Harda",
      "Balaghat",
      "Agar Malwa",
    ],
    Maharashtra: [
      "Mumbai",
      "Gadchiroli",
      "Pune",
      "Nagpur",
      "Nashik",
      "Aurangabad",
      "Solapur",
      "Kolhapur",
      "Thane",
      "Satara",
      "Latur",
      "Chandrapur",
      "Jalgaon",
      "Bhiwandi",
      "Shirdi",
      "Akola",
      "Parbhani",
      "Raigad",
      "Washim",
      "Buldhana",
      "Nanded",
      "Yavatmal",
      "Beed",
      "Amravati",
      "Kalyan",
      "Dombivli",
      "Ulhasnagar",
      "Nagothane",
      "Vasai",
      "Virar",
      "Mira-Bhayandar",
      "Dhule",
      "Sangli",
      "Wardha",
      "Ahmednagar",
      "Pandharpur",
      "Malegaon",
      "Osmanabad",
      "Gondia",
      "Baramati",
      "Jalna",
      "Hingoli",
      "Sindhudurg",
      "Ratnagiri",
      "Palghar",
      "Ambarnath",
      "Badlapur",
      "Taloja",
      "Alibaug",
      "Murbad",
      "Karjat",
      "Pen",
      "Newasa",
    ],
    Manipur: [
      "Imphal",
      "Churachandpur",
      "Thoubal",
      "Bishnupur",
      "Kakching",
      "Senapati",
      "Ukhrul",
      "Tamenglong",
      "Jiribam",
      "Moreh",
      "Noney",
      "Pherzawl",
      "Kangpokpi",
    ],
    Meghalaya: [
      "Shillong",
      "Tura",
      "Nongpoh",
      "Cherrapunjee",
      "Jowai",
      "Baghmara",
      "Williamnagar",
      "Mawkyrwat",
      "Resubelpara",
      "Mairang",
    ],
    Mizoram: [
      "Aizawl",
      "Lunglei",
      "Champhai",
      "Serchhip",
      "Kolasib",
      "Saiha",
      "Lawngtlai",
      "Mamit",
      "Hnahthial",
      "Khawzawl",
      "Saitual",
    ],
    Nagaland: [
      "Kohima",
      "Dimapur",
      "Mokokchung",
      "Tuensang",
      "Wokha",
      "Mon",
      "Zunheboto",
      "Phek",
      "Longleng",
      "Kiphire",
      "Peren",
    ],
    Odisha: [
      "Bhubaneswar",
      "Cuttack",
      "Rourkela",
      "Puri",
      "Sambalpur",
      "Berhampur",
      "Balasore",
      "Baripada",
      "Bhadrak",
      "Jeypore",
      "Angul",
      "Dhenkanal",
      "Keonjhar",
      "Kendrapara",
      "Jagatsinghpur",
      "Paradeep",
      "Bargarh",
      "Rayagada",
      "Koraput",
      "Nabarangpur",
      "Kalahandi",
      "Nuapada",
      "Phulbani",
      "Balangir",
      "Sundargarh",
    ],
    Punjab: [
      "Amritsar",
      "Ludhiana",
      "Jalandhar",
      "Patiala",
      "Bathinda",
      "Mohali", // Also known as Sahibzada Ajit Singh Nagar (SAS Nagar)
      "Hoshiarpur",
      "Gurdaspur",
      "Ferozepur",
      "Sangrur",
      "Moga",
      "Rupnagar", // Official name for Ropar
      "Kapurthala",
      "Faridkot",
      "Muktsar", // Corrected from "Makatsar"
      "Fazilka",
      "Barnala",
      "Mansa",
      "Tarn Taran",
      "Nawanshahr", // Also known as Shaheed Bhagat Singh Nagar
      "Pathankot",
      "Zirakpur",
      "Khanna",
      "Malerkotla",
      "Abohar",
      "Rajpura",
      "Phagwara",
      "Batala",
      "Samrala",
      "Anandpur Sahib",
      "Sirhind",
      "Kharar",
      "Morinda",
      "Bassi Pathana",
      "Khamanon", // Corrected from "Khamano"
      "Chunni Kalan",
      "Balachaur",
      "Dinanagar",
      "Dasuya",
      "Nakodar",
      "Jagraon",
      "Sunam",
      "Dhuri",
      "Lehragaga",
      "Rampura Phul",
    ],
    Rajasthan: [
      "Baran",
      "Newai",
      "Gaganagar",
      "Suratgarh",
      "Jaipur",
      "Udaipur",
      "Jodhpur",
      "Kota",
      "Ajmer",
      "Bikaner",
      "Alwar",
      "Bharatpur",
      "Sikar",
      "Pali",
      "Nagaur",
      "Jhunjhunu",
      "Chittorgarh",
      "Tonk",
      "Barmer",
      "Jaisalmer",
      "Dholpur",
      "Bhilwara",
      "Hanumangarh",
      "Sawai Madhopur",
    ],
    Sikkim: [
      "Gangtok",
      "Namchi",
      "Pelling",
      "Geyzing",
      "Mangan",
      "Rangpo",
      "Jorethang",
      "Yuksom",
      "Ravangla",
      "Lachen",
      "Lachung",
    ],
    "Tamil Nadu": [
      "Chennai",
      "Coimbatore",
      "Madurai",
      "Tiruchirappalli",
      "Salem",
      "Erode",
      "Tirunelveli",
      "Vellore",
      "Thanjavur",
      "Tuticorin",
      "Dindigul",
      "Cuddalore",
      "Kancheepuram",
      "Nagercoil",
      "Kumbakonam",
      "Karur",
      "Sivakasi",
      "Namakkal",
      "Tiruppur",
    ],
    Telangana: [
      "Hyderabad",
      "Warangal",
      "Nizamabad",
      "Karimnagar",
      "Khammam",
      "Mahbubnagar",
      "Ramagundam",
      "Siddipet",
      "Adilabad",
      "Nalgonda",
      "Mancherial",
      "Kothagudem",
      "Zaheerabad",
      "Miryalaguda",
      "Bhongir",
      "Jagtial",
    ],
    Tripura: [
      "Agartala",
      "Udaipur",
      "Dharmanagar",
      "Kailashahar",
      "Belonia",
      "Kamalpur",
      "Ambassa",
      "Khowai",
      "Sabroom",
      "Sonamura",
      "Melaghar",
    ],
    "Uttar Pradesh": [
      "Shikohabad ",
      "Lucknow",
      "Matbarganj",
      "Kasganj",
      "Kanpur",
      "Varanasi",
      "Agra",
      "Prayagraj (Allahabad)",
      "Ghaziabad",
      "Noida",
      "Meerut",
      "Aligarh",
      "Bareilly",
      "Moradabad",
      "Saharanpur",
      "Gorakhpur",
      "Firozabad",
      "Jhansi",
      "Muzaffarnagar",
      "Mathura-Vrindavan",
      "Budaun",
      "Rampur",
      "Shahjahanpur",
      "Farrukhabad-Fatehgarh",
      "Ayodhya",
      "Unnao",
      "Jaunpur",
      "Lakhimpur",
      "Hathras",
      "Banda",
      "Pilibhit",
      "Barabanki",
      "Khurja",
      "Gonda",
      "Mainpuri",
      "Lalitpur",
      "Sitapur",
      "Etah",
      "Deoria",
      "Ghazipur",
    ],
    Uttarakhand: [
      "Dehradun",
      "Haridwar",
      "Nainital",
      "Rishikesh",
      "Mussoorie",
      "Almora",
      "Pithoragarh",
      "Haldwani",
      "Rudrapur",
      "Bageshwar",
      "Champawat",
      "Uttarkashi",
      "Roorkee",
      "Tehri",
      "Lansdowne",
    ],
    "West Bengal": [
      "Kolkata",
      "Garia",
      "Darjeeling",
      "Siliguri",
      "Howrah",
      "Asansol",
      "Durgapur",
      "Malda",
      "Cooch Behar",
      "Haldia",
      "Kharagpur",
      "Raiganj",
      "Bardhaman",
      "Jalpaiguri",
      "Chandannagar",
      "Kalimpong",
      "Alipurduar",
    ],
    "Andaman and Nicobar Islands": [
      "Port Blair",
      "Havelock Island",
      "Diglipur",
      "Neil Island",
      "Car Nicobar",
      "Little Andaman",
      "Long Island",
      "Mayabunder",
      "Campbell Bay",
      "Rangat",
      "Wandoor",
    ],
    Chandigarh: [
      "Sector 1",
      "Sector 2",
      "Sector 3",
      "Sector 4",
      "Sector 5",
      "Sector 6",
      "Sector 7",
      "Sector 8",
      "Sector 9",
      "Sector 10",
      "Sector 11",
      "Sector 12",
      "Sector 13", // Note: Sector 13 does not exist in Chandigarh.
      "Sector 14",
      "Sector 15",
      "Sector 16",
      "Sector 17",
      "Sector 18",
      "Sector 19",
      "Sector 20",
      "Sector 21",
      "Sector 22",
      "Sector 23",
      "Sector 24",
      "Sector 25",
      "Sector 26",
      "Sector 27",
      "Sector 28",
      "Sector 29",
      "Sector 30",
      "Sector 31",
      "Sector 32",
      "Sector 33",
      "Sector 34",
      "Sector 35",
      "Sector 36",
      "Sector 37",
      "Sector 38",
      "Sector 39",
      "Sector 40",
      "Sector 41",
      "Sector 42",
      "Sector 43",
      "Sector 44",
      "Sector 45",
      "Sector 46",
      "Sector 47",
    ],
    "Dadra and Nagar Haveli and Daman and Diu": [
      "Daman",
      "Diu",
      "Silvassa",
      "Amli",
      "Kachigam",
      "Naroli",
      "Vapi",
      "Marwad",
      "Samarvarni",
      "Kawant",
    ],
    Delhi: [
      "New Delhi",
      "Old Delhi",
      "Dwarka",
      "Rohini",
      "Karol Bagh",
      "Lajpat Nagar",
      "Saket",
      "Vasant Kunj",
      "Janakpuri",
      "Mayur Vihar",
      "Shahdara",
      "Preet Vihar",
      "Pitampura",
      "Chanakyapuri",
      "Narela",
      "Mehrauli",
      "Najafgarh",
      "Okhla",
      "Tilak Nagar",
    ],
    "Jammu and Kashmir": [
      "Srinagar",
      "Jammu",
      "Anantnag",
      "Baramulla",
      "Pulwama",
      "Kupwara",
      "Udhampur",
      "Kathua",
      "Poonch",
      "Kulgam",
      "Budgam",
      "Bandipora",
      "Ganderbal",
      "Rajouri",
      "Reasi",
      "Doda",
      "Miran sahib",
    ],
    Ladakh: [
      "Leh",
      "Kargil",
      "Diskit",
      "Padum",
      "Nubra",
      "Tangtse",
      "Sankoo",
      "Zanskar",
      "Nyoma",
      "Turtuk",
      "Hanle",
    ],
    Lakshadweep: [
      "Kavaratti",
      "Agatti",
      "Minicoy",
      "Amini",
      "Andrott",
      "Kalpeni",
      "Kadmat",
      "Chetlat",
      "Bitra",
      "Bangaram",
    ],
    Puducherry: [
      "Puducherry",
      "Karaikal",
      "Mahe",
      "Yanam",
      "Villianur",
      "Bahour",
      "Oulgaret",
      "Ariyankuppam",
      "Nettapakkam",
    ],
  };

  const debouncedSearchChange = useMemo(
    () => debounce((value) => setSearchTerm(value), 300),
    []
  );

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
    return entries
      .filter((row) => {
        const createdAt = new Date(row.createdAt);
        return (
          (!searchTerm ||
            row.customerName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
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
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
  }, []);

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

  const handleExport = async () => {
    try {
      const exportData = filteredData.map((entry) => ({
        Customer_Name: entry.customerName || "",
        Mobile_Number: entry.mobileNumber || "",
        Contact_Person: entry.contactperson || "",
        Address: entry.address || "",
        State: entry.state || "",
        City: entry.city || "",
        Organization: entry.organization || "",
        Category: entry.category || "",
        Created_At: entry.createdAt
          ? new Date(entry.createdAt).toLocaleDateString()
          : "",
        Expected_Closing_Date: entry.expectedClosingDate
          ? new Date(entry.expectedClosingDate).toLocaleDateString()
          : "",
        Follow_Up_Date: entry.followUpDate
          ? new Date(entry.followUpDate).toLocaleDateString()
          : "",
        Remarks: entry.remarks || "",
        Products:
          entry.products
            ?.map(
              (p) =>
                `${p.name} (${p.specification}, ${p.size}, Qty: ${p.quantity})`
            )
            .join("; ") || "",
        Type: entry.type || "",
        Status: entry.status || "",
        Close_Type: entry.closetype || "",
        Assigned_To: entry.assignedTo?.username || "",
        Estimated_Value: entry.estimatedValue || "",
        Close_Amount: entry.closeamount || "",
        Next_Action: entry.nextAction || "",
        Live_Location: entry.liveLocation || "",
        First_Person_Met: entry.firstPersonMeet || "",
        Second_Person_Met: entry.secondPersonMeet || "",
        Third_Person_Met: entry.thirdPersonMeet || "",
        Fourth_Person_Met: entry.fourthPersonMeet || "",
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Entries");
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "DataSet.xlsx";
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Filtered entries exported successfully!");
    } catch (error) {
      console.error("Export error:", error.message);
      toast.error("Failed to export filtered entries!");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("No file selected!");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in to upload entries!");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        const newEntries = parsedData.map((item) => ({
          customerName: item.Customer_Name?.trim() || "",
          mobileNumber: item.Mobile_Number?.trim() || "",
          contactperson: item.Contact_Person?.trim() || "",
          firstdate:
            item.First_Date && item.First_Date !== "Not Set"
              ? new Date(item.First_Date)
              : undefined,
          address: item.Address?.trim() || "",
          state: item.State?.trim() || "",
          city: item.City?.trim() || "",
          products:
            item.Products && item.Products !== "N/A"
              ? item.Products.split("; ").map((p) => {
                  const [name, rest] = p.split(" (");
                  const [spec, sizeQty] = rest?.split(", ") || ["", ""];
                  const size = sizeQty?.split(", Qty: ")[0] || "";
                  const quantity = parseInt(sizeQty?.split(", Qty: ")[1]) || 1;
                  return { name, specification: spec, size, quantity };
                })
              : [],
          type: item.Type?.trim() || "Customer",
          organization: item.Organization?.trim() || "",
          category: item.Category?.trim() || "",
          remarks: item.Remarks?.trim() || "",
          createdAt: item.Created_At ? new Date(item.Created_At) : new Date(),
          status: item.Status?.trim() || "Not Found",
          expectedClosingDate:
            item.Expected_Closing_Date &&
            item.Expected_Closing_Date !== "Not Set"
              ? new Date(item.Expected_Closing_Date)
              : undefined,
          followUpDate:
            item.Follow_Up_Date && item.Follow_Up_Date !== "Not Set"
              ? new Date(item.Follow_Up_Date)
              : undefined,
          estimatedValue: item.Estimated_Value
            ? Number(item.Estimated_Value)
            : undefined,
          closeamount: item.Close_Amount
            ? Number(item.Close_Amount)
            : undefined,
          closetype: item.Close_Type?.trim() || "",
          nextAction: item.Next_Action?.trim() || "",
          liveLocation: item.Live_Location?.trim() || "",
          firstPersonMeet: item.First_Person_Met?.trim() || "",
          secondPersonMeet: item.Second_Person_Met?.trim() || "",
          thirdPersonMeet: item.Third_Person_Met?.trim() || "",
          fourthPersonMeet: item.Fourth_Person_Met?.trim() || "",
        }));
        const response = await axios.post(
          "https://crm-server-amz7.onrender.com/api/entries",
          newEntries,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.status === 200 || response.status === 201) {
          setEntries((prev) => [...newEntries, ...prev]);
          toast.success("Entries uploaded successfully!");
          fetchEntries();
        }
      } catch (error) {
        console.error("File parsing error:", error.message);
        toast.error("Error parsing the Excel file!");
      }
    };
    reader.onerror = () => {
      toast.error("Error reading the file!");
    };
    reader.readAsArrayBuffer(file);
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

  const navigate = useNavigate();
  const fetchUserRole = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://crm-server-amz7.onrender.com/api/user-role",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserRole(response.data.role);
      setUserId(response.data.userId); // Corrected to match response structure
    } catch (error) {
      toast.error("Failed to fetch user role!");
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  const handleSelectAll = () => {
    if (isSelectionMode && (role === "superadmin" || role === "admin")) {
      const allFilteredIds = filteredData.map((entry) => entry._id);
      setSelectedEntries(allFilteredIds);
    }
  };

  const { total, monthly } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const total = entries.reduce(
      (sum, entry) => sum + (entry.history?.length || 0),
      0
    );
    const monthly = entries.reduce((sum, entry) => {
      const entryDate = new Date(entry.createdAt);
      const entryMonth = entryDate.getMonth();
      const entryYear = entryDate.getFullYear();
      if (entryMonth === currentMonth && entryYear === currentYear) {
        return sum + (entry.history?.length || 0);
      }
      return sum;
    }, 0);
    return { total, monthly };
  }, [entries]);

  useEffect(() => {
    setTotalVisits(total);
    setMonthlyVisits(monthly);
  }, [total, monthly]);

  useEffect(() => {
    const checkMonthChange = () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthly = entries.reduce((sum, entry) => {
        const entryDate = new Date(entry.createdAt);
        const entryMonth = entryDate.getMonth();
        const entryYear = entryDate.getFullYear();
        if (entryMonth === currentMonth && entryYear === currentYear) {
          return sum + (entry.history?.length || 0);
        }
        return sum;
      }, 0);
      setMonthlyVisits(monthly);
    };
    const interval = setInterval(checkMonthChange, 60000);
    return () => clearInterval(interval);
  }, [entries]);

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
          {row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("en-GB")
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
              borderRadius: "22px",
              padding: "0",
            }}
            aria-label={`View entry for ${row.customerName}`}
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
            style={{ width: "40px", height: "40px", padding: "0" }}
            aria-label={`Delete entry for ${row.customerName}`}
          >
            <svg
              className="bin-top"
              viewBox="0 0 39 7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4" />
              <line
                x1="12"
                y1="1.5"
                x2="26.0357"
                y2="1.5"
                stroke="white"
                strokeWidth="3"
              />
            </svg>
            <svg
              className="bin-bottom"
              viewBox="0 0 33 39"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <mask id="bin-mask" fill="white">
                <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z" />
              </mask>
              <path
                d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
                fill="white"
                mask="url(#bin-mask)"
              />
              <path d="M12 6L12 29" stroke="white" strokeWidth="4" />
              <path d="M21 6V29" stroke="white" strokeWidth="4" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const renderMobileCard = ({ index, style }) => {
    const row = filteredData[index];
    const isSelected = selectedEntries.includes(row._id);
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
            backgroundColor: isSelected ? "rgba(37, 117, 252, 0.1)" : "#fff",
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
              Entry #{index + 1}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: "0.8rem", color: "#555" }}
            >
              {row.createdAt
                ? new Date(row.createdAt).toLocaleDateString()
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
            sx={{ mb: 0.5, fontSize: "0.9rem", color: "#555" }}
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
                borderRadius: "22px",
                padding: "0",
              }}
              aria-label={`View entry for ${row.customerName}`}
            >
              <FaEye style={{ marginBottom: "3px" }} />
            </Button>
            <button
              className="editBtn"
              onClick={() => {
                setEntryToEdit(row);
                setIsEditModalOpen(true);
              }}
              style={{ width: "40px", height: "40px", padding: "0" }}
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
              style={{ width: "40px", height: "40px", padding: "0" }}
              aria-label={`Delete entry for ${row.customerName}`}
            >
              <svg
                className="bin-top"
                viewBox="0 0 39 7"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4" />
                <line
                  x1="12"
                  y1="1.5"
                  x2="26.0357"
                  y2="1.5"
                  stroke="white"
                  strokeWidth="3"
                />
              </svg>
              <svg
                className="bin-bottom"
                viewBox="0 0 33 39"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <mask id="bin-mask" fill="white">
                  <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z" />
                </mask>
                <path
                  d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
                  fill="white"
                  mask="url(#bin-mask)"
                />
                <path d="M12 6L12 29" stroke="white" strokeWidth="4" />
                <path d="M21 6V29" stroke="white" strokeWidth="4" />
              </svg>
            </button>
          </Box>
        </Box>
      </motion.div>
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
      <Box
        sx={{
          width: isMobile ? "100%" : "90%",
          margin: "auto",
          padding: isMobile ? "10px" : "20px",
        }}
      >
        {/* Inline CSS for loading animation */}
        <style>
          {`
          .loading-wave {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
          }
          .loading-bar {
            width: 12px;
            height: 40px;
            background: linear-gradient(135deg, #2575fc, #6a11cb);
            animation: wave 1.2s infinite ease-in-out;
          }
          .loading-bar:nth-child(2) { animation-delay: -1.1s; }
          .loading-bar:nth-child(3) { animation-delay: -1.0s; }
          .loading-bar:nth-child(4) { animation-delay: -0.9s; }
          @keyframes wave {
            0%, 40%, 100% { transform: scaleY(0.4); }
            20% { transform: scaleY(1.0); }
          }
          .enhanced-search-bar, .enhanced-filter-dropdown {
            transition: border-color 0.2s ease;
          }
          .enhanced-search-bar:focus, .enhanced-filter-dropdown:focus {
            border-color: #2575fc;
            outline: none;
          }
          .virtual-row.selected {
            background-color: rgba(37, 117, 252, 0.1);
            border-left: 4px solid #2575fc;
          }
          .editBtn {
            background: #2575fc;
            border: none;
            border-radius: 22px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .editBtn svg {
            fill: white;
          }
          .bin-button {
            background: #ff4444;
            border: none;
            border-radius: 22px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}
        </style>

        {/* Search and Filters */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            mt: 3,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ flex: isMobile ? "1 1 100%" : "1 1 auto" }}>
            <input
              type="text"
              className="enhanced-search-bar"
              placeholder="🔍 Search..."
              onChange={(e) => debouncedSearchChange(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 15px",
                borderRadius: "20px",
                border: "1px solid #ddd",
                fontSize: "1rem",
              }}
              aria-label="Search entries"
            />
          </Box>
          {(role === "superadmin" || role === "admin") && (
            <select
              className="enhanced-filter-dropdown"
              value={selectedUsername}
              onChange={(e) => setSelectedUsername(e.target.value)}
              style={{
                padding: "10px",
                borderRadius: "20px",
                border: "1px solid #ddd",
                fontSize: "1rem",
                minWidth: isMobile ? "100%" : "150px",
              }}
              aria-label="Select user"
            >
              <option value="">-- Select User --</option>
              {usernames
                .slice()
                .sort((a, b) => a.localeCompare(b))
                .map((username) => (
                  <option key={username} value={username}>
                    {username}
                  </option>
                ))}
            </select>
          )}
          <Box
            sx={{ position: "relative", minWidth: isMobile ? "100%" : "200px" }}
          >
            <input
              type="text"
              value={
                dateRange[0]?.startDate && dateRange[0]?.endDate
                  ? `${dateRange[0].startDate.toLocaleDateString()} - ${dateRange[0].endDate.toLocaleDateString()}`
                  : ""
              }
              placeholder="-- Select date range --"
              readOnly
              onClick={(e) => setAnchorEl(e.currentTarget)}
              style={{
                width: "100%",
                padding: "10px 15px",
                borderRadius: "20px",
                border: "1px solid #ddd",
                fontSize: "1rem",
                cursor: "pointer",
              }}
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
                  maxWidth: isMobile ? "95vw" : "600px",
                  maxHeight: isMobile ? "80vh" : "auto",
                  overflowY: isMobile ? "auto" : "visible",
                  padding: isMobile ? "10px" : "0",
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
              />
            </Popover>
          </Box>
          <select
            className="enhanced-filter-dropdown"
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedCity("");
            }}
            style={{
              padding: "10px",
              borderRadius: "20px",
              border: "1px solid #ddd",
              fontSize: "1rem",
              minWidth: isMobile ? "100%" : "150px",
            }}
            aria-label="Select state"
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
            style={{
              padding: "10px",
              borderRadius: "20px",
              border: "1px solid #ddd",
              fontSize: "1rem",
              minWidth: isMobile ? "100%" : "150px",
            }}
            aria-label="Select city"
          >
            <option value="">-- Select City --</option>
            {selectedState &&
              statesAndCities[selectedState]?.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
          </select>
          <ActionButton
            onClick={handleReset}
            label="Reset"
            icon={<span style={{ fontSize: "1.2rem" }}>↺</span>}
            ariaLabel="Reset filters"
          />
        </Box>

        {/* Call Tracking Dashboard */}
        <CallTrackingDashboard
          entries={entries}
          role={role}
          onFilterChange={setDashboardFilter}
          selectedCategory={dashboardFilter}
          userId={userId}
          selectedUsername={selectedUsername}
          dateRange={dateRange} // ✅ ADD THIS LINE
        />

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            justifyContent: "center",
            mb: 3,
          }}
        >
          <motion.label
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <ActionButton
              icon={<FaUpload />}
              label="Bulk Upload"
              ariaLabel="Bulk upload via Excel"
            />
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              style={{ display: "none" }}
              aria-hidden="true"
            />
          </motion.label>
          <ActionButton
            onClick={() => setIsAddModalOpen(true)}
            icon={<FaPlus />}
            label="Add New Entry"
            ariaLabel="Add new entry"
          />
          {(role === "superadmin" || role === "admin") && (
            <>
              <ActionButton
                onClick={() => setIsTeamBuilderOpen(true)}
                icon={<FaUsers />}
                label="Team Builder"
                ariaLabel="Open team builder"
              />
              <ActionButton
                onClick={() => setIsAnalyticsModalOpen(true)}
                icon={<FaChartBar />}
                label="Analytics"
                ariaLabel="View analytics"
              />
              <ActionButton
                onClick={handleExport}
                icon={<FaFileExcel />}
                label="Export To Excel"
                ariaLabel="Export to Excel"
              />
            </>
          )}
          {(userRole === "superadmin" || userRole === "admin") && (
            <ActionButton
              onClick={() => setIsDrawerOpen(true)}
              icon={<FaClock />}
              label="Attendance"
              ariaLabel="View attendance"
            />
          )}
        </Box>

        {/* Selection Actions */}
        {(role === "superadmin" || role === "admin") &&
          filteredData.length > 0 && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                justifyContent: "center",
                mb: 3,
              }}
            >
              {isSelectionMode && (
                <ActionButton
                  onClick={handleSelectAll}
                  label="Select All"
                  ariaLabel="Select all entries"
                />
              )}
              {selectedEntries.length > 0 && (
                <>
                  <ActionButton
                    onClick={handleCopySelected}
                    label={`Copy Selected (${selectedEntries.length})`}
                    ariaLabel="Copy selected entries"
                  />
                  <ActionButton
                    onClick={handleDeleteSelected}
                    label={`Delete Selected (${selectedEntries.length})`}
                    variant="danger"
                    ariaLabel="Delete selected entries"
                  />
                </>
              )}
            </Box>
          )}

        {/* Metrics */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,

            mb: 3,
          }}
        >
          <Box
            sx={{
              fontWeight: "600",
              fontSize: isMobile ? "0.9rem" : "1rem",
              color: "#fff",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              padding: isMobile ? "5px 10px" : "5px 15px",
              borderRadius: "20px",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
              textAlign: "center",
              textTransform: "capitalize",
            }}
          >
            Total Results: {filteredData.length}
          </Box>
          <Box
            sx={{
              fontWeight: "600",
              fontSize: isMobile ? "0.9rem" : "1rem",
              color: "#fff",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              padding: isMobile ? "5px 10px" : "5px 15px",
              borderRadius: "20px",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
              textAlign: "center",
              textTransform: "capitalize",
            }}
          >
            Total Visits: {totalVisits}
          </Box>
          <Box
            sx={{
              fontWeight: "600",
              fontSize: isMobile ? "0.9rem" : "1rem",
              color: "#fff",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              padding: isMobile ? "5px 10px" : "5px 15px",
              borderRadius: "20px",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
              textAlign: "center",
              textTransform: "capitalize",
            }}
          >
            Monthly Visits: {monthlyVisits}
          </Box>
        </Box>

        {/* Data Table / Cards */}
        <Box
          sx={{
            width: "100%",
            height: isMobile ? "auto" : "75vh",
            overflowX: isMobile ? "visible" : "hidden",
            boxShadow: isMobile ? "none" : "0 6px 18px rgba(0, 0, 0, 0.1)",
            borderRadius: isMobile ? "0" : "15px",
            backgroundColor: "#fff",
            padding: isMobile ? "10px" : "0",
          }}
        >
          {isMobile ? (
            <Box
              sx={{
                maxHeight: "75vh",
                overflowY: "auto",
                padding: "10px",
                scrollBehavior: "smooth",
                WebkitOverflowScrolling: "touch",
                position: "relative",
              }}
            >
              {filteredData.length === 0 ? (
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
                    padding: "20px",
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
                  backdropFilter: "blur(8px)",
                  padding: "10px",
                  boxShadow: "0 -2px 4px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  justifyContent: "center",
                  gap: "12px",
                  zIndex: 10,
                }}
              >
                <ActionButton
                  onClick={() => setIsAddModalOpen(true)}
                  icon={<FaPlus />}
                  label="Add New"
                  ariaLabel="Add new entry"
                />
                <motion.label
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <ActionButton
                    icon={<FaUpload />}
                    label="Bulk Upload"
                    ariaLabel="Bulk upload via Excel"
                  />
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".xlsx, .xls"
                    style={{ display: "none" }}
                    aria-hidden="true"
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
                }}
              >
                <Box>SNo.</Box>
                <Box>Date</Box>
                <Box>Customer</Box>
                <Box>Mobile</Box>
                <Box>Address</Box>
                <Box>City</Box>
                <Box>State</Box>
                <Box>Organization</Box>
                <Box>Users</Box>
                <Box>Actions</Box>
              </Box>
              {filteredData.length === 0 ? (
                <Box
                  sx={{
                    height: "calc(100% - 60px)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "1.2rem",
                    color: "#666",
                    fontWeight: "bold",
                  }}
                >
                  No Entries Available
                </Box>
              ) : (
                <AutoSizer>
                  {({ height, width }) => (
                    <List
                      height={height - 60}
                      rowCount={filteredData.length}
                      rowHeight={60}
                      rowRenderer={rowRenderer}
                      width={width}
                      overscanRowCount={10}
                    />
                  )}
                </AutoSizer>
              )}
            </>
          )}
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
        />
        {(role === "superadmin" || role === "admin") && (
          <>
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
              dateRange={dateRange}
            />
            <ValueAnalyticsDrawer
              entries={entries}
              isOpen={isValueAnalyticsOpen}
              onClose={() => setIsValueAnalyticsOpen(false)}
              role={role}
              userId={userId}
              dateRange={dateRange}
            />
            {role === "superadmin" && (
              <TeamAnalyticsDrawer
                entries={entries}
                isOpen={isTeamAnalyticsOpen}
                onClose={() => setIsTeamAnalyticsOpen(false)}
                role={role}
                userId={userId}
                dateRange={dateRange}
              />
            )}
          </>
        )}
        {isAnalyticsModalOpen && (
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
            onClick={() => setIsAnalyticsModalOpen(false)}
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
                  padding: isMobile ? "15px" : "20px",
                  borderBottom: "1px solid #e0e0e0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: isMobile ? "1.2rem" : "1.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
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
                    padding: "5px",
                  }}
                  onClick={() => setIsAnalyticsModalOpen(false)}
                  aria-label="Close analytics modal"
                >
                  ✕
                </button>
              </Box>
              <Box
                sx={{
                  padding: isMobile ? "15px" : "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                <ActionButton
                  onClick={() => {
                    setIsAnalyticsOpen(true);
                    setIsAnalyticsModalOpen(false);
                  }}
                  icon={<FaChartBar />}
                  label="Team Analytics"
                  ariaLabel="View team analytics"
                />
                <ActionButton
                  onClick={() => {
                    setIsValueAnalyticsOpen(true);
                    setIsAnalyticsModalOpen(false);
                  }}
                  icon={<FaChartBar />}
                  label="Value Analytics"
                  ariaLabel="View value analytics"
                />
                {role === "superadmin" && (
                  <ActionButton
                    onClick={() => {
                      setIsTeamAnalyticsOpen(true);
                      setIsAnalyticsModalOpen(false);
                    }}
                    icon={<FaChartBar />}
                    label="Team-Wise Analytics"
                    ariaLabel="View team-wise analytics"
                  />
                )}
              </Box>
            </motion.div>
          </motion.div>
        )}
        <AttendanceTracker
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          userId={userId}
          role={userRole}
        />
      </Box>
      <Box
        component="footer"
        sx={{
          textAlign: "center",
          py: 2,
          mt: 4,
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
        }}
      >
        <Typography variant="body2">
          © 2025 CRM. All rights reserved.
        </Typography>
      </Box>
    </>
  );
}

export default DashBoard;
