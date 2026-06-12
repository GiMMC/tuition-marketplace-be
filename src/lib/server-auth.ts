import { cookies } from 'next/headers';
import { verifyToken, isTokenBlacklisted, JwtPayload } from './auth';
import { prisma } from './prisma';

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  const blacklisted = await isTokenBlacklisted(token);
  if (blacklisted) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { tutorProfile: true }
  });

  if (!user) {
    return null;
  }

  return user;
}
