# Update Trip API - Form-Data Format

## Overview

The Update Trip API now supports form-data format, similar to the Create Trip API, allowing you to update trip information and optionally upload a cover image in a single request.

## Endpoint

```
PUT /api/trips/:id
```

## Headers

```
Authorization: Bearer {{authToken}}
Content-Type: multipart/form-data (automatically set)
```

## URL Parameters

- `id` (string, required): The MongoDB ObjectId of the trip to update

## Form-Data Fields

### Text Fields (All Optional)

| Field                     | Type | Description           | Example                            |
| ------------------------- | ---- | --------------------- | ---------------------------------- |
| `name`                    | text | Trip name             | "Updated YORK TRIP"                |
| `to_address`              | text | Destination address   | "Updated Jaipur, Rajasthan, India" |
| `from_address`            | text | Starting address      | "Mumbai, Maharashtra, India"       |
| `display_start`           | text | Display start date    | "Jan 15, 2024"                     |
| `display_end`             | text | Display end date      | "Jan 20, 2024"                     |
| `start_date`              | text | ISO start date        | "2024-01-15T00:00:00.000Z"         |
| `end_date`                | text | ISO end date          | "2024-01-20T23:59:59.000Z"         |
| `to_location_latitude`    | text | Destination latitude  | "26.9124"                          |
| `to_location_longitude`   | text | Destination longitude | "75.7873"                          |
| `from_location_latitude`  | text | Starting latitude     | "19.0760"                          |
| `from_location_longitude` | text | Starting longitude    | "72.8777"                          |

### File Fields (Optional)

| Field        | Type | Description                            |
| ------------ | ---- | -------------------------------------- |
| `coverImage` | file | Trip cover image (jpg, png, gif, etc.) |

## Example Request

### cURL

```bash
curl -X PUT \
  http://localhost:3000/api/trips/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer your-auth-token-here" \
  -F "name=Updated YORK TRIP" \
  -F "to_address=Updated Jaipur, Rajasthan, India" \
  -F "from_address=Mumbai, Maharashtra, India" \
  -F "display_start=Jan 15, 2024" \
  -F "display_end=Jan 20, 2024" \
  -F "start_date=2024-01-15T00:00:00.000Z" \
  -F "end_date=2024-01-20T23:59:59.000Z" \
  -F "to_location_latitude=26.9124" \
  -F "to_location_longitude=75.7873" \
  -F "from_location_latitude=19.0760" \
  -F "from_location_longitude=72.8777" \
  -F "coverImage=@/path/to/your/image.jpg"
```

### JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append("name", "Updated YORK TRIP");
formData.append("to_address", "Updated Jaipur, Rajasthan, India");
formData.append("from_address", "Mumbai, Maharashtra, India");
formData.append("display_start", "Jan 15, 2024");
formData.append("display_end", "Jan 20, 2024");
formData.append("start_date", "2024-01-15T00:00:00.000Z");
formData.append("end_date", "2024-01-20T23:59:59.000Z");
formData.append("to_location_latitude", "26.9124");
formData.append("to_location_longitude", "75.7873");
formData.append("from_location_latitude", "19.0760");
formData.append("from_location_longitude", "72.8777");

// Add file if you have one
const fileInput = document.getElementById("coverImage");
if (fileInput.files[0]) {
  formData.append("coverImage", fileInput.files[0]);
}

fetch("http://localhost:3000/api/trips/507f1f77bcf86cd799439011", {
  method: "PUT",
  headers: {
    Authorization: "Bearer your-auth-token-here",
  },
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error("Error:", error));
```

## Expected Response

### Success Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Trip updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Updated YORK TRIP",
    "to_address": "Updated Jaipur, Rajasthan, India",
    "from_address": "Mumbai, Maharashtra, India",
    "display_start": "Jan 15, 2024",
    "display_end": "Jan 20, 2024",
    "start_date": "2024-01-15T00:00:00.000Z",
    "end_date": "2024-01-20T23:59:59.000Z",
    "to_location": {
      "latitude": 26.9124,
      "longitude": 75.7873
    },
    "from_location": {
      "latitude": 19.076,
      "longitude": 72.8777
    },
    "cover_image": {
      "url": "https://res.cloudinary.com/your-cloud/image/upload/...",
      "uploadedAt": "2024-01-15T10:30:00.000Z"
    },
    "duration": "6 days",
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Responses

#### 400 Bad Request

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Trip ID is required",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid or expired token",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Trip not found",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Features

### 1. Partial Updates

- Only send the fields you want to update
- Other fields remain unchanged
- No need to send all trip data

### 2. File Upload Support

- Upload cover image along with trip data
- Supports common image formats (jpg, png, gif, etc.)
- 5MB file size limit
- Automatically uploaded to Cloudinary

### 3. Location Handling

- Send latitude/longitude as separate fields
- Automatically converted to location objects
- Supports both destination and starting locations

### 4. Date Processing

- Send dates as ISO strings
- Automatically converted to Date objects
- Supports both start and end dates

## Notes

- **Authentication Required**: Valid Bearer token is required
- **File Upload**: Cover image upload is optional
- **Validation**: All fields are validated according to the Trip schema
- **Location Fields**: Must send both latitude and longitude for location updates
- **Date Format**: Use ISO 8601 format for dates
- **File Types**: Only image files are accepted for cover image
- **File Size**: Maximum 5MB for cover image

## Comparison with Create Trip API

| Feature         | Create Trip     | Update Trip  |
| --------------- | --------------- | ------------ |
| Method          | POST            | PUT          |
| Form-Data       | ✅              | ✅           |
| File Upload     | ✅              | ✅           |
| Required Fields | All trip fields | Only trip ID |
| Authentication  | ✅              | ✅           |
| Response Format | Same            | Same         |
