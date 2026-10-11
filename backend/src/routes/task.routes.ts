import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role, TaskStatus, Priority, TaskFrequency } from '@prisma/client';
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
  priority: z.nativeEnum(Priority).optional(),
  estimatedHours: z.number().min(0, 'Estimated hours cannot be negative').nullable().optional(),
  category: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  frequency: z.nativeEnum(TaskFrequency).optional(),
  classification: z.string().optional(),
  repeatDay: z.string().nullable().optional(),
  forwardedToId: z.string().nullable().optional(),
  forwardedFromId: z.string().nullable().optional(),
  noOfEntry: z.coerce.number().int().min(0).nullable().optional(),
  timePerEntry: z.coerce.number().min(0).nullable().optional(),
  totalTime: z.coerce.number().min(0).nullable().optional(),
});

const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  completionNotes: z.string().nullable().optional(),
});

async function enrichTasksWithStaffInfo(tasks: any[]) {
  const employeeIds = new Set<string>();
  tasks.forEach((t) => {
    if (t.forwardedFromId) employeeIds.add(t.forwardedFromId);
    if (t.forwardedToId) employeeIds.add(t.forwardedToId);
    if (t.employeeId) employeeIds.add(t.employeeId);
  });

  const employees = await prisma.employee.findMany({
    where: { id: { in: Array.from(employeeIds) } },
    select: { id: true, name: true, email: true, role: true },
  });

  const empMap = new Map(employees.map((e) => [e.id, e]));

  return tasks.map((t) => {
    const forwardedFromEmp = t.forwardedFromId ? empMap.get(t.forwardedFromId) : null;
    const forwardedToEmp = t.forwardedToId ? empMap.get(t.forwardedToId) : null;
    const assignedEmp = t.employeeId ? empMap.get(t.employeeId) : null;

    const staff1Name = forwardedFromEmp ? forwardedFromEmp.name : (assignedEmp?.name || t.employee?.name || 'Self');
    const staff2Name = forwardedToEmp ? forwardedToEmp.name : null;

    return {
      ...t,
      company: t.company || 'ICC Industries',
      forwardedFromName: forwardedFromEmp ? forwardedFromEmp.name : (t.forwardedFromId ? 'Colleague' : null),
      forwardedToName: forwardedToEmp ? forwardedToEmp.name : (t.forwardedToId ? 'Colleague' : null),
      staff1Name,
      staff2Name,
    };
  });
}

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
      where: {
        OR: [
          { employeeId: employee.id },
          { forwardedFromId: employee.id },
          { forwardedToId: employee.id },
        ],
      },
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
    const enrichedTasks = await enrichTasksWithStaffInfo(updatedTasks);

    return res.status(200).json(enrichedTasks);
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

    const { status, completionNotes } = parseResult.data;
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

    if (existingTask.employeeId !== employee.id && existingTask.forwardedFromId !== employee.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this task.' });
    }

    const completedAt = status === TaskStatus.COMPLETED ? new Date() : null;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt,
        ...(completionNotes !== undefined && { completionNotes }),
      },
    });

    return res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Update task status error:', error);
    return res.status(500).json({ error: 'Failed to update task status.' });
  }
});

// PATCH /api/tasks/:id/approve (OWNER only)
router.patch('/:id/approve', requireRole(Role.OWNER), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Send confirmation email to the employee in the background
    sendMail({
      to: existingTask.employee.email,
      subject: `Task Approved & Completed: ${existingTask.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1E1B2E;">
          <h2 style="color: #10B981;">Task Approved</h2>
          <p>Dear ${existingTask.employee.name},</p>
          <p>Your self-allocated task has been reviewed and approved by the owner:</p>
          <div style="background-color: #ECFDF5; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #A7F3D0;">
            <h3 style="margin: 0 0 8px 0; color: #065F46;">${existingTask.title}</h3>
            <p style="margin: 0 0 8px 0; font-size: 14px;">${existingTask.description}</p>
            <p style="margin: 0; font-size: 13px; color: #047857;"><strong>Status:</strong> Completed & Approved</p>
          </div>
          <p style="font-size: 12px; color: #6B6580;">Great job completing this task!</p>
        </div>
      `,
    }).catch((emailErr) => {
      console.error('Non-critical approval email dispatch failure:', emailErr);
    });

    return res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Approve task error:', error);
    return res.status(500).json({ error: 'Failed to approve task.' });
  }
});

// PATCH /api/tasks/:id/classification (OWNER or EMPLOYEE)
router.patch('/:id/classification', requireRole([Role.OWNER, Role.EMPLOYEE]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { classification, repeatDay } = req.body;

    const validClassifications = ['PENDING', 'TEN_POINTS', 'REGULAR', 'A_TO_Z'];
    if (classification && !validClassifications.includes(classification)) {
      return res.status(400).json({ error: 'Invalid classification value. Must be PENDING, TEN_POINTS, or REGULAR.' });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (req.user?.role === Role.EMPLOYEE) {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user.userId },
      });
      if (!employee || (existingTask.employeeId !== employee.id && existingTask.forwardedFromId !== employee.id)) {
        return res.status(403).json({ error: 'Forbidden: You do not own this task.' });
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(classification !== undefined && { classification }),
        ...(repeatDay !== undefined && { repeatDay }),
      },
    });

    return res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Update task classification error:', error);
    return res.status(500).json({ error: 'Failed to update task classification.' });
  }
});

