import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/server-auth';

/**
 * @swagger
 * /api/tutors/{id}:
 *   get:
 *     summary: Get a specific tutor profile
 *     description: Fetch details of a tutor by their ID.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tutor not found
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const tutor = await prisma.tutorProfile.findUnique({
      where: { id },
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
      }
    });

    if (!tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    return NextResponse.json({ tutor }, { status: 200 });
  } catch (error) {
    console.error('Get tutor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
