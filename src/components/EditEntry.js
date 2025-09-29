import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Modal, Form, Spinner, Alert, Button } from "react-bootstrap";
import axios from "axios";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import Select from "react-select";
import styled from "styled-components";
import { productOptions } from "./Options";
import imageCompression from "browser-image-compression";
import debounce from "lodash/debounce";
import {
  FaEdit,
  FaSyncAlt,
  FaCog,
  FaMapMarkerAlt,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import { FaUserTag } from "react-icons/fa";

const StyledModal = styled(Modal)`
  .modal-content {
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    margin: auto;
  }
  .modal-header,
  .modal-footer {
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    color: white;
    border: none;
  }
  .modal-body {
    padding: 2rem;
    background: #f9f9f9;
    max-height: 70vh;
    overflow-y: auto;
  }
`;

const StyledButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${(props) =>
    props.variant === "primary"
      ? "linear-gradient(135deg, #2575fc, #6a11cb)"
      : props.variant === "info"
      ? "linear-gradient(135deg, #2575fc, #6a11cb)"
      : props.variant === "danger"
      ? "#dc3545"
      : props.variant === "success"
      ? "#28a745"
      : "linear-gradient(135deg, rgb(252, 152, 11), rgb(244, 193, 10))"};
  &:hover {
    opacity: 0.9;
    transform: scale(1.05);
  }
`;

const FormSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
`;

const LocationContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ProductContainer = styled.div`
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 10px;
`;

const ProductActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

function EditEntry({ isOpen, onClose, onEntryUpdated, entry }) {
  const initialFormData = useMemo(
    () => ({
      customerName: "",
      mobileNumber: "",
      contactperson: "",
      products: [{ name: "", specification: "", size: "", quantity: "" }],
      type: "",
      address: "",
      state: "",
      city: "",
      organization: "",
      category: "",
      firstPersonMeet: "",
      secondPersonMeet: "",
      thirdPersonMeet: "",
      fourthPersonMeet: "",
      status: "",
      closetype: "",
      firstdate: "",
      expectedClosingDate: "",
      followUpDate: "",
      remarks: "",
      liveLocation: "",
      nextAction: "",
      estimatedValue: "",
      closeamount: "",
      assignedTo: [],
      createdAt:"",
      attachment: null
    }),
    []
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm({
    mode: "onChange",
    defaultValues: initialFormData,
  });

  const [view, setView] = useState("options");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualLocation, setManualLocation] = useState(false);
  const [locationFetched, setLocationFetched] = useState(false);
  const [users, setUsers] = useState([]);
  const status = watch("status");
  const selectedState = watch("state");
  const [selectedFileName, setSelectedFileName] = useState(null);
  // Attachment file watch
  const fileInputRef = useRef(null);
const cameraInputRef = useRef(null);
const handleAttachmentChange = async (e) => {
  const file = e.target.files[0];
  if (!file) {
    console.log("No file selected.");
    toast.error("No file selected. Please try again.");
    return;
  }

  console.log("Selected file:", file.name, file.size, file.type);

  // Compress image if it's an image file
  let processedFile = file;
  if (file.type.startsWith("image/")) {
    try {
      const options = {
        maxSizeMB: 1, 
        maxWidthOrHeight: 1024, 
        useWebWorker: true,
        fileType: file.type, 
      };
      const compressedBlob = await imageCompression(file, options);
      // Wrap blob into a File to preserve the original name and proper type
      processedFile = new File([compressedBlob], file.name, {
        type: compressedBlob.type || file.type,
        lastModified: Date.now(),
      });
      console.log("Compressed file size:", processedFile.size, "Name:", processedFile.name, "Type:", processedFile.type);
    } catch (error) {
      console.error("Image compression error:", error);
      toast.error("Failed to compress image. Please try a smaller file.");
      return;
    }
  }

  if (processedFile.size > 5 * 1024 * 1024) {
    console.log("File size exceeds 5MB:", processedFile.size);
    toast.error("File too large! Max 5MB.");
    return;
  }

  setValue("attachment", processedFile, { shouldValidate: true, shouldDirty: true });
  setSelectedFileName(processedFile.name);
  toast.success(`File selected: ${processedFile.name}`);
};

const triggerCameraInput = () => {
  if (cameraInputRef.current) {
    console.log("Triggering camera input");
    cameraInputRef.current.click();
  } else {
    console.error("Camera input ref not found");
    toast.error("Sorry, the camera option isn't available right now. Please try uploading from your device instead.");
  }
};

const triggerFileInput = () => {
  if (fileInputRef.current) {
    console.log("Triggering file input");
    fileInputRef.current.click();
  } else {
    console.error("File input ref not found");
    toast.error("Sorry, the file upload option isn't available right now. Please try again later.");
  }
};
const clearAttachment = () => {
  setValue("attachment", null, { shouldValidate: true, shouldDirty: true });
  setSelectedFileName(null);
  if (fileInputRef.current) fileInputRef.current.value = null;
  if (cameraInputRef.current) cameraInputRef.current.value = null;
  toast.info("The attachment has been removed.");
};
  // Ends Attachment file watch

  // Sync form with entry prop
  useEffect(() => {
    if (isOpen && entry) {
      const formData = {
        customerName: entry.customerName || "",
        mobileNumber: entry.mobileNumber || "",
        contactperson: entry.contactperson || "",
        assignedTo: Array.isArray(entry.assignedTo)
          ? entry.assignedTo.map((user) => ({
              value: user._id,
              label: user.username,
            }))
          : [],
        products:
          Array.isArray(entry.products) && entry.products.length > 0
            ? entry.products.map((p) => ({
                name: p.name || "",
                specification: p.specification || "",
                size: p.size || "",
                quantity: p.quantity || "",
              }))
            : [{ name: "", specification: "", size: "", quantity: "" }],
        type: entry.type || "",
        address: entry.address || "",
        state: entry.state || "",
        city: entry.city || "",
        organization: entry.organization || "",
        category: entry.category || "",
        firstPersonMeet: entry.firstPersonMeet || "",
        secondPersonMeet: entry.secondPersonMeet || "",
        thirdPersonMeet: entry.thirdPersonMeet || "",
        fourthPersonMeet: entry.fourthPersonMeet || "",
        status: entry.status || "",
        closetype: entry.closetype || "",
        firstdate: entry.firstdate
          ? new Date(entry.firstdate).toISOString().split("T")[0]
          : "",
        expectedClosingDate: entry.expectedClosingDate
          ? new Date(entry.expectedClosingDate).toISOString().split("T")[0]
          : "",
        followUpDate: entry.followUpDate
          ? new Date(entry.followUpDate).toISOString().split("T")[0]
          : "",
        remarks: entry.remarks || "",
        liveLocation: entry.liveLocation || "",
        nextAction: entry.nextAction || "",
        estimatedValue: entry.estimatedValue || "",
        closeamount: entry.closeamount || "",
        createdAt: entry.createdAt
          ? new Date(entry.createdAt).toISOString().split("T")[0]
          : "",
      };
      reset(formData, { keepDirty: false });
      setError(null);
      setShowConfirm(false);
      setManualLocation(false);
      setLocationFetched(!!entry.liveLocation);
      setView("options");
    }
  }, [isOpen, entry, reset]);

  const selectedCloseType = watch("closetype");
  const fetchLiveLocation = useCallback(() => {
    setLocationLoading(true);

    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by your browser.");
      setLocationFetched(false);
      setLocationLoading(false);
      toast.error("Sorry, your browser doesn't support location sharing. Please try a different browser or device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = `${position.coords.latitude}, ${position.coords.longitude}`;
        setValue("liveLocation", location, { shouldValidate: true, shouldDirty: true });
        setLocationFetched(true);
        setLocationLoading(false);
        toast.success("Your location was fetched successfully!");
      },
      (error) => {
        console.error("Error fetching location:", error);
        setLocationFetched(false);
        setLocationLoading(false);

        let message = "We couldn't get your location. Please check your settings and try again.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "You haven't allowed access to your location. Please go to your browser settings and allow location sharing for this site.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information isn't available right now. Please try again later.";
            break;
          case error.TIMEOUT:
            message = "It took too long to get your location. Please try again.";
            break;
          default:
            message = "Something went wrong while trying to get your location. Please try again.";
        }

        toast.error(message);
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  }, [setValue]);

  // Trigger location fetch when status changes
  useEffect(() => {
    if (
      status &&
      status !== entry?.status &&
      !getValues("liveLocation") &&
      !manualLocation
    ) {
      fetchLiveLocation();
    }
  }, [status, entry?.status, fetchLiveLocation, getValues, manualLocation]);

  const debouncedHandleInputChange = useCallback(
    debounce((name, value) => {
      setValue(name, value, { shouldValidate: true, shouldDirty: true });
    }, 300),
    [setValue]
  );

  const addProduct = () => {
    const currentProducts = getValues("products");
    setValue(
      "products",
      [
        ...currentProducts,
        { name: "", specification: "", size: "", quantity: "" },
      ],
      { shouldValidate: true, shouldDirty: true }
    );
  };

  const removeProduct = (index) => {
    const currentProducts = getValues("products");
    const newProducts = currentProducts.filter((_, i) => i !== index);
    setValue(
      "products",
      newProducts.length > 0
        ? newProducts
        : [{ name: "", specification: "", size: "", quantity: "" }],
      { shouldValidate: true, shouldDirty: true }
    );
  };

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user._id,
        label: user.username,
      })),
    [users]
  );

 const onSubmit = async (data) => {
  if (!showConfirm) {
    setShowConfirm(true);
    return;
  }
  setLoading(true);
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("You must be logged in to update an entry.");
      }

      const formDataToSend = new FormData();
      const { attachment, ...restData } = data;
      const payload = {
        ...restData,
        products: data.products.filter(
          (p) => p.name && p.specification && p.size && p.quantity
        ),
        assignedTo: data.assignedTo.map((user) => user.value),
      };

      Object.keys(payload).forEach((key) => {
        if (key === "products") {
          payload[key].forEach((item, index) => {
            Object.keys(item).forEach((subKey) => {
              formDataToSend.append(`products[${index}][${subKey}]`, item[subKey]);
            });
          });
        } else if (key === "assignedTo") {
          payload[key].forEach((item, index) => {
            formDataToSend.append(`assignedTo[${index}]`, item);
          });
        } else if (payload[key] !== undefined && payload[key] !== null) {
          formDataToSend.append(key, payload[key]);
        }
      });

      if (attachment) {
        if (attachment.size > 5 * 1024 * 1024) {
          throw new Error("File too large! Max 5MB.");
        }
        formDataToSend.append("attachment", attachment);
      }

      if (payload.status !== entry?.status && !payload.liveLocation) {
        throw new Error("Live location is required when updating status.");
      }

      const response = await axios.put(
        `${process.env.REACT_APP_URL}/api/editentry/${entry._id}`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 120000, 
        }
      );

      const updatedEntry = response.data.data || response.data;
      if (!updatedEntry || !updatedEntry._id) {
        throw new Error("Invalid response from server.");
      }

      toast.success("Entry updated successfully!");
      onEntryUpdated(updatedEntry);
      reset({
        ...initialFormData,
        assignedTo: Array.isArray(updatedEntry.assignedTo)
          ? updatedEntry.assignedTo.map((user) => ({
              value: user._id,
              label: user.username,
            }))
          : [],
      });
      onClose();
      setLoading(false);
      return; 
    } catch (err) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, err);

      if (attempt === maxRetries) {
        let errorMessage = "Failed to update entry after multiple attempts.";
        if (err.response) {
          const status = err.response.status;
          const serverMessage = err.response.data?.message || "";
          if (status === 400) {
            errorMessage = "Please check the information you entered.";
          } else if (status === 401) {
            errorMessage = "Session expired. Please log in again.";
          } else if (status === 403) {
            errorMessage = "Access denied.";
          } else if (serverMessage) {
            errorMessage = serverMessage;
          }
        } else if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
          errorMessage = "Request timed out. Please check your network and try again.";
        } else if (err.message === "Network Error") {
          errorMessage = "Network issue detected. Please check your internet connection or try Wi-Fi.";
        }

        setError(errorMessage);
        toast.error(errorMessage);
        setLoading(false);
        setShowConfirm(false);
        return;
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
};
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/tag-users`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUsers(response.data || []);
      } catch (error) {
        console.error("Error fetching users for tagging:", error);
        toast.error(
          error.response?.data?.message ||
            "Sorry, we couldn't load the list of users to tag. Please check your internet connection and try again later."
        );
        setUsers([]);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Mock Data
  const states = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",

    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
  ];

  const citiesByState = useMemo(
    () => ({
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
        "Aurangabad",
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
        "Panchkula",
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
        "Bilaspur",
        "Chamba",
        "Hamirpur",
        "Kangra",
        "Kinnaur",
        "Kullu",
        "Lahaul and Spiti",
        "Mandi",
        "Shimla",
        "Sirmaur",
        "Solan",
        "Una",
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
        "Bathinda",
        "Barnala",
        "Faridkot",
        "Fatehgarh Sahib",
        "Fazilka",
        "Ferozepur",
        "Gurdaspur",
        "Hoshiarpur",
        "Jalandhar",
        "Kapurthala",
        "Ludhiana",
        "Malerkotla",
        "Mansa",
        "Moga",
        "Pathankot",
        "Patiala",
        "Rupnagar",
        "S.A.S. Nagar",
        "Sangrur",
        "Shaheed Bhagat Singh Nagar",
        "Sri Muktsar Sahib",
        "Tarn Taran",
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
        "Sector 48",
        "Sector 49",
        "Sector 50",
        "Sector 51",
        "Sector 52",
        "Sector 53",
        "Sector 54",
        "Sector 55",
        "Sector 56",
        "Sector 63",
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
        "Anantnag",
        "Bandipora",
        "Baramulla",
        "Budgam",
        "Doda",
        "Ganderbal",
        "Jammu",
        "Kathua",
        "Kishtwar",
        "Kulgam",
        "Kupwara",
        "Poonch",
        "Pulwama",
        "Rajouri",
        "Ramban",
        "Reasi",
        "Samba",
        "Shopian",
        "Srinagar",
        "Udhampur",
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
    }),
    []
  );
  const renderOptions = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1rem",
        gap: "1rem",
        "@media (min-width: 576px)": {
          flexDirection: "row",
          justifyContent: "space-around",
        },
      }}
    >
      <StyledButton
        variant="primary"
        onClick={() => setView("edit")}
        disabled={loading}
        style={{ width: "100%", maxWidth: "250px" }}
      >
        Edit Full Details
      </StyledButton>
      <StyledButton
        variant="info"
        onClick={() => setView("update")}
        disabled={loading}
        style={{ width: "100%", maxWidth: "250px" }}
      >
        Update Follow-up
      </StyledButton>
    </div>
  );

  const renderEditForm = () => (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <FormSection>
      <Form.Group controlId="createdAt">
          <Form.Label>📅 Created At</Form.Label>
          <Form.Control
            type="date"
            {...register("createdAt")}
            isInvalid={!!errors.createdAt}
            aria-label="Created At"
            onChange={(e) =>
              debouncedHandleInputChange("createdAt", e.target.value)
            }
          
          />
          <Form.Control.Feedback type="invalid">
            {errors.createdAt?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="customerName">
          <Form.Label>👤 Customer Name</Form.Label>
          <Form.Control
            {...register("customerName")}
            isInvalid={!!errors.customerName}
            aria-label="Customer Name"
            onChange={(e) =>
              debouncedHandleInputChange("customerName", e.target.value)
            }
          />
          <Form.Control.Feedback type="invalid">
            {errors.customerName?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="mobileNumber">
          <Form.Label>📱 Mobile Number</Form.Label>
          <Form.Control
            {...register("mobileNumber")}
            isInvalid={!!errors.mobileNumber}
            aria-label="Mobile Number"
            onChange={(e) =>
              debouncedHandleInputChange(
                "mobileNumber",
                e.target.value.replace(/\D/g, "").slice(0, 10)
              )
            }
          />
          <Form.Control.Feedback type="invalid">
            {errors.mobileNumber?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="contactPerson">
          <Form.Label>👤 Contact Person Name</Form.Label>
          <Form.Control
            {...register("contactperson")}
            isInvalid={!!errors.contactperson}
            aria-label="Contact Person Name"
            placeholder="Enter Contact Person Name"
            onChange={(e) =>
              debouncedHandleInputChange("contactperson", e.target.value)
            }
          />
          <Form.Control.Feedback type="invalid">
            {errors.contactperson?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="products">
          <Form.Label>📦 Products</Form.Label>
          {watch("products").map((product, index) => (
            <ProductContainer key={index}>
              <ProductActions>
                <strong>Product {index + 1}</strong>
                {watch("products").length > 1 && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeProduct(index)}
                    aria-label={`Remove Product ${index + 1}`}
                  >
                    <FaTrash />
                  </Button>
                )}
              </ProductActions>
              <Form.Group controlId={`products.${index}.name`}>
                <Form.Label>Name</Form.Label>
                <Controller
                  name={`products.${index}.name`}
                  control={control}
                  render={({ field }) => (
                    <Form.Control
                      as="select"
                      {...field}
                      isInvalid={!!errors.products?.[index]?.name}
                      aria-label={`Product ${index + 1} Name`}
                      onChange={(e) => {
                        field.onChange(e);

                        setValue(`products.${index}.specification`, "", {
                          shouldValidate: true,
                        });
                        setValue(`products.${index}.size`, "", {
                          shouldValidate: true,
                        });
                      }}
                    >
                      <option value="">-- Select Product --</option>
                      {productOptions.map((option) => (
                        <option key={option.name} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </Form.Control>
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.products?.[index]?.name?.message}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId={`products.${index}.specification`}>
                <Form.Label>Specification</Form.Label>
                <Controller
                  name={`products.${index}.specification`}
                  control={control}
                  render={({ field }) => (
                    <Form.Control
                      as="select"
                      {...field}
                      isInvalid={!!errors.products?.[index]?.specification}
                      aria-label={`Product ${index + 1} Specification`}
                      disabled={!product.name}
                    >
                      <option value="">-- Select Specification --</option>
                      {product.name &&
                        productOptions
                          .find((option) => option.name === product.name)
                          ?.specifications.map((spec) => (
                            <option key={spec} value={spec}>
                              {spec}
                            </option>
                          ))}
                    </Form.Control>
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.products?.[index]?.specification?.message}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId={`products.${index}.size`}>
                <Form.Label>Size</Form.Label>
                <Controller
                  name={`products.${index}.size`}
                  control={control}
                  render={({ field }) => (
                    <Form.Control
                      as="select"
                      {...field}
                      isInvalid={!!errors.products?.[index]?.size}
                      aria-label={`Product ${index + 1} Size`}
                      disabled={!product.name}
                    >
                      <option value="">-- Select Size --</option>
                      {product.name &&
                        productOptions
                          .find((option) => option.name === product.name)
                          ?.sizes.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                    </Form.Control>
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.products?.[index]?.size?.message}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId={`products.${index}.quantity`}>
                <Form.Label>Quantity</Form.Label>
                <Form.Control
                  type="number"
                  {...register(`products.${index}.quantity`)}
                  isInvalid={!!errors.products?.[index]?.quantity}
                  aria-label={`Product ${index + 1} Quantity`}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.products?.[index]?.quantity?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </ProductContainer>
          ))}
          <Button
            variant="outline-primary"
            onClick={addProduct}
            aria-label="Add Product"
            style={{ marginTop: "10px" }}
          >
            <FaPlus /> Add Product
          </Button>
        </Form.Group>

        <Form.Group controlId="type">
          <Form.Label>👥 Customer Type</Form.Label>
          <Form.Select
            {...register("type")}
            isInvalid={!!errors.type}
            aria-label="Customer Type"
            onChange={(e) =>
              setValue("type", e.target.value, { shouldValidate: true })
            }
          >
            <option value="">-- Select Type --</option>
            <option value="Direct Client">Direct Client</option>
            <option value="Partner">Partner</option>
          </Form.Select>
          <Form.Control.Feedback type="invalid">
            {errors.type?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="address">
          <Form.Label>🏠 Address</Form.Label>
          <Form.Control
            as="textarea"
            {...register("address")}
            isInvalid={!!errors.address}
            rows={2}
            aria-label="Address"
            onChange={(e) =>
              debouncedHandleInputChange("address", e.target.value)
            }
          />
          <Form.Control.Feedback type="invalid">
            {errors.address?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="state">
          <Form.Label>🗺️ State</Form.Label>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <Form.Control
                as="select"
                {...field}
                isInvalid={!!errors.state}
                aria-label="State"
                onChange={(e) => {
                  field.onChange(e);
                  setValue("city", "", { shouldValidate: true });
                }}
              >
                <option value="">-- Select State --</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Form.Control>
            )}
          />
          <Form.Control.Feedback type="invalid">
            {errors.state?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="city">
          <Form.Label>🌆 City</Form.Label>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <Form.Control
                as="select"
                {...field}
                isInvalid={!!errors.city}
                disabled={!selectedState}
                aria-label="City"
              >
                <option value="">-- Select City --</option>
                {selectedState &&
                  citiesByState[selectedState]?.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
              </Form.Control>
            )}
          />
          <Form.Control.Feedback type="invalid">
            {errors.city?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="formOrganization" className="mb-3">
          <Form.Label>🏢 Organization</Form.Label>
          <Form.Select
            {...register("organization")}
            isInvalid={!!errors.organization}
            aria-label="Organization"
            name="organization"
            disabled={loading}
          >
            <option value="">Select organization type</option>
            <option value="Hospital">Hospital</option>
            <option value="Govt department">Govt department</option>
            <option value="Corporate">Corporate</option>

            <option value="Private coaching">Private coaching</option>
            <option value="Private school">Private school</option>
            <option value="Private college">Private college</option>

            <option value="Govt school">Govt school</option>
            <option value="Govt college">Govt college</option>
            <option value="Govt aided college">Govt aided college</option>
            <option value="Ngo">Ngo</option>
            <option value="Dealer/partner">Dealer/partner</option>
            <option value="Others">Others</option>
          </Form.Select>
          <Form.Control.Feedback type="invalid">
            {errors.organization?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="category">
          <Form.Label>📁 Category</Form.Label>
          <Form.Select
            {...register("category")}
            isInvalid={!!errors.category}
            aria-label="Category"
          >
            <option value="">-- Select Category --</option>
            <option value="Private">Private</option>
            <option value="Government">Government</option>
          </Form.Select>
          <Form.Control.Feedback type="invalid">
            {errors.category?.message}
          </Form.Control.Feedback>
        </Form.Group>
      </FormSection>
    </Form>
  );

  const renderUpdateForm = () => (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <FormSection>
        <Form.Group controlId="assignedTo">
          <Form.Label>
            <FaUserTag className="me-1" /> Tag With Salesperson
          </Form.Label>
          <Controller
            name="assignedTo"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                isMulti
                options={userOptions}
                placeholder="Select Salespersons..."
                isInvalid={!!errors.assignedTo}
                aria-label="Assign to Salesperson"
              />
            )}
          />
          {errors.assignedTo && (
            <div className="invalid-feedback d-block">
              {errors.assignedTo.message}
            </div>
          )}
        </Form.Group>
        <Form.Group controlId="status">
          <Form.Label>📊 Status</Form.Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Form.Control
                as="select"
                {...field}
                isInvalid={!!errors.status}
                aria-label="Status"
              >
                <option value="">-- Select Status --</option>
                <option value="Maybe">Maybe</option>
                <option value="Interested">Interested</option>
                <option value="Not Interested">Not Interested</option>
                <option value="Closed">Closed</option>
              </Form.Control>
            )}
          />
          <Form.Control.Feedback type="invalid">
            {errors.status?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="closetype">
          <Form.Label>🎯 Close Type</Form.Label>
          <Controller
            name="closetype"
            control={control}
            rules={{
              required: status === "Closed" ? "Close Type is required" : false,
            }}
            render={({ field }) => (
              <Form.Control
                as="select"
                {...field}
                disabled={status !== "Closed"}
                isInvalid={!!errors.closetype}
                aria-label="Close Type"
              >
                <option value="">Select Close Type</option>
                <option value="Closed Won">Closed Won</option>
                <option value="Closed Lost">Closed Lost</option>
              </Form.Control>
            )}
          />
          <Form.Control.Feedback type="invalid">
            {errors.closetype?.message}
          </Form.Control.Feedback>
        </Form.Group>
        {selectedCloseType === "Closed Won" && (
          <Form.Group controlId="closeamount">
            <Form.Label>💰 Close Amount</Form.Label>
            <Controller
              name="closeamount"
              control={control}
              rules={{ required: "Close Amount is required" }}
              render={({ field }) => (
                <Form.Control
                  type="number"
                  placeholder="Enter Close Amount"
                  {...field}
                  isInvalid={!!errors.closeamount}
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.closeamount?.message}
            </Form.Control.Feedback>
          </Form.Group>
        )}

        <Form.Group controlId="firstPersonMeet">
          <Form.Label>👤 First Person Meet</Form.Label>
          <Form.Control
            {...register("firstPersonMeet")}
            isInvalid={!!errors.firstPersonMeet}
            aria-label="First Person Meet"
            placeholder="Enter first person met"
          />
          <Form.Control.Feedback type="invalid">
            {errors.firstPersonMeet?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="secondPersonMeet">
          <Form.Label>👤 Second Person Meet</Form.Label>
          <Form.Control
            {...register("secondPersonMeet")}
            isInvalid={!!errors.secondPersonMeet}
            aria-label="Second Person Meet"
            placeholder="Enter second person met"
          />
          <Form.Control.Feedback type="invalid">
            {errors.secondPersonMeet?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="thirdPersonMeet">
          <Form.Label>👤 Third Person Meet</Form.Label>
          <Form.Control
            {...register("thirdPersonMeet")}
            isInvalid={!!errors.thirdPersonMeet}
            aria-label="Third Person Meet"
            placeholder="Enter third person met"
          />
          <Form.Control.Feedback type="invalid">
            {errors.thirdPersonMeet?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="fourthPersonMeet">
          <Form.Label>👤 Fourth Person Meet</Form.Label>
          <Form.Control
            {...register("fourthPersonMeet")}
            isInvalid={!!errors.fourthPersonMeet}
            aria-label="Fourth Person Meet"
            placeholder="Enter fourth person met"
          />
          <Form.Control.Feedback type="invalid">
            {errors.fourthPersonMeet?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="liveLocation">
          <Form.Label>📍 Live Location</Form.Label>
          <LocationContainer>
            <Form.Control
              type="text"
              value={
                locationFetched
                  ? "Location Fetched ✅"
                  : "Location Not Fetched ❌"
              }
              readOnly
              disabled
              aria-label="Live Location"
            />
            <Button
              variant="outline-primary"
              onClick={fetchLiveLocation}
              disabled={locationLoading}
              aria-label="Fetch Live Location"
            >
              <FaMapMarkerAlt />
            </Button>
          </LocationContainer>
        </Form.Group>

        <Form.Group controlId="nextAction">
          <Form.Label>🚀 Next Action</Form.Label>
          <Form.Control
            type="text"
            {...register("nextAction")}
            isInvalid={!!errors.nextAction}
            aria-label="Next Action"
            placeholder="Enter next action plan"
          />
          <Form.Control.Feedback type="invalid">
            {errors.nextAction?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="estimatedValue">
          <Form.Label>💰 Estimated Value</Form.Label>
          <Form.Control
            type="number"
            {...register("estimatedValue")}
            isInvalid={!!errors.estimatedValue}
            aria-label="Estimated Value"
          />
          <Form.Control.Feedback type="invalid">
            {errors.estimatedValue?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="firstMeetingDate">
          <Form.Label>📅 First Meeting Date</Form.Label>
          <Form.Control
            type="date"
            {...register("firstdate")}
            max={new Date().toISOString().split("T")[0]}
            isInvalid={!!errors.firstMeetingDate}
            aria-label="First Meeting Date"
          />
          <Form.Control.Feedback type="invalid">
            {errors.firstMeetingDate?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="followUpDate">
          <Form.Label>📅 Next Follow-up Date</Form.Label>
          <Form.Control
            type="date"
            {...register("followUpDate")}
            isInvalid={!!errors.followUpDate}
            aria-label="Follow-up Date"
          />
          <Form.Control.Feedback type="invalid">
            {errors.followUpDate?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="expectedClosingDate">
          <Form.Label>📅 Expected Closure Date</Form.Label>
          <Form.Control
            type="date"
            {...register("expectedClosingDate")}
            isInvalid={!!errors.expectedClosingDate}
            aria-label="Expected Closing Date"
          />
          <Form.Control.Feedback type="invalid">
            {errors.expectedClosingDate?.message}
          </Form.Control.Feedback>
        </Form.Group>
<Form.Group controlId="attachment">
  <Form.Label>📎 Attachment (Optional)</Form.Label>
  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
    <StyledButton
      type="button"
      variant="primary"
      onClick={triggerCameraInput}
      disabled={loading}
      style={{ flex: "1 1 auto", minWidth: "150px" }}
    >
      <span role="img" aria-label="camera">📷</span> Capture Photo
    </StyledButton>
    <StyledButton
      type="button"
      variant="info"
      onClick={triggerFileInput}
      disabled={loading}
      style={{ flex: "1 1 auto", minWidth: "150px" }}
    >
      <span role="img" aria-label="upload">📤</span> Upload from Device
    </StyledButton>
  </div>
  <input
    type="file"
    accept="image/*"
    capture="environment"
    style={{ display: "none" }}
    ref={cameraInputRef}
    onChange={handleAttachmentChange}
  />
  <input
    type="file"
    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
    style={{ display: "none" }}
    ref={fileInputRef}
    onChange={handleAttachmentChange}
  />
  <Form.Text>Upload bills or documents (PDF, images, Word, max 5MB).</Form.Text>
  {watch("attachment") && (
    <div
      style={{
        marginTop: "10px",
        padding: "10px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "#f8f9fa",
      }}
    >
      {watch("attachment").type.startsWith("image/") ? (
        <img
          src={URL.createObjectURL(watch("attachment"))}
          alt="Preview"
          style={{ maxWidth: "50px", maxHeight: "50px", objectFit: "cover", borderRadius: "4px" }}
        />
      ) : (
        <span role="img" aria-label="document">📄</span>
      )}
      <Form.Text style={{ color: "green", flex: 1 }}>
        Selected: {selectedFileName}
      </Form.Text>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={clearAttachment}
        aria-label="Remove Attachment"
      >
        <FaTrash />
      </Button>
    </div>
  )}
</Form.Group>
      <Form.Group controlId="remarks">
  <Form.Label>✏️ Remarks</Form.Label>
  <Form.Control
    as="textarea"
    {...register("remarks", {
      required: status !== entry?.status && !watch("attachment") ? "Remarks are required when updating status without an attachment" : false,
      maxLength: { value: 500, message: "Max 500 characters" },
      onChange: (e) => {
        const value = e.target.value.slice(0, 500);
        e.target.value = value;
        return value;
      },
    })}
    rows={3}
    isInvalid={!!errors.remarks}
    aria-label="Remarks"
    onPaste={(e) => {
      const pastedText = e.clipboardData.getData("text").slice(0, 500);
      e.target.value = pastedText;
      if (pastedText.length >= 500) {
        toast.warn("The pasted text was too long, so we shortened it to 500 characters.");
      }
      setValue("remarks", pastedText, { shouldValidate: true });
    }}
    spellCheck="true"
    placeholder="Enter remarks"
  />
  <Form.Text>{watch("remarks")?.length || 0}/500</Form.Text>
  <Form.Control.Feedback type="invalid">
    {errors.remarks?.message}
  </Form.Control.Feedback>
</Form.Group>
      </FormSection>
    </Form>
  );

  return (
    <StyledModal
      show={isOpen}
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title className="text-center w-100 d-flex align-items-center justify-content-center">
          {view === "options" ? (
            <>
              <FaCog className="me-2" />
              <span style={{ fontWeight: "bold" }}>Entry Management</span>
            </>
          ) : view === "edit" ? (
            <>
              <FaEdit className="me-2" />
              <span style={{ fontWeight: "bold" }}>Edit Entry</span>
            </>
          ) : (
            <>
              <FaSyncAlt className="me-2" />
              <span style={{ fontWeight: "bold" }}>Update Follow-up</span>
            </>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {view === "options" && renderOptions()}
        {view === "edit" && renderEditForm()}
        {view === "update" && renderUpdateForm()}
      </Modal.Body>

      <Modal.Footer>
        <StyledButton
          variant="danger"
          onClick={onClose}
          disabled={loading}
          aria-label="Close Modal"
        >
          Close
        </StyledButton>
        {(view === "edit" || view === "update") &&
          (showConfirm ? (
            <>
              <StyledButton
                variant="warning"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                aria-label="Cancel Confirmation"
              >
                Cancel
              </StyledButton>
              <StyledButton
                variant="success"
                onClick={handleSubmit(onSubmit)}
                disabled={loading}
                aria-label="Confirm Action"
              >
                {loading ? (
                  <Spinner as="span" animation="border" size="sm" />
                ) : (
                  "Confirm"
                )}
              </StyledButton>
            </>
          ) : (
            <StyledButton
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              disabled={loading || !isDirty || Object.keys(errors).length > 0}
              aria-label={view === "edit" ? "Save Changes" : "Update Follow-up"}
            >
              {loading ? (
                <Spinner as="span" animation="border" size="sm" />
              ) : view === "edit" ? (
                "Save Changes"
              ) : (
                "Update Follow-up"
              )}
            </StyledButton>
          ))}
      </Modal.Footer>
    </StyledModal>
  );
}

export default EditEntry;