# Poll API Documentation

## Overview

The Poll API allows users to create, manage, and interact with polls within trips. All poll operations require authentication and trip participation. Polls can be created by any trip participant and managed by the poll owner.

## Base URL

```
/api/polls
```

## Authentication

- **Required**: Bearer token in Authorization header
- **Header**: `Authorization: Bearer <your-jwt-token>`

## Endpoints

### 1. Create Poll

Create a new poll for a specific trip.

```
POST /api/polls
```

#### Request Body

```json
{
  "question": "What should we do for dinner?",
  "options": ["Italian", "Chinese", "Mexican", "Thai"],
  "allow_multi_answers": false,
  "published": true,
  "trip_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "createdBy": "689452c56a3c22c49f65bb1b",
  "trip_id": "68dd0f98ab55dea0f1d13489",
  "status": "Active",
  "close_poll_date_time": "2025-10-31T12:06:00+05:30",
  "display_close_poll_date": "31/10/2025",
  "display_close_poll_time": "12:06 PM",
  "reminders": [
      5,
      15
  ]
}
```

#### Field Descriptions

| Field | Type | Required | Description | Max Length |
|-------|------|----------|-------------|------------|
| `question` | string | Yes | Poll question | 500 characters |
| `options` | array | Yes | Array of poll options (2-10 options) | 200 chars each |
| `allow_multi_answers` | boolean | No | Allow multiple selections | - |
| `published` | boolean | No | Whether poll is published | - |
| `trip_id` | string | Yes | Trip ID where poll belongs | - |

