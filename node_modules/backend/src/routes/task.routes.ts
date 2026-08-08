import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role, TaskStatus } from '@prisma/client';
import { updateOverdueTasks } from '../utils/taskHelper';
import { sendMail } from '../services/email';

const router = Router();

const createTaskSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid due date string',
  }),
});

const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

// All task routes require authentication
router.use(requireAuth);

// GET /api/tasks/mine (EMPLOYEE only)
router.get('/mine', requireRole(Role.EMPLOYEE), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: req.user.userId },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found.' });
    }

    const tasks = await prisma.task.findMany({
      where: { employeeId: employee.id },
      orderBy: { dueDate: 'asc' },
    });

    const updatedTasks = await updateOverdueTasks(tasks);

    return res.status(200).json(updatedTasks);
  } catch (error) {
    console.error('Fetch my tasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch your tasks.' });
  }
});

// PATCH /api/tasks/:id/status (EMPLOYEE only)
router.patch('/:id/status', requireRole(Role.EMPLOYEE), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const parseResult = updateTaskStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
      return res.status(400).json({ error: errorMessage });
    }

    const { status } = parseResult.data;
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { userId: req.user.userId },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found.' });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (existingTask.employeeId !== employee.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this task.' });
    }

    const completedAt = status === TaskStatus.COMPLETED ? new Date() : null;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt,
      },
    });

    return res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Update task status error:', error);
    return res.status(500).json({ error: 'Failed to update task status.' });
  }
});

// POST /api/tasks (OWNER only)
router.post('/', requireRole(Role.OWNER), async (req: Request, res: Response) => {
  try {
    const parseResult = createTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
      return res.status(400).json({ error: errorMessage });
    }

    const { employeeId, title, description, dueDate } = parseResult.data;

    const employeeExists = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employeeExists) {
      return res.status(404).json({ error: 'Assigned employee not found.' });
    }

    const task = await prisma.task.create({
      data: {
        employeeId,
        title,
        description,
        dueDate: new Date(dueDate),
        status: TaskStatus.PENDING,
      },

    });

    // Send task assignment email to employee
    try {
      await sendMail({
        to: employeeExists.email,
        subject: `New task assigned: ${task.title}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1E1B2E;">
            <h2 style="color: #7C3AED;">New Task Assignment</h2>
            <p>Dear ${employeeExists.name},</p>
            <p>You have been assigned a new task on the ICC Industries HR Portal:</p>
            <div style="background-color: #EDE4FC; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3 style="margin: 0 0 8px 0; color: #1E1B2E;">${task.title}</h3>
              <p style="margin: 0 0 8px 0; font-size: 14px;">${task.description}</p>
              <p style="margin: 0; font-size: 13px; color: #6B6580;"><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleString()}</p>
            </div>
            <p style="font-size: 12px; color: #6B6580;">Please log into the portal to review and update task status.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Non-critical task email dispatch failure:', emailErr);
    }

    return res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Failed to create task.' });
  }
});

// GET /api/tasks (OWNER only - optional filters: employeeId, status)
router.get('/', requireRole(Role.OWNER), async (req: Request, res: Response) => {
  try {
    const { employeeId, status } = req.query;

    const whereClause: any = {};
    if (employeeId && typeof employeeId === 'string') {
      whereClause.employeeId = employeeId;
    }
    if (status && typeof status === 'string' && Object.values(TaskStatus).includes(status as TaskStatus)) {
      whereClause.status = status as TaskStatus;
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const updatedTasks = await updateOverdueTasks(tasks);

    return res.status(200).json(updatedTasks);
  } catch (error) {
    console.error('List tasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

export default router;
