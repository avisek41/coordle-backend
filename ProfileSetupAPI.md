# Profile Setup API Documentation

## Overview

The Profile Setup API allows users to set up their profile information. All profile fields are optional, and only the authentication token is required.

## Endpoint

```
PUT /api/users/setup-profile
```

## Authentication

- **Required**: Bearer token in Authorization header
- **Header**: `Authorization: Bearer <your-jwt-token>`

## Request Body

All fields are optional. You can send any combination of the following fields:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "preferredName": "Johnny",
  "phoneNumber": "+1234567890",
  "pronouns": "he/him",
  "country": "United States",
  "state": "California",
  "postalCode": "90210",
  "preferredAirport": "LAX",
  "racialEthnic": "Asian American",
  "ageDemographic": "25-34",
  "foodAllergies": ["nuts", "shellfish"],
  "dietaryRestrictions": "Vegetarian",
  "genderIdentity": "Male",
  "sexualOrientation": true,
  "disabilityStatus": false
}
```

## Field Descriptions

| Field                 | Type    | Description                     | Max Length     |
| --------------------- | ------- | ------------------------------- | -------------- |
| `firstName`           | string  | User's first name               | 50 characters  |
| `lastName`            | string  | User's last name                | 50 characters  |
| `preferredName`       | string  | User's preferred name           | 50 characters  |
| `phoneNumber`         | string  | User's phone number             | -              |
| `pronouns`            | string  | User's preferred pronouns       | 20 characters  |
| `country`             | string  | User's country                  | 50 characters  |
| `state`               | string  | User's state/province           | 50 characters  |
| `postalCode`          | string  | User's postal code              | 20 characters  |
| `preferredAirport`    | string  | User's preferred airport code   | 10 characters  |
| `racialEthnic`        | string  | User's racial/ethnic background | 100 characters |
| `ageDemographic`      | string  | User's age demographic          | 50 characters  |
| `foodAllergies`       | array   | Array of food allergies         | -              |
| `dietaryRestrictions` | string  | User's dietary restrictions     | 200 characters |
| `genderIdentity`      | string  | User's gender identity          | 50 characters  |
| `sexualOrientation`   | boolean | User's sexual orientation       | -              |
| `disabilityStatus`    | boolean | User's disability status        | -              |

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "_id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "preferredName": "Johnny",
    "phoneNumber": "+1234567890",
    "pronouns": "he/him",
    "country": "United States",
    "state": "California",
    "postalCode": "90210",
    "preferredAirport": "LAX",
    "racialEthnic": "Asian American",
    "ageDemographic": "25-34",
    "foodAllergies": ["nuts", "shellfish"],
    "dietaryRestrictions": "Vegetarian",
    "genderIdentity": "Male",
    "sexualOrientation": true,
    "disabilityStatus": false,
    "isProfileSetup": true,
    "userRole": "traveller",
    "isPhoneVerified": false,
    "isEmailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Authentication required",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 409 Conflict (Phone Number Already Exists)

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Phone number is already registered with another account",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "statusCode": 500,
  "message": "Internal server error",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Usage Examples

### Example 1: Set up basic profile

```bash
curl -X PUT http://localhost:3000/api/users/setup-profile \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "country": "United States"
  }'
```

### Example 2: Update specific fields

```bash
curl -X PUT http://localhost:3000/api/users/setup-profile \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "preferredName": "Johnny",
    "pronouns": "he/him",
    "foodAllergies": ["nuts", "dairy"]
  }'
```

### Example 3: Complete profile setup

```bash
curl -X PUT http://localhost:3000/api/users/setup-profile \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "preferredName": "Johnny",
    "phoneNumber": "+1234567890",
    "pronouns": "he/him",
    "country": "United States",
    "state": "California",
    "postalCode": "90210",
    "preferredAirport": "LAX",
    "racialEthnic": "Asian American",
    "ageDemographic": "25-34",
    "foodAllergies": ["nuts", "shellfish"],
    "dietaryRestrictions": "Vegetarian",
    "genderIdentity": "Male",
    "sexualOrientation": true,
    "disabilityStatus": false
  }'
```

## Notes

1. **All fields are optional**: You can send any combination of fields
2. **Progressive setup**: Users can set up their profile gradually
3. **Token required**: Only the JWT token is mandatory
4. **Phone number validation**: If updating phone number, it checks for uniqueness
5. **Profile setup flag**: The `isProfileSetup` field is automatically set to `true` when any profile field is updated
6. **Validation**: All string fields have maximum length limits
7. **Privacy**: Users have full control over what information they share

## Testing

You can test this API using:

- Postman
- cURL
- Any HTTP client

Make sure to:

1. First register/login to get a JWT token
2. Use the token in the Authorization header
3. Send only the fields you want to update