// POST /api/tasks (OWNER or EMPLOYEE self-allocation)
router.post('/', requireRole([Role.OWNER, Role.EMPLOYEE]), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // If requester is an employee, override/force employeeId to their own ID
    if (req.user.role === Role.EMPLOYEE) {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user.userId },
      });
      if (!employee) {
        return res.status(404).json({ error: 'Employee profile not found.' });
      }
      req.body.employeeId = employee.id;
    }

    const parseResult = createTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
      return res.status(400).json({ error: errorMessage });
    }

    const { employeeId, title, description, dueDate, priority, estimatedHours, category, company, frequency, classification, repeatDay, forwardedToId, forwardedFromId, noOfEntry, timePerEntry, totalTime } = parseResult.data;

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
        priority: priority || Priority.MEDIUM,
        estimatedHours: estimatedHours ?? null,
        category: category ?? null,
        company: company || 'ICC Industries',
        frequency: frequency || TaskFrequency.ONE_TIME,
        classification: classification || 'REGULAR',
        repeatDay: repeatDay ?? null,
        forwardedToId: forwardedToId || null,
        forwardedFromId: forwardedFromId || null,
        noOfEntry: noOfEntry ?? null,
        timePerEntry: timePerEntry ?? null,
        totalTime: totalTime ?? null,
      },
    });

    // Handle Email Notifications in the background (asynchronously)
    if (req.user.role === Role.EMPLOYEE) {
      // Send task self-allocation email to Owner in background
      prisma.ownerProfile.findFirst().then((ownerProfile) => {
        if (ownerProfile) {
          sendMail({
            to: ownerProfile.email,
            subject: `New self-allocated task: ${task.title} (by ${employeeExists.name})`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #1E1B2E;">
                <h2 style="color: #7C3AED;">Task Self-Allocation</h2>
                <p>Hello ${ownerProfile.name},</p>
                <p>Employee <strong>${employeeExists.name}</strong> (${employeeExists.role}) has self-allocated a new task:</p>
                <div style="background-color: #EDE4FC; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <h3 style="margin: 0 0 8px 0; color: #1E1B2E;">${task.title}</h3>
                  <p style="margin: 0 0 8px 0; font-size: 14px;">${task.description}</p>
                  <p style="margin: 0; font-size: 13px; color: #6B6580;"><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleString()}</p>
                </div>
                <p style="font-size: 12px; color: #6B6580;">You can monitor their progress in the Executive Dashboard.</p>
              </div>
            `,
          }).catch((emailErr) => {
            console.error('Non-critical owner email dispatch failure:', emailErr);
          });
        }
      }).catch((profileErr) => {
        console.error('Non-critical owner profile query failure:', profileErr);
      });
    } else {
      // Send task assignment email to employee in background
      sendMail({
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
      }).catch((emailErr) => {
        console.error('Non-critical task email dispatch failure:', emailErr);
      });
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
    const enrichedTasks = await enrichTasksWithStaffInfo(updatedTasks);

    return res.status(200).json(enrichedTasks);
  } catch (error) {
    console.error('List tasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// GET /api/tasks/employees-list — Retrieve employees for forwarding
router.get('/employees-list', async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json(employees);
  } catch (error) {
    console.error('Fetch employees list error:', error);
    return res.status(500).json({ error: 'Failed to fetch employees list.' });
  }
});

// PATCH /api/tasks/:id/forward — Forward a task to another employee
router.patch('/:id/forward', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { forwardedToId } = req.body;

    if (!forwardedToId) {
      return res.status(400).json({ error: 'forwardedToId is required.' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const senderEmployee = await prisma.employee.findUnique({
      where: { userId: req.user.userId },
    });

    if (!senderEmployee) {
      return res.status(404).json({ error: 'Sender employee profile not found.' });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (existingTask.employeeId !== senderEmployee.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this task.' });
    }

    const recipientEmployee = await prisma.employee.findUnique({
      where: { id: forwardedToId },
    });

    if (!recipientEmployee) {
      return res.status(404).json({ error: 'Recipient employee profile not found.' });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        forwardedToId,
        forwardedFromId: senderEmployee.id,
      },
    });

    return res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Forward task error:', error);
    return res.status(500).json({ error: 'Failed to forward task.' });
  }
});

// GET /api/tasks/forwarded — Get tasks forwarded to the current employee
router.get('/forwarded', async (req: Request, res: Response) => {
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
      where: { forwardedToId: employee.id },
      orderBy: { dueDate: 'asc' },
    });

    const tasksWithSender = await Promise.all(
      tasks.map(async (t) => {
        let senderName = 'Unknown Employee';
        if (t.forwardedFromId) {
          const sender = await prisma.employee.findUnique({
            where: { id: t.forwardedFromId },
            select: { name: true },
          });
          if (sender) senderName = sender.name;
        }
        return {
          ...t,
          forwardedFromName: senderName,
        };
      })
    );

    return res.status(200).json(tasksWithSender);
  } catch (error) {
    console.error('Fetch forwarded tasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch forwarded tasks.' });
  }
});

// PATCH /api/tasks/:id/accept-forward — Accept a forwarded task
router.patch('/:id/accept-forward', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

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

    if (existingTask.forwardedToId !== employee.id) {
      return res.status(403).json({ error: 'Forbidden: This task was not forwarded to you.' });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        employeeId: employee.id,
        forwardedToId: null,
      },
    });

    return res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Accept forward task error:', error);
    return res.status(500).json({ error: 'Failed to accept forwarded task.' });
  }
});

export default router;
