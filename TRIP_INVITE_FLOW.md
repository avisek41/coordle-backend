# Trip Invite Flow - Option 1 (Separate Steps)

## Overview

This document describes the **Option 1** approach for inviting users to trips using separate API calls for registration and trip addition.

## Flow Summary

1. **Step 1**: Register user with `isInvited: true` flag
2. **Step 2**: Add user to trip using the returned user ID

## Step 1: Register User with Invite Flag

### API Endpoint

```
POST /api/users/register
```

### Request Body

```json
{
  "email": "invited@example.com",
  "userRole": "traveller",
  "registrationMethod": "email",
  "isInvited": true
}
```

### What Happens

- ✅ User gets registered in the system
- ✅ **Welcome email is automatically sent** (because `isInvited: true`)
- ✅ User gets a JWT token for immediate access
- ✅ Response includes user ID and invite info

### Response

```json
{
  "success": true,
  "message": "User registered successfully with email",
  "data": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "email": "invited@example.com",
    "name": "",
    "userRole": "traveller",
    "isPhoneVerified": false,
    "isEmailVerified": false,
    "isProfileSetup": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "inviteInfo": {
      "isInvited": true,
      "welcomeEmailSent": true,
      "userRef": "/users/64f1a2b3c4d5e6f7g8h9i0j1"
    }
  }
}
```

## Step 2: Add User to Trip

### API Endpoint

```
POST /api/trips/:tripId/participants
```

### Request Body

```json
{
  "userId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "userRole": "traveller"
}
```

### What Happens

- ✅ User gets added to trip's `users` array
- ✅ If role is "host", also added to `hosts` array
- ✅ Trip's `invite_count` increases
- ✅ User can now access the trip

### Response

```json
{
  "success": true,
  "message": "User added to trip successfully",
  "data": {
    "tripId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "userId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "userRole": "traveller",
    "userRef": "/users/64f1a2b3c4d5e6f7g8h9i0j1"
  }
}
```

## Frontend Implementation

### JavaScript Example

```javascript
// Step 1: Register user with invite flag
const registerResponse = await fetch("/api/users/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "invited@example.com",
    userRole: "traveller",
    registrationMethod: "email",
    isInvited: true,
  }),
});

const userData = await registerResponse.json();
const userId = userData.data.id;

// Step 2: Add user to trip
const addToTripResponse = await fetch(`/api/trips/${tripId}/participants`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  },
  body: JSON.stringify({
    userId: userId,
    userRole: "traveller",
  }),
});

const tripData = await addToTripResponse.json();
console.log("User successfully invited to trip!");
```

## Error Handling

### Registration Errors

- **Email already exists**: User already registered
- **Invalid email format**: Email validation failed
- **Password validation**: If password provided, must meet requirements

### Trip Addition Errors

- **User not found**: User ID doesn't exist
- **User already in trip**: User is already a participant
- **Permission denied**: Only trip owners/hosts can add users
- **Trip not found**: Invalid trip ID

## User Roles

### Available Roles

- **`traveller`**: Regular trip participant (default)
- **`host`**: Trip host with additional permissions

### Role Behavior

- **Travellers**: Added to `users` array only
- **Hosts**: Added to both `users` and `hosts` arrays

## Trip Schema Structure

```typescript
{
  owner_id: string,        // Trip owner (single user)
  users: string[],         // ALL participants (travelers + hosts)
  hosts: string[],         // ONLY hosts (subset of users)
  invite_count: number     // Number of invited users
}
```

## Benefits of Option 1

- ✅ **Clear separation**: Registration and trip addition are separate concerns
- ✅ **Flexible**: Owner can register user first, then decide later if to add to trip
- ✅ **Reusable**: Registration API can be used for non-trip invites too
- ✅ **Better error handling**: Can handle registration failure separately from trip addition
- ✅ **Frontend control**: Frontend can show different UI states for each step

## API Endpoints Summary

| Endpoint                          | Method | Description                    |
| --------------------------------- | ------ | ------------------------------ |
| `/api/users/register`             | POST   | Register user with invite flag |
| `/api/trips/:tripId/participants` | POST   | Add user to trip               |
| `/api/trips/:tripId/participants` | DELETE | Remove user from trip          |
| `/api/trips/:tripId/participants` | GET    | Get trip participants          |
| `/api/trips/:tripId/check-user`   | GET    | Check if user is in trip       |

## Testing

### Postman Collection

The Postman collection includes examples for:

- Register User (Email with Password - Invited)
- Register User (Email without Password - Invited)
- Add User to Trip
- Remove User from Trip
- Get Trip Participants
- Check User in Trip
