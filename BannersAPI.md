# Banners API Documentation

## Overview

The Banners API module provides complete CRUD operations for managing promotional banners in the Coordle application. Banners can be used for displaying promotional content, announcements, or featured content on the frontend.

## Features

- ✅ Create banners with image uploads via Cloudinary
- ✅ Retrieve all banners with filtering and sorting
- ✅ Get active banners only
- ✅ Update banner details and images
- ✅ Delete banners with automatic image cleanup
- ✅ Authentication required for create/update/delete operations
- ✅ Public access for viewing banners

## Model Schema

```typescript
interface IBanner {
  title: string; // Banner title (required, max 100 chars)
  imageUrl: string; // Cloudinary image URL (required)
  redirectLink: string; // URL to redirect when clicked (required)
  isActive: boolean; // Whether banner is active (default: true)
  order: number; // Display order (default: 0, lower numbers first)
  createdAt: Date; // Auto-generated timestamp
  updatedAt: Date; // Auto-generated timestamp
}
```

## API Endpoints

### 1. Get All Banners

**GET** `/api/banners`

**Query Parameters:**

- `isActive` (optional): Filter by active status (`true`/`false`)
- `sortBy` (optional): Sort field (`order`, `createdAt`, `title`) - default: `order`
- `sortOrder` (optional): Sort order (`asc`/`desc`) - default: `asc`

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Banners retrieved successfully",
  "data": [
    {
      "_id": "banner_id",
      "title": "Summer Sale",
      "imageUrl": "https://res.cloudinary.com/...",
      "redirectLink": "https://example.com/sale",
      "isActive": true,
      "order": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Get Active Banners

**GET** `/api/banners/active`

**Response:** Returns only active banners sorted by order

### 3. Get Banner by ID

**GET** `/api/banners/:id`

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Banner retrieved successfully",
  "data": {
    "_id": "banner_id",
    "title": "Summer Sale",
    "imageUrl": "https://res.cloudinary.com/...",
    "redirectLink": "https://example.com/sale",
    "isActive": true,
    "order": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Create Banner

**POST** `/api/banners`

**Authentication:** Required (Bearer token)

**Content-Type:** `multipart/form-data`

**Form Data:**

- `title` (required): Banner title
- `redirectLink` (required): URL to redirect when clicked
- `isActive` (optional): Whether banner is active (default: true)
- `order` (optional): Display order (default: 0)
- `image` (required): Image file (JPG, PNG, etc., max 5MB)

**Response:**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Banner created successfully",
  "data": {
    "_id": "new_banner_id",
    "title": "Summer Sale",
    "imageUrl": "https://res.cloudinary.com/...",
    "redirectLink": "https://example.com/sale",
    "isActive": true,
    "order": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Update Banner

**PUT** `/api/banners/:id`

**Authentication:** Required (Bearer token)

**Content-Type:** `multipart/form-data`

**Form Data:**

- `title` (optional): Updated banner title
- `redirectLink` (optional): Updated redirect URL
- `isActive` (optional): Updated active status
- `order` (optional): Updated display order
- `image` (optional): New image file

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Banner updated successfully",
  "data": {
    "_id": "banner_id",
    "title": "Updated Title",
    "imageUrl": "https://res.cloudinary.com/...",
    "redirectLink": "https://example.com/updated",
    "isActive": false,
    "order": 2,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 6. Delete Banner

**DELETE** `/api/banners/:id`

**Authentication:** Required (Bearer token)

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Banner deleted successfully"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Title and redirect link are required",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Access token is required",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 404 Not Found

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Banner not found",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "statusCode": 500,
  "message": "Failed to create banner",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Image Upload Specifications

- **Supported Formats:** JPG, JPEG, PNG, GIF, WebP
- **Maximum File Size:** 5MB
- **Storage:** Cloudinary with automatic optimization
- **Transformations:**
  - Width: 1200px (default)
  - Height: 400px (default)
  - Crop: Fill
  - Quality: Auto
  - Format: Auto (WebP when supported)

## Usage Examples

### Frontend Integration

```javascript
// Get active banners for display
const response = await fetch("/api/banners/active");
const { data: banners } = await response.json();

// Display banners in order
banners.forEach((banner) => {
  console.log(`${banner.title}: ${banner.imageUrl}`);
});
```

### Admin Panel Integration

```javascript
// Create new banner
const formData = new FormData();
formData.append("title", "New Promotion");
formData.append("redirectLink", "https://example.com/promo");
formData.append("image", imageFile);

const response = await fetch("/api/banners", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

## Database Indexes

The Banner model includes the following indexes for optimal performance:

- `{ isActive: 1, order: 1 }` - For filtering active banners by order
- `{ createdAt: -1 }` - For sorting by creation date

## Security Considerations

1. **Authentication:** All create/update/delete operations require valid JWT tokens
2. **File Validation:** Only image files are accepted
3. **File Size Limits:** 5MB maximum file size
4. **Input Validation:** Title and redirect link are required and validated
5. **Image Cleanup:** Old images are automatically deleted from Cloudinary when updated/deleted

## Environment Variables

Ensure the following environment variables are set:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `JWT_SECRET` (for authentication)
