# Profile Photo API Documentation

This document outlines the profile photo management functionality implemented for the Coordle backend API using Cloudinary for image storage and processing.

## Overview

The profile photo API provides complete CRUD operations for user profile photos with the following features:

- ✅ **Direct buffer uploads** (no base64 conversion)
- ✅ **Automatic image optimization and transformation**
- ✅ **Thumbnail generation**
- ✅ **Secure file handling with authentication**
- ✅ **Public profile photo access**
- ✅ **Cloudinary integration for reliable storage**

## Environment Variables

Add these to your `.env` file:

```env
# Cloudinary Configuration (required)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## API Endpoints

Base URL: `/api/profile-photo`

### 1. Upload Profile Photo

- **POST** `/api/profile-photo/upload`
- **Authentication**: Required (Bearer Token)
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `profilePhoto` (file): Image file (max 5MB)
- **Supported formats**: JPEG, PNG, GIF, WebP
- **Features**:
  - Automatically resizes to 500x500px with face detection
  - Creates optimized thumbnail (150x150px)
  - Replaces existing profile photo if present

### 2. Get My Profile Photo

- **GET** `/api/profile-photo`
- **Authentication**: Required (Bearer Token)
- **Returns**: Profile photo data with URLs and metadata

### 3. Delete My Profile Photo

- **DELETE** `/api/profile-photo`
- **Authentication**: Required (Bearer Token)
- **Action**: Removes photo from both database and Cloudinary

### 4. Get Public Profile Photo

- **GET** `/api/profile-photo/public/:userId`
- **Authentication**: Not required
- **Parameters**: `userId` - Target user ID
- **Returns**: Public profile photo data (limited metadata)

## Implementation Details

### Files Created/Modified

1. **`src/config/cloudinary.ts`** - Cloudinary configuration
2. **`src/utils/cloudinaryUtils.ts`** - Upload/delete utilities
3. **`src/controllers/profilePhotoController.ts`** - API logic
4. **`src/routes/profilePhotoRoutes.ts`** - Route definitions
5. **`src/models/User.ts`** - Added profile photo fields
6. **`src/index.ts`** - Registered new routes
7. **`Coordle_Backend_API.postman_collection.json`** - Added API endpoints

### User Model Updates

Added `profilePhoto` field to User schema:

```typescript
profilePhoto?: {
  url: string;              // Main image URL
  publicId: string;         // Cloudinary public ID
  thumbnailUrl: string;     // Optimized thumbnail URL
  width: number;            // Image width
  height: number;           // Image height
  format: string;           // Image format (jpg, png, etc.)
  bytes: number;            // File size in bytes
  uploadedAt: Date;         // Upload timestamp
};
```

### Key Features

#### Image Processing

- **Auto-optimization**: Cloudinary automatically optimizes format and quality
- **Face detection**: Crops intelligently using face detection for profile photos
- **Responsive images**: Multiple sizes available for different use cases
- **Format conversion**: Automatic format selection for best performance

#### Security

- **Authentication required**: All upload/delete operations need valid JWT
- **File validation**: Only image files accepted
- **Size limits**: 5MB maximum file size
- **Public access control**: Limited metadata for public endpoints

#### Storage Organization

- **Folder structure**: `coordle/users/{userId}/profile/`
- **Naming convention**: `profile_{userId}_{timestamp}`
- **Automatic cleanup**: Old photos deleted when new ones uploaded

## Usage Examples

### Frontend Integration

```javascript
// Upload profile photo
const formData = new FormData();
formData.append("profilePhoto", imageFile);

const response = await fetch("/api/profile-photo/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
  body: formData,
});

const result = await response.json();
console.log(result.data.profilePhoto.url); // Main image URL
console.log(result.data.profilePhoto.thumbnailUrl); // Thumbnail URL
```

### Response Format

```json
{
  "success": true,
  "message": "Profile photo uploaded successfully",
  "data": {
    "profilePhoto": {
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/coordle/users/user123/profile/profile_user123_1234567890.jpg",
      "publicId": "coordle/users/user123/profile/profile_user123_1234567890",
      "thumbnailUrl": "https://res.cloudinary.com/your-cloud/image/upload/c_fill,g_face,h_150,w_150/coordle/users/user123/profile/profile_user123_1234567890.jpg",
      "width": 500,
      "height": 500,
      "format": "jpg",
      "bytes": 45620,
      "uploadedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## Error Handling

The API includes comprehensive error handling for:

- **Authentication errors** (401)
- **File validation errors** (400)
- **File size exceeded** (400)
- **User not found** (404)
- **No photo found** (404)
- **Cloudinary upload failures** (500)
- **Database errors** (500)

## Testing

Use the provided Postman collection (`Coordle_Backend_API.postman_collection.json`) which includes:

- Upload Profile Photo
- Get My Profile Photo
- Delete My Profile Photo
- Get Public Profile Photo

## Performance Considerations

1. **Direct buffer upload**: No intermediate file storage
2. **Automatic optimization**: Reduced bandwidth usage
3. **CDN delivery**: Fast global image delivery via Cloudinary
4. **Thumbnail generation**: Quick loading for user lists
5. **Efficient cleanup**: Old photos automatically removed

## Security Best Practices

1. **File type validation**: Only images accepted
2. **Size limits**: Prevents abuse
3. **Authentication**: Secure access control
4. **Public ID obscurity**: Non-guessable image URLs
5. **Error sanitization**: No sensitive data in error messages

## Future Enhancements

Potential improvements:

- Multiple profile photo sizes
- Image editing capabilities
- Batch operations
- Advanced transformations
- Video support
- Analytics tracking

## Dependencies

- `cloudinary`: Image storage and processing
- `multer`: File upload handling
- `mongoose`: Database operations
- `jsonwebtoken`: Authentication

No additional dependencies were required as we implemented direct buffer uploads instead of using multer-storage-cloudinary to avoid version conflicts.
