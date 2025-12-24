import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Modal, Button, Dropdown } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast } from "react-toastify";
import {
  FaHistory,
  FaMapMarkerAlt,
  FaAngleDown,
  FaAngleUp,
  FaEllipsisV,
} from "react-icons/fa";
import { Box, Typography, Collapse, Chip } from "@mui/material";
import styled from "styled-components";
import * as XLSX from "xlsx";
import DisableCopy from "./DisableCopy";

// Styled Components (unchanged)
const GradientModalHeader = styled(Modal.Header)`
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  color: #fff;
  padding: 1.5rem 2rem;
  border-bottom: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
`;

const GradientSection = styled.div`
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.98),
    rgba(240, 240, 245, 0.98)
  );
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }
`;

const SectionHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem 0;
`;

const InfoRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0;
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  color: #333;
`;

const Label = styled.strong`
  font-size: 0.9rem;
  color: #2575fc;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

const Value = styled.span`
  font-size: 1rem;
  color: #444;
  word-break: break-word;
  line-height: 1.5;
`;

const HistoryContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding-right: 1rem;
  margin-top: 1rem;
  
  @media (max-width: 576px) {
    padding-right: 0.5rem;
    max-height: 350px;
  }
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    border-radius: 4px;
  }
`;

const HistoryItem = styled.div`
  position: relative;
  padding: 0 0 2rem 3rem;
  border-left: 3px solid #e0e7ff;
  margin-bottom: 1.5rem;
  
  @media (max-width: 576px) {
    padding: 0 0 1.5rem 2.5rem;
    margin-bottom: 1rem;
  }
  
  &:last-child {
    border-left-color: transparent;
  }
  &:before {
    content: "";
    position: absolute;
    left: -8px;
    top: 1.2rem;
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(37, 117, 252, 0.6);
    z-index: 2;
    
    @media (max-width: 576px) {
      width: 14px;
      height: 14px;
      left: -7px;
      top: 1rem;
    }
  }
`;

const HistoryContent = styled.div`
  background: #fff;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f4f8;
  transition: all 0.3s ease;
  
  @media (max-width: 576px) {
    padding: 1rem;
    border-radius: 8px;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    border-color: #e0e7ff;
  }
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #f8fafc;
  flex-wrap: wrap;
  gap: 0.5rem;
  
  @media (max-width: 576px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
`;

const HistoryNumber = styled.div`
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  min-width: 40px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(37, 117, 252, 0.3);
  flex-shrink: 0;
`;

const HistoryTimestamp = styled.div`
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  word-break: keep-all;
  white-space: nowrap;
  
  @media (max-width: 576px) {
    font-size: 0.85rem;
    align-self: flex-start;
  }
  
  &:before {
    content: "📅";
    font-size: 0.8rem;
  }
`;

const HistoryStatusChip = styled(Chip)`
  font-weight: 600;
  font-size: 0.8rem;
  height: 28px;
  margin-bottom: 0.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const HistorySection = styled.div`
  margin-bottom: 1rem;
  &:last-child {
    margin-bottom: 0;
  }
`;

const HistorySectionTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #2575fc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HistoryValue = styled.div`
  font-size: 0.95rem;
  color: #374151;
  line-height: 1.5;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #e0e7ff;
`;

const PersonMeetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const PersonMeetItem = styled.div`
  background: #f1f5f9;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
  font-size: 0.9rem;
  color: #1e293b;
`;

const HistoryLocation = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-radius: 8px;
  border: 1px solid #bfdbfe;
  margin-top: 0.5rem;
`;

const MapLink = styled.a`
  text-decoration: none;
  color: #2563eb;
  font-weight: 500;
  font-size: 0.9rem;
  transition: color 0.2s ease;
  &:hover {
    color: #1d4ed8;
    text-decoration: underline;
  }
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const TagChip = styled(Chip)`
  background: linear-gradient(135deg, #e0f7fa, #b2ebf2);
  color: #006064;
  font-weight: 500;
  border-radius: 16px;
  font-size: 0.8rem;
  height: 24px;
`;

const AttachmentButton = styled(Button)`
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  &:hover {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
  &:before {
    content: "📎";
    font-size: 0.9rem;
  }
`;

const GradientButton = styled(Button)`
  background: ${(props) =>
    props.disabled ? "#cccccc" : "linear-gradient(135deg, #2575fc, #6a11cb)"};
  border: none;
  border-radius: 30px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-2px);
    background: ${(props) =>
      props.disabled ? "#cccccc" : "linear-gradient(135deg, #6a11cb, #2575fc)"};
  }
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 117, 252, 0.3);
  }
