# Stage 1

This is the REST API design for a campus notification system for placements, events, results and general announcements. Users are assumed to already be authenticated.

## Main actions

- create notification
- list notifications for logged in user
- get one notification
- get unread count
- mark one as read
- mark all as read
- get/update notification preferences
- receive real-time notifications

## Base path

```text
/api/v1
```

## Common headers

```http
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json
```

## Notification object

```json
{
  "id": "notif_101",
  "category": "placements",
  "title": "New placement drive",
  "message": "Comp opened applications for 2026 batch.",
  "priority": "high",
  "status": "unread",
  "actionUrl": "/placements/comp-2026",
  "createdAt": "2026-05-08T10:30:00Z",
  "readAt": null
}
```

## Endpoints

### 1. Create notification

```http
POST /api/v1/notifications
```

Request:

```json
{
  "recipientIds": ["user_101"],
  "category": "placements",
  "title": "New placement drive",
  "message": "Comp opened applications for 2026 batch.",
  "priority": "high",
  "actionUrl": "/placements/comp-2026"
}
```

Response:

```json
{
  "success": true,
  "message": "Notification created",
  "data": {
    "notificationId": "notif_101"
  }
}
```

### 2. List notifications

```http
GET /api/v1/notifications?status=unread&category=placements&limit=20
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "notif_101",
        "category": "placements",
        "title": "New placement drive",
        "message": "Comp opened applications for 2026 batch.",
        "priority": "high",
        "status": "unread",
        "actionUrl": "/placements/comp-2026",
        "createdAt": "2026-05-08T10:30:00Z",
        "readAt": null
      }
    ]
  },
  "meta": {
    "limit": 20,
    "hasMore": true,
    "nextCursor": "cursor_102"
  }
}
```

### 3. Get one notification

```http
GET /api/v1/notifications/{notificationId}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "notif_101",
    "category": "placements",
    "title": "New placement drive",
    "message": "Comp opened applications for 2026 batch.",
    "priority": "high",
    "status": "unread",
    "actionUrl": "/placements/comp-2026",
    "createdAt": "2026-05-08T10:30:00Z",
    "readAt": null
  }
}
```

### 4. Get unread count

```http
GET /api/v1/notifications/unread-count
```

Response:

```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

### 5. Mark one notification as read

```http
PATCH /api/v1/notifications/{notificationId}/read
```

Request:

```json
{
  "readAt": "2026-05-08T10:45:00Z"
}
```

Response:

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### 6. Mark all as read

```http
PATCH /api/v1/notifications/read-all
```

Request:

```json
{
  "readAt": "2026-05-08T10:45:00Z"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "updatedCount": 12
  }
}
```

### 7. Get notification preferences

```http
GET /api/v1/preferences/notifications
```

Response:

```json
{
  "success": true,
  "data": {
    "channels": {
      "inApp": true,
      "email": true,
      "sms": false
    },
    "categories": {
      "placements": true,
      "events": true,
      "results": true,
      "announcements": true
    }
  }
}
```

### 8. Update notification preferences

```http
PUT /api/v1/preferences/notifications
```

Request:

```json
{
  "channels": {
    "inApp": true,
    "email": false,
    "sms": false
  },
  "categories": {
    "placements": true,
    "events": true,
    "results": true,
    "announcements": false
  }
}
```

Response:

```json
{
  "success": true,
  "message": "Preferences updated"
}
```

## Real-time notifications

For real-time updates I would use SSE because notifications are mostly server to client only.

```http
GET /api/v1/notifications/stream
```

Headers:

```http
Authorization: Bearer <token>
Accept: text/event-stream
Cache-Control: no-cache
```

Example event:

```text
event: notification.created
id: notif_101
data: {"id":"notif_101","category":"placements","title":"New placement drive","message":"Comp opened applications for 2026 batch.","status":"unread"}
```

## Status codes

- `200` for fetch/update
- `201` for create
- `400` bad request
- `401` unauthorized
- `404` not found
- `500` server error