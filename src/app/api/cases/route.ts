import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getUser } from '@/lib/server-auth';

const createCaseSchema = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
  level: z.string().min(1),
  location: z.string().optional(),
  budgetPerHour: z.number().optional(),
});

/**
 * @swagger
 * /api/cases:
 *   post:
 *     summary: Create a tuition case
 *     description: Creates a new tuition case. Only accessible by Parents.
 *     security:
 *       - cookieAuth: []
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
 *     responses:
 *       201:
 *         description: Case created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (only parents can create cases)
 */
export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Only parents can create cases' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createCaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.issues }, { status: 400 });
    }

    const { title, subject, level, location, budgetPerHour } = parsed.data;

    const newCase = await prisma.case.create({
      data: {
        title,
        subject,
        level,
        location,
        budgetPerHour,
        parentId: user.id,
      },
    });

    return NextResponse.json({ message: 'Case created successfully', case: newCase }, { status: 201 });
  } catch (error) {
    console.error('Create case error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/cases:
 *   get:
 *     summary: Get tuition cases
 *     description: Returns a list of cases. If user is a Parent, returns only their own cases.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: A list of cases
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const subject = searchParams.get('subject') || '';
    const level = searchParams.get('level') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const skip = (page - 1) * limit;

    let whereClause: any = {};

    if (search) {
      whereClause.title = { contains: search, mode: 'insensitive' };
    }
    if (subject) {
      whereClause.subject = { equals: subject, mode: 'insensitive' };
    }
    if (level) {
      whereClause.level = { equals: level, mode: 'insensitive' };
    }
    if (status) {
      whereClause.status = status;
    }

    if (user.role === 'PARENT') {
      whereClause.parentId = user.id;
    } else if (user.role === 'TUTOR') {
      if (!user.tutorProfile) {
        return NextResponse.json({ cases: [], pagination: { total: 0, page, limit, totalPages: 0 } });
      }
      whereClause.caseInvitations = {
        some: { tutorProfileId: user.tutorProfile.id }
      };
    }

    const cases = await prisma.case.findMany({
      where: whereClause,
      include: {
        caseInvitations: {
          include: {
            tutorProfile: {
              select: { displayName: true }
            }
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.case.count({ where: whereClause });

    return NextResponse.json({
      cases,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    }, { status: 200 });
  } catch (error) {
    console.error('List cases error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
