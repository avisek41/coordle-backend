# Email Verification API

This document describes the email verification API endpoints for the Coordle backend.

## Endpoints

### 1. Send Email Verification Link

**POST** `/api/verification/send-email-link`

Sends an email verification link to the specified email address.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Email verification link sent successfully",
  "data": {
    "email": "user@example.com",
    "expiresIn": "24 hours"
  }
}
```

### 2. Verify Email Address

**POST** `/api/verification/verify-email`

Verifies an email address using the token from the verification link.

**Request Body:**

```json
{
  "email": "user@example.com",
  "token": "verification_token_from_link"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Email address verified successfully",
  "data": {
    "email": "user@example.com",
    "isEmailVerified": true,
    "isPhoneVerified": false,
    "userId": "user_id"
  }
}
```

### 3. Resend Email Verification Link

**POST** `/api/verification/resend-email-link`

Resends an email verification link to the specified email address.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Email verification link resent successfully",
  "data": {
    "email": "user@example.com",
    "expiresIn": "24 hours"
  }
}
```

## Features

- **24-hour expiration**: Verification links expire after 24 hours
- **Rate limiting**: Resend requests are limited to once every 5 minutes
- **Automatic cleanup**: Expired verification links are automatically deleted
- **User creation**: If no user exists with the email, a new user is created with verified email
- **Duplicate prevention**: Prevents sending verification links to already verified emails

## Environment Variables

Make sure to set the following environment variables:

- `FRONTEND_URL`: The base URL of your frontend application (defaults to `http://localhost:3000`)
- `MY_GMAIL`: Your Gmail address for sending emails
- `MY_PASSWORD`: Your Gmail app password

## Usage Flow

1. User provides email address
2. System sends verification link via email
3. User clicks link or manually enters token
4. System verifies token and marks email as verified
5. User can now use the verified email for authentication

## Error Responses

### Invalid Email

```json
{
  "success": false,
  "message": "Email is required"
}
```

### Already Verified

```json
{
  "success": false,
  "message": "Email is already verified for another user"
}
```

### Invalid/Expired Token

```json
{
  "success": false,
  "message": "Invalid or expired verification link"
}
```

### Rate Limit Exceeded

```json
{
  "success": false,
  "message": "Please wait 5 minutes before requesting another verification link"
}
```