#### Success Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Poll created successfully",
  "data": {
    "_id": "poll_mongodb_id",
    "question": "What should we do for dinner?",
    "options": ["Italian", "Chinese", "Mexican", "Thai"],
    "allow_multi_answers": false,
    "published": true,
    "createdBy": "689452c56a3c22c49f65bb1b",
    "trip_id": "68dd0f98ab55dea0f1d13489",
    "status": "Active",
    "close_poll_date_time": "2025-10-31T12:06:00+05:30",
    "display_close_poll_date": "31/10/2025",
    "display_close_poll_time": "12:06 PM",
    "reminders": [
        5,
        15
    ],
    "createdAt": "2025-10-07T16:38:27.973Z",
    "updatedAt": "2025-10-07T16:38:27.973Z",
    "__v": 0,
    "duration": "24 days",
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. Get All Polls

Retrieve all polls with optional filtering.

```
GET /api/polls
```

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `?page=1` |
| `limit` | number | Items per page (default: 10) | `?limit=20` |
| `status` | string | Filter by status ("Active", "Closed") | `?status=Active` |
| `published` | boolean | Filter by published status | `?published=true` |
| `trip_id` | string | Filter by trip ID | `?trip_id=60f7b3b3b3b3b3b3b3b3b3b3` |

#### Success Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Polls retrieved successfully",
  "data": {
    "polls": [
      {
        "_id": "poll_mongodb_id",
        "id": "0BEi784KSPmeGneG9c6H",
        "question": "What should we do for dinner?",
        "options": ["Italian", "Chinese", "Mexican", "Thai"],
        "allow_multi_answers": false,
        "published": true,
        "owner_id": "user_id",
        "trip_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "status": "Active",
        "createdBy": {
            "_id": "689452c56a3c22c49f65bb1b",
            "email": "avisek@york.ie",
            "preferredName": "Avi12",
            "profilePhotoURL": "url"
        },
        "trip_id": "68dd0f98ab55dea0f1d13489",
        "status": "Active",
        "close_poll_date_time": "2025-10-31T12:06:00+05:30",
        "display_close_poll_date": "31/10/2025",
        "display_close_poll_time": "12:06 PM",
        "reminders": [
            5,
            15
        ]
        "reminders": [],
        "duration": "365 days",
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 3. Get Poll by ID

Retrieve a specific poll by its custom ID.

```
GET /api/polls/:id
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Poll's custom ID |

#### Success Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Poll retrieved successfully",
  "data": {
    "_id": "poll_mongodb_id",
    "id": "0BEi784KSPmeGneG9c6H",
    "question": "What should we do for dinner?",
    "options": ["Italian", "Chinese", "Mexican", "Thai"],
    "allow_multi_answers": false,
    "published": true,
    "owner_id": "user_id",
    "trip_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "status": "Active",
    "reminders": [],
    "duration": "365 days",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 4. Update Poll

Update an existing poll (owner only).

```
PUT /api/polls/:id
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Poll's custom ID |

#### Request Body

All fields are optional. Only send the fields you want to update:

```json
{
  "question": "Updated question?",
  "options": ["Option 1", "Option 2", "Option 3"],  "allow_multi_answers": true,
  "published": true,
  "trip_id": "68dd0f98ab55dea0f1d13489",
  "status": "Active",
  "close_poll_date_time": "2025-10-31T12:06:00+05:30",
  "display_close_poll_date": "31/10/2025",
  "display_close_poll_time": "12:06 PM",
  "reminders": [
      5,
      15
  ]
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Poll updated successfully",
  "data": {
    "_id": "poll_mongodb_id",
    "id": "0BEi784KSPmeGneG9c6H",
    "question": "Updated question?",
    "options": ["Option 1", "Option 2", "Option 3"],
    "allow_multi_answers": true,
    "published": true,
    "owner_id": "user_id",
    "trip_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "status": "Active",
    "reminders": [],
    "duration": "365 days",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 5. Delete Poll

Delete a poll (owner only).

```
DELETE /api/polls/:id
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Poll's custom ID |

#### Success Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Poll deleted successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```
### 7. Close Poll

Close a poll to stop voting (owner only).

```
POST /api/polls/:id/close
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Poll's custom ID |

#### Success Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Poll closed successfully",
  "data": {
    "_id": "poll_mongodb_id",
    "id": "0BEi784KSPmeGneG9c6H",
    "question": "What should we do for dinner?",
    "options": ["Italian", "Chinese", "Mexican", "Thai"],
    "allow_multi_answers": false,
    "published": true,
    "owner_id": "user_id",
    "trip_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "status": "Closed",
    "reminders": [],
    "duration": "365 days",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 8. Get Polls by Trip

Retrieve all polls for a specific trip.

```
GET /api/polls/trip/:tripId
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tripId` | string | Yes | Trip's MongoDB ObjectId |

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `?page=1` |
| `limit` | number | Items per page (default: 10) | `?limit=20` |
| `status` | string | Filter by status ("Active", "Closed") | `?status=Active` |
| `published` | boolean | Filter by published status | `?published=true` |

#### Success Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Polls retrieved successfully",
  "data": {
    "polls": [
      {
        "_id": "poll_mongodb_id",
        "id": "0BEi784KSPmeGneG9c6H",
        "question": "What should we do for dinner?",
        "options": ["Italian", "Chinese", "Mexican", "Thai"],
        "allow_multi_answers": false,
        "published": true,
        "owner_id": "user_id",
        "trip_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "status": "Active",
        "reminders": [],
        "duration": "365 days",
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Poll question is required",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "statusCode": 401,
  "message": "User authentication required",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "statusCode": 403,
  "message": "Only trip participants can create polls",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 404 Not Found

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Poll not found",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "statusCode": 500,
  "message": "Internal server error",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Usage Examples

### Example 1: Create a simple poll

```bash
curl -X POST http://localhost:3000/api/polls \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What time should we meet?",
    "options": ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM"],
    "trip_id": "60f7b3b3b3b3b3b3b3b3b3b3"
  }'
```

### Example 2: Create a poll with close date

```bash
curl -X POST http://localhost:3000/api/polls \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Which restaurant should we go to?",
    "options": ["Restaurant A", "Restaurant B", "Restaurant C"],
    "allow_multi_answers": false,
    "published": true,
    "trip_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  }'
```

### Example 3: Get polls for a trip

```bash
curl -X GET "http://localhost:3000/api/polls/trip/60f7b3b3b3b3b3b3b3b3b3b3?status=Active&published=true" \
  -H "Authorization: Bearer your-jwt-token"
```

### Example 4: Update a poll

```bash
curl -X PUT http://localhost:3000/api/polls/0BEi784KSPmeGneG9c6H \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Updated question?",
    "published": true
  }'
```

### Example 6: Close a poll

```bash
curl -X POST http://localhost:3000/api/polls/0BEi784KSPmeGneG9c6H/close \
  -H "Authorization: Bearer your-jwt-token"
```

## Poll Status

Polls have two possible statuses:

- **`Active`** - Default status, poll is available for voting
- **`Closed`** - Poll is closed and no longer accepts votes

## Permissions

- **Trip Participants**: Can create polls and view polls for trips they participate in
- **Poll Owner**: Can update, delete, publish, and close their own polls
- **Authentication**: All endpoints require valid JWT token

## Validation Rules

1. **Question**: Required, maximum 500 characters
2. **Options**: Required, 2-10 options, each maximum 200 characters
3. **Trip ID**: Required, must be valid MongoDB ObjectId
4. **Poll ID**: Custom 20-character alphanumeric string
5. **Dates**: Must be valid ISO date strings if provided

## Notes

1. **Trip Participation**: Only trip participants can create or view polls
2. **Owner Permissions**: Only poll owners can modify their polls
3. **Status Management**: Use publish/close endpoints to manage poll status
4. **Pagination**: All list endpoints support pagination
5. **Filtering**: Use query parameters to filter polls by status, published state, etc.
6. **Virtual Fields**: Responses include calculated fields like `duration`
7. **Unique IDs**: Each poll gets a unique 20-character custom ID for easy reference

## Testing

You can test this API using:

- Postman
- cURL
- Any HTTP client

Make sure to:

1. First register/login to get a JWT token
2. Join or create a trip to participate in polls
3. Use the token in the Authorization header
4. Use valid trip IDs for poll creation
