import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getUser } from '@/lib/server-auth';

const profileSchema = z.object({
  displayName: z.string().min(1),
  qualifications: z.string().optional(),
  experiences: z.string().optional(),
});

/**
 * @swagger
 * /api/tutors/me:
 *   get:
 *     summary: Get your own tutor profile
 *     description: Fetch the current logged-in tutor's profile
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Profile details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a tutor)
 *       404:
 *         description: Profile not set up
 */
export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Only tutors can have a profile' }, { status: 403 });
    }

    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/tutors/me:
 *   post:
 *     summary: Create or update your tutor profile
 *     description: Set your display name, qualifications, and experiences.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               qualifications:
 *                 type: string
 *               experiences:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Only tutors can have a profile' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.issues }, { status: 400 });
    }

    const { displayName, qualifications, experiences } = parsed.data;

    const tutorProfile = await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName,
        qualifications,
        experiences,
      },
      create: {
        userId: user.id,
        displayName,
        qualifications,
        experiences,
      },
    });

    return NextResponse.json({ message: 'Profile saved successfully', tutorProfile }, { status: 200 });
  } catch (error) {
    console.error('Save profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
