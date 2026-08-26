import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  adminId?: number;
  adminEmail?: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token missing or invalid' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'ca-admin-super-secret-key-2026';

  jwt.verify(token, secret, (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Token is expired or invalid' });
      return;
    }

    (req as AuthenticatedRequest).adminId = decoded.id;
    (req as AuthenticatedRequest).adminEmail = decoded.email;
    next();
  });
};
