import React, { useState, useCallback, useEffect } from "react";
import { Modal, Button, Badge } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast } from "react-toastify";
import { FaHistory, FaMapMarkerAlt } from "react-icons/fa";
import styled from "styled-components";
import DisableCopy from "./DisableCopy"; // Adjust the path based on your project structure

const Section = styled.div`
  background: #fafafa;
  border-radius: 10px;
  padding: 1.2rem;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const InfoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
`;

const InfoItem = styled.span`
  font-size: 1rem;
  color: #555;
  min-width: 200px;
`;

const HistoryContainer = styled.div`
  margin-top: 1rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 10px;
`;

const HistoryItem = styled.div`
  position: relative;
  padding: 1rem 0 1rem 2rem;
  border-left: 2px solid #2575fc;
  &:before {
    content: "";
    position: absolute;
    left: -6px;
    top: 1.5rem;
    width: 12px;
    height: 12px;
    background: #2575fc;
    border-radius: 50%;
    box-shadow: 0 0 5px rgba(37, 117, 252, 0.5);
  }
`;

const HistoryContent = styled.div`
  background: #fff;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
  &:hover {
    transform: translateX(5px);
  }
`;

const HistoryTimestamp = styled.div`
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 0.5rem;
`;

const HistoryRemarks = styled.div`
  font-size: 1rem;
  color: #333;
  margin-bottom: 0.5rem;
`;

const HistoryLocation = styled.div`
  font-size: 0.95rem;
  color: #2575fc;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MapLink = styled.a`
  text-decoration: none;
  color: #2575fc;
  font-weight: 500;
  transition: color 0.2s ease;
  &:hover {
    color: #6a11cb;
    text-decoration: underline;
  }
