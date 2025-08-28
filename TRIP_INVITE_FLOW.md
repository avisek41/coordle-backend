# Trip Invite Flow - Enhanced with Phone Number Support

## Overview

This document describes the enhanced trip invite flow that now supports both **email and phone number** invites using the combined API.

## Enhanced API: Invite Users to Trip (Email + Phone)

### API Endpoint

```
POST /api/users/invite-to-trip
```

### Request Body

The API now supports three types of invites:

#### 1. Email-Only Invites

```json
{
  "tripId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "users": [
    {
      "email": "user1@example.com",
      "userRole": "traveller",
      "isInvited": true
    },
    {
      "email": "user2@example.com",
      "userRole": "host",
      "isInvited": true
    }
  ]
}
```

#### 2. Phone-Only Invites

```json
{
  "tripId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "users": [
    {
      "phoneNumber": "+1234567890",
      "userRole": "traveller",
      "isInvited": true
    },
    {
      "phoneNumber": "+447911123456",
      "userRole": "host",
      "isInvited": true
    },
    {
      "phoneNumber": "+919876543210",
      "userRole": "traveller",
      "isInvited": true
    }
  ]
}
```

#### 3. Mixed Email & Phone Invites

```json
{
  "tripId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "users": [
    {
      "email": "user1@example.com",
      "userRole": "traveller",
      "isInvited": true
    },
    {
      "phoneNumber": "+1234567890",
      "userRole": "host",
      "isInvited": true
    },
    {
      "email": "user3@example.com",
      "phoneNumber": "+447911123456",
      "userRole": "traveller",
      "isInvited": true
    }
  ]
}
```

### What Happens

#### For Email Users:

- ✅ User gets registered in the system (if new)
- ✅ **Welcome email is automatically sent** (because `isInvited: true`)
- ✅ User gets added to trip
- ✅ Response includes user ID and invite info

#### For Phone Users:

- ✅ User gets registered in the system (if new)
- ✅ **Phone verification status set to false** (needs verification)
- ✅ User gets added to trip
- ✅ Response includes user ID and invite info
- ⚠️ **SMS welcome message** (needs implementation)

### Response

```json
{
  "success": true,
  "message": "Bulk invite completed",
  "data": {
    "tripId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "results": [
      {
        "contact": "user1@example.com",
        "contactType": "email",
        "success": true,
        "exists": false,
        "userId": "64f1a2b3c4d5e6f7g8h9i0j2",
        "message": "User registered successfully"
      },
      {
        "contact": "+1234567890",
        "contactType": "phone",
        "success": true,
        "exists": true,
        "userId": "64f1a2b3c4d5e6f7g8h9i0j3",
        "message": "User already exists"
      }
    ],
    "errors": [],
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0,
      "existing": 1,
      "new": 1,
      "addedToTrip": 2,
      "alreadyInTrip": 0
    }
  }
}
```

## Validation Rules

### Email Validation

- Must be valid email format: `user@domain.com`
- Required if no phone number provided

### Phone Number Validation

- Must be valid international format with country code: `+1234567890`
- **Country code is REQUIRED** (must start with `+`)
- Supports formats: `+1234567890`, `+447911123456`, `+919876543210`
- Required if no email provided

### User Requirements

- At least one contact method (email OR phone) is required
- Both email and phone can be provided for the same user
- `userRole` defaults to "traveller" if not specified
- `isInvited` defaults to `true` if not specified

## Duplicate User Handling

### Email Duplicates

- If user exists by email, reuses existing user
- No duplicate user created

### Phone Duplicates

- If user exists by phone number, reuses existing user
- No duplicate user created

### Mixed Duplicates

- If user exists by either email or phone, reuses existing user
- System checks both contact methods for existing users

## Trip Addition Logic

### User Addition

- All users (new and existing) get added to trip's `users` array
- If `userRole` is "host", also added to `hosts` array
- Trip's `invite_count` increases for each new addition

### Duplicate Trip Addition

- If user is already in trip, returns an error
- Error message: "User is already part of this trip"
- No duplicate addition to trip

## Error Handling

### Validation Errors

```json
{
  "success": false,
  "message": "Invalid phone number format: 1234567890",
  "statusCode": 400
}
```

### Permission Errors

```json
{
  "success": false,
  "message": "Only trip owners and hosts can invite users to trips",
  "statusCode": 403
}
```

### Processing Errors

```json
{
  "success": true,
  "data": {
    "results": [...],
    "errors": [
      {
        "contact": "+1234567890",
        "contactType": "phone",
        "error": "User is already part of this trip"
      },
      {
        "contact": "user@example.com",
        "contactType": "email",
        "error": "Invalid phone number format. Must be like +1234567890 with country code"
      }
    ]
  }
}
```

## API Endpoints Summary

| Endpoint                          | Method | Description                                     |
| --------------------------------- | ------ | ----------------------------------------------- |
| `/api/users/invite-to-trip`       | POST   | **NEW**: Bulk invite with email & phone support |
| `/api/trips/:tripId/participants` | POST   | Add existing user to trip                       |
| `/api/trips/:tripId/participants` | DELETE | Remove user from trip                           |
| `/api/trips/:tripId/participants` | GET    | Get trip participants                           |
| `/api/trips/:tripId/check-user`   | GET    | Check if user is in trip                        |

## Testing

### Postman Collection

The Postman collection includes examples for:

- **Invite Users to Trip (Email Only)**
- **Invite Users to Trip (Phone Only)**
- **Invite Users to Trip (Mixed Email & Phone)**

### Test Scenarios

1. **Email-only bulk invite**
2. **Phone-only bulk invite**
3. **Mixed email and phone invite**
4. **Duplicate user handling**
5. **Invalid contact format validation**
6. **Permission validation**

## Benefits of Enhanced API

- ✅ **Flexible**: Support both email and phone invites
- ✅ **Efficient**: Single API call for bulk invites
- ✅ **Smart**: Handles duplicates automatically
- ✅ **Comprehensive**: Validates all contact formats
- ✅ **Scalable**: Works with any number of users
- ✅ **User-friendly**: Clear error messages and status
