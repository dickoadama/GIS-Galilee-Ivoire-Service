import { type NextFunction, type Request, type Response } from 'express';
import { type DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';
import { type UserRole } from '../types/app.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  userRole?: UserRole;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Non autorisé : jeton manquant.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const synced = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name || ''
    );
    req.userRole = synced.role;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Non autorisé : jeton invalide.' });
  }
};