`;

function ViewEntry({ isOpen, onClose, entry, role }) {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setShowHistory(false);
  }, [entry]);

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
      : entry.products || "N/A";

    const textToCopy = `
      Date: ${
        entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : "N/A"
      }
      Customer Name: ${entry.customerName || "N/A"}
      Mobile Number: ${entry.mobileNumber || "N/A"}
      Contact Person Name: ${entry.contactperson || "N/A"}
      First Meeting Date: ${
        entry.firstdate ? new Date(entry.firstdate).toLocaleDateString() : "N/A"
      }
      Products: ${productsText}
      Customer Type: ${entry.type || "N/A"}
      Address: ${entry.address || "N/A"}
      City: ${entry.city || "N/A"}
      State: ${entry.state || "N/A"}
      Organization: ${entry.organization || "N/A"}
      Category: ${entry.category || "N/A"}
      Status: ${entry.status || "Not Interested"}
      Expected Closing Date: ${
        entry.expectedClosingDate
          ? new Date(entry.expectedClosingDate).toLocaleDateString()
          : "N/A"
      }
      Follow Up Date: ${
        entry.followUpDate
          ? new Date(entry.followUpDate).toLocaleDateString()
          : "N/A"
      }
      Remarks: ${entry.remarks || "N/A"}
      Priority: ${entry.priority || "N/A"}
      Next Action: ${entry.nextAction || "N/A"}
      Estimated Value: ${
        entry.estimatedValue
          ? `$${entry.estimatedValue.toLocaleString()}`
          : "N/A"
      }
      Updated At: ${
        entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : "N/A"
      }
      Created By: ${entry.createdBy?.username || "N/A"}
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
  }, [entry, role]);

  const getGoogleMapsUrl = (location) => {
    if (!location) return "#";
    const coordMatch = location.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
    if (coordMatch) {
      const [lat, lng] = coordMatch.slice(1);
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
  };

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
      >
        <Modal.Header
          closeButton
          style={{
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            color: "#fff",
            padding: "1.5rem 2rem",
            borderBottom: "none",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Modal.Title
            id="view-entry-modal-title"
            style={{
              fontWeight: "700",
              fontSize: "1.8rem",
              letterSpacing: "1px",
              textTransform: "uppercase",
              textShadow: "1px 1px 3px rgba(0, 0, 0, 0.2)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ marginRight: "10px", fontSize: "1.5rem" }}>📋</span>{" "}
            Client Profile
          </Modal.Title>
        </Modal.Header>

        <Modal.Body
          style={{
            padding: "2rem",
            background: "#ffffff",
            borderRadius: "0 0 15px 15px",
            minHeight: "550px",
            boxShadow: "inset 0 -4px 15px rgba(0, 0, 0, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <Section>
            <h3
              style={{
                fontSize: "1.3rem",
                fontWeight: "600",
                color: "#333",
                marginBottom: "0.5rem",
              }}
            >
              Personal Info
            </h3>
            <InfoRow>
              <InfoItem>
                <strong>Customer Name:</strong> {entry.customerName || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>Mobile:</strong> {entry.mobileNumber || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>Contact Person:</strong> {entry.contactperson || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>Status:</strong> {entry.status || "N/A"}
              </InfoItem>
            </InfoRow>
          </Section>

          <Section>
            <h3
              style={{
                fontSize: "1.3rem",
                fontWeight: "600",
                color: "#333",
                marginBottom: "0.5rem",
              }}
            >
              Location
            </h3>
            <InfoRow>
              <InfoItem>
                <strong>Address:</strong> {entry.address || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>City:</strong> {entry.city || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>State:</strong> {entry.state || "N/A"}
              </InfoItem>
            </InfoRow>
          </Section>

          <Section>
            <h3
              style={{
                fontSize: "1.3rem",
                fontWeight: "600",
                color: "#333",
                marginBottom: "0.5rem",
              }}
            >
              Business Info
            </h3>
            <InfoRow>
              <InfoItem>
                <strong>Organization:</strong> {entry.organization || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>Category:</strong> {entry.category || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>Products:</strong>{" "}
                {Array.isArray(entry.products)
                  ? entry.products.map((product, index) => (
                      <div key={index}>
                        {product.name} (Spec: {product.specification}, Size:{" "}
                        {product.size}, Qty: {product.quantity})
                      </div>
                    ))
                  : entry.products || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>Type:</strong> {entry.type || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>Estimated Value (₹):</strong>{" "}
                {entry.estimatedValue
                  ? `₹${new Intl.NumberFormat("en-IN").format(
                      entry.estimatedValue
                    )}`
                  : "N/A"}
              </InfoItem>
            </InfoRow>
          </Section>

          <Section>
            <h3
              style={{
                fontSize: "1.3rem",
                fontWeight: "600",
                color: "#333",
                marginBottom: "0.5rem",
              }}
            >
              Follow-up
            </h3>
            <InfoRow>
              <InfoItem>
                <strong>Status:</strong> {entry.status || "Not Interested"}
              </InfoItem>
              <InfoItem>
                <strong>Close Type:</strong> {entry.closetype || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>First Meeting:</strong>{" "}
                {entry.firstdate
                  ? new Date(entry.firstdate).toLocaleDateString("en-GB")
                  : "N/A"}
              </InfoItem>

              <InfoItem>
                <strong>Follow Up:</strong>{" "}
                {entry.followUpDate
                  ? new Date(entry.followUpDate).toLocaleDateString("en-GB")
                  : "N/A"}
              </InfoItem>

              <InfoItem>
                <strong>Expected Close:</strong>{" "}
                {entry.expectedClosingDate
                  ? new Date(entry.expectedClosingDate).toLocaleDateString(
                      "en-GB"
                    )
                  : "N/A"}
              </InfoItem>
            </InfoRow>
            <InfoRow>
              <InfoItem>
                <strong>Priority:</strong> {entry.priority || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>Next Action:</strong> {entry.nextAction || "N/A"}
              </InfoItem>
            </InfoRow>
            <InfoRow>
              <InfoItem>
                <strong>Remarks:</strong> {entry.remarks || "N/A"}
              </InfoItem>
              <InfoItem>
                <strong>Created:</strong>{" "}
                {entry.createdAt
                  ? new Date(entry.createdAt).toLocaleDateString("en-GB")
                  : "N/A"}
              </InfoItem>

              <InfoItem>
                <strong>Updated:</strong>{" "}
                {entry.updatedAt
                  ? new Date(entry.updatedAt).toLocaleDateString("en-GB")
                  : "N/A"}
              </InfoItem>

              <InfoItem>
                <strong>Created By:</strong>{" "}
                {entry.createdBy?.username || "N/A"}
              </InfoItem>
            </InfoRow>
          </Section>

          <Section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  fontSize: "1.3rem",
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "0.5rem",
                }}
              >
                History Log
              </h3>
              <Button
                variant="outline-primary"
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  borderRadius: "20px",
                  padding: "6px 12px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  transition: "all 0.3s ease",
                }}
              >
                <FaHistory className="me-2" /> {showHistory ? "Hide" : "Show"}{" "}
                History
              </Button>
            </div>
            {showHistory && (
              <HistoryContainer>
                {entry?.history && entry.history.length > 0 ? (
                  entry.history
                    .slice()
                    .sort(
                      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                    )
                    .map((log, index, array) => (
                      <HistoryItem key={`${log.timestamp}-${index}`}>
                        <HistoryContent>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "1.2rem",
                                fontWeight: "600",
                                color: "#2575fc",
                                marginRight: "1rem",
                              }}
                            >
                              #{array.length - index}
                            </span>
                            <HistoryTimestamp>
                              {new Date(log.timestamp).toLocaleString()}
                            </HistoryTimestamp>
                          </div>
                          <Badge
                            bg={
                              log.status === "Interested"
                                ? "success"
                                : log.status === "Not Interested"
                                ? "danger"
                                : "warning"
                            }
                            style={{ marginBottom: "0.5rem" }}
                          >
                            {log.status || "N/A"}
                          </Badge>
                          <HistoryRemarks>
                            {log.remarks || "No remarks"}
                          </HistoryRemarks>
                          {Array.isArray(log.products) &&
                            log.products.length > 0 && (
                              <div style={{ marginBottom: "0.5rem" }}>
                                <strong>Products:</strong>{" "}
                                {log.products.map((product, idx) => (
                                  <div key={idx}>
                                    {product.name} (Spec:{" "}
                                    {product.specification}, Size:{" "}
                                    {product.size}, Qty: {product.quantity})
                                  </div>
                                ))}
                              </div>
                            )}
                          {log.liveLocation && (
                            <HistoryLocation>
                              <FaMapMarkerAlt />
                              <MapLink
                                href={getGoogleMapsUrl(log.liveLocation)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View Location
                              </MapLink>
                            </HistoryLocation>
                          )}
                          {log.firstPersonMeet && (
                            <div>
                              <strong>First Person Meet:</strong>{" "}
                              {log.firstPersonMeet}
                            </div>
                          )}
                          {log.secondPersonMeet && (
                            <div>
                              <strong>Second Person Meet:</strong>{" "}
                              {log.secondPersonMeet}
                            </div>
                          )}
                          {log.thirdPersonMeet && (
                            <div>
                              <strong>Third Person Meet:</strong>{" "}
                              {log.thirdPersonMeet}
                            </div>
                          )}
                          {log.fourthPersonMeet && (
                            <div>
                              <strong>Fourth Person Meet:</strong>{" "}
                              {log.fourthPersonMeet}
                            </div>
                          )}
                        </HistoryContent>
                      </HistoryItem>
                    ))
                ) : (
                  <p>No history available.</p>
                )}
              </HistoryContainer>
            )}
          </Section>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <Button
              variant="primary"
              onClick={handleCopy}
              disabled={role !== "admin" && role !== "superadmin"}
              style={{
                background:
                  role === "admin" || role === "superadmin"
                    ? "linear-gradient(135deg, #2575fc, #6a11cb)"
                    : "#cccccc",
                color: "#fff",
                width: "100%",
                borderRadius: "40px",
                padding: "12px 0",
                fontSize: "1.1rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "1px",
                transition: "all 0.3s ease",
                boxShadow: "0 6px 15px rgba(0, 0, 0, 0.2)",
                border: "none",
              }}
              onMouseEnter={(e) =>
                (role === "admin" || role === "superadmin") &&
                (e.target.style.transform = "translateY(-3px)")
              }
              onMouseLeave={(e) =>
                (role === "admin" || role === "superadmin") &&
                (e.target.style.transform = "translateY(0)")
              }
            >
              {copied ? "✅ Copied!" : "📑 Copy Details"}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default ViewEntry;
