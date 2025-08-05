import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../config/jwt';
import { sendErrorResponse, STATUS_CODES, MESSAGES } from '../utils/apiResponse';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Middleware to verify JWT token
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        'Access token is required'
      );
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    sendErrorResponse(
      res,
      STATUS_CODES.UNAUTHORIZED,
      'Invalid or expired token'
    );
    return;
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Middleware to check if user has specific role
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        'Authentication required'
      );
      return;
    }

    if (!roles.includes(req.user.userRole)) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        'Insufficient permissions'
      );
      return;
    }

    next();
  };
}; 