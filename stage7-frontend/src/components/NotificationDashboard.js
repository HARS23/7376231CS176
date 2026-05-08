"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

const TYPE_STYLES = {
  Placement: {
    borderColor: "text.primary",
    color: "text.primary",
  },
  Result: {
    borderColor: "text.secondary",
    color: "text.primary",
  },
  Event: {
    borderColor: "divider",
    color: "text.secondary",
  },
};

function NotificationCard({ notification, compact = false }) {
  return (
    <Paper
      sx={{
        p: compact ? 2 : 2.5,
        borderRadius: 3,
        backgroundColor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        justifyContent="space-between"
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              label={notification.type}
              size="small"
              variant="outlined"
              sx={TYPE_STYLES[notification.type] ?? undefined}
            />
            {notification.isNew ? (
              <Chip
                label="New"
                variant="outlined"
                size="small"
                sx={{ borderColor: "text.primary", color: "text.primary" }}
              />
            ) : null}
          </Stack>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {notification.message}
          </Typography>
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ minWidth: compact ? "auto" : 150 }}
        >
          {notification.timestamp}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default function NotificationDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/notifications?limit=10", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load notifications.");
        }

        const payload = await response.json();

        if (active) {
          setData(payload);
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError.message || "Unable to load notifications.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 4, md: 6 },
        backgroundColor: "background.default",
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Stack spacing={1} sx={{ pb: 1 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: "2.4rem", md: "3rem" } }}>
              Priority Inbox
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Notifications ranked by urgency and recency for quick triage.
            </Typography>
          </Stack>

          {loading ? (
            <Paper sx={{ p: 4, borderRadius: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <CircularProgress size={24} color="inherit" />
                <Typography>Loading notifications...</Typography>
              </Stack>
            </Paper>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}

          {!loading && !error && data ? (
            <Stack spacing={3}>
              <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="h2">Priority Queue</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Top {data.priorityNotifications?.length ?? 0} items after
                      priority sorting.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      label={`Page ${data.page}`}
                      variant="outlined"
                      sx={{ borderColor: "text.primary", color: "text.primary" }}
                    />
                    <Chip
                      label={`${data.total} total`}
                      variant="outlined"
                      sx={{ borderColor: "divider" }}
                    />
                    <Chip
                      label={`Filter: ${data.notificationType}`}
                      variant="outlined"
                      sx={{ borderColor: "divider" }}
                    />
                  </Stack>
                </Stack>

                <Divider sx={{ my: 2.5 }} />

                <Stack spacing={2}>
                  {(data.priorityNotifications ?? []).map((notification) => (
                    <NotificationCard
                      key={`priority-${notification.id}`}
                      notification={notification}
                    />
                  ))}
                </Stack>
              </Paper>

              <Stack spacing={1.5} sx={{ pb: 2 }}>
                <Typography variant="h2">All Notifications</Typography>
                <Stack spacing={1.5}>
                  {(data.notifications ?? []).map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      compact
                    />
                  ))}
                </Stack>
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
