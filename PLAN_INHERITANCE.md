# Plan Inheritance Feature

## Overview

The Plan Inheritance feature allows trip owners to automatically share their subscription plan with invited users. When an owner invites users to a trip, those users will automatically inherit the same plan as the owner, ensuring they have access to the same features and capabilities.

## How It Works

### 1. Plan Storage

- **User Model**: Each user now has a `planId` field that references their active plan
- **Payment Integration**: When a user pays for a plan, their `planId` is automatically set
- **Role Upgrade**: Users with plans automatically get upgraded from `traveller` to `owner` role

### 2. Plan Inheritance Logic

- **Owner Check**: Only trip owners (not hosts) can share their plans
- **Automatic Assignment**: Invited users automatically get the owner's plan if they don't have one
- **Existing Users**: Users who already have plans keep their current plans
- **New Users**: Newly registered users inherit the owner's plan

### 3. Implementation Points

#### User Registration (inviteUsersToTrip)

- New users created during invitation inherit the owner's plan
- Existing users without plans get updated with the owner's plan
- Response includes plan inheritance information

#### Direct Trip Addition (addUserToTrip)

- Single user addition includes plan inheritance
- Response shows whether plan was inherited

#### Bulk Trip Addition (addMultipleUsersToTrip)

- Multiple users can inherit plans in bulk
- Summary includes plan inheritance statistics

## API Endpoints

### Plan Management Routes (`/api/users`)

- `GET /same-plan/:ownerId` - Get all users with the same plan as an owner
- `POST /invite-to-trip` - Invite users to trip with plan inheritance

## API Response Changes

### Get Users with Same Plan Response

```json
{
  "success": true,
  "message": "Users with same plan retrieved successfully",
  "data": {
    "owner": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "userRole": "owner"
    },
    "plan": {
      "planId": "64f1a2b3c4d5e6f7g8h9i0j2",
      "planName": "Organizations",
      "planVariant": "PRO",
      "price": 1200,
      "currency": "usd",
      "features": [
        "Unlimited trips",
        "Invite unlimited members",
        "3 Hosts per trip",
        "15 Days free trial"
      ]
    },
    "users": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j3",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phoneNumber": "+1234567891",
        "userRole": "owner",
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j4",
        "name": "Bob Johnson",
        "email": "bob@example.com",
        "phoneNumber": "+1234567892",
        "userRole": "owner",
        "createdAt": "2024-01-16T14:20:00.000Z"
      }
    ],
            "summary": {
          "totalUsers": 2,
          "totalUsersWithSamePlan": 3,
          "usersAlreadyInTrips": 1,
          "planId": "64f1a2b3c4d5e6f7g8h9i0j2"
        }
  }
}
```

### Invite Users to Trip Response

```json
{
  "success": true,
  "message": "Bulk invite completed",
  "data": {
    "tripId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "results": [
      {
        "contact": "user@example.com",
        "contactType": "email",
        "success": true,
        "exists": false,
        "userId": "64f1a2b3c4d5e6f7g8h9i0j2",
        "message": "User registered successfully",
        "planInherited": true,
        "planId": "64f1a2b3c4d5e6f7g8h9i0j3"
      }
    ],
    "summary": {
      "total": 1,
      "successful": 1,
      "failed": 0,
      "existing": 0,
      "new": 1,
      "addedToTrip": 1,
      "planInheritance": {
        "ownerHasPlan": true,
        "planInherited": 1,
        "plansUpdated": 0
      }
    }
  }
}
```

### Add User to Trip Response

```json
{
  "success": true,
  "message": "User added to trip successfully",
  "data": {
    "tripId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "userId": "64f1a2b3c4d5e6f7g8h9i0j2",
    "userRole": "traveller",
    "userRef": "/users/64f1a2b3c4d5e6f7g8h9i0j2",
    "planInheritance": {
      "planInherited": true,
      "ownerPlanId": "64f1a2b3c4d5e6f7g8h9i0j3"
    }
  }
}
```

## Database Changes

### User Model Updates

