import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/server-auth';

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
