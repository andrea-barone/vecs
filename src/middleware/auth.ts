import { Request, Response, NextFunction } from 'express';
import { credentialsService } from '../services/credentials.service';

export interface AuthRequest extends Request {
  token?: string;
}

export const ocpiAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Token ')) {
      return res.status(401).json({
        data: null,
        status_code: 2001,
        status_message: 'Missing or invalid authorization header',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(6);

    const isValid = await credentialsService.validateToken(token);
    if (!isValid) {
      return res.status(401).json({
        data: null,
        status_code: 2001,
        status_message: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      });
    }

    req.token = token;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      data: null,
      status_code: 2000,
      status_message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};
