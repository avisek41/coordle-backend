# Phone Verification Flow Guide

## Overview

There are two different phone verification flows depending on whether the user is **registering** (new user) or **logging in** (existing user).

## 🔍 Check User Existence First

Before deciding which flow to use, you can check if a user exists by phone number:

**POST** `/api/users/check-user-by-phone`

```json
{
  "phoneNumber": "+918637222653"
}
```

**Response (User Exists):**

```json
{
  "success": true,
  "message": "User found",
  "data": {
    "exists": true,
    "action": "login",
    "message": "User exists. Please use login flow.",
    "user": {
      "id": "user_id_here",
      "name": "User Name",
      "phoneNumber": "+918637222653",
      "isPhoneVerified": true,
      "isEmailVerified": false,
      "isProfileSetup": false,
      "userRole": "traveller"
    }
  }
}
```

**Response (User Doesn't Exist):**

```json
{
  "success": true,
  "message": "User not found",
  "data": {
    "exists": false,
    "action": "register",
    "message": "User does not exist. Please use registration flow."
  }
}
```

## 🔐 For New User Registration

### Step 1: Send Verification Code

**POST** `/api/verification/send-code`

```json
{
  "phoneNumber": "+918637222653"
}
```

**Note:** This endpoint will block if the phone number is already verified for another user.

### Step 2: Verify Phone Number

**POST** `/api/verification/verify`

```json
{
  "phoneNumber": "+918637222653",
  "code": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Phone number verified successfully",
  "data": {
    "phoneNumber": "+918637222653",
    "isPhoneVerified": true,
    "isEmailVerified": false,
    "isProfileSetup": false,
    "userId": "user_id_here",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Step 3: Register User (Optional)

**POST** `/api/verification/register`

```json
{
  "phoneNumber": "+918637222653",
  "name": "Your Name",
  "userRole": "traveller"
}
```

## 🔑 For Existing User Login

### Step 1: Send Login Verification Code

**POST** `/api/users/send-login-code`

```json
{
  "phoneNumber": "+918637222653"
}
```

**Note:** This endpoint requires the user to already exist in the database.

### Step 2: Login with Verification Code

**POST** `/api/users/login`

```json
{
  "phoneNumber": "+918637222653",
  "verificationCode": "123456",
  "loginMethod": "phone"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful with phone verification",
  "data": {
    "id": "user_id_here",
    "name": "Your Name",
    "phoneNumber": "+918637222653",
    "isPhoneVerified": true,
    "isEmailVerified": false,
    "isProfileSetup": false,
    "userRole": "traveller",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 🚨 Common Issues and Solutions

### Issue: "Phone number is already verified for another user"

**Cause:** Using `/api/verification/send-code` for login instead of `/api/users/send-login-code`

**Solution:** Use the correct endpoint:

- For **new users**: Use `/api/verification/send-code`
- For **existing users**: Use `/api/users/send-login-code`

### Issue: "User not found"

**Cause:** Using `/api/users/send-login-code` for a phone number that hasn't been registered

**Solution:** Use the registration flow instead:

1. Use `/api/verification/send-code`
2. Complete the registration process

## 📋 Summary

| Action       | New User                      | Existing User                |
| ------------ | ----------------------------- | ---------------------------- |
| Send Code    | `/api/verification/send-code` | `/api/users/send-login-code` |
| Verify/Login | `/api/verification/verify`    | `/api/users/login`           |
| Register     | `/api/verification/register`  | Not needed                   |

## 🔄 Complete Flow Examples

### New User Registration Flow:

1. `POST /api/verification/send-code` → Get verification code
2. `POST /api/verification/verify` → Verify phone (get token)
3. `POST /api/verification/register` → Add user details

### Existing User Login Flow:

1. `POST /api/users/send-login-code` → Get verification code
2. `POST /api/users/login` → Login with code (get token)
