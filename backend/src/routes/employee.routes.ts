import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';
import { sendMail } from '../services/email';

const router = Router();

const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().min(1, 'Address is required'),
  role: z.string().min(1, 'Role title is required'),
});

// All routes require OWNER role
router.use(requireAuth, requireRole(Role.OWNER));

// POST /api/employees — Create a new employee with User account in transaction
router.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = createEmployeeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
      return res.status(400).json({ error: errorMessage });
    }

    const { name, email, phone, address, role } = parseResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create User & Employee in a single Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: Role.EMPLOYEE,
        },
      });

      const newEmployee = await tx.employee.create({
        data: {
          userId: newUser.id,
          name,
          email,
          phone,
          address,
          role,
          status: 'ACTIVE',
        },
      });

      return newEmployee;
    });

    // Send employee onboarding email containing login credentials (tempPassword)
    try {
      await sendMail({
        to: result.email,
        subject: 'Your ICC Industries HR Portal account',
        html: `
          <div font-family: sans-serif; padding: 20px; color: #1E1B2E;">
            <h2 style="color: #7C3AED;">Welcome to ICC Industries HR Portal</h2>
            <p>Dear ${result.name},</p>
            <p>An employee account has been provisioned for you. Please use the initial credentials below to log in:</p>
            <div style="background-color: #EDE4FC; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 4px 0;"><strong>Portal URL:</strong> <a href="http://localhost:5173/login">http://localhost:5173/login</a></p>
              <p style="margin: 4px 0;"><strong>Email:</strong> ${result.email}</p>
              <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
            </div>
            <p style="font-size: 12px; color: #6B6580;">Please sign in and update your profile details.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Non-critical email dispatch failure:', emailErr);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error('Create employee error:', error);
    return res.status(500).json({ error: 'Failed to create employee.' });
  }
});

// GET /api/employees — List all employees
router.get('/', async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    return res.status(200).json(employees);
  } catch (error) {
    console.error('List employees error:', error);
    return res.status(500).json({ error: 'Failed to fetch employees.' });
  }
});

// GET /api/employees/:id — Single employee detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    return res.status(200).json(employee);
  } catch (error) {
    console.error('Get employee detail error:', error);
    return res.status(500).json({ error: 'Failed to fetch employee details.' });
  }
});

export default router;