`;

const GradientDropdownToggle = styled(Dropdown.Toggle)`
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover {
    background: linear-gradient(135deg, #6a11cb, #2575fc);
  }
  &:focus {
    box-shadow: 0 0 0 3px rgba(37, 117, 252, 0.3);
  }
`;

const GradientDropdownMenu = styled(Dropdown.Menu)`
  background: #fff;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.5rem 0;
`;

const GradientDropdownItem = styled(Dropdown.Item)`
  font-size: 0.9rem;
  color: #333;
  padding: 0.5rem 1.5rem;
  transition: all 0.2s ease;
  &:hover {
    background: linear-gradient(
      135deg,
      rgba(37, 117, 252, 0.1),
      rgba(106, 17, 203, 0.1)
    );
    color: #2575fc;
  }
`;

function ViewEntry({ isOpen, onClose, entry, role }) {
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState({
    personal: true,
    location: true,
    business: true,
    followup: true,
    history: false,
  });

  // Utility to format dates safely
  const formatDate = (date) => {
    if (!date || isNaN(new Date(date).getTime())) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Sort history once
  const sortedHistory = useMemo(() => {
    return Array.isArray(entry?.history)
      ? [...entry.history].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        )
      : [];
  }, [entry?.history]);

  useEffect(() => {
    setOpenSections({
      personal: true,
      location: true,
      business: true,
      followup: true,
      history: false,
    });
    setCopied(false);
  }, [entry]);

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };


  // Enhanced function to format assignedTo for display
  const formatAssignedTo = useCallback(
    (assignedTo) => {
      if (!Array.isArray(assignedTo) || assignedTo.length === 0) {
        return "Not Assigned";
      }
      const usernames = assignedTo
        .map((user) => {
          if (typeof user === "object" && user?.username) {
            return user.username;
          } else if (typeof user === "string") {
            const foundUser = entry?.assignedTo?.find(
              (u) => u._id.toString() === user
            );
            return foundUser?.username || null;
          }
          return null;
        })
        .filter(Boolean);
      return usernames.length > 0 ? usernames.join(", ") : "Not Assigned";
    },
    [entry?.assignedTo]
  );

  const handleCopy = useCallback(() => {
    if (role !== "admin" && role !== "superadmin") {
      toast.error("Only admins and superadmins can copy data.");
      return;
    }

    if (!entry) return;

    const productsText = Array.isArray(entry.products)
      ? entry.products
          .map(
            (product, index) =>
              `Product ${index + 1}: ${product.name}, Specification: ${
                product.specification
              }, Size: ${product.size}, Quantity: ${product.quantity}`
          )
          .join("\n")
      : "N/A";

    const assignedToText = formatAssignedTo(entry.assignedTo);

    const textToCopy = `
      Date: ${formatDate(entry.createdAt)}
      Customer Name: ${entry.customerName || "N/A"}
       Customer Email: ${entry.customerEmail || "N/A"}
      Mobile Number: ${entry.mobileNumber || "N/A"}
      Contact Person Name: ${entry.contactperson || "N/A"}
      First Meeting Date: ${formatDate(entry.firstdate)}
      Products: ${productsText}
      Customer Type: ${entry.type || "N/A"}
      Address: ${entry.address || "N/A"}
      City: ${entry.city || "N/A"}
      State: ${entry.state || "N/A"}
      Organization: ${entry.organization || "N/A"}
      Category: ${entry.category || "N/A"}
      Status: ${entry.status || "Not Interested"}
      Expected Closure Date: ${formatDate(entry.expectedClosingDate)}
      Follow Up Date: ${formatDate(entry.followUpDate)}
      Remarks: ${entry.remarks || "N/A"}
      Priority: ${entry.priority || "N/A"}
      Next Action: ${entry.nextAction || "N/A"}
      Estimated Value: ${
        entry.estimatedValue
          ? `₹${new Intl.NumberFormat("en-IN").format(entry.estimatedValue)}`
          : "N/A"
      }
      Closing Amount: ${
        entry.closeamount
          ? `₹${new Intl.NumberFormat("en-IN").format(entry.closeamount)}`
          : "N/A"
      }
      Updated At: ${formatDate(entry.updatedAt)}
      Created By: ${entry.createdBy?.username || "N/A"}
      Assigned To: ${assignedToText}
    `.trim();

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopied(true);
        toast.success("Details copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        toast.error("Failed to copy details!");
        console.error("Copy error:", err);
      });
  }, [entry, role, formatAssignedTo]);

  const handleExportEntry = useCallback(() => {
    try {
      if (!entry) {
        toast.error("No entry data to export.");
        return;
      }

      const assignedToText = formatAssignedTo(entry.assignedTo);

      const exportData = [
        {
          Section: "Client Entry",
          Customer: entry.customerName || "",
           CustomerEmail: entry.customerEmail || "",
          
          "Mobile Number": entry.mobileNumber || "",
          "Contact Person": entry.contactperson || "",
          Address: entry.address || "",
          City: entry.city || "",
          State: entry.state || "",
          Organization: entry.organization || "",
          Category: entry.category || "",
          Type: entry.type || "",
          Products: Array.isArray(entry.products)
            ? entry.products
                .map(
                  (p) =>
                    `${p.name} (Spec: ${p.specification}, Size: ${p.size}, Qty: ${p.quantity})`
                )
                .join("; ")
            : "",
          "Estimated Value": entry.estimatedValue
            ? `₹${new Intl.NumberFormat("en-IN").format(entry.estimatedValue)}`
            : "",
          "Closing Amount": entry.closeamount
            ? `₹${new Intl.NumberFormat("en-IN").format(entry.closeamount)}`
            : "",
          Status: entry.status || "Not Interested",
          "Close Type": entry.closetype || "",
          "First Meeting": formatDate(entry.firstdate),
          "Follow Up": formatDate(entry.followUpDate),
          "Expected Closing Date": formatDate(entry.expectedClosingDate),
          Priority: entry.priority || "",
          "Next Action": entry.nextAction || "",
          Remarks: entry.remarks || "",
          Created: formatDate(entry.createdAt),
          Updated: formatDate(entry.updatedAt),
          "Created By": entry.createdBy?.username || "Unknown",
          "Assigned To": assignedToText,
          Attachment: entry.attachmentpath ? "Yes" : "No",
        },
      ];

      const historyData = sortedHistory.map((log, index) => ({
        Section: `History #${sortedHistory.length - index}`,
        Status: log.status || "N/A",
        Remarks: log.remarks || "N/A",
        Timestamp: formatDate(log.timestamp),
        Location: log.liveLocation || "N/A",
        Products: Array.isArray(log.products)
          ? log.products
              .map(
                (p) =>
                  `${p.name} (Spec: ${p.specification}, Size: ${p.size}, Qty: ${p.quantity})`
              )
              .join("; ")
          : "N/A",
        "Assigned To": formatAssignedTo(log.assignedTo),
        "First Person Meet": log.firstPersonMeet || "N/A",
        "Second Person Meet": log.secondPersonMeet || "N/A",
        "Third Person Meet": log.thirdPersonMeet || "N/A",
        "Fourth Person Meet": log.fourthPersonMeet || "N/A",
        Attachment: log.attachmentpath ? "Yes" : "No",
      }));

      const worksheet = XLSX.utils.json_to_sheet([
        ...exportData,
        ...historyData,
      ]);
      const colWidths = Object.keys(exportData[0]).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...[...exportData, ...historyData].map(
            (row) => String(row[key] || "").length
          )
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Client Entry");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `client_entry_${
        entry.customerName || "entry"
      }_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Entry exported successfully!");
    } catch (error) {
      console.error("Error exporting entry:", error);
      toast.error("Failed to export entry!");
    }
  }, [entry, formatAssignedTo, sortedHistory]);

  const getGoogleMapsUrl = (location) => {
    if (!location) return "#";
    const coordMatch = location.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
    if (coordMatch) {
      const [lat, lng] = coordMatch.slice(1);
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
  };

  // New function to handle attachment download
  const handleDownloadAttachment = useCallback(
    async (attachmentPath) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const filename = attachmentPath.split("/").pop();
        if (!filename) {
          throw new Error("Invalid attachment path");
        }

        const response = await fetch(
          `${process.env.REACT_APP_URL}/api/download/${encodeURIComponent(
            filename
          )}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/octet-stream",
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorText}`
          );
        }

        const blob = await response.blob();
        const ext = filename.includes(".")
          ? "." + filename.split(".").pop()
          : "";
        let downloadFilename = `${
          entry.customerName
            ? entry.customerName.replace(/[^a-zA-Z0-9]/g, "_")
            : "entry"
        }_attachment${ext}`;

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("Attachment downloaded successfully!");
      } catch (error) {
        console.error("Error downloading attachment:", error);
        toast.error(`Failed to download attachment: ${error.message}`);
      }
    },
    [entry]
  );
  if (!entry) return null;

  return (
    <>
      <DisableCopy role={role} />
      <Modal
        show={isOpen}
        onHide={onClose}
        backdrop="static"
        keyboard={false}
        size="lg"
        aria-labelledby="view-entry-modal-title"
        dialogClassName="compact-modal"
        centered
      >
        <GradientModalHeader closeButton>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Modal.Title
              id="view-entry-modal-title"
              style={{
                fontWeight: "700",
                fontSize: "1.6rem",
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                textShadow: "1px 1px 3px rgba(0, 0, 0, 0.2)",
                display: "flex",
                alignItems: "center",
              }}
            >
              Client Profile
            </Modal.Title>
            <Box sx={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Box
                component="div"
                sx={{
                  borderRadius: "8px",
                  px: 2,
                  py: 0.8,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    color: "#fff",
                    textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  Visits: {sortedHistory.length}
                </Typography>
              </Box>
              <Dropdown>
                <GradientDropdownToggle
                  id="dropdown-actions"
                  aria-label="More Actions"
                >
                  <FaEllipsisV />
                </GradientDropdownToggle>
                <GradientDropdownMenu>
                  {(role === "admin" || role === "superadmin") && (
                    <GradientDropdownItem
                      onClick={handleCopy}
                      aria-label={copied ? "Copied" : "Copy Details"}
                    >
                      {copied ? "✅ Copied!" : "📑 Copy Details"}
                    </GradientDropdownItem>
                  )}
                  <GradientDropdownItem
                    onClick={handleExportEntry}
                    aria-label="Export Entry"
                  >
                    📤 Export Entry
                  </GradientDropdownItem>
                  <GradientDropdownItem
                    onClick={onClose}
                    aria-label="Close Modal"
                  >
                    🔙 Close
                  </GradientDropdownItem>
                </GradientDropdownMenu>
              </Dropdown>
            </Box>
          </Box>
        </GradientModalHeader>

        <Modal.Body
          style={{
            padding: "2rem",
            background: "#f9fafb",
            borderRadius: "0 0 12px 12px",
            minHeight: "500px",
            boxShadow: "inset 0 -4px 12px rgba(0, 0, 0, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <GradientSection>
            <SectionHeader
              onClick={() => toggleSection("personal")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("personal")}
              aria-expanded={openSections.personal}
              aria-controls="personal-section"
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Personal Info
              </Typography>
              {openSections.personal ? <FaAngleUp /> : <FaAngleDown />}
            </SectionHeader>
            <Collapse in={openSections.personal} id="personal-section">
              <InfoRow>
                <InfoItem>
                  <Label>Customer Name</Label>
                  <Value>{entry.customerName || "N/A"}</Value>
                </InfoItem>
                 <InfoItem>
                  <Label>Customer Email</Label>
                  <Value>{entry.customerEmail || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Mobile</Label>
                  <Value>{entry.mobileNumber || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Contact Person</Label>
                  <Value>{entry.contactperson || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Status</Label>
                  <Value>{entry.status || "Not Interested"}</Value>
                </InfoItem>
              </InfoRow>
            </Collapse>
          </GradientSection>

          <GradientSection>
            <SectionHeader
              onClick={() => toggleSection("location")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("location")}
              aria-expanded={openSections.location}
              aria-controls="location-section"
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Location
              </Typography>
              {openSections.location ? <FaAngleUp /> : <FaAngleDown />}
            </SectionHeader>
            <Collapse in={openSections.location} id="location-section">
              <InfoRow>
                <InfoItem>
                  <Label>Address</Label>
                  <Value>{entry.address || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>City</Label>
                  <Value>{entry.city || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>State</Label>
                  <Value>{entry.state || "N/A"}</Value>
                </InfoItem>
              </InfoRow>
            </Collapse>
          </GradientSection>

          <GradientSection>
            <SectionHeader
              onClick={() => toggleSection("business")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("business")}
              aria-expanded={openSections.business}
              aria-controls="business-section"
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Business Info
              </Typography>
              {openSections.business ? <FaAngleUp /> : <FaAngleDown />}
            </SectionHeader>
            <Collapse in={openSections.business} id="business-section">
              <InfoRow>
                <InfoItem>
                  <Label>Organization</Label>
                  <Value>{entry.organization || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Category</Label>
                  <Value>{entry.category || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Products</Label>
                  <Value>
                    {Array.isArray(entry.products) && entry.products.length > 0
                      ? entry.products.map((product, index) => (
                          <div key={index}>
                            {product.name || "N/A"} (Spec:{" "}
                            {product.specification || "N/A"}, Size:{" "}
                            {product.size || "N/A"}, Qty:{" "}
                            {product.quantity || "N/A"})
                          </div>
                        ))
                      : "N/A"}
                  </Value>
                </InfoItem>
                <InfoItem>
                  <Label>Type</Label>
                  <Value>{entry.type || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Estimated Value (₹)</Label>
                  <Value>
                    {entry.estimatedValue
                      ? `₹${new Intl.NumberFormat("en-IN").format(
                          entry.estimatedValue
                        )}`
                      : "N/A"}
                  </Value>
                </InfoItem>
                <InfoItem>
                  <Label>Closing Amount (₹)</Label>
                  <Value>
                    {entry.closeamount
                      ? `₹${new Intl.NumberFormat("en-IN").format(
                          entry.closeamount
                        )}`
                      : "N/A"}
                  </Value>
                </InfoItem>
              </InfoRow>
            </Collapse>
          </GradientSection>

          <GradientSection>
            <SectionHeader
              onClick={() => toggleSection("followup")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("followup")}
              aria-expanded={openSections.followup}
              aria-controls="followup-section"
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Follow-up Actions
              </Typography>
              {openSections.followup ? <FaAngleUp /> : <FaAngleDown />}
            </SectionHeader>
            <Collapse in={openSections.followup} id="followup-section">
              <InfoRow>
                <InfoItem>
                  <Label>Status</Label>
                  <Value>{entry.status || "Not Interested"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Close Type</Label>
                  <Value>{entry.closetype || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>First Meeting</Label>
                  <Value>{formatDate(entry.firstdate)}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Follow Up</Label>
                  <Value>{formatDate(entry.followUpDate)}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Expected Closure</Label>
                  <Value>{formatDate(entry.expectedClosingDate)}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Priority</Label>
                  <Value>{entry.priority || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Next Action</Label>
                  <Value>{entry.nextAction || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Remarks</Label>
                  <Value>{entry.remarks || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Created</Label>
                  <Value>{formatDate(entry.createdAt)}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Updated</Label>
                  <Value>{formatDate(entry.updatedAt)}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Created By</Label>
                  <Value>{entry.createdBy?.username || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Tagged With</Label>
                  <TagContainer>
                    {Array.isArray(entry.assignedTo) &&
                    entry.assignedTo.length > 0 ? (
                      entry.assignedTo.map((user, index) => (
                        <TagChip
                          key={index}
                          label={
                            typeof user === "object"
                              ? user.username || "Unknown"
                              : "Unknown"
                          }
                          size="small"
                        />
                      ))
                    ) : (
                      <Value>Not Assigned</Value>
                    )}
                  </TagContainer>
                </InfoItem>
              </InfoRow>
            </Collapse>
          </GradientSection>

          <GradientSection>
            <SectionHeader
              onClick={() => toggleSection("history")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("history")}
              aria-expanded={openSections.history}
              aria-controls="history-section"
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                History Log
              </Typography>
              {openSections.history ? <FaAngleUp /> : <FaAngleDown />}
            </SectionHeader>
            <Collapse in={openSections.history} id="history-section">
              <HistoryContainer>
                {sortedHistory.length > 0 ? (
                  sortedHistory.map((log, index, array) => (
                    <HistoryItem key={`${log.timestamp}-${index}`}>
                      <HistoryContent>
                        <HistoryHeader>
                          <HistoryNumber>#{array.length - index}</HistoryNumber>
                          <HistoryTimestamp>
                            {formatDate(log.timestamp)}
                          </HistoryTimestamp>
                        </HistoryHeader>

                        <HistoryStatusChip
                          label={log.status || "N/A"}
                          color={
                            log.status === "Interested"
                              ? "success"
                              : log.status === "Not Interested"
                              ? "error"
                              : log.status === "Closed"
                              ? "info"
                              : "warning"
                          }
                          size="small"
                        />

                        {log.remarks && (
                          <HistorySection>
                            <HistorySectionTitle>
                              💬 Remarks
                            </HistorySectionTitle>
                            <HistoryValue>{log.remarks}</HistoryValue>
                          </HistorySection>
                        )}

                        {log.liveLocation && (
                          <HistorySection>
                            <HistoryLocation>
                              <FaMapMarkerAlt style={{ color: '#2563eb' }} />
                              <MapLink
                                href={getGoogleMapsUrl(log.liveLocation)}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="View Location on Google Maps"
                              >
                                View Location
                              </MapLink>
                            </HistoryLocation>
                          </HistorySection>
                        )}

                        {Array.isArray(log.assignedTo) && log.assignedTo.length > 0 && (
                          <HistorySection>
                            <HistorySectionTitle>
                              🏷️ Tagged With
                            </HistorySectionTitle>
                            <TagContainer>
                              {log.assignedTo.map((user, userIndex) => {
                                const username = formatAssignedTo([user]);
                                return username !== "Not Assigned" ? (
                                  <TagChip
                                    key={userIndex}
                                    label={username}
                                    size="small"
                                  />
                                ) : null;
                              })}
                              {log.assignedTo.every(user => formatAssignedTo([user]) === "Not Assigned") && (
                                <HistoryValue style={{ background: '#fef3c7', borderLeftColor: '#f59e0b' }}>
                                  Not Assigned
                                </HistoryValue>
                              )}
                            </TagContainer>
                          </HistorySection>
                        )}

                        {(log.firstPersonMeet || log.secondPersonMeet || log.thirdPersonMeet || log.fourthPersonMeet) && (
                          <HistorySection>
                            <HistorySectionTitle>
                              👥 Third Person Meet
                            </HistorySectionTitle>
                            <PersonMeetGrid>
                              {log.firstPersonMeet && (
                                <PersonMeetItem>
                                  <strong>1st:</strong> {log.firstPersonMeet}
                                </PersonMeetItem>
                              )}
                              {log.secondPersonMeet && (
                                <PersonMeetItem>
                                  <strong>2nd:</strong> {log.secondPersonMeet}
                                </PersonMeetItem>
                              )}
                              {log.thirdPersonMeet && (
                                <PersonMeetItem>
                                  <strong>3rd:</strong> {log.thirdPersonMeet}
                                </PersonMeetItem>
                              )}
                              {log.fourthPersonMeet && (
                                <PersonMeetItem>
                                  <strong>4th:</strong> {log.fourthPersonMeet}
                                </PersonMeetItem>
                              )}
                            </PersonMeetGrid>
                          </HistorySection>
                        )}

                        {Array.isArray(log.products) && log.products.length > 0 && (
                          <HistorySection>
                            <HistorySectionTitle>
                              📦 Products
                            </HistorySectionTitle>
                            <HistoryValue>
                              {log.products.map((product, idx) => (
                                <div key={idx} style={{ marginBottom: '0.5rem' }}>
                                  <strong>{product.name || "N/A"}</strong>
                                  <br />
                                  <small style={{ color: '#6b7280' }}>
                                    Spec: {product.specification || "N/A"} | 
                                    Size: {product.size || "N/A"} | 
                                    Qty: {product.quantity || "N/A"}
                                  </small>
                                </div>
                              ))}
                            </HistoryValue>
                          </HistorySection>
                        )}

                        {log.attachmentpath && (
                          <HistorySection>
                            <HistorySectionTitle>
                              📎 Attachment
                            </HistorySectionTitle>
                            <AttachmentButton
                              onClick={() => handleDownloadAttachment(log.attachmentpath)}
                              aria-label="Download Attachment"
                            >
                              Download File
                            </AttachmentButton>
                          </HistorySection>
                        )}
                      </HistoryContent>
                    </HistoryItem>
                  ))
                ) : (
                  <Typography
                    variant="subtitle2"
                    sx={{ 
                      color: "#64748b", 
                      fontStyle: "italic", 
                      padding: "2rem",
                      textAlign: "center",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "2px dashed #cbd5e1"
                    }}
                  >
                    📝 No history available yet. Updates will appear here as they happen.
                  </Typography>
                )}
              </HistoryContainer>
            </Collapse>
          </GradientSection>
        </Modal.Body>
        <Modal.Footer>
          <GradientButton
            variant="secondary"
            onClick={onClose}
            aria-label="Close Modal"
          >
            Close
          </GradientButton>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ViewEntry;
