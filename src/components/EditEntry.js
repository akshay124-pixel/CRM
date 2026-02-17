import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  Modal,
  Form,
  Spinner,
  Alert,
  Button,
  ProgressBar,
} from "react-bootstrap";
import api from "../utils/api";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import Select from "react-select";
import styled from "styled-components";
import { productOptions } from "./Options";
import imageCompression from "browser-image-compression";
import { validatePhoneNumber } from "../utils/phoneValidation";
import { statesAndCities } from "./Options";
import debounce from "lodash/debounce";
import { FaEdit, FaSyncAlt, FaCog, FaPlus, FaTrash } from "react-icons/fa";
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
      customerEmail: "",
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
      createdAt: "",
      attachment: null,
    }),
    [],
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

  // Enhanced location state management
  const [locationState, setLocationState] = useState({
    status: "idle", // 'idle', 'fetching', 'slow', 'timeout', 'success', 'error'
    coordinates: null,
    error: null,
    attempts: 0,
    startTime: null,
    lastKnownLocation: null,
  });

  // Track if user is actively editing update follow-up fields
  const [isEditingFollowUp, setIsEditingFollowUp] = useState(false);
  const status = watch("status");
  const selectedState = watch("state");

  // Watch all update follow-up fields for auto-location trigger
  const assignedTo = watch("assignedTo");
  const closetype = watch("closetype");
  const closeamount = watch("closeamount");
  const firstPersonMeet = watch("firstPersonMeet");
  const secondPersonMeet = watch("secondPersonMeet");
  const thirdPersonMeet = watch("thirdPersonMeet");
  const fourthPersonMeet = watch("fourthPersonMeet");
  const nextAction = watch("nextAction");
  const estimatedValue = watch("estimatedValue");
  const firstdate = watch("firstdate");
  const followUpDate = watch("followUpDate");
  const expectedClosingDate = watch("expectedClosingDate");
  const remarks = watch("remarks");
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
        console.log(
          "Compressed file size:",
          processedFile.size,
          "Name:",
          processedFile.name,
          "Type:",
          processedFile.type,
        );
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

    setValue("attachment", processedFile, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setSelectedFileName(processedFile.name);
    toast.success(`File selected: ${processedFile.name}`);
  };

  const triggerCameraInput = () => {
    if (cameraInputRef.current) {
      console.log("Triggering camera input");
      cameraInputRef.current.click();
    } else {
      console.error("Camera input ref not found");
      toast.error(
        "Sorry, the camera option isn't available right now. Please try uploading from your device instead.",
      );
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      console.log("Triggering file input");
      fileInputRef.current.click();
    } else {
      console.error("File input ref not found");
      toast.error(
        "Sorry, the file upload option isn't available right now. Please try again later.",
      );
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
        customerEmail: entry.customerEmail || "",

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

      // Reset enhanced location state
      setLocationState({
        status: entry.liveLocation ? "success" : "idle",
        coordinates: null,
        error: null,
        attempts: 0,
        startTime: null,
        lastKnownLocation: null,
      });
      setIsEditingFollowUp(false);
    }
  }, [isOpen, entry, reset]);

  const selectedCloseType = watch("closetype");
  // Enhanced location fetching with timeout, retry, and progressive feedback
  const fetchLiveLocation = useCallback(
    async (isRetry = false) => {
      if (!isRetry) {
        setLocationState((prev) => ({
          ...prev,
          status: "fetching",
          startTime: Date.now(),
          attempts: prev.attempts + 1,
          error: null,
        }));
      }

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        setLocationState((prev) => ({
          ...prev,
          status: "error",
          error: "Geolocation is not supported by this device",
        }));
        toast.error("Location services not supported on this device");
        return;
      }

      // Set up progressive feedback timers
      const slowTimer = setTimeout(() => {
        setLocationState((prev) =>
          prev.status === "fetching"
            ? {
                ...prev,
                status: "slow",
              }
            : prev,
        );
      }, 8000); // Show "taking longer" after 8 seconds

      const timeoutTimer = setTimeout(() => {
        setLocationState((prev) =>
          prev.status === "fetching" || prev.status === "slow"
            ? {
                ...prev,
                status: "timeout",
              }
            : prev,
        );
      }, 30000); // Timeout after 30 seconds

      try {
        const position = await new Promise((resolve, reject) => {
          const options = {
            enableHighAccuracy: true,
            timeout: 25000, // 25 second timeout
            maximumAge: 300000, // Accept 5-minute old cached location
          };

          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });

        // Clear timers on success
        clearTimeout(slowTimer);
        clearTimeout(timeoutTimer);

        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        const locationString = `${coordinates.latitude}, ${coordinates.longitude}`;

        // Update state
        setLocationState((prev) => ({
          ...prev,
          status: "success",
          coordinates,
          error: null,
        }));

        setValue("liveLocation", locationString, {
          shouldValidate: true,
          shouldDirty: true,
        });

        setLocationFetched(true);

        const accuracyText =
          coordinates.accuracy < 100
            ? `Location obtained with ${Math.round(coordinates.accuracy)}m accuracy`
            : "Location obtained (low accuracy)";

        toast.success(accuracyText);
      } catch (error) {
        clearTimeout(slowTimer);
        clearTimeout(timeoutTimer);

        console.error("Location error:", error);

        let errorMessage = "Unable to get location";
        let errorType = "error";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              "Location information unavailable. Check your GPS settings.";
            break;
          case error.TIMEOUT:
            errorMessage =
              "Location request timed out. GPS might be taking longer than usual.";
            errorType = "timeout";
            break;
          default:
            errorMessage = "Failed to get location. Please try again.";
        }

        setLocationState((prev) => ({
          ...prev,
          status: errorType,
          error: errorMessage,
        }));

        setLocationFetched(false);

        // Don't show toast for timeout - let UI handle it
        if (error.code !== error.TIMEOUT) {
          toast.error(errorMessage);
        }
      }
    },
    [setValue],
  );

  // Auto-trigger location fetch when any update follow-up field changes
  useEffect(() => {
    // Check if we're in update view and any field has been modified
    if (view === "update" && entry) {
      const hasFieldChanged =
        status !== entry?.status ||
        (Array.isArray(assignedTo) &&
          Array.isArray(entry?.assignedTo) &&
          assignedTo.length !== entry.assignedTo.length) ||
        closetype !== entry?.closetype ||
        closeamount !== entry?.closeamount ||
        firstPersonMeet !== entry?.firstPersonMeet ||
        secondPersonMeet !== entry?.secondPersonMeet ||
        thirdPersonMeet !== entry?.thirdPersonMeet ||
        fourthPersonMeet !== entry?.fourthPersonMeet ||
        nextAction !== entry?.nextAction ||
        estimatedValue !== entry?.estimatedValue ||
        firstdate !==
          (entry?.firstdate
            ? new Date(entry.firstdate).toISOString().split("T")[0]
            : "") ||
        followUpDate !==
          (entry?.followUpDate
            ? new Date(entry.followUpDate).toISOString().split("T")[0]
            : "") ||
        expectedClosingDate !==
          (entry?.expectedClosingDate
            ? new Date(entry.expectedClosingDate).toISOString().split("T")[0]
            : "") ||
        remarks !== entry?.remarks;

      // Update editing state
      setIsEditingFollowUp(hasFieldChanged);

      // Only trigger location fetch if:
      // 1. Any field has changed
      // 2. Location is not already fetched or in progress
      // 3. Location state is idle or error (not fetching, slow, timeout, or success)
      if (
        hasFieldChanged &&
        !getValues("liveLocation") &&
        (locationState.status === "idle" || locationState.status === "error")
      ) {
        // Small delay to prevent excessive API calls during rapid typing
        const timeoutId = setTimeout(() => {
          fetchLiveLocation();
        }, 1000);

        return () => clearTimeout(timeoutId);
      }
    } else {
      setIsEditingFollowUp(false);
    }
  }, [
    view,
    entry,
    status,
    assignedTo,
    closetype,
    closeamount,
    firstPersonMeet,
    secondPersonMeet,
    thirdPersonMeet,
    fourthPersonMeet,
    nextAction,
    estimatedValue,
    firstdate,
    followUpDate,
    expectedClosingDate,
    remarks,
    fetchLiveLocation,
    getValues,
    locationState.status,
  ]);

  const debouncedHandleInputChange = useCallback(
    debounce((name, value) => {
      setValue(name, value, { shouldValidate: true, shouldDirty: true });
    }, 300),
    [setValue],
  );

  const addProduct = () => {
    const currentProducts = getValues("products");
    setValue(
      "products",
      [
        ...currentProducts,
        { name: "", specification: "", size: "", quantity: "" },
      ],
      { shouldValidate: true, shouldDirty: true },
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
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user._id,
        label: user.username,
      })),
    [users],
  );

  const onSubmit = async (data) => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    // CHANGE: Prevent user from entering their own mobile number
    if (data.mobileNumber) {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const phoneValidation = validatePhoneNumber(
        data.mobileNumber,
        user.username,
      );
      if (!phoneValidation.isValid) {
        toast.error(phoneValidation.message);
        setShowConfirm(false);
        return;
      }
    }

    setLoading(true);
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Token check removed as api interceptor handles auth

        const formDataToSend = new FormData();
        const { attachment, ...restData } = data;
        const payload = {
          ...restData,
          products: data.products.filter(
            (p) => p.name && p.specification && p.size && p.quantity,
          ),
          assignedTo: data.assignedTo.map((user) => user.value),
        };

        Object.keys(payload).forEach((key) => {
          if (key === "products") {
            payload[key].forEach((item, index) => {
              Object.keys(item).forEach((subKey) => {
                formDataToSend.append(
                  `products[${index}][${subKey}]`,
                  item[subKey],
                );
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
          // Location is now mandatory when updating status
          toast.error(
            "Live location is required when updating status! Please fetch your location before submitting.",
          );
          setLoading(false);
          setShowConfirm(false);
          return;
        }

        const response = await api.put(
          `/api/editentry/${entry._id}`,
          formDataToSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            timeout: 120000,
          },
        );

        const updatedEntry = response.data.data || response.data;
        if (!updatedEntry || !updatedEntry._id) {
          throw new Error("Invalid response from server.");
        }

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
          } else if (
            err.code === "ECONNABORTED" ||
            err.message.includes("timeout")
          ) {
            errorMessage =
              "Request timed out. Please check your network and try again.";
          } else if (err.message === "Network Error") {
            errorMessage =
              "Network issue detected. Please check your internet connection or try Wi-Fi.";
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
        // Token check removed as api interceptor handles auth
        const response = await api.get("/api/tag-users");
        setUsers(response.data || []);
      } catch (error) {
        console.error("Error fetching users for tagging:", error);
        toast.error(
          error.response?.data?.message ||
            "Sorry, we couldn't load the list of users to tag. Please check your internet connection and try again later.",
        );
        setUsers([]);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

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
        <Form.Group controlId="customerEmail">
          <Form.Label>📧 Customer Email</Form.Label>
          <Form.Control
            type="email"
            {...register("customerEmail")}
            isInvalid={!!errors.customerEmail}
            aria-label="Customer Email"
            onChange={(e) =>
              debouncedHandleInputChange("customerEmail", e.target.value)
            }
          />
          <Form.Control.Feedback type="invalid">
            {errors.customerEmail?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="mobileNumber">
          <Form.Label>📱 Mobile Number</Form.Label>
          <Controller
            name="mobileNumber"
            control={control}
            render={({ field }) => (
              <Form.Control
                {...field}
                type="text"
                inputMode="numeric"
                placeholder="Enter 10-digit mobile number"
                isInvalid={!!errors.mobileNumber}
                aria-label="Mobile Number"
                onChange={(e) => {
                  const numericValue = e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10);
                  field.onChange(numericValue);
                }}
                value={field.value || ""}
              />
            )}
          />
          {watch("mobileNumber") &&
            watch("mobileNumber").length > 0 &&
            watch("mobileNumber").length < 10 && (
              <Form.Text style={{ color: "red" }}>
                Mobile number must be exactly 10 digits
              </Form.Text>
            )}
          {watch("mobileNumber") && watch("mobileNumber").length === 10 && (
            <Form.Text style={{ color: "green" }}>
              ✓ Valid mobile number
            </Form.Text>
          )}
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
                {Object.keys(statesAndCities).map((state) => (
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
                  statesAndCities[selectedState]?.map((city) => (
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
              rules={{
                required: "Close Amount is required",
                pattern: {
                  value: /^[0-9]+$/,
                  message: "Only numbers are allowed",
                },
              }}
              render={({ field }) => (
                <Form.Control
                  type="text"
                  placeholder="Enter Close Amount"
                  {...field}
                  isInvalid={!!errors.closeamount}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, "");
                    field.onChange(e);
                  }}
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
          <Form.Label>📍 Live Location *</Form.Label>

          {/* Location Status Display */}
          <div
            style={{
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "12px",
              backgroundColor:
                locationState.status === "success"
                  ? "#d4edda"
                  : locationState.status === "error"
                    ? "#f8d7da"
                    : locationState.status === "timeout"
                      ? "#fff3cd"
                      : "#e2e3e5",
              border: `1px solid ${
                locationState.status === "success"
                  ? "#c3e6cb"
                  : locationState.status === "error"
                    ? "#f5c6cb"
                    : locationState.status === "timeout"
                      ? "#ffeaa7"
                      : "#d1d3d4"
              }`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {locationState.status === "success" && <span>📍</span>}
                {locationState.status === "fetching" && <span>🔄</span>}
                {locationState.status === "slow" && <span>⏳</span>}
                {locationState.status === "timeout" && <span>⚠️</span>}
                {locationState.status === "error" && <span>❌</span>}
                {locationState.status === "idle" && <span>📍</span>}

                <span style={{ fontWeight: "500" }}>
                  {locationState.status === "success" && "Location obtained"}
                  {locationState.status === "fetching" &&
                    "Getting your location..."}
                  {locationState.status === "slow" &&
                    "Taking longer than usual..."}
                  {locationState.status === "timeout" &&
                    "Location request timed out"}
                  {locationState.status === "error" && "Location unavailable"}
                  {locationState.status === "idle" && "Location not set"}
                </span>
              </div>

              {locationState.status === "success" &&
                locationState.coordinates && (
                  <small style={{ color: "#6c757d" }}>
                    Accuracy: ~
                    {Math.round(locationState.coordinates.accuracy || 0)}m
                  </small>
                )}
            </div>

            {locationState.status === "slow" && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "0.9em",
                  color: "#856404",
                }}
              >
                GPS is taking longer than usual. This is common on Android
                devices.
              </div>
            )}

            {locationState.status === "timeout" && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "0.9em",
                  color: "#856404",
                }}
              >
                Location request timed out. Location is required to update
                status - please retry to get your location.
              </div>
            )}

            {locationState.error && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "0.9em",
                  color: "#721c24",
                }}
              >
                {locationState.error}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            {/* Primary Get Location Button */}
            {(locationState.status === "idle" ||
              locationState.status === "error") && (
              <Button
                variant="primary"
                onClick={() => fetchLiveLocation()}
                disabled={loading}
                style={{ flex: "1", minWidth: "140px" }}
              >
                📍 Get Location
              </Button>
            )}

            {/* Retry Button */}
            {(locationState.status === "timeout" ||
              locationState.status === "error") && (
              <Button
                variant="outline-primary"
                onClick={() => fetchLiveLocation(true)}
                disabled={loading}
                style={{ flex: "1", minWidth: "100px" }}
              >
                🔄 Retry
              </Button>
            )}
          </div>

          {/* Progress Indicator for Active Location Fetch */}
          {(locationState.status === "fetching" ||
            locationState.status === "slow") && (
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <small style={{ color: "#6c757d" }}>
                  {locationState.status === "fetching"
                    ? "Searching for GPS signal..."
                    : "Still searching..."}
                </small>
                <small style={{ color: "#6c757d" }}>
                  {locationState.startTime &&
                    `${Math.round((Date.now() - locationState.startTime) / 1000)}s`}
                </small>
              </div>
              <ProgressBar
                animated
                now={locationState.status === "fetching" ? 30 : 70}
                style={{ height: "4px" }}
                variant={
                  locationState.status === "slow" ? "warning" : "primary"
                }
              />
            </div>
          )}

          {/* Help Text */}
          <Form.Text className="text-muted">
            {locationState.status === "idle" &&
              !isEditingFollowUp &&
              "Location will be automatically fetched when you start editing fields."}
            {locationState.status === "idle" &&
              isEditingFollowUp &&
              "Auto-fetching location due to field changes..."}
            {locationState.status === "success" &&
              "✓ Location saved successfully"}
            {(locationState.status === "error" ||
              locationState.status === "timeout") &&
              "Location is required. Please retry to get your location."}
          </Form.Text>
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
            type="text"
            placeholder="Enter Estimated Value"
            {...register("estimatedValue", {
              pattern: {
                value: /^[0-9]+$/,
                message: "Only numbers are allowed",
              },
            })}
            isInvalid={!!errors.estimatedValue}
            aria-label="Estimated Value"
            onInput={(e) => {
              e.target.value = e.target.value.replace(/[^0-9]/g, "");
            }}
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
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "10px",
            }}
          >
            <StyledButton
              type="button"
              variant="primary"
              onClick={triggerCameraInput}
              disabled={loading}
              style={{ flex: "1 1 auto", minWidth: "150px" }}
            >
              <span role="img" aria-label="camera">
                📷
              </span>{" "}
              Capture Photo
            </StyledButton>
            <StyledButton
              type="button"
              variant="info"
              onClick={triggerFileInput}
              disabled={loading}
              style={{ flex: "1 1 auto", minWidth: "150px" }}
            >
              <span role="img" aria-label="upload">
                📤
              </span>{" "}
              Upload from Device
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
          <Form.Text>
            Upload bills or documents (PDF, images, Word, max 5MB).
          </Form.Text>
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
                  style={{
                    maxWidth: "50px",
                    maxHeight: "50px",
                    objectFit: "cover",
                    borderRadius: "4px",
                  }}
                />
              ) : (
                <span role="img" aria-label="document">
                  📄
                </span>
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
          <Form.Label>
            ✏️ Remarks{" "}
            {status !== entry?.status && (
              <span style={{ color: "red" }}>*</span>
            )}
          </Form.Label>
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
                toast.warn(
                  "The pasted text was too long, so we shortened it to 500 characters.",
                );
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
