import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "1d7570a04f32c5394f9e6df4259be768";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Interface for JWT payload
export interface JWTPayload {
  userId: string;
  email?: string | undefined;
  phoneNumber?: string | undefined;
  userRole: string;
}

// Generate JWT token
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
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
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
};
