# Auth API - Postman Ready

## Phone Verification Flow

### 1. Send Verification Code

**POST** `/api/verification/send-code`

**Request Body:**

```json
{
  "phoneNumber": "+1234567890"
}
```

---

### 2. Verify Phone Number

**POST** `/api/verification/verify`

**Request Body:**

```json
{
  "phoneNumber": "+1234567890",
  "code": "123456"
}
```

---

### 3. Resend Verification Code

**POST** `/api/verification/resend-code`

**Request Body:**

```json
{
  "phoneNumber": "+1234567890"
}
```

---

### 4. Register User After Phone Verification

**POST** `/api/verification/register`

**Request Body:**

```json
{
  "phoneNumber": "+1234567890",
  "name": "John Doe",
  "userRole": "traveller"
}
```

---

## User Registration

### 5. Register User (Email or Phone)

**POST** `/api/users/register`

**Request Body (Email Registration):**

```json
{
  "registrationMethod": "email",
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "userRole": "traveller",
  "phoneNumber": "+1234567890"
}
```

**Request Body (Phone Registration):**

```json
{
  "registrationMethod": "phone",
  "name": "John Doe",
  "phoneNumber": "+1234567890",
  "userRole": "traveller"
}
```

---

## Login Flow

### 6. Send Login Verification Code

**POST** `/api/users/send-login-code`

**Request Body:**

```json
{
  "phoneNumber": "+1234567890"
}
```

---

### 7. Login with Email

**POST** `/api/users/login`

**Request Body:**

```json
{
  "loginMethod": "email",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful with email",
  "data": {
    "id": "user_id",
    "name": "John Doe",
    "email": "user@example.com",
    "phoneNumber": "+1234567890",
    "isPhoneVerified": false,
    "isEmailVerified": true,
    "isProfileSetup": false,
    "userRole": "traveller",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 8. Login with Phone

**POST** `/api/users/login`

**Request Body:**

```json
{
  "loginMethod": "phone",
  "phoneNumber": "+1234567890",
  "verificationCode": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful with phone verification",
  "data": {
    "id": "user_id",
    "name": "John Doe",
    "email": "user@example.com",
    "phoneNumber": "+1234567890",
    "isPhoneVerified": true,
    "isEmailVerified": false,
    "isProfileSetup": false,
    "userRole": "traveller",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```
