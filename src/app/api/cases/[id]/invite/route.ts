import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getUser } from '@/lib/server-auth';

const inviteSchema = z.object({
  tutorProfileId: z.string().uuid(),
});

/**
 * @swagger
 * /api/cases/{id}/invite:
 *   post:
 *     summary: Invite a tutor to a case
 *     description: Parents can invite a specific tutor profile to their tuition case.
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
 *               tutorProfileId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *       400:
 *         description: Invalid data or already invited
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Only parents can invite tutors' }, { status: 403 });
    }

    const { id: caseId } = await params;

    const caseItem = await prisma.case.findUnique({ where: { id: caseId } });

    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (caseItem.parentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.issues }, { status: 400 });
    }

    const { tutorProfileId } = parsed.data;

    // Verify tutor exists
    const tutor = await prisma.tutorProfile.findUnique({ where: { id: tutorProfileId } });
    if (!tutor) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    // Check if already invited
    const existingInvite = await prisma.caseInvitation.findUnique({
      where: {
        caseId_tutorProfileId: {
          caseId,
          tutorProfileId,
        }
      }
    });

    if (existingInvite) {
      return NextResponse.json({ error: 'Tutor is already invited' }, { status: 409 });
    }

    const invitation = await prisma.caseInvitation.create({
      data: {
        caseId,
        tutorProfileId,
      }
    });

    return NextResponse.json({ message: 'Tutor invited successfully', invitation }, { status: 201 });
  } catch (error) {
    console.error('Invite tutor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
