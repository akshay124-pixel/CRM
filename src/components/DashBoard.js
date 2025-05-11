import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import TeamAnalyticsDrawer from "./TeamAnalyticsDrawer.js";
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
  FaCheckCircle, // Added for selection feedback
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
import { FixedSizeList } from "react-window"; // Added for mobile virtualization

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

    // Apply role/userId and selectedUsername filters in one step
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
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [totalVisits, setTotalVisits] = useState(0);
  const [monthlyVisits, setMonthlyVisits] = useState(0);
  const [entryToView, setEntryToView] = useState(null);
  const [itemIdToDelete, setItemIdToDelete] = useState(null);
  const [itemIdsToDelete, setItemIdsToDelete] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsername, setSelectedUsername] = useState("");
  const [usernames, setUsernames] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState("total");
  const [isTeamAnalyticsOpen, setIsTeamAnalyticsOpen] = useState(false);
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

  // Placeholder for states and cities (replace with actual data)
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
  const [filters, setFilters] = useState({
    customerName: "",
    mobileNumber: "",
    status: "",
    category: "",
    state: "",
    city: "",
    type: "",
    fromDate: null,
    toDate: null,
  });
  // Update filters when searchTerm, selectedState, selectedCity, selectedUsername, dashboardFilter, or dateRange change
  useEffect(() => {
    setFilters({
      customerName: searchTerm,
      mobileNumber: searchTerm,
      status: dashboardFilter === "total" ? "" : dashboardFilter,
      category: "",
      state: selectedState,
      city: selectedCity,
      type: "",
      fromDate: dateRange[0].startDate,
      toDate: dateRange[0].endDate,
    });
  }, [
    searchTerm,
    selectedState,
    selectedCity,
    selectedUsername,
    dashboardFilter,
    dateRange,
  ]);
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

  // Update filteredData useMemo
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

  // Modified handleExport to export filtered data using filteredData instead of server fetch
  const handleExport = async () => {
    try {
      // Prepare data for export using filteredData
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

      // Create worksheet from filtered data
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Entries");

      // Generate Excel file as a buffer
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      // Create Blob and trigger download
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "DataSet.xlsx"; // Updated filename to reflect filtered data
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
      console.error("No authentication token found in localStorage");
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

        console.log(
          "Uploading entries with token:",
          token.substring(0, 10) + "..."
        );
        console.log("Entries to upload:", newEntries);

        try {
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
        } catch (apiError) {
          console.error(
            "API error:",
            apiError.response?.data || apiError.message
          );
          const errorMessage =
            apiError.response?.data?.message ||
            "Failed to upload entries. Please check your login status.";
          toast.error(errorMessage);
        }
      } catch (error) {
        console.error("File parsing error:", error.message);
        toast.error("Error parsing the Excel file!");
      }
    };
    reader.onerror = () => {
      console.error("File reader error");
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

  const handleSelectAll = () => {
    if (isSelectionMode && (role === "superadmin" || role === "admin")) {
      const allFilteredIds = filteredData.map((entry) => entry._id);
      setSelectedEntries(allFilteredIds);
    }
  };
  // Memoize visits calculation to prevent unnecessary recalculations
  const { total, monthly } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const total = entries.reduce((sum, entry) => {
      return sum + (entry.history?.length || 0); // Only count history items
    }, 0);

    const monthly = entries.reduce((sum, entry) => {
      const entryDate = new Date(entry.createdAt);
      const entryMonth = entryDate.getMonth();
      const entryYear = entryDate.getFullYear();

      // Only include entries from the current month
      if (entryMonth === currentMonth && entryYear === currentYear) {
        return sum + (entry.history?.length || 0); // Only count history items
      }
      return sum;
    }, 0);

    return { total, monthly };
  }, [entries]);

  // Update visits state when memoized values change
  useEffect(() => {
    console.log("Total Visits:", total, "Monthly Visits:", monthly); // Debug log
    setTotalVisits(total);
    setMonthlyVisits(monthly);
  }, [total, monthly]);

  // Fetch entries without entries in dependencies
  useEffect(() => {
    if (!authLoading && role && userId) {
      fetchEntries();
    }
  }, [authLoading, role, userId, fetchEntries]);

  // Reset monthly visits at the start of a new month
  useEffect(() => {
    const checkMonthChange = () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthly = entries.reduce((sum, entry) => {
        const entryDate = new Date(entry.createdAt);
        const entryMonth = entryDate.getMonth();
        const entryYear = entryDate.getFullYear();

        // Only include entries from the current month
        if (entryMonth === currentMonth && entryYear === currentYear) {
          return sum + (entry.history?.length || 0); // Only count history items
        }
        return sum;
      }, 0);

      console.log("Monthly Visits (reset check):", monthly); // Debug log
      setMonthlyVisits(monthly);
    };

    // Check every minute for a month change
    const interval = setInterval(checkMonthChange, 60000);
    return () => clearInterval(interval);
  }, [entries]);
  //Ends Here
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
          ...style, // For react-window virtualization
          padding: "0 10px 24px 10px", // 24px gap between cards
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
          {/* Card Header with Entry Number and Date */}
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

          {/* Selection Checkmark */}
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

          {/* Card Content */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              mb: 1,
              fontSize: "1.1rem",
              whiteSpace: "nowrap", // Prevents text wrapping
              overflow: "hidden", // Hides overflow content
              textOverflow: "ellipsis", // Adds ellipsis for truncated text
              maxWidth: "100%", // Ensures it respects parent container's width
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

          {/* Action Buttons */}
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
              role="button"
              tabIndex={0}
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
              style={{ width: "40px", height: "40px", padding: "0" }}
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
                maxWidth: isMobile ? "95vw" : "600px",
                maxHeight: isMobile ? "80vh" : "auto",
                overflowY: isMobile ? "auto" : "visible",
                overflowX: "visible",
                padding: isMobile ? "10px" : "0",
                boxSizing: "border-box",
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
        style={{
          width: isMobile ? "100%" : "90%",
          margin: "auto",
          padding: isMobile ? "10px" : "20px",
        }}
      >
        <CallTrackingDashboard
          entries={entries}
          role={role}
          onFilterChange={setDashboardFilter}
          selectedCategory={dashboardFilter}
          userId={userId}
          selectedUsername={selectedUsername}
        />
        <div style={{ textAlign: "center", margin: isMobile ? "10px 0" : "0" }}>
          <label
            className="action-button"
            style={{
              padding: isMobile ? "10px 15px" : "12px 20px",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              color: "white",
              borderRadius: "12px",
              margin: isMobile ? "5px" : "0 10px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: isMobile ? "0.9rem" : "1rem",
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
            className="action-button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: isMobile ? "10px 15px" : "12px 20px",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: isMobile ? "0.9rem" : "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              margin: isMobile ? "5px" : "0 10px",
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
                className="action-button"
                onClick={() => setIsTeamBuilderOpen(true)}
                style={{
                  padding: isMobile ? "10px 15px" : "12px 20px",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  color: "white",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  border: "none",
                  fontSize: isMobile ? "0.9rem" : "1rem",
                  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  margin: isMobile ? "5px" : "0 10px",
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
                className="action-button"
                onClick={() => setIsAnalyticsModalOpen(true)}
                style={{
                  padding: isMobile ? "10px 15px" : "12px 20px",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  color: "white",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  border: "none",
                  fontSize: isMobile ? "0.9rem" : "1rem",
                  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  margin: isMobile ? "5px" : "0 10px",
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
                Analytics
              </button>
              <button
                className="action-button"
                onClick={handleExport}
                style={{
                  padding: isMobile ? "10px 15px" : "12px 20px",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  color: "white",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  border: "none",
                  fontSize: isMobile ? "0.9rem" : "1rem",
                  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  margin: isMobile ? "5px" : "0 10px",
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
              <div
                style={{
                  marginTop: "10px",
                  marginLeft: isMobile ? "0" : "50px",
                  display: isMobile ? "flex" : "block",
                  flexWrap: isMobile ? "wrap" : "none",
                  justifyContent: isMobile ? "center" : "flex-start",
                }}
              >
                {isSelectionMode && (
                  <Button
                    variant="info"
                    className="select mx-3"
                    onClick={handleSelectAll}
                    style={{
                      margin: isMobile ? "5px" : "0 10px 0 0",
                      background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                      border: "none",
                      color: "white",
                      padding: isMobile ? "8px 15px" : "10px 20px",
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
                        margin: isMobile ? "5px" : "0 10px 0 0",
                        background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                        border: "none",
                        padding: isMobile ? "8px 15px" : "10px 20px",
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
                        margin: isMobile ? "5px" : "0 10px 0 0",
                        background: "linear-gradient(90deg, #ff4444, #cc0000)",
                        border: "none",
                        padding: isMobile ? "8px 15px" : "10px 20px",
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
            style={{
              fontSize: isMobile ? "0.8rem" : "0.9rem",
              color: "#6c757d",
              marginTop: "10px",
              textAlign: isMobile ? "center" : "center",
            }}
          >
            Upload a valid Excel file with columns:{" "}
            <strong>
              Customer Name, Mobile Number, Address, State, City, Organization,
              Category, Created At, Expected Closing Date, Follow-Up Date,
              Remarks, Products Description, Type, Close Type, Assigned To.
            </strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <div
            style={{
              fontWeight: "600",
              fontSize: isMobile ? "0.9rem" : "1rem",
              color: "#fff",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              padding: isMobile ? "5px 10px" : "5px 15px",
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
            style={{
              fontWeight: "600",
              fontSize: isMobile ? "0.9rem" : "1rem",
              color: "#fff",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              padding: isMobile ? "5px 10px" : "5px 15px",
              borderRadius: "20px",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
              display: "inline-block",
              textAlign: "center",
              width: "auto",
              textTransform: "capitalize",
            }}
          >
            Total Visits: {totalVisits}
          </div>
          <div
            style={{
              fontWeight: "600",
              fontSize: isMobile ? "0.9rem" : "1rem",
              color: "#fff",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              padding: isMobile ? "5px 10px" : "5px 15px",
              borderRadius: "20px",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
              display: "inline-block",
              textAlign: "center",
              width: "auto",
              textTransform: "capitalize",
            }}
          >
            Monthly Visits: {monthlyVisits}
          </div>
        </div>
        <div
          className="table-container"
          style={{
            width: "100%",
            height: isMobile ? "auto" : "75vh",
            margin: "0 auto",
            overflowX: isMobile ? "visible" : "hidden",
            boxShadow: isMobile ? "none" : "0 6px 18px rgba(0, 0, 0, 0.1)",
            borderRadius: isMobile ? "0" : "15px",
            marginTop: "20px",
            backgroundColor: "#fff",
            padding: isMobile ? "10px" : "0",
          }}
        >
          {isMobile ? (
            <div
              className="card-scroll-container"
              style={{
                maxHeight: "75vh",
                overflowY: "auto",
                overflowX: "hidden",
                padding: "10px",
                scrollBehavior: "smooth",
                WebkitOverflowScrolling: "touch",
                position: "relative",
              }}
            >
              {filteredData.length === 0 ? (
                <div
                  style={{
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
                </div>
              ) : (
                <FixedSizeList
                  height={window.innerHeight * 0.75} // Match maxHeight: 75vh
                  width="100%"
                  itemCount={filteredData.length}
                  itemSize={280} // Estimated card height (adjust if needed)
                  overscanCount={5}
                >
                  {renderMobileCard}
                </FixedSizeList>
              )}
              {/* Sticky Action Bar */}
              <div
                style={{
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
                <motion.button
                  onClick={() => setIsAddModalOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                    color: "white",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    border: "none",
                    fontSize: "0.9rem",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FaPlus size={16} />
                  Add New
                </motion.button>
                <motion.label
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                    color: "white",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    border: "none",
                    fontSize: "0.9rem",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
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
              </div>
            </div>
          ) : (
            <>
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
                <div>SNo.</div>
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
                  Users
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
                    fontSize: "1.2rem",
                    color: "#666",
                    fontWeight: "bold",
                  }}
                >
                  No Entries Available
                </div>
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
        </div>
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
            dateRange={dateRange} // Pass dateRange prop
          />
          <ValueAnalyticsDrawer
            entries={entries}
            isOpen={isValueAnalyticsOpen}
            onClose={() => setIsValueAnalyticsOpen(false)}
            role={role}
            userId={userId}
            dateRange={dateRange} // Pass dateRange prop
          />
          <TeamAnalyticsDrawer
            entries={entries}
            isOpen={isTeamAnalyticsOpen}
            onClose={() => setIsTeamAnalyticsOpen(false)}
            role={role} // Corrected from userRole to role
            userId={userId}
            dateRange={dateRange}
          />
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
            <div
              style={{
                padding: isMobile ? "15px" : "20px",
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: isMobile ? "1.2rem" : "1.5rem",
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                Analytics Options
              </h3>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  color: "#666",
                  transition: "color 0.2s ease",
                }}
                onClick={() => setIsAnalyticsModalOpen(false)}
                onMouseEnter={(e) => (e.target.style.color = "#2575fc")}
                onMouseLeave={(e) => (e.target.style.color = "#666")}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                padding: isMobile ? "15px" : "20px",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <button
                className="action-button"
                onClick={() => {
                  setIsAnalyticsOpen(true);
                  setIsAnalyticsModalOpen(false);
                }}
                style={{
                  padding: isMobile ? "10px 15px" : "12px 20px",
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
                className="action-button"
                onClick={() => {
                  setIsValueAnalyticsOpen(true);
                  setIsAnalyticsModalOpen(false);
                }}
                style={{
                  padding: isMobile ? "10px 15px" : "12px 20px",
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
                Value Analytics
              </button>
              <button
                className="action-button"
                onClick={() => {
                  setIsTeamAnalyticsOpen(true); // Now defined
                  setIsAnalyticsModalOpen(false);
                }}
                style={{
                  padding: isMobile ? "10px 15px" : "12px 20px",
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
                Team-Analytics
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      <footer className="footer-container">
        <p style={{ marginTop: "10px", color: "white", height: "10px" }}>
          © 2025 CRM. All rights reserved.
        </p>
      </footer>
    </>
  );
}

export default DashBoard;
