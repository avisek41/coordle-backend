# Cloudinary Setup Documentation

This document outlines the Cloudinary integration setup for the Coordle backend API.

## Overview

Cloudinary is integrated into the backend to handle image upload, storage, transformation, and management for:

- **User Profile Images**: Quick profile picture uploads via user routes
- **User Documents**: Comprehensive document management (any document type) via dedicated document routes
- **General Image Management**: Utility endpoints for various image operations

The implementation provides a complete image management solution with:

- ✅ **Direct buffer uploads** (no base64 conversion overhead)
- ✅ **Automatic file type detection**
- ✅ **Optimized URLs and transformations**
- ✅ **Efficient FormData handling**

### Why Direct Buffer Upload vs Base64?

**❌ Base64 Problems:**

- Increases file size by ~33%
- Requires additional encoding/decoding CPU time
- Higher memory usage
- Slower upload times

**✅ Direct Buffer Benefits:**

- Original file size maintained
- Faster uploads
- Lower memory footprint
- Better performance

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Getting Cloudinary Credentials

1. Sign up for a free Cloudinary account at [cloudinary.com](https://cloudinary.com)
2. Go to your Dashboard
3. Copy the following values:
   - **Cloud Name**: Found in the "Product Environment Credentials" section
   - **API Key**: Found in the "Product Environment Credentials" section
   - **API Secret**: Found in the "Product Environment Credentials" section (click "Reveal" to show)

## API Endpoints

### User Profile Images (Quick Operations)

Base URL: `/api/users`

#### 1. Upload Profile Image

- **POST** `/api/users/profile-image`
- **Authentication**: Required (Bearer Token)
- **Content-Type**: `multipart/form-data`
- **Body**: `profileImage` (file): Single image file (max 5MB)

#### 2. Get Profile Image

- **GET** `/api/users/profile-image`
- **Authentication**: Required (Bearer Token)

#### 3. Delete Profile Image

- **DELETE** `/api/users/profile-image`
- **Authentication**: Required (Bearer Token)

### User Documents (Comprehensive Management)

Base URL: `/api/documents`

#### 1. Upload Documents

- **POST** `/api/documents/upload`
- **Authentication**: Required (Bearer Token)
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `documents` (files): Multiple document files (images/PDFs, max 20, 15MB each)
  - `documentType` (string): Type of document (e.g., "Government ID", "Passport", "Bank Statement")
  - `description` (string, optional): Document description
  - `expiryDate` (string, optional): Expiry date (YYYY-MM-DD format)

#### 2. Get All User Documents

- **GET** `/api/documents`
- **Authentication**: Required (Bearer Token)

#### 3. Get Document by ID

- **GET** `/api/documents/:documentId`
- **Authentication**: Required (Bearer Token)

#### 4. Update Document Information

- **PUT** `/api/documents/:documentId`
- **Authentication**: Required (Bearer Token)
- **Content-Type**: `application/json`
- **Body**: `{ documentType?, description?, expiryDate? }`

#### 5. Delete Document

- **DELETE** `/api/documents/:documentId`
- **Authentication**: Required (Bearer Token)

#### 6. Add Images to Existing Document

- **POST** `/api/documents/:documentId/add-images`
- **Authentication**: Required (Bearer Token)
- **Content-Type**: `multipart/form-data`
- **Body**: `images` (files): Additional image files (max 10)

### General Image Management

Base URL: `/api/images`

### Available Endpoints

#### 1. Upload Single Image

- **POST** `/api/images/upload`
- **Authentication**: Required (Bearer Token)
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `image` (file): Image file to upload
  - `folder` (string, optional): Cloudinary folder name
  - `publicId` (string, optional): Custom public ID

#### 2. Upload Multiple Images

- **POST** `/api/images/upload-multiple`
- **Authentication**: Required (Bearer Token)
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `images` (files): Array of image files (max 10)
  - `folder` (string, optional): Cloudinary folder name

#### 3. Delete Single Image

- **DELETE** `/api/images/:publicId`
- **Authentication**: Required (Bearer Token)
- **Parameters**:
  - `publicId`: Cloudinary public ID of the image

#### 4. Delete Multiple Images

- **DELETE** `/api/images/delete-multiple`
- **Authentication**: Required (Bearer Token)
- **Content-Type**: `application/json`
- **Body**:
  ```json
  {
    "publicIds": ["image1_id", "image2_id"]
  }
  ```

#### 5. Get Optimized Image URL

- **GET** `/api/images/url/:publicId`
- **Authentication**: Not required
- **Parameters**:
  - `publicId`: Cloudinary public ID of the image
- **Query Parameters** (all optional):
  - `width`: Desired width in pixels
  - `height`: Desired height in pixels
  - `crop`: Crop mode (fill, fit, scale, etc.)
  - `quality`: Image quality (auto, best, good, etc.)

## Features

### File Upload Limitations

#### Profile Images

- **Maximum file size**: 5MB per image
- **Maximum files per request**: 1 image
- **Supported formats**: Image formats only (JPEG, PNG, GIF, WebP, etc.)

#### Documents

- **Maximum file size**: 15MB per file
- **Maximum files per request**: 20 files for upload, 10 for adding to existing document
- **Supported formats**: Image formats and PDFs

#### General Images

- **Maximum file size**: 10MB per image
- **Maximum files per request**: 10 images
- **Supported formats**: All image formats (JPEG, PNG, GIF, WebP, etc.)

### Image Transformations

- Automatic format optimization
- Quality optimization
- Responsive image generation
- Thumbnail creation
- Custom crop modes

### Folder Organization

Images are automatically organized into folders:

#### Automatic Folder Structure:

- `users/{userId}/profile/`: User profile images
- `users/{userId}/documents/`: User document files
- Custom folders can be specified for general image uploads

#### Document Types (Examples):

- "Government ID" - National ID, State ID, etc.
- "Passport" - Passport pages
- "Driver's License" - Driving license front/back
- "Bank Statement" - Bank documents
- "Insurance Documents" - Insurance papers
- "Educational Certificates" - Degrees, certificates
- "Medical Records" - Health documents
- Any custom document type

## Usage Examples

### Frontend Integration

```javascript
// Upload profile image
const profileFormData = new FormData();
profileFormData.append("profileImage", imageFile);

const profileResponse = await fetch("/api/users/profile-image", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: profileFormData,
});

// Upload documents
const docFormData = new FormData();
docFormData.append("documents", documentFile1);
docFormData.append("documents", documentFile2);
docFormData.append("documentType", "Government ID");
docFormData.append("description", "Passport for verification");
docFormData.append("expiryDate", "2030-12-31");

const docResponse = await fetch("/api/documents/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: docFormData,
});

// Get all user documents
const docsResponse = await fetch("/api/documents", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Get optimized image URL (for general images)
const optimizedUrl = `/api/images/url/${publicId}?width=300&height=300&crop=fill`;
```

### Response Format

All endpoints return standardized API responses:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "image_public_id",
    "width": 1920,
    "height": 1080,
    "format": "jpg",
    "bytes": 245760,
    "thumbnailUrl": "https://res.cloudinary.com/..."
  }
}
```

## Security Considerations

1. **Authentication**: All upload and delete operations require authentication
2. **File Type Validation**: Only image files are accepted
3. **File Size Limits**: Prevents abuse with large file uploads
4. **Error Handling**: Comprehensive error handling with appropriate status codes

## Testing

Use the provided Postman collection (`Coordle_Backend_API.postman_collection.json`) which includes all image management endpoints with sample requests.

## Troubleshooting

### Common Issues

1. **Invalid Credentials Error**

   - Verify environment variables are correctly set
   - Check Cloudinary dashboard for correct credentials

2. **File Upload Fails**

   - Ensure file size is under 10MB
   - Verify file is a valid image format
   - Check if authentication token is valid

3. **Image Not Found**

   - Verify the public ID exists in your Cloudinary account
   - Check if the image was deleted or moved

4. **Transformation Errors**
   - Ensure transformation parameters are valid
   - Check Cloudinary documentation for supported parameters

## Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Transformation Reference](https://cloudinary.com/documentation/image_transformations)
- [Node.js SDK Documentation](https://cloudinary.com/documentation/node_integration)
