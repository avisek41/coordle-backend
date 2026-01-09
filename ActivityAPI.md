# Activity API Documentation

## API Endpoint

**Base URL:** `POST /api/activities`

**Full URL:** `http://localhost:3000/api/activities` (or your server URL)

**Authentication:** Required (Bearer token in Authorization header)

## Request Headers

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

## Required Fields

- `activity_name` (string) - Name of the activity
- `reservation_date` (Date/ISO string) - Date of the reservation
- `startTime` (Date/ISO string) - Start time of the activity
- `activity_type` (string) - Type of activity (see valid types below)
- `trip_id` (string) - MongoDB ObjectId of the trip

## Optional Fields

- `endTime` (Date/ISO string) - End time of the activity
- `phone` (string) - Phone number
- `website` (string) - Website URL
- `reservation_code` (string) - Reservation code
- `tickets` (string) - Ticket number/information
- `address` (string) - Address of the activity
- `notes` (string) - Additional notes

## Valid Activity Types

- `restaurant`
- `tour`
- `museum`
- `bar_party`
- `event`
- `training`
- `relax`
- `fitness`
- `shopping`
- `concert`
- `kids`
- `theater`
- `meeting`
- `misc`
- `other`

---

## Test Payloads by Activity Type

### 1. Restaurant

