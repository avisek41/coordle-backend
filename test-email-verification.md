# Email Verification Test Guide

## Test the Complete Email Verification Flow

### Step 1: Send Verification Link

```bash
curl -X POST http://localhost:3000/api/verification/send-email-link \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Email verification link sent successfully",
  "data": {
    "email": "test@example.com",
    "expiresIn": "24 hours"
  }
}
```

### Step 2: Check Database Before Verification

```javascript
// In MongoDB shell or Compass
db.users.findOne({ email: "test@example.com" });
// Should return null or user with isEmailVerified: false
```

### Step 3: Verify Email (Simulate clicking link)

```bash
curl -X POST http://localhost:3000/api/verification/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "token": "TOKEN_FROM_EMAIL_LINK"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Email address verified successfully",
  "data": {
    "email": "test@example.com",
    "isEmailVerified": true,
    "isPhoneVerified": false,
    "userId": "64f8a1b2c3d4e5f6a7b8c9d0"
  }
}
```

### Step 4: Check Database After Verification

```javascript
// In MongoDB shell or Compass
db.users.findOne({ email: "test@example.com" });
// Should return user with isEmailVerified: true
```

## Database Schema Verification

The user document should look like this after email verification:

```json
{
  "_id": ObjectId("64f8a1b2c3d4e5f6a7b8c9d0"),
  "email": "test@example.com",
  "name": "",
  "isEmailVerified": true,
  "isPhoneVerified": false,
  "userRole": "traveller",
  "createdAt": ISODate("2024-01-01T00:00:00.000Z"),
  "updatedAt": ISODate("2024-01-01T00:00:00.000Z")
}
```

## Key Points:

1. **✅ User Creation**: If no user exists, creates new user with `isEmailVerified: true`
2. **✅ User Update**: If user exists, updates `isEmailVerified: true`
3. **✅ Token Cleanup**: Deletes verification token after successful verification
4. **✅ Response Data**: Returns updated user status in response
5. **✅ Database Persistence**: Changes are saved to MongoDB

## Error Cases to Test:

### Invalid Token

```bash
curl -X POST http://localhost:3000/api/verification/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "token": "invalid_token"
  }'
```

### Expired Token

```bash
# Wait 24 hours or manually expire token in database
```

### Missing Fields

```bash
curl -X POST http://localhost:3000/api/verification/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```
