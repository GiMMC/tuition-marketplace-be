import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/server-auth';
import { generateDownloadUrl } from '@/lib/storage';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        case: { include: { caseInvitations: true } },
      }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let isAuthorized = false;

    if (document.tutorProfileId) {
      // Document is part of a tutor profile
      // Tutors can only download their own profile documents?
      // Wait, parents can view tutor profiles, so they should be able to download their documents.
      if (user.role === 'PARENT') {
        isAuthorized = true;
      } else if (user.role === 'TUTOR' && user.tutorProfile?.id === document.tutorProfileId) {
        isAuthorized = true;
      }
    } else if (document.case) {
      // Document is part of a case
      if (user.role === 'PARENT' && document.case.parentId === user.id) {
        isAuthorized = true;
      } else if (user.role === 'TUTOR' && user.tutorProfile) {
        const isInvited = document.case.caseInvitations.some(inv => inv.tutorProfileId === user.tutorProfile!.id);
        if (isInvited) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const signedUrl = await generateDownloadUrl(document.filename);

    return NextResponse.json({ signedUrl, document }, { status: 200 });
  } catch (error) {
    console.error('Download document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
