import React from "react";
import { Box, Typography, IconButton, useTheme, useMediaQuery } from "@mui/material";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const TablePagination = ({
  page,
  limit,
  total,
  onPageChange,
  isLoading,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const totalPages = Math.ceil(total / limit) || 1;

  const handlePrevious = () => {
    if (page > 1 && !isLoading) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages && !isLoading) {
      onPageChange(page + 1);
    }
  };

  if (total === 0) return null;

  if (isMobile) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          padding: "12px",
          borderTop: "1px solid #e0e0e0",
          backgroundColor: "#fff",
          borderBottomLeftRadius: "15px",
          borderBottomRightRadius: "15px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: "300px",
          }}
        >
          <IconButton
            onClick={handlePrevious}
            disabled={page === 1 || isLoading}
            size="medium" // Larger touch target
            sx={{
              backgroundColor: page === 1 ? "#f5f5f5" : "#e3f2fd",
              color: page === 1 ? "#bdbdbd" : "#1976d2",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              "&:hover": {
                backgroundColor: page === 1 ? "#f5f5f5" : "#bbdefb",
              },
            }}
          >
            <FaChevronLeft size={16} />
          </IconButton>

          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              fontSize: "1rem",
              color: "#333",
            }}
          >
            {page} / {totalPages}
          </Typography>

          <IconButton
            onClick={handleNext}
            disabled={page === totalPages || isLoading}
            size="medium" // Larger touch target
            sx={{
              backgroundColor: page === totalPages ? "#f5f5f5" : "#e3f2fd",
              color: page === totalPages ? "#bdbdbd" : "#1976d2",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              "&:hover": {
                backgroundColor: page === totalPages ? "#f5f5f5" : "#bbdefb",
              },
            }}
          >
            <FaChevronRight size={16} />
          </IconButton>
        </Box>
        
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ fontSize: "0.85rem" }}
        >
          {Math.min((page - 1) * limit + 1, total)}-{Math.min(page * limit, total)} of {total} items
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        borderTop: "1px solid #e0e0e0",
        backgroundColor: "#fff",
        borderBottomLeftRadius: "15px",
        borderBottomRightRadius: "15px",
      }}
    >
      <Typography
        variant="body2"
        color="textSecondary"
        sx={{ fontSize: isMobile ? "0.8rem" : "0.9rem" }}
      >
        Showing {Math.min((page - 1) * limit + 1, total)} -{" "}
        {Math.min(page * limit, total)} of {total}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton
          onClick={handlePrevious}
          disabled={page === 1 || isLoading}
          size="small"
          sx={{
            backgroundColor: page === 1 ? "#f5f5f5" : "#e3f2fd",
            color: page === 1 ? "#bdbdbd" : "#1976d2",
            "&:hover": {
              backgroundColor: page === 1 ? "#f5f5f5" : "#bbdefb",
            },
          }}
        >
          <FaChevronLeft size={14} />
        </IconButton>

        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            minWidth: "60px",
            textAlign: "center",
            fontSize: isMobile ? "0.8rem" : "0.9rem",
          }}
        >
          Page {page} of {totalPages}
        </Typography>

        <IconButton
          onClick={handleNext}
          disabled={page === totalPages || isLoading}
          size="small"
          sx={{
            backgroundColor: page === totalPages ? "#f5f5f5" : "#e3f2fd",
            color: page === totalPages ? "#bdbdbd" : "#1976d2",
            "&:hover": {
              backgroundColor: page === totalPages ? "#f5f5f5" : "#bbdefb",
            },
          }}
        >
          <FaChevronRight size={14} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default TablePagination;
