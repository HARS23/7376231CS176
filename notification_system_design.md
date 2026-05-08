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

# Stage 2

For storage, I would use PostgreSQL because the data here is structured, relationships are simple, and querying unread/read notifications with filters is easier in SQL. It is also reliable for transactions and indexing.

## Main tables

### users

```sql
users(
  id varchar primary key,
  name varchar not null,
  email varchar unique not null,
  created_at timestamptz not null default now()
)
```

### notifications

```sql
notifications(
  id varchar primary key,
  category varchar not null,
  title varchar not null,
  message text not null,
  priority varchar not null,
  action_url varchar,
  created_at timestamptz not null default now(),
  expires_at timestamptz
)
```

### user_notifications

```sql
user_notifications(
  id bigserial primary key,
  user_id varchar not null references users(id),
  notification_id varchar not null references notifications(id),
  status varchar not null default 'unread',
  read_at timestamptz,
  unique(user_id, notification_id)
)
```

### notification_preferences

```sql
notification_preferences(
  user_id varchar primary key references users(id),
  in_app boolean not null default true,
  email boolean not null default true,
  sms boolean not null default false,
  placements boolean not null default true,
  events boolean not null default true,
  results boolean not null default true,
  announcements boolean not null default true,
  updated_at timestamptz not null default now()
)
```

## Why this schema

- `notifications` stores the common notification content once
- `user_notifications` maps notifications to users and tracks read/unread
- preferences are separated because they change independently
- this matches the Stage 1 APIs cleanly

## Useful indexes

```sql
create index idx_user_notifications_user_status_created
on user_notifications(user_id, status, id desc);

create index idx_notifications_category
on notifications(category);

create index idx_notifications_created_at
on notifications(created_at desc);
```

## Problems when data grows

- notification list can become very large
- unread count can become slower if indexes are missing
- marking all as read can update many rows
- real-time delivery can put more load during peak times like results or placements

## How to handle scaling

- use indexes on `user_id`, `status`, and `created_at`
- use cursor pagination instead of offset pagination
- archive or delete expired old notifications
- batch insert user notification rows for bulk notifications
- use caching for unread count if traffic becomes very high
- use a queue for notification creation and fan-out

## Sample SQL queries

### Create notification

```sql
insert into notifications(id, category, title, message, priority, action_url, expires_at)
values ('notif_101', 'placements', 'New placement drive', 'Comp opened applications for 2026 batch.', 'high', '/placements/comp-2026', '2026-05-20T23:59:59Z');
```

### Map notification to user

```sql
insert into user_notifications(user_id, notification_id, status)
values ('user_101', 'notif_101', 'unread');
```

### List notifications for a user

```sql
select
  n.id,
  n.category,
  n.title,
  n.message,
  n.priority,
  n.action_url,
  n.created_at,
  un.status,
  un.read_at
from user_notifications un
join notifications n on n.id = un.notification_id
where un.user_id = 'user_101'
  and un.status = 'unread'
order by n.created_at desc
limit 20;
```

### Get one notification

```sql
select
  n.id,
  n.category,
  n.title,
  n.message,
  n.priority,
  n.action_url,
  n.created_at,
  un.status,
  un.read_at
from user_notifications un
join notifications n on n.id = un.notification_id
where un.user_id = 'user_101'
  and n.id = 'notif_101';
```

### Get unread count

```sql
select count(*) as unread_count
from user_notifications
where user_id = 'user_101'
  and status = 'unread';
```

### Mark one as read

```sql
update user_notifications
set status = 'read',
    read_at = now()
where user_id = 'user_101'
  and notification_id = 'notif_101';
```

### Mark all as read

```sql
update user_notifications
set status = 'read',
    read_at = now()
where user_id = 'user_101'
  and status = 'unread';
```

### Get preferences

```sql
select *
from notification_preferences
where user_id = 'user_101';
```

### Update preferences

```sql
update notification_preferences
set email = false,
    announcements = false,
    updated_at = now()
where user_id = 'user_101';
```
