import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/server-auth';
import { uploadDocumentToStorage } from '@/lib/storage';

/**
 * @swagger
 * /api/tutors/me/documents:
 *   post:
 *     summary: Upload a profile document
 *     description: Uploads a document to Supabase and attaches it to the logged-in tutor's profile.
 *     security:
 *       - cookieAuth: []
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
 *       400:
 *         description: No file provided or file too large
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

    if (user.role !== 'TUTOR' || !user.tutorProfile) {
      return NextResponse.json({ error: 'Only tutors with profiles can upload documents' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

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
        tutorProfileId: user.tutorProfile.id,
      }
    });

    return NextResponse.json({ message: 'Document uploaded successfully', document }, { status: 201 });
  } catch (error) {
    console.error('Upload tutor document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
