import { getAccessToken } from "./auth";

const NOTIFICATIONS_URL =
  "http://4.224.186.213/evaluation-service/notifications";

const TYPE_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function parseTimestamp(timestamp) {
  const parsed = Date.parse(timestamp.replace(" ", "T") + "Z");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildNotification(notification, index) {
  const timestampMs = parseTimestamp(notification.Timestamp);
  const typeWeight = TYPE_WEIGHTS[notification.Type] ?? 0;

  return {
    id: notification.ID,
    type: notification.Type,
    message: notification.Message,
    timestamp: notification.Timestamp,
    timestampMs,
    typeWeight,
    isNew: index < 4,
  };
}

function sortByPriority(left, right) {
  if (right.typeWeight !== left.typeWeight) {
    return right.typeWeight - left.typeWeight;
  }

  return right.timestampMs - left.timestampMs;
}

export async function fetchNotifications({
  page = 1,
  limit = 10,
  notificationType = null,
}) {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (notificationType) {
    params.set("notification_type", notificationType);
  }

  const response = await fetch(`${NOTIFICATIONS_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Notifications fetch failed with status ${response.status}`);
  }

  const payload = await response.json();
  const notifications = (payload.notifications ?? []).map(buildNotification);
  const priorityNotifications = [...notifications]
    .sort(sortByPriority)
    .slice(0, limit);

  return {
    page,
    limit,
    notificationType: notificationType ?? "All",
    total: notifications.length,
    notifications,
    priorityNotifications,
  };
}
