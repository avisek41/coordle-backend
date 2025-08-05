import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "1d7570a04f32c5394f9e6df4259be768";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "refresh_secret_key_change_in_production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m"; // Shorter access token
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d"; // Longer refresh token

// Interface for JWT payload
export interface JWTPayload {
  userId: string;
  email?: string | undefined;
  phoneNumber?: string | undefined;
  userRole: string;
  tokenType?: "access" | "refresh";
}

// Interface for refresh token payload
export interface RefreshTokenPayload {
  userId: string;
  tokenType: "refresh";
}

// Generate Access Token (short-lived)
export const generateAccessToken = (
  payload: Omit<JWTPayload, "tokenType">
): string => {
  return jwt.sign({ ...payload, tokenType: "access" }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

// Generate Refresh Token (long-lived)
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId, tokenType: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
};

// Generate both access and refresh tokens
export const generateTokenPair = (
  payload: Omit<JWTPayload, "tokenType">
): {
  accessToken: string;
  refreshToken: string;
} => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload.userId),
  };
};

// Verify Access Token
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (decoded.tokenType !== "access") {
      throw new Error("Invalid token type");
    }
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired access token");
  }
};

// Verify Refresh Token
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(
      token,
      JWT_REFRESH_SECRET
    ) as RefreshTokenPayload;
    if (decoded.tokenType !== "refresh") {
      throw new Error("Invalid token type");
    }
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
};

// Legacy function for backward compatibility
export const generateToken = (payload: JWTPayload): string => {
  return generateAccessToken(payload);
};

// Legacy function for backward compatibility
export const verifyToken = (token: string): JWTPayload => {
  return verifyAccessToken(token);
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Compare password
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  generateToken, // Legacy
  verifyToken, // Legacy
  hashPassword,
  comparePassword,
};