```json
{
  "activity_name": "The French Laundry",
  "reservation_date": "2024-12-25T00:00:00.000Z",
  "startTime": "2024-12-25T19:00:00.000Z",
  "endTime": "2024-12-25T22:00:00.000Z",
  "phone": "+1-707-944-2380",
  "website": "https://www.thomas-keller.com/tfl",
  "reservation_code": "RES-2024-12345",
  "address": "6640 Washington St, Yountville, CA 94599",
  "notes": "Dress code: Smart casual. Please arrive 15 minutes early.",
  "activity_type": "restaurant",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 2. Tour

```json
{
  "activity_name": "Golden Gate Bridge Walking Tour",
  "reservation_date": "2024-12-26T00:00:00.000Z",
  "startTime": "2024-12-26T10:00:00.000Z",
  "endTime": "2024-12-26T12:30:00.000Z",
  "phone": "+1-415-555-0123",
  "website": "https://www.goldengatetours.com",
  "reservation_code": "TOUR-GGB-789",
  "address": "Golden Gate Bridge, San Francisco, CA",
  "notes": "Meet at the visitor center. Wear comfortable walking shoes.",
  "activity_type": "tour",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 3. Museum

```json
{
  "activity_name": "Metropolitan Museum of Art",
  "reservation_date": "2024-12-27T00:00:00.000Z",
  "startTime": "2024-12-27T14:00:00.000Z",
  "endTime": "2024-12-27T17:00:00.000Z",
  "phone": "+1-212-535-7710",
  "website": "https://www.metmuseum.org",
  "reservation_code": "MET-2024-456",
  "address": "1000 5th Ave, New York, NY 10028",
  "notes": "Audio guide available. Photography allowed in most galleries.",
  "activity_type": "museum",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 4. Bar & Party

```json
{
  "activity_name": "New Year's Eve Celebration",
  "reservation_date": "2024-12-31T00:00:00.000Z",
  "startTime": "2024-12-31T20:00:00.000Z",
  "endTime": "2025-01-01T02:00:00.000Z",
  "phone": "+1-212-555-0199",
  "website": "https://www.nyevenue.com",
  "reservation_code": "NYE-2024-VIP",
  "address": "123 Times Square, New York, NY 10036",
  "notes": "VIP table reservation. Dress code: Cocktail attire.",
  "activity_type": "bar_party",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 5. Event

```json
{
  "activity_name": "Tech Conference 2024",
  "reservation_date": "2024-12-28T00:00:00.000Z",
  "startTime": "2024-12-28T09:00:00.000Z",
  "endTime": "2024-12-28T18:00:00.000Z",
  "phone": "+1-415-555-0200",
  "website": "https://www.techconf2024.com",
  "address": "Moscone Center, San Francisco, CA",
  "notes": "Registration includes lunch. Bring business cards.",
  "activity_type": "event",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 6. Training

```json
{
  "activity_name": "Yoga Workshop - Advanced Poses",
  "reservation_date": "2024-12-29T00:00:00.000Z",
  "startTime": "2024-12-29T08:00:00.000Z",
  "endTime": "2024-12-29T10:00:00.000Z",
  "phone": "+1-415-555-0300",
  "website": "https://www.yogastudio.com",
  "address": "456 Wellness St, San Francisco, CA 94102",
  "notes": "Bring your own mat. Water provided.",
  "activity_type": "training",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 7. Relax

```json
{
  "activity_name": "Spa Day - Full Body Massage",
  "reservation_date": "2024-12-30T00:00:00.000Z",
  "startTime": "2024-12-30T14:00:00.000Z",
  "endTime": "2024-12-30T16:00:00.000Z",
  "phone": "+1-415-555-0400",
  "website": "https://www.relaxspa.com",
  "reservation_code": "SPA-RELAX-2024",
  "address": "789 Serenity Ave, San Francisco, CA 94103",
  "notes": "Arrive 15 minutes early. Includes access to sauna and steam room.",
  "activity_type": "relax",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 8. Fitness

```json
{
  "activity_name": "CrossFit Class - Morning Session",
  "reservation_date": "2024-12-31T00:00:00.000Z",
  "startTime": "2024-12-31T06:00:00.000Z",
  "endTime": "2024-12-31T07:00:00.000Z",
  "phone": "+1-415-555-0500",
  "website": "https://www.crossfitgym.com",
  "address": "321 Fitness Blvd, San Francisco, CA 94104",
  "notes": "First-time visitors welcome. Bring water bottle and towel.",
  "activity_type": "fitness",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 9. Shopping

```json
{
  "activity_name": "Black Friday Shopping Spree",
  "reservation_date": "2024-11-29T00:00:00.000Z",
  "startTime": "2024-11-29T08:00:00.000Z",
  "endTime": "2024-11-29T15:00:00.000Z",
  "address": "Union Square, San Francisco, CA",
  "notes": "Meet at Macy's entrance. Bring shopping bags.",
  "activity_type": "shopping",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 10. Concert

```json
{
  "activity_name": "Taylor Swift - The Eras Tour",
  "reservation_date": "2025-01-15T00:00:00.000Z",
  "startTime": "2025-01-15T19:30:00.000Z",
  "endTime": "2025-01-15T23:00:00.000Z",
  "phone": "+1-415-555-0600",
  "website": "https://www.ticketmaster.com",
  "tickets": "Section 105, Row 12, Seats 8-9",
  "address": "Levi's Stadium, Santa Clara, CA",
  "notes": "Parking pass included. Gates open at 6:30 PM.",
  "activity_type": "concert",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 11. Kids

```json
{
  "activity_name": "Children's Museum Visit",
  "reservation_date": "2025-01-10T00:00:00.000Z",
  "startTime": "2025-01-10T10:00:00.000Z",
  "endTime": "2025-01-10T14:00:00.000Z",
  "phone": "+1-415-555-0700",
  "website": "https://www.kidsmuseum.org",
  "address": "123 Discovery Way, San Francisco, CA 94105",
  "notes": "Perfect for ages 3-10. Snack area available.",
  "activity_type": "kids",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 12. Theater

```json
{
  "activity_name": "Hamilton - Broadway Show",
  "reservation_date": "2025-01-20T00:00:00.000Z",
  "startTime": "2025-01-20T20:00:00.000Z",
  "endTime": "2025-01-20T23:00:00.000Z",
  "phone": "+1-212-555-0800",
  "website": "https://www.hamiltonmusical.com",
  "tickets": "Orchestra, Row F, Seats 10-11",
  "address": "Richard Rodgers Theatre, 226 W 46th St, New York, NY 10036",
  "notes": "Show starts promptly. No late seating.",
  "activity_type": "theater",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 13. Meeting

```json
{
  "activity_name": "Team Strategy Meeting",
  "reservation_date": "2025-01-05T00:00:00.000Z",
  "startTime": "2025-01-05T14:00:00.000Z",
  "endTime": "2025-01-05T16:00:00.000Z",
  "address": "Conference Room A, 456 Business Park, San Francisco, CA",
  "notes": "Agenda: Q1 planning, budget review, team goals.",
  "activity_type": "meeting",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 14. Misc

```json
{
  "activity_name": "City Exploration Walk",
  "reservation_date": "2025-01-12T00:00:00.000Z",
  "startTime": "2025-01-12T11:00:00.000Z",
  "endTime": "2025-01-12T15:00:00.000Z",
  "address": "Starting point: Union Square, San Francisco, CA",
  "notes": "Self-guided walking tour. Map provided.",
  "activity_type": "misc",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

### 15. Other

```json
{
  "activity_name": "Custom Activity - Wine Tasting",
  "reservation_date": "2025-01-18T00:00:00.000Z",
  "startTime": "2025-01-18T15:00:00.000Z",
  "endTime": "2025-01-18T17:30:00.000Z",
  "phone": "+1-707-555-0900",
  "website": "https://www.napavalleywines.com",
  "reservation_code": "WINE-2025-001",
  "address": "Napa Valley, CA",
  "notes": "Private tasting for 4 people. Includes cheese pairing.",
  "activity_type": "other",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

---

## Minimal Payload (Only Required Fields)

```json
{
  "activity_name": "Simple Activity",
  "reservation_date": "2024-12-25T00:00:00.000Z",
  "startTime": "2024-12-25T10:00:00.000Z",
  "activity_type": "event",
  "trip_id": "507f1f77bcf86cd799439011"
}
```

---

## Response Format

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Activity created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "activity_name": "The French Laundry",
    "reservation_date": "2024-12-25T00:00:00.000Z",
    "startTime": "2024-12-25T19:00:00.000Z",
    "endTime": "2024-12-25T22:00:00.000Z",
    "phone": "+1-707-944-2380",
    "website": "https://www.thomas-keller.com/tfl",
    "reservation_code": "RES-2024-12345",
    "tickets": "",
    "address": "6640 Washington St, Yountville, CA 94599",
    "notes": "Dress code: Smart casual. Please arrive 15 minutes early.",
    "activity_type": "restaurant",
    "trip_id": "507f1f77bcf86cd799439011",
    "owner_id": "507f1f77bcf86cd799439013",
    "createdBy": "507f1f77bcf86cd799439013",
    "createdAt": "2024-12-20T10:30:00.000Z",
    "updatedAt": "2024-12-20T10:30:00.000Z"
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "message": "Activity name, reservation date, start time, activity type, and trip ID are required"
}
```

---

## Testing with cURL

```bash
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "activity_name": "The French Laundry",
    "reservation_date": "2024-12-25T00:00:00.000Z",
    "startTime": "2024-12-25T19:00:00.000Z",
    "endTime": "2024-12-25T22:00:00.000Z",
    "phone": "+1-707-944-2380",
    "website": "https://www.thomas-keller.com/tfl",
    "reservation_code": "RES-2024-12345",
    "address": "6640 Washington St, Yountville, CA 94599",
    "notes": "Dress code: Smart casual.",
    "activity_type": "restaurant",
    "trip_id": "507f1f77bcf86cd799439011"
  }'
```

---

## Other Endpoints

### Get All Activities for a Trip
- **GET** `/api/activities/trip/:tripId`
- Requires authentication

### Get Activity by ID
- **GET** `/api/activities/:id`
- Requires authentication

### Update Activity
- **PUT** `/api/activities/:id`
- Requires authentication (owner only)

### Delete Activity
- **DELETE** `/api/activities/:id`
- Requires authentication (owner only)

