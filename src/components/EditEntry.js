import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Modal, Form, Spinner, Alert, Button } from "react-bootstrap";
import axios from "axios";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import styled from "styled-components";
import debounce from "lodash/debounce";
import {
  FaEdit,
  FaSyncAlt,
  FaCog,
  FaMapMarkerAlt,
  FaPlus,
  FaTrash,
} from "react-icons/fa";

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
      firstMeetingDate: "",
      expectedClosingDate: "",
      followUpDate: "",
      remarks: "",
      liveLocation: "",
      nextAction: "",
      estimatedValue: "",
      closeamount: "",
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

  const status = watch("status");
  const selectedState = watch("state");

  // Sync form with entry prop
  useEffect(() => {
    if (isOpen && entry) {
      const formData = {
        customerName: entry.customerName || "",
        mobileNumber: entry.mobileNumber || "",
        contactperson: entry.contactperson || "",
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
        firstMeetingDate: entry.firstMeetingDate
          ? new Date(entry.firstMeetingDate).toISOString().split("T")[0]
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
      };
      reset(formData, { keepDirty: false });
      setError(null);
      setShowConfirm(false);
      setManualLocation(false);
      setView("options");
    }
  }, [isOpen, entry, reset]);

  const selectedCloseType = watch("closetype");
  const fetchLiveLocation = useCallback(() => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = `${position.coords.latitude}, ${position.coords.longitude}`;
          setValue("liveLocation", location, { shouldValidate: true }); // backend ke liye hidden field
          setLocationFetched(true);
          setLocationLoading(false);
          toast.success("Location fetched successfully!");
        },
        (error) => {
          console.error("Error fetching location:", error);
          setLocationFetched(false);
          setLocationLoading(false);
        },
        { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
      );
    } else {
      console.error("Geolocation is not supported by your browser.");
      setLocationFetched(false);
      setLocationLoading(false);
    }
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

  const onSubmit = async (data) => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setLoading(true);
    try {
      // Clean products array
      const payload = {
        ...data,
        products: data.products.filter(
          (p) => p.name && p.specification && p.size && p.quantity
        ),
      };

      // Validation for status change
      if (payload.status !== entry?.status) {
        if (!payload.liveLocation)
          throw new Error("Live location is required when updating status.");
      }

      const response = await axios.put(
        `https://crm-server-amz7.onrender.com/api/editentry/${entry._id}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const updatedEntry = response.data.data || response.data;
      if (!updatedEntry || !updatedEntry._id) {
        throw new Error("Invalid response from server.");
      }

      toast.success("Entry updated successfully!");
      onEntryUpdated(updatedEntry);
      reset(updatedEntry); // Sync form with server data
      onClose();
    } catch (err) {
      console.error("Submit error:", err.response?.data || err.message);
      let errorMessage = "Failed to update entry!";
      if (
        err.response?.data?.message &&
        err.response.data.message.includes("token")
      ) {
        errorMessage =
          "Server requires authentication. Please contact the administrator to allow edits without login.";
      } else if (
        err.response?.data?.errors &&
        Array.isArray(err.response.data.errors)
      ) {
        errorMessage = err.response.data.errors
          .map((error) => `${error.field}: ${error.message}`)
          .join(", ");
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };
  const productOptions = [
    {
      name: "IFPD",
      sizes: ["65 inch", "75 inch", "86 inch", "98 inch"],
      specifications: [
        "Android 9, 4GB RAM, 32GB ROM",
        "Android 8, 4GB RAM, 32GB ROM",
        "Android 11, 4GB RAM, 32GB ROM",
        "Android 11, 8GB RAM, 128GB ROM",
        "Android 13, 4GB RAM, 32GB ROM",
        "Android 13, 8GB RAM, 128GB ROM",
        "Android 13, 8GB RAM, 128GB ROM Inbuilt Camera",
        "Android 14, 8GB RAM, 128GB ROM",
        "Android 14, 8GB RAM, 128GB ROM Inbuilt Camera",
      ],
    },
    {
      name: "OPS",
      sizes: ["N/A"],
      specifications: [
        // i5 6th Gen
        "i5 6th Gen, 8GB RAM, 256GB ROM",
        "i5 6th Gen, 8GB RAM, 512GB ROM",
        "i5 6th Gen, 8GB RAM, 1TB ROM",
        "i5 6th Gen, 16GB RAM, 256GB ROM",
        "i5 6th Gen, 16GB RAM, 512GB ROM",
        "i5 6th Gen, 16GB RAM, 1TB ROM",
        // i5 7th Gen
        "i5 7th Gen, 8GB RAM, 256GB ROM",
        "i5 7th Gen, 8GB RAM, 512GB ROM",
        "i5 7th Gen, 8GB RAM, 1TB ROM",
        "i5 7th Gen, 16GB RAM, 256GB ROM",
        "i5 7th Gen, 16GB RAM, 512GB ROM",
        "i5 7th Gen, 16GB RAM, 1TB ROM",
        // i5 8th Gen
        "i5 8th Gen, 8GB RAM, 256GB ROM",
        "i5 8th Gen, 8GB RAM, 512GB ROM",
        "i5 8th Gen, 8GB RAM, 1TB ROM",
        "i5 8th Gen, 16GB RAM, 256GB ROM",
        "i5 8th Gen, 16GB RAM, 512GB ROM",
        "i5 8th Gen, 16GB RAM, 1TB ROM",
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
        // i7 4th Gen
        "i7 4th Gen, 8GB RAM, 256GB ROM",
        "i7 4th Gen, 8GB RAM, 512GB ROM",
        "i7 4th Gen, 8GB RAM, 1TB ROM",
        "i7 4th Gen, 16GB RAM, 256GB ROM",
        "i7 4th Gen, 16GB RAM, 512GB ROM",
        "i7 4th Gen, 16GB RAM, 1TB ROM",
        // i7 5th Gen
        "i7 5th Gen, 8GB RAM, 256GB ROM",
        "i7 5th Gen, 8GB RAM, 512GB ROM",
        "i7 5th Gen, 8GB RAM, 1TB ROM",
        "i7 5th Gen, 16GB RAM, 256GB ROM",
        "i7 5th Gen, 16GB RAM, 512GB ROM",
        "i7 5th Gen, 16GB RAM, 1TB ROM",
        // i7 6th Gen
        "i7 6th Gen, 8GB RAM, 256GB ROM",
        "i7 6th Gen, 8GB RAM, 512GB ROM",
        "i7 6th Gen, 8GB RAM, 1TB ROM",
        "i7 6th Gen, 16GB RAM, 256GB ROM",
        "i7 6th Gen, 16GB RAM, 512GB ROM",
        "i7 6th Gen, 16GB RAM, 1TB ROM",
        // i7 7th Gen
        "i7 7th Gen, 8GB RAM, 256GB ROM",
        "i7 7th Gen, 8GB RAM, 512GB ROM",
        "i7 7th Gen, 8GB RAM, 1TB ROM",
        "i7 7th Gen, 16GB RAM, 256GB ROM",
        "i7 7th Gen, 16GB RAM, 512GB ROM",
        "i7 7th Gen, 16GB RAM, 1TB ROM",
        // i7 8th Gen
        "i7 8th Gen, 8GB RAM, 256GB ROM",
        "i7 8th Gen, 8GB RAM, 512GB ROM",
        "i7 8th Gen, 8GB RAM, 1TB ROM",
        "i7 8th Gen, 16GB RAM, 256GB ROM",
        "i7 8th Gen, 16GB RAM, 512GB ROM",
        "i7 8th Gen, 16GB RAM, 1TB ROM",
        // i7 9th Gen
        "i7 9th Gen, 8GB RAM, 256GB ROM",
        "i7 9th Gen, 8GB RAM, 512GB ROM",
        "i7 9th Gen, 8GB RAM, 1TB ROM",
        "i7 9th Gen, 16GB RAM, 256GB ROM",
        "i7 9th Gen, 16GB RAM, 512GB ROM",
        "i7 9th Gen, 16GB RAM, 1TB ROM",
        // i7 10th Gen
        "i7 10th Gen, 8GB RAM, 256GB ROM",
        "i7 10th Gen, 8GB RAM, 512GB ROM",
        "i7 10th Gen, 8GB RAM, 1TB ROM",
        "i7 10th Gen, 16GB RAM, 256GB ROM",
        "i7 10th Gen, 16GB RAM, 512GB ROM",
        "i7 10th Gen, 16GB RAM, 1TB ROM",
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
      sizes: ["Standard"],
      specifications: [
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 1 HANDHELD MIC, 1 GOOSENECK MIC',
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 2 HANDHELD MIC, 1 GOOSENECK MIC',
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 1 HANDHELD MIC, 1 COOLER MIC, 1 GOOSENECK MIC',
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 1 HANDHELD MIC, 2 COOLER MIC, 1 GOOSENECK MIC',
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 1 HANDHELD MIC, 1 GOOSENECK MIC, VISUALIZER',
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 2 HANDHELD MIC, 1 GOOSENECK MIC, VISUALIZER',
      ],
    },
    {
      name: "Advance Digital Podium",
      sizes: ["Front Display 32inch"],
      specifications: [
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 1 HANDHELD MIC, 1 COOLER MIC, 1 GOOSENECK MIC',
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 1 HANDHELD MIC, 2 COOLER MIC, 1 GOOSENECK MIC',
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 1 HANDHELD MIC, 1 GOOSENECK MIC',
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 2 HANDHELD MIC, 1 GOOSENECK MIC',
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 1 HANDHELD MIC, 1 GOOSENECK MIC, VISUALIZER',
        'MINI PC 21.5" TOUCH DISPLAY, AMP. 70 WATT 30 W, 2 SPEAKER, 2 HANDHELD MIC, 1 GOOSENECK MIC, VISUALIZER',
      ],
    },
    {
      name: "Audio Podium",
      sizes: ["Full"],
      specifications: ["N/A"],
    },
    {
      name: "Kiosk",
      sizes: ["32 inch", "43 inch", "55 inch", "65 inch"],
      specifications: ["Touch Andriod 13/4/32", "Non-Touch Andriod 13/4/32"],
    },
    {
      name: "PTZ Camera",
      sizes: ["N/A"],
      specifications: [
        "Non-Voice Tracking-Full HD",
        "UHD 20x",
        "FHD Voice Tracking",
        "4K Auto Tracking",
        "4K 12x",
        "HD 20x",
      ],
    },
    {
      name: "Document Camera",
      sizes: ["N/A"],
      specifications: [
        "Hydraulic Wall Mount Visualizer",
        "Non-Hydraulic Wall Mount Visualizer",
        "Slim Portable Visualizer",
        "Table Top Portable Visualizer",
        "Visualizer",
      ],
    },
    {
      name: "UPS",
      sizes: ["Standard"],
      specifications: [
        "1 KVA",
        "2 KVA",
        "3 KVA",
        "4 KVA",
        "5 KVA",
        "6 KVA",
        "7 KVA",
        "8 KVA",
        "9 KVA",
        "10 KVA",
        "Offline UPS",
        "Online UPS",
      ],
    },
    {
      name: "Wallmount Kit",
      sizes: ["55 inch", "65 inch", "75 inch", "86 inch", "98 inch"],
      specifications: ["Standard"],
    },
    {
      name: "Furniture",
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
      sizes: ["65 inch", "75 inch", "86 inch", "98 inch"],
      specifications: [
        "Common",
        "White & Red Dispaly Boards",
        "White & Green Dispaly Boards",
        "White & Blue Dispaly Boards",
        "N/A",
      ],
    },
    {
      name: "3 Cup Speaker",
      sizes: ["N/A"],
      specifications: ["N/A"],
    },
    {
      name: "Microphone",
      sizes: ["N/A"],
      specifications: [
        "Handheld Collar Mic",
        "Goose Neck Mic",
        "Collar/Lapel Mic",
      ],
    },
    {
      name: "Keyboard",
      sizes: ["N/A"],
      specifications: ["Wireless", "Wired"],
    },
    {
      name: "Mouse",
      sizes: ["N/A"],
      specifications: ["Wireless", "Wired"],
    },
    {
      name: "Interactive White Board",
      sizes: ["82 inch"],
      specifications: ["Ceramic", "Non-Ceramic"],
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
      specifications: ["FHD Voice Tracking"],
    },
    {
      name: "PTZ Camera - 4K Auto Tracking",
      sizes: ["N/A"],
      specifications: ["4K Auto Tracking"],
    },
    {
      name: "Web Cam",
      sizes: ["N/A"],
      specifications: [
        "Full HD Non-AI Featured",
        "4K AI Featured",
        "4K Auto Tracking",
      ],
    },
    {
      name: "Bluetooth Microphone",
      sizes: ["N/A"],
      specifications: ["N/A"],
    },
    {
      name: "UPS - Offline",
      sizes: ["N/A"],
      specifications: ["Offline UPS"],
    },
    {
      name: "UPS - Online",
      sizes: ["N/A"],
      specifications: ["Online UPS"],
    },
    {
      name: "UPS Cabinet",
      sizes: ["N/A"],
      specifications: ["N/A"],
    },
    {
      name: "SD Card",
      sizes: ["N/A"],
      specifications: ["8GB", "16GB", "32GB", "64GB", "128GB"],
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
      specifications: ["Standard", "4K"],
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
      specifications: [
        "Color Printer",
        "Monochrome Printer",
        "Black and White Printer",
        "Multifunction Color Printer",
        "Multifunction Monochrome Printer",
        "Multifunction Black and White Printer",
      ],
    },
    {
      name: "Google TV",
      sizes: ["43 inch", "50 inch", "55 inch"],
      specifications: ["4GB RAM / 32GB ROM 4K"],
    },
    {
      name: "Wriety Software",
      sizes: ["N/A"],
      specifications: ["N/A"],
    },
    {
      name: "Ceiling Mount Kit",
      sizes: ["Standard"],
      specifications: ["Projector Ceiling Mount", "PTZ Ceiling Mount"],
    },
    {
      name: "Almirah Type Shutter",
      sizes: ["65 inch", "75 inch", "86 inch", "98 inch"],
      specifications: ["Plain", "White Boards", "Green Boards"],
    },
    {
      name: "Aicharya",
      sizes: ["N/A"],
      specifications: ["Standard"],
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
      name: "PRO Share Software",
      sizes: ["N/A"],
      specifications: ["N/A"],
    },
    {
      name: "E Share Software",
      sizes: ["N/A"],
      specifications: ["N/A"],
    },
    {
      name: "DMS Software",
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
      specifications: ["256GB", "512GB", "1TB"],
    },
    {
      name: "RAM",
      sizes: ["N/A"],
      specifications: ["8GB", "16GB"],
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
      name: "Hydraulic Bracket",
      sizes: ["N/A"],
      specifications: ["N/A"],
    },
    {
      name: "Desktop PC Monitor",
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
      specifications: ["Long Throw", "Short Throw", "Ultra Long Throw"],
    },
    {
      name: "LED TV",
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
      name: "IT Catalog",
      sizes: ["N/A"],
      specifications: ["N/A"],
    },
    {
      name: "AI Charya Podium",
      sizes: ["N/A"],
      specifications: ["Standard"],
    },
    {
      name: "4 Pole C Curve MCB",
      sizes: ["N/A"],
      specifications: ["N/A"],
    },
    {
      name: "Extension Mic",
      sizes: ["N/A"],
      specifications: ["N/A"],
    },
    {
      name: "Mike Wireless",
      sizes: ["N/A"],
      specifications: ["N/A"],
    },
    {
      name: "Advance Podium",
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
      specifications: [
        "Hydraulic Wall Mount Visualizer",
        "Non-Hydraulic Wall Mount Visualizer",
      ],
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
        "S.A.S. Nagar", // Sahibzada Ajit Singh Nagar
        "Sangrur",
        "Shaheed Bhagat Singh Nagar", // Nawanshahr
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
        <Form.Group controlId="customerName">
          <Form.Label>👤 Customer Name</Form.Label>
          <Form.Control
            {...register("customerName", {
              required: "Customer name is required",
              maxLength: { value: 100, message: "Max 100 characters" },
            })}
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
            {...register("mobileNumber", {
              required: "Mobile number is required",
              pattern: { value: /^\d{10}$/, message: "Must be 10 digits" },
            })}
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
            {...register("contactperson", {
              required: "Contact person name is required",
              pattern: {
                value: /^[A-Za-z\s]+$/,
                message: "Only alphabets are allowed",
              },
            })}
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
                  rules={{ required: "Product name is required" }}
                  render={({ field }) => (
                    <Form.Control
                      as="select"
                      {...field}
                      isInvalid={!!errors.products?.[index]?.name}
                      aria-label={`Product ${index + 1} Name`}
                      onChange={(e) => {
                        field.onChange(e);
                        // Reset specification and size when product changes
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
                  rules={{ required: "Specification is required" }}
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
                  rules={{ required: "Size is required" }}
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
                  {...register(`products.${index}.quantity`, {
                    required: "Quantity is required",
                    min: { value: 1, message: "Quantity must be at least 1" },
                    valueAsNumber: true,
                  })}
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
            {...register("type", { required: "Customer type is required" })}
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
            {...register("address", {
              required: "Address is required",
              minLength: { value: 5, message: "Min 5 characters" },
            })}
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
            rules={{ required: "State is required" }}
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
            rules={{ required: "City is required" }}
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
            {...register("organization", {
              required: "Organization is required",
            })}
            isInvalid={!!errors.organization}
            aria-label="Organization"
            name="organization"
            disabled={loading}
          >
            <option value="">Select organization type</option>
            <option value="Hospital">Hospital</option>
            <option value="Govt department">Govt department</option>
            <option value="Corporate">Corporate</option>
            <option value="Private school">Private school</option>
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
            {...register("category", { required: "Category is required" })}
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
            {...register("firstMeetingDate")}
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

        <Form.Group controlId="remarks">
          <Form.Label>✏️ Remarks</Form.Label>
          <Form.Control
            as="textarea"
            {...register("remarks", {
              required:
                status !== entry?.status
                  ? "Remarks are required when updating status"
                  : false,
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
                toast.warn("Pasted content truncated to 500 characters.");
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
