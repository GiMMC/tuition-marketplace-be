import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getUser } from '@/lib/server-auth';

/**
 * @swagger
 * /api/cases/{id}:
 *   get:
 *     summary: Get a specific tuition case
 *     description: Fetch details of a tuition case. Only accessible by the Parent who owns it, or a Tutor invited to it.
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
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 */
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
      const isInvited = caseItem.caseInvitations.some((inv: any) => inv.tutorProfileId === user.tutorProfile!.id);
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

/**
 * @swagger
 * /api/cases/{id}:
 *   patch:
 *     summary: Update a tuition case
 *     description: Update details of a tuition case. Only accessible by the Parent who owns it.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               subject:
 *                 type: string
 *               level:
 *                 type: string
 *               location:
 *                 type: string
 *               budgetPerHour:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_PROGRESS, CLOSED]
 *     responses:
 *       200:
 *         description: Case updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
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
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.issues }, { status: 400 });
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
