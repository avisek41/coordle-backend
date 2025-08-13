# Trip Cover Image Management

## Overview

The trip cover image management has been enhanced to properly handle image replacement and cleanup in Cloudinary. This ensures that old images are deleted when new ones are uploaded, and all images are properly cleaned up when trips are deleted.

## Key Features

### 1. Image Replacement

- **Old images are automatically deleted** when a new cover image is uploaded
- **No orphaned images** left in Cloudinary
- **Storage optimization** by removing unused images

### 2. Trip Deletion Cleanup

- **All cover images are deleted** when a trip is deleted
- **Complete cleanup** of Cloudinary resources
- **No storage waste** from deleted trips

### 3. Public ID Storage

- **Public IDs are stored** in the database for efficient deletion
- **No URL parsing required** for deletion operations
- **More reliable** than extracting IDs from URLs

## Database Schema Changes

### Trip Model Updates

```typescript
cover_image: {
  url: string; // Cloudinary URL
  publicId: string; // Cloudinary Public ID (NEW)
  uploadedAt: Date; // Upload timestamp
}
```

## API Endpoints

### 1. Create Trip with Cover Image

```
POST /api/trips
Content-Type: multipart/form-data
Authorization: Bearer {{authToken}}

Form Data:
- coverImage: [file] (optional)
- name: [text]
- to_address: [text]
- ... other trip fields
```

**Behavior:**

- Uploads cover image to Cloudinary
- Stores both URL and Public ID
- No old image to delete (new trip)

### 2. Update Trip with Cover Image

```
PUT /api/trips/:id
Content-Type: multipart/form-data
Authorization: Bearer {{authToken}}

Form Data:
- coverImage: [file] (optional)
- name: [text] (optional)
- to_address: [text] (optional)
- ... other trip fields
```

**Behavior:**

- **Deletes old cover image** from Cloudinary (if exists)
- Uploads new cover image to Cloudinary
- Updates both URL and Public ID
- **Replaces old image completely**

### 3. Upload Trip Cover Image (Separate Endpoint)

```
POST /api/trips/:id/cover-image
Content-Type: multipart/form-data
Authorization: Bearer {{authToken}}

Form Data:
- coverImage: [file] (required)
```

**Behavior:**

- **Deletes old cover image** from Cloudinary (if exists)
- Uploads new cover image to Cloudinary
- Updates both URL and Public ID
- **Replaces old image completely**

### 4. Delete Trip

```
DELETE /api/trips/:id
Authorization: Bearer {{authToken}}
```

**Behavior:**

- **Deletes entire trip folder** from Cloudinary (cover images, gallery images, etc.)
- Deletes trip from database
- **Complete cleanup** of all trip resources

## Implementation Details

### Cloudinary Integration

```typescript
// Upload with overwrite enabled
const uploadResult = await uploadTripCoverImage(buffer, tripId);

// Delete single image using stored public ID
await deleteTripImage(publicId);

// Delete entire trip folder (all images)
await deleteTripFolder(tripId);
```

### Error Handling

- **Graceful degradation**: If image deletion fails, upload continues
- **Logging**: All errors are logged for debugging
- **No blocking**: Image operations don't block trip operations

### Storage Optimization

- **Automatic cleanup**: Old images are removed immediately
- **No duplicates**: Each trip has only one cover image
- **Efficient deletion**: Uses stored public IDs for fast deletion
- **Complete folder cleanup**: Entire trip folders deleted when trips are removed

## Example Workflow

### 1. Create Trip with Cover Image

```javascript
// User creates a trip with cover image
const formData = new FormData();
formData.append('name', 'My Trip');
formData.append('coverImage', imageFile);

// Result: Image uploaded, URL and Public ID stored
{
  "cover_image": {
    "url": "https://res.cloudinary.com/.../image.jpg",
    "publicId": "coordle/trips/123/cover/cover_123_1234567890",
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Update Trip with New Cover Image

```javascript
// User updates trip with new cover image
const formData = new FormData();
formData.append("name", "Updated Trip");
formData.append("coverImage", newImageFile);

// Result: Old image deleted, new image uploaded
// Old: coordle/trips/123/cover/cover_123_1234567890 (DELETED)
// New: coordle/trips/123/cover/cover_123_1234567891 (UPLOADED)
```

### 3. Delete Trip

```javascript
// User deletes the trip
DELETE / api / trips / 123;

// Result: Entire trip folder deleted from Cloudinary
// coordle/trips/123/ (ENTIRE FOLDER DELETED)
// - coordle/trips/123/cover/cover_123_1234567891 (DELETED)
// - coordle/trips/123/gallery/image1_1234567892 (DELETED)
// - coordle/trips/123/gallery/image2_1234567893 (DELETED)
```

## Benefits

### 1. Storage Efficiency

- **No orphaned images** in Cloudinary
- **Automatic cleanup** prevents storage waste
- **Cost optimization** by removing unused resources

### 2. Data Integrity

- **Consistent state** between database and Cloudinary
- **Reliable deletion** using stored public IDs
- **No broken image links**

### 3. User Experience

- **Seamless image replacement** without manual cleanup
- **Fast operations** with stored public IDs
- **Reliable image management**

## Migration Notes

### For Existing Trips

- **Existing trips** without publicId will still work
- **New uploads** will store publicId automatically
- **Gradual migration** as trips are updated

### Backward Compatibility

- **API remains the same** for clients
- **No breaking changes** in request/response format
- **Enhanced functionality** without disruption

## Testing

### Test Scenarios

1. **Create trip with cover image** → Verify image uploaded and stored
2. **Update trip with new cover image** → Verify old image deleted, new image uploaded
3. **Update trip without cover image** → Verify no image changes
4. **Delete trip with cover image** → Verify image deleted from Cloudinary
5. **Delete trip without cover image** → Verify no errors

### Verification Steps

1. Check Cloudinary dashboard for image presence/absence
2. Verify database contains correct publicId
3. Confirm API responses include updated image data
4. Test error scenarios (network issues, invalid files, etc.)
