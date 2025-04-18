import React, { useState, useCallback, useEffect } from "react";
import { Modal, Button, Form, ProgressBar, Table } from "react-bootstrap";
import axios from "axios";
import { toast } from "react-toastify";
import styled from "styled-components";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const StyledTable = styled(Table)`
  margin-top: 0.5rem;
  font-size: 0.95rem;
  & th,
  & td {
    padding: 0.5rem;
    vertical-align: middle;
  }
  & th {
    background: #f1f3f5;
    color: #333;
    font-weight: 600;
  }
  & tbody tr:hover {
    background: #e9ecef;
  }
`;

const productOptions = [
  {
    name: "IFPD",
    sizes: ["65 inch", "75 inch", "86 inch", "98 inch"],
    specifications: ["Android 14, 8GB RAM, 128GB ROM"],
  },
  {
    name: "OPS",
    sizes: ["N/A"],
    specifications: [
      // i5 11th Gen
      "i5 11th Gen, 8GB RAM, 256GB ROM",
      "i5 11th Gen, 8GB RAM, 512GB ROM",
      "i5 11th Gen, 8GB RAM, 1TB ROM",
      "i5 11th Gen, 16GB RAM, 256GB ROM",
      "i5 11th Gen, 16GB RAM, 512GB ROM",
      "i5 11th Gen, 16GB RAM, 1TB ROM",

      // i5 12th Gen
      "i5 12th Gen, 8GB RAM, 256GB ROM",
      "i5 12th Gen, 8GB RAM, 512GB ROM",
      "i5 12th Gen, 8GB RAM, 1TB ROM",
      "i5 12th Gen, 16GB RAM, 256GB ROM",
      "i5 12th Gen, 16GB RAM, 512GB ROM",
      "i5 12th Gen, 16GB RAM, 1TB ROM",

      // i7 11th Gen
      "i7 11th Gen, 8GB RAM, 256GB ROM",
      "i7 11th Gen, 8GB RAM, 512GB ROM",
      "i7 11th Gen, 8GB RAM, 1TB ROM",
      "i7 11th Gen, 16GB RAM, 256GB ROM",
      "i7 11th Gen, 16GB RAM, 512GB ROM",
      "i7 11th Gen, 16GB RAM, 1TB ROM",

      // i7 12th Gen
      "i7 12th Gen, 8GB RAM, 256GB ROM",
      "i7 12th Gen, 8GB RAM, 512GB ROM",
      "i7 12th Gen, 8GB RAM, 1TB ROM",
      "i7 12th Gen, 16GB RAM, 256GB ROM",
      "i7 12th Gen, 16GB RAM, 512GB ROM",
      "i7 12th Gen, 16GB RAM, 1TB ROM",
    ],
  },
  {
    name: "Digital Podium",
    sizes: ["Full"],
    specifications: ["N/A"],
  },
  {
    name: "Audio Podium",
    sizes: ["Full"],
    specifications: ["N/A"],
  },
  {
    name: "Kiosk",
    sizes: ["N/A"],
    specifications: ["Touch", "Non-Touch"],
  },
  {
    name: "PTZ Camera",
    sizes: ["N/A"],
    specifications: ["4K 12x", "HD 20x"],
  },
  {
    name: "Document Camera",
    sizes: ["N/A"],
    specifications: ["Visualizer"],
  },
  {
    name: "UPS",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Wallmount Kit",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Stylus Pen",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Sliding Shutter",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "3 Cup Speaker",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Wireless Colleramic",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Wireless Keyboard Mouse",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Interactive White Board",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Floor Stand",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Notice Board",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Visualizer",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "PTZ Camera - Full HD Voice Tracking",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "PTZ Camera - 4K - Auto Tracking",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Web Cam - 4K",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Web Cam - Full HD",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Bluetooth Microphone",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "UPS - Offline",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "UPS - Online",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "UPS Cabinet",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "SD Card",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Casing",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Fitting Accessories",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "HDMI Cable",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "White Board",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "C-type Cable",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Fujifilm-Printer",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Google TV",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Wriety Software",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Ceiling Mount Kit",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Almirah Type Shutter",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Logo",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Microphones",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "E-Share License",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Battery Bank",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Rack & Interlink",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Green Board",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "AI Charya Podium",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Wooden Podium",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Writing Board",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "IT Catalog",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "LED Video Wall",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "4K Video Bar",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Microsoft Office 2016 Licensed",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Windows 11 Licensed",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Embibe Content",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "SSD",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "RAM",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Video Conferencing Camera",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "CBSE Content",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "ICSE Content",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "PA System Speakers",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Red Board",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Promark Stickers",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Bluetooth Speaker",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "3 Cup Conference Speaker",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Conference Setup-Delegate Room",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Content",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Flex",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Wireless Speakerphone - Two Pair",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Remote",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Educational Software",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "LED",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Controller",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Hydraulic Bracket",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "4 Pole C Curve MCB",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Desktop PC Monitor",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Extension Mic",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Home Theatre",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Digital Audio Processor",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Projector",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Mike Wireless",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "LED TV",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Advance Podium",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Digital Podium Controller",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Amplifier Mic Receiver",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Wireless Mic Receiver",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Projector Screen",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Speakerphone",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Speaker & Mic",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Document Visualizer",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Black Metal Body Electronic Lectern",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "LED Monitor",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Document Camera Wall Mounted",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "SLV Mic",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Bubble Roll",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
  {
    name: "Wrapping Roll",
    sizes: ["N/A"],
    specifications: ["N/A"],
  },
];

function AddEntry({ isOpen, onClose, onEntryAdded }) {
  const initialFormData = {
    customerName: "",
    mobileNumber: "",
    contactperson: "",
    status: "",
    firstdate: "",
    products: [],
    estimatedValue: "",
    type: "",
    address: "",
    state: "",
    city: "",
    organization: "",
    category: "",
    remarks: "",
    liveLocation: "",
    createdAt: new Date().toISOString(),
  };

  const [formData, setFormData] = useState(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [productInput, setProductInput] = useState({
    name: "",
    specification: "",
    size: "",
    quantity: "",
  });

  const totalSteps = 4;

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...initialFormData, createdAt: new Date().toISOString() });
      setSelectedState("");
      setSelectedCity("");
      setCurrentStep(1);
      setProductInput({ name: "", specification: "", size: "", quantity: "" });
    }
  }, [isOpen]);

  const handleInput = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "mobileNumber"
          ? value.replace(/\D/g, "").slice(0, 10)
          : name === "estimatedValue"
          ? value.replace(/\D/g, "")
          : value,
    }));
  }, []);

  const handleProductInput = (e) => {
    const { name, value } = e.target;
    setProductInput((prev) => ({
      ...prev,
      [name]: name === "quantity" ? value.replace(/\D/g, "") : value,
      ...(name === "name" ? { specification: "", size: "" } : {}),
    }));
  };

  const addProduct = () => {
    if (
      !productInput.name ||
      !productInput.specification ||
      !productInput.size ||
      !productInput.quantity ||
      Number(productInput.quantity) <= 0
    ) {
      toast.error("Please fill all product fields with valid values!");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          name: productInput.name,
          specification: productInput.specification,
          size: productInput.size,
          quantity: Number(productInput.quantity),
        },
      ],
    }));

    setProductInput({ name: "", specification: "", size: "", quantity: "" });
    toast.success("Product added to list!");
  };

  const removeProduct = (index) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
    toast.info("Product removed from list.");
  };

  const fetchLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationString = `${latitude}, ${longitude}`;
          setFormData((prev) => ({
            ...prev,
            liveLocation: locationString,
          }));
          toast.success("Location fetched successfully!");
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching location:", error);
          toast.error(
            "Failed to fetch location. Please allow location access."
          );
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  const validateStep = (step) => {
    const stepFields = {
      1: ["customerName"],
      2: ["products"],
      3: [],
      4: ["status", "liveLocation"],
    };

    const fieldsToValidate = stepFields[step] || [];

    for (const field of fieldsToValidate) {
      if (field === "products") {
        if (!formData.products.length) {
          toast.error("At least one product is required!");
          return false;
        }
      } else if (!formData[field] || formData[field].toString().trim() === "") {
        toast.error(
          `${field.charAt(0).toUpperCase() + field.slice(1)} is required!`
        );
        return false;
      }
    }

    if (
      step === 1 &&
      formData.mobileNumber &&
      formData.mobileNumber.length !== 10
    ) {
      toast.error("Mobile number must be exactly 10 digits!");
      return false;
    }

    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentStep !== totalSteps) {
      return;
    }

    if (!validateStep(4)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("You must be logged in to add an entry.");
        setLoading(false);
        return;
      }

      const submitData = {
        ...formData,
        createdAt: new Date().toISOString(),
        estimatedValue: Number(formData.estimatedValue) || 0,
      };

      const response = await axios.post(
        "https://crm-server-amz7.onrender.com/api/entry",
        submitData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const newEntry = response.data.data;
      toast.success("Entry added successfully!");
      onEntryAdded(newEntry);

      setFormData({ ...initialFormData, createdAt: new Date().toISOString() });
      setSelectedState("");
      setSelectedCity("");
      setCurrentStep(1);
      setProductInput({ name: "", specification: "", size: "", quantity: "" });
      onClose();
    } catch (error) {
      console.error(
        "Error adding entry:",
        error.response?.data || error.message
      );
      toast.error(error.response?.data?.message || "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = (e) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedCity("");
    setFormData((prev) => ({
      ...prev,
      state,
      city: "",
    }));
  };

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setFormData((prev) => ({
      ...prev,
      city,
    }));
  };

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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <Form.Group controlId="formCustomerName" className="mb-3">
              <Form.Label>Customer Name</Form.Label>
              <Form.Control
                type="text"
                name="customerName"
                required
                value={formData.customerName}
                onChange={handleInput}
                placeholder="Enter customer name"
                disabled={loading}
              />
            </Form.Group>

            <Form.Group controlId="mobileNumber" className="mb-3">
              <Form.Label>Mobile Number</Form.Label>
              <Form.Control
                type="text"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleInput}
                placeholder="Enter mobile number"
                maxLength={10}
                disabled={loading}
              />
              {formData.mobileNumber && formData.mobileNumber.length < 10 && (
                <Form.Text style={{ color: "red" }}>
                  Mobile number must be 10 digits
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group controlId="contactperson" className="mb-3">
              <Form.Label>Contact Person Name</Form.Label>
              <Form.Control
                type="text"
                name="contactperson"
                value={formData.contactperson}
                onChange={handleInput}
                placeholder="Enter contact person name"
                disabled={loading}
              />
            </Form.Group>
          </>
        );
      case 2:
        return (
          <>
            <Form.Group controlId="formFirstDate" className="mb-3">
              <Form.Label>First Meeting Date</Form.Label>
              <DatePicker
                selected={
                  formData.firstdate ? new Date(formData.firstdate) : null
                }
                onChange={(date) =>
                  handleInput({ target: { name: "firstdate", value: date } })
                }
                dateFormat="dd/MM/yy"
                className="form-control"
                maxDate={new Date()}
                disabled={loading}
                placeholderText="DD/MM/YY"
              />
            </Form.Group>

            <Form.Group controlId="formProductSelection" className="mb-3">
              <Form.Label>Add Product</Form.Label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Form.Select
                  name="name"
                  value={productInput.name}
                  onChange={handleProductInput}
                  disabled={loading}
                  style={{ flex: "1" }}
                >
                  <option value="">Select Product</option>
                  {productOptions.map((product) => (
                    <option key={product.name} value={product.name}>
                      {product.name}
                    </option>
                  ))}
                </Form.Select>

                <Form.Select
                  name="specification"
                  value={productInput.specification}
                  onChange={handleProductInput}
                  disabled={!productInput.name || loading}
                  style={{ flex: "1" }}
                >
                  <option value="">Select Specification</option>
                  {productInput.name &&
                    productOptions
                      .find((p) => p.name === productInput.name)
                      ?.specifications.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                </Form.Select>

                <Form.Select
                  name="size"
                  value={productInput.size}
                  onChange={handleProductInput}
                  disabled={!productInput.name || loading}
                  style={{ flex: "1" }}
                >
                  <option value="">Select Size</option>
                  {productInput.name &&
                    productOptions
                      .find((p) => p.name === productInput.name)
                      ?.sizes.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                </Form.Select>

                <Form.Control
                  type="text"
                  name="quantity"
                  value={productInput.quantity}
                  onChange={handleProductInput}
                  placeholder="Quantity"
                  disabled={loading || !productInput.name}
                  style={{ flex: "1" }}
                />

                <Button
                  variant="outline-primary"
                  onClick={addProduct}
                  disabled={loading}
                >
                  Add
                </Button>
              </div>
            </Form.Group>

            {formData.products.length > 0 && (
              <StyledTable striped bordered hover>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Specification</th>
                    <th>Size</th>
                    <th>Quantity</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.products.map((product, index) => (
                    <tr key={index}>
                      <td>{product.name}</td>
                      <td>{product.specification}</td>
                      <td>{product.size}</td>
                      <td>{product.quantity}</td>
                      <td>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeProduct(index)}
                          disabled={loading}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </StyledTable>
            )}

            <Form.Group controlId="formEstimatedValue" className="mb-3">
              <Form.Label>Estimated Value (₹)</Form.Label>
              <Form.Control
                type="text"
                name="estimatedValue"
                value={formData.estimatedValue}
                onChange={handleInput}
                placeholder="Enter estimated value (numeric)"
                disabled={loading}
              />
            </Form.Group>

            <Form.Group controlId="formCustomerType" className="mb-3">
              <Form.Label>Customer Type</Form.Label>
              <Form.Select
                name="type"
                value={formData.type}
                onChange={handleInput}
                disabled={loading}
              >
                <option value="">-- Select Type --</option>
                <option value="Direct Client">Direct Client</option>
                <option value="Partner">Partner</option>
              </Form.Select>
            </Form.Group>
          </>
        );
      case 3:
        return (
          <>
            <Form.Group controlId="formAddress" className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInput}
                placeholder="Enter address"
                disabled={loading}
              />
            </Form.Group>

            <Form.Group controlId="formState" className="mb-3">
              <Form.Label>State</Form.Label>
              <Form.Control
                as="select"
                name="state"
                value={selectedState}
                onChange={handleStateChange}
                disabled={loading}
              >
                <option value="">-- Select State --</option>
                {Object.keys(statesAndCities).map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="formCity" className="mb-3">
              <Form.Label>City</Form.Label>
              <Form.Control
                as="select"
                name="city"
                value={selectedCity}
                onChange={handleCityChange}
                disabled={!selectedState || loading}
              >
                <option value="">-- Select City --</option>
                {selectedState &&
                  statesAndCities[selectedState].map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="formOrganization" className="mb-3">
              <Form.Label>Organization</Form.Label>
              <Form.Select
                name="organization"
                value={formData.organization}
                onChange={handleInput}
                disabled={loading}
              >
                <option value="">Select organization type</option>
                <option value="School/Society">School/Society</option>
                <option value="Institute/College/University">
                  Institute/College/University
                </option>
                <option value="Organization/Partner/NGO">
                  Organization/Partner/NGO
                </option>
                <option value="Others">Others</option>
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="formCategory" className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                name="category"
                value={formData.category}
                onChange={handleInput}
                disabled={loading}
              >
                <option value="">Select category</option>
                <option value="Private">Private</option>
                <option value="Government">Government</option>
              </Form.Select>
            </Form.Group>
          </>
        );
      case 4:
        return (
          <>
            <Form.Group controlId="status" className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Control
                as="select"
                value={formData.status}
                onChange={handleInput}
                name="status"
                disabled={loading}
              >
                <option value="">-- Select Status --</option>
                <option value="Maybe">Maybe</option>
                <option value="Interested">Interested</option>
                <option value="Not Interested">Not Interested</option>
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="formRemarks" className="mb-3">
              <Form.Label>Remarks</Form.Label>
              <Form.Control
                as="textarea"
                name="remarks"
                value={formData.remarks}
                onChange={handleInput}
                disabled={loading}
                placeholder="Enter remarks"
                rows={3}
              />
            </Form.Group>

            <Form.Group controlId="formLiveLocation" className="mb-3">
              <Form.Label>Live Location</Form.Label>
              <div style={{ display: "flex", gap: "10px" }}>
                <Form.Control
                  type="text"
                  name="liveLocation"
                  required
                  value={formData.liveLocation}
                  onChange={handleInput}
                  placeholder="Enter coordinates (e.g., 34.0522, -118.2437)"
                  disabled={loading}
                  style={{ flex: 1 }}
                />
                <Button
                  variant="outline-primary"
                  onClick={fetchLocation}
                  disabled={loading}
                >
                  {loading ? "Fetching..." : "Get Location"}
                </Button>
              </div>
            </Form.Group>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
      size="lg"
    >
      <Modal.Header
        closeButton
        style={{
          background: "linear-gradient(to right, #6a11cb, #2575fc)",
          color: "#fff",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          borderBottom: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Modal.Title style={{ fontWeight: "bold", fontSize: "1.5rem" }}>
          <span role="img" aria-label="add-entry">
            ✨
          </span>{" "}
          Add New Entry - Step {currentStep} of {totalSteps}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: "2rem", backgroundColor: "#f8f9fa" }}>
        <ProgressBar
          now={(currentStep / totalSteps) * 100}
          label={`${Math.round((currentStep / totalSteps) * 100)}%`}
          style={{
            marginBottom: "1.5rem",
            height: "20px",
            borderRadius: "10px",
          }}
          variant="success"
        />

        <Form>
          <div
            style={{
              transition: "all 0.3s ease",
              opacity: 1,
            }}
          >
            {renderStep()}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "2rem",
            }}
          >
            <div style={{ display: "flex", gap: "20px" }}>
              {currentStep > 1 && (
                <Button
                  variant="outline-secondary"
                  onClick={handleBack}
                  disabled={loading}
                  style={{
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontWeight: "bold",
                  }}
                >
                  Back
                </Button>
              )}
              {currentStep === totalSteps && (
                <Button
                  variant="success"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    borderRadius: "8px",
                    padding: "10px 40px",
                    backgroundColor: "#28a745",
                    border: "none",
                    fontWeight: "bold",
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) =>
                    (e.target.style.backgroundColor = "#218838")
                  }
                  onMouseOut={(e) =>
                    (e.target.style.backgroundColor = "#28a745")
                  }
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              )}
            </div>

            {currentStep < totalSteps && (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={loading}
                style={{
                  borderRadius: "8px",
                  padding: "10px 20px",
                  background: "linear-gradient(to right, #6a11cb, #2575fc)",
                  border: "none",
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) =>
                  (e.target.style.background =
                    "linear-gradient(to right, #5a0bb8, #1a5ad7)")
                }
                onMouseOut={(e) =>
                  (e.target.style.background =
                    "linear-gradient(to right, #6a11cb, #2575fc)")
                }
              >
                Next
              </Button>
            )}
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default AddEntry;
