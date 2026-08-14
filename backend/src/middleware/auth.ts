import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Token missing.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const requireRole = (role: Role | Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires one of the roles: ${roles.join(', ')}.` });
    }

    return next();
  };
};
