import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/server-auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, tutorId: string }> }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Only parents can revoke invitations' }, { status: 403 });
    }

    const { id: caseId, tutorId: tutorProfileId } = await params;

    const caseItem = await prisma.case.findUnique({ where: { id: caseId } });

    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (caseItem.parentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingInvite = await prisma.caseInvitation.findUnique({
      where: {
        caseId_tutorProfileId: {
          caseId,
          tutorProfileId,
        }
      }
    });

    if (!existingInvite) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    await prisma.caseInvitation.delete({
      where: { id: existingInvite.id }
    });

    return NextResponse.json({ message: 'Invitation revoked successfully' }, { status: 200 });
  } catch (error) {
    console.error('Revoke invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
