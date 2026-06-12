import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getUser } from '@/lib/server-auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const caseItem = await prisma.case.findUnique({
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
        },
        caseInvitations: {
          include: {
            tutorProfile: {
              select: { displayName: true }
            }
          }
        }
      }
    });

    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Authorization check
    if (user.role === 'PARENT') {
      if (caseItem.parentId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (user.role === 'TUTOR') {
      if (!user.tutorProfile) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const isInvited = caseItem.caseInvitations.some(inv => inv.tutorProfileId === user.tutorProfile!.id);
      if (!isInvited) {
        // According to requirements, we should avoid leaking existence if they aren't authorized?
        // Actually the prompt says "avoid leaking existence where appropriate — explain your choice".
        // Returning 404 here prevents tutors from probing if a case ID exists.
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ case: caseItem }, { status: 200 });
  } catch (error) {
    console.error('Get case error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  level: z.string().min(1).optional(),
  location: z.string().optional(),
  budgetPerHour: z.number().optional(),
  status: z.enum(['OPEN', 'MATCHED', 'CLOSED']).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Only parents can edit cases' }, { status: 403 });
    }

    const { id } = await params;

    const caseItem = await prisma.case.findUnique({ where: { id } });

    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (caseItem.parentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateCaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    const updatedCase = await prisma.case.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ message: 'Case updated', case: updatedCase }, { status: 200 });
  } catch (error) {
    console.error('Update case error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
