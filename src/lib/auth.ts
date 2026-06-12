import jwt from 'jsonwebtoken';
import { redis } from './redis';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development_only_please_change_in_production';
const JWT_EXPIRES_IN = '1d';

export interface JwtPayload {
  userId: string;
  role: 'PARENT' | 'TUTOR';
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
};

export const blacklistToken = async (token: string): Promise<void> => {
  // Extract expiry to set TTL in Redis
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (decoded?.exp) {
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;
      if (ttl > 0) {
        await redis.setex(`bl_${token}`, ttl, 'true');
      }
    }
  } catch (e) {
    console.error('Failed to blacklist token', e);
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const result = await redis.get(`bl_${token}`);
    return result === 'true';
  } catch (e) {
    console.error('Redis check failed', e);
    // In case of redis failure, we allow the request but ideally we should handle it better
    return false;
  }
};
