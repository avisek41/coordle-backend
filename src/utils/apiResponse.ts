import { Response } from "express";

// Standard response interface
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

// Success response helper
export const sendSuccessResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
): void => {
  const response: ApiResponse<T> = {
    success: true,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    ...(data !== undefined && { data }),
  };

  res.status(statusCode).json(response);
};

// Error response helper
export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  error?: string
): void => {
  const response: ApiResponse = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    ...(error !== undefined && { error }),
  };

  res.status(statusCode).json(response);
};

// Common status codes
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Common messages
export const MESSAGES = {
  // Success messages
  USER_REGISTERED: "User registered successfully",
  USER_LOGIN_SUCCESS: "Login successful",
  VERIFICATION_CODE_SENT: "Verification code sent successfully",
  USER_UPDATED: "User updated successfully",
  USER_DELETED: "User deleted successfully",
  USERS_RETRIEVED: "Users retrieved successfully",
  USER_RETRIEVED: "User retrieved successfully",
  USER_PROFILE_RETRIEVED: "User profile retrieved successfully",
  USERS_BY_ROLE_RETRIEVED: "Users by role retrieved successfully",

  // Error messages
  INVALID_REGISTRATION_METHOD:
    "Registration method must be either 'email' or 'phone'",
  MISSING_REQUIRED_FIELDS: "Required fields are missing",
  PASSWORDS_DONT_MATCH: "Password and confirm password do not match",
  PASSWORD_TOO_SHORT: "Password must be at least 6 characters long",
  USER_ALREADY_EXISTS: "User already exists",
  PHONE_NOT_VERIFIED: "Phone number must be verified before registration",
  INVALID_LOGIN_METHOD: "Login method must be either 'email' or 'phone'",
  USER_NOT_FOUND: "User not found",
  INVALID_PASSWORD: "Invalid password",
  INVALID_VERIFICATION_CODE: "Invalid or expired verification code",
  VERIFICATION_CODE_REQUIRED: "Verification code is required for phone login",
  PHONE_NUMBER_REQUIRED: "Phone number is required",
  EMAIL_PASSWORD_REQUIRED: "Email and password are required for email login",
  EMAIL_ALREADY_EXISTS: "Email already exists",
  INVALID_ROLE: "Invalid role. Must be 'owner', 'host', or 'traveller'",
  USER_ID_REQUIRED: "User ID is required",
  INTERNAL_SERVER_ERROR: "Internal server error",
  SMS_SEND_FAILED: "Failed to send verification code. Please try again.",
} as const;
