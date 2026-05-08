# Stage 1

This section covers the API design for a campus notification system for placements, events, results, and general announcements. Users are assumed to already be authenticated.

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

For real-time updates, I would use SSE because notifications are mostly server-to-client only.

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

This section covers storage design for the same notification system. I would use PostgreSQL because the data is structured, relationships are simple, and querying unread/read notifications with filters is easier in SQL.

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

## Why I chose this schema

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

## How I would handle scaling

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

# Stage 3

This section checks the slow query and how I would improve it.

The old query was:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

## Is this query accurate

Not exactly. In my Stage 2 schema, read/unread is tracked in `user_notifications`, not directly in `notifications`. So the better query should use `user_notifications` and join `notifications`.

## Why this is slow

- if there is no proper index, the DB may scan a large part of the table
- `SELECT *` fetches more columns than needed
- sorting also adds extra work
- with many rows, filtering only by `studentID` and `isRead` without a good composite index can become expensive

Without a useful index, cost is roughly a table scan, so close to `O(n)`.  
With a proper composite index, cost is closer to `O(log n + k)` where `k` is matching rows returned.

## Better query

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
where un.user_id = 'student_1042'
  and un.status = 'unread'
order by n.created_at desc
limit 50;
```

I would change it because:

- it matches the normalized schema
- it avoids `SELECT *`
- it uses `desc`, which is usually more useful for notifications
- limit helps avoid loading everything at once

## Indexes I would use

```sql
create index idx_user_notifications_user_status_notification
on user_notifications(user_id, status, notification_id);

create index idx_notifications_created_at
on notifications(created_at desc);
```

If unread notifications are fetched very often, another useful index can be:

```sql
create index idx_user_notifications_user_status_read
on user_notifications(user_id, status, read_at);
```

## Should we add indexes on every column

No.
Reasons:

- every index takes extra storage
- inserts and updates become slower

## Query to find all students who got a placement notification in the last 7 days

If the table uses `notificationType` enum with value `Placement`, then:

```sql
select distinct un.user_id
from user_notifications un
join notifications n on n.id = un.notification_id
where n.category = 'placements'
  and n.created_at >= now() - interval '7 days';
```

If the column name is exactly `notificationType`, then:

```sql
select distinct un.user_id
from user_notifications un
join notifications n on n.id = un.notification_id
where n.notificationType = 'Placement'
  and n.created_at >= now() - interval '7 days';
```

# Stage 4

This section covers how I would reduce DB load when notifications are being fetched on every page load.

## Main problem

Right now, every page load is hitting the database for notification data. If many students open pages at the same time, the DB gets too many repeated reads. That increases latency and gives a bad user experience.

## Solution I would suggest

I would not rely on only one fix. I would combine a few simple strategies:

- cache unread count
- cache recent notifications for a short time
- stop fetching full notifications on every page load
- use SSE for live updates after first load
- paginate aggressively

## 1. Cache unread count

Unread count is usually shown on every page, so it is a good candidate for caching.

Example:

- key: `unread_count:user_101`
- short TTL like 30 to 60 seconds
- update or invalidate cache when a notification is created or marked as read

Tradeoff:

- big reduction in repeated DB reads
- very easy to implement
- count can be slightly stale for a few seconds

## 2. Cache recent notifications

Instead of hitting the DB every time, I would cache the first page of recent notifications for each user.

Example:

- key: `recent_notifications:user_101`
- store top 20 notifications
- short TTL like 30 to 60 seconds

Tradeoff:

- reduces DB pressure a lot
- faster page loads
- invalidation is a little harder than unread count
- cached list can be slightly outdated for a short time

## 3. Do not fetch full notifications on every page load

On normal page load, most pages only need the unread count or maybe the latest few notifications. I would avoid loading the full notification list unless the user opens the notification panel.

Better flow:

1. page loads only unread count
2. if user opens notification drawer, then fetch recent notifications
3. if user scrolls more, then fetch next page using cursor pagination

Tradeoff:

- much less DB load
- better perceived performance
- frontend becomes slightly more stateful

## 4. Use SSE after initial load

Instead of polling notifications again and again, I would fetch once and then use SSE for new events.

Flow:

1. initial API call loads unread count and recent notifications
2. SSE connection stays open
3. new notifications are pushed to client directly

Tradeoff:

- removes repeated polling
- gives near real-time experience
- needs connection management on server side
- at very high scale, SSE connections also need planning

## 5. Keep pagination strict

I would never return all notifications on one request. I would keep small page sizes like 20 or 50 and use cursor pagination.

Tradeoff:

- protects DB and API from heavy reads
- better response time
- user needs extra requests for older history, which is acceptable

## 6. Precompute or cache unread count separately

If traffic becomes very high, unread count can be stored separately in a fast store like Redis, and updated whenever notifications are created or read.

Tradeoff:

- very fast reads
- great for high traffic
- adds extra write-side complexity
- count and DB must stay in sync

## Best practical approach

If I had to choose a practical combination, I would do this:

1. fetch only unread count on normal page load
2. fetch notification list only when user opens notification panel
3. use Redis cache for unread count and first page of notifications
4. use SSE for live updates
5. keep DB queries paginated and indexed

## Conclusion

The main improvement is to stop treating every page load like a full notification fetch. A mix of lazy loading, short-term caching, SSE, and pagination will reduce DB pressure a lot and improve user experience. The tradeoff is a little more application complexity, but it is worth it because read traffic is the real bottleneck here.
