import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/server-auth';
import { uploadDocumentToStorage } from '@/lib/storage';

/**
 * @swagger
 * /api/cases/{id}/documents:
 *   post:
 *     summary: Upload a case document
 *     description: Uploads a document to Supabase and attaches it to a specific case.
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Document uploaded successfully
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

    const { id: caseId } = await params;

    const caseItem = await prisma.case.findUnique({
      where: { id: caseId },
      include: { caseInvitations: true }
    });

    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check permissions: Parent owner or invited Tutor
    let isAuthorized = false;
    if (user.role === 'PARENT' && caseItem.parentId === user.id) {
      isAuthorized = true;
    } else if (user.role === 'TUTOR' && user.tutorProfile) {
      const isInvited = caseItem.caseInvitations.some((inv: any) => inv.tutorProfileId === user.tutorProfile!.id);
      if (isInvited) isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Optional: Validate file type and size here before uploading
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    const { filename, size, mimeType } = await uploadDocumentToStorage(file);

    const document = await prisma.document.create({
      data: {
        filename,
        originalName: file.name,
        mimeType,
        size,
        uploadedById: user.id,
        caseId,
      }
    });

    return NextResponse.json({ message: 'Document uploaded successfully', document }, { status: 201 });
  } catch (error) {
    console.error('Upload document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/cases/{id}/documents:
 *   get:
 *     summary: List case documents
 *     description: Fetch all documents attached to a specific case.
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
 *         description: A list of documents
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

    const { id: caseId } = await params;

    const caseItem = await prisma.case.findUnique({
      where: { id: caseId },
      include: { caseInvitations: true }
    });

    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check permissions: Parent owner or invited Tutor
    let isAuthorized = false;
    if (user.role === 'PARENT' && caseItem.parentId === user.id) {
      isAuthorized = true;
    } else if (user.role === 'TUTOR' && user.tutorProfile) {
      const isInvited = caseItem.caseInvitations.some((inv: any) => inv.tutorProfileId === user.tutorProfile!.id);
      if (isInvited) isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const documents = await prisma.document.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
