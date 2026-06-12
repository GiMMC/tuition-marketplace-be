import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getUser } from '@/lib/server-auth';

/**
 * @swagger
 * /api/tutors:
 *   get:
 *     summary: List all tutors
 *     description: Fetch a paginated list of tutors. Optional search parameter for display name.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for tutor displayName
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *       - in: query
 *         name: take
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successful response
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const skip = (page - 1) * limit;

    const whereClause = search
      ? {
          OR: [
            { displayName: { contains: search, mode: 'insensitive' as any } },
            { qualifications: { contains: search, mode: 'insensitive' as any } },
            { experiences: { contains: search, mode: 'insensitive' as any } },
          ],
        }
      : {};

    const tutors = await prisma.tutorProfile.findMany({
      where: whereClause,
      include: {
        documents: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true,
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.tutorProfile.count({ where: whereClause });

    return NextResponse.json({
      tutors,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    }, { status: 200 });
  } catch (error) {
    console.error('List tutors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
