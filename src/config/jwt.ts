import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "1d7570a04f32c5394f9e6df4259be768";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // 7 days

// Interface for JWT payload
export interface JWTPayload {
  userId: string;
  email?: string;
  phoneNumber?: string;
  userRole: string;
  tokenType?: "access";
}

// Generate Access Token (7 days)
export const generateAccessToken = (
  payload: Omit<JWTPayload, "tokenType">
): string => {
  return jwt.sign({ ...payload, tokenType: "access" }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

// Verify Access Token
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (decoded.tokenType !== "access") {
      throw new Error("Invalid token type");
    }
    return decoded;
  } catch {
    throw new Error("Invalid or expired access token");
  }
};

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export default {
  generateAccessToken,
  verifyAccessToken,
  hashPassword,
  comparePassword,
};