```typescript
export interface IUser extends Document {
  // ... existing fields
  planId?: mongoose.Types.ObjectId; // Reference to the user's plan
  // ... other fields
}
```

### New Index

```typescript
userSchema.index({ planId: 1 });
```

## Business Rules

1. **Owner Only**: Only trip owners can share their plans (hosts cannot)
2. **No Override**: Users with existing plans keep their current plans
3. **Automatic**: Plan inheritance happens automatically during invitation
4. **Transparent**: Users are notified when they inherit a plan
5. **Audit Trail**: All plan changes are logged and tracked

### Plan Discovery Rules

1. **Authentication Required**: Users must be authenticated to view plan information
2. **Owner Validation**: The specified ownerId must exist and have a plan
3. **Exclusive Results**: Owner is excluded from the results (only other users shown)
4. **Limited User Data**: Only essential user information is returned for privacy
5. **Plan Details**: Full plan information is included for context
6. **Trip Exclusion**: Users already in owner's trips are automatically excluded from results
7. **Real-time Updates**: List automatically updates when users are invited to trips

## Error Handling

- Plan inheritance failures don't block user invitation
- Errors are logged but don't affect the main flow
- Users can still be added to trips even if plan inheritance fails

### API Error Responses

**Owner Not Found:**

```json
{
  "success": false,
  "message": "Owner not found",
  "statusCode": 404
}
```

**Owner Has No Plan:**

```json
{
  "success": false,
  "message": "Owner does not have a plan",
  "statusCode": 400
}
```

**Invalid Owner ID:**

```json
{
  "success": false,
  "message": "Invalid owner ID format",
  "statusCode": 400
}
```

## Testing Scenarios

1. **Owner with Plan invites User without Plan**

   - User should inherit owner's plan
   - Response should show `planInherited: true`

2. **Owner with Plan invites User with Plan**

   - User should keep their existing plan
   - Response should show `planInherited: false`

3. **Host invites User**

   - No plan inheritance should occur
   - User should remain with their current plan

4. **Owner without Plan invites User**

   - No plan inheritance should occur
   - Response should show `ownerHasPlan: false`

5. **Get Users with Same Plan - Owner with Plan**

   - Should return all users with matching planId
   - Owner should be excluded from results
   - Plan details should be included

6. **Get Users with Same Plan - Owner without Plan**

   - Should return error: "Owner does not have a plan"
   - Status code should be 400

7. **Get Users with Same Plan - Invalid Owner ID**
   - Should return error: "Invalid owner ID format"
   - Status code should be 400

8. **Get Users with Same Plan - Trip Exclusion**
   - Users already in owner's trips should be excluded from results
   - Summary should show correct counts for available vs. excluded users
   - API should return only users available for new invitations

## Usage Examples

### Finding Users with Same Plan

To find all users who have the same plan as a specific owner:

**Important**: This API automatically excludes users who are already in trips with the owner, ensuring you only see available users for new invitations.

```bash
GET /api/users/same-plan/{ownerId}
Authorization: Bearer {token}
```

**Example Request:**

```bash
GET /api/users/same-plan/64f1a2b3c4d5e6f7g8h9i0j1
```

**Use Cases:**

- **Trip Owners**: Find other users with the same plan for collaboration
- **Admin Analytics**: Monitor plan distribution across users
- **Support**: Identify users affected by plan changes
- **Marketing**: Target users with specific plan features

**Summary Fields:**
- **totalUsers**: Number of available users (excluding those already in trips)
- **totalUsersWithSamePlan**: Total users with the same plan (including those in trips)
- **usersAlreadyInTrips**: Number of users already in owner's trips
- **planId**: The plan ID being searched

## Future Enhancements

1. **Plan Expiry**: Handle plan expiration and renewal
2. **Plan Downgrades**: Allow users to change plans
3. **Usage Tracking**: Monitor plan usage across inherited users
4. **Notifications**: Alert users when they inherit or lose plans
5. **Admin Controls**: Allow admins to manage plan inheritance rules
