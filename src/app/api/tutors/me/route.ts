import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getUser } from '@/lib/server-auth';

const profileSchema = z.object({
  displayName: z.string().min(1),
  qualifications: z.string().optional(),
  experiences: z.string().optional(),
});

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
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
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
