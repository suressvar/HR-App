"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const taskHelper_1 = require("../utils/taskHelper");
const email_1 = require("../services/email");
const router = (0, express_1.Router)();
const createTaskSchema = zod_1.z.object({
    employeeId: zod_1.z.string().min(1, 'Employee ID is required'),
    title: zod_1.z.string().min(1, 'Title is required'),
    description: zod_1.z.string().min(1, 'Description is required'),
    dueDate: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid due date string',
    }),
    priority: zod_1.z.nativeEnum(client_1.Priority).optional(),
    estimatedHours: zod_1.z.number().min(0, 'Estimated hours cannot be negative').nullable().optional(),
    category: zod_1.z.string().nullable().optional(),
    frequency: zod_1.z.nativeEnum(client_1.TaskFrequency).optional(),
});
const updateTaskStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.TaskStatus),
    completionNotes: zod_1.z.string().nullable().optional(),
});
// All task routes require authentication
router.use(auth_1.requireAuth);
// GET /api/tasks/mine (EMPLOYEE only)
router.get('/mine', (0, auth_1.requireRole)(client_1.Role.EMPLOYEE), async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { userId: req.user.userId },
        });
        if (!employee) {
            return res.status(404).json({ error: 'Employee profile not found.' });
        }
        const tasks = await prisma_1.prisma.task.findMany({
            where: { employeeId: employee.id },
            orderBy: { dueDate: 'asc' },
        });
        const updatedTasks = await (0, taskHelper_1.updateOverdueTasks)(tasks);
        return res.status(200).json(updatedTasks);
    }
    catch (error) {
        console.error('Fetch my tasks error:', error);
        return res.status(500).json({ error: 'Failed to fetch your tasks.' });
    }
});
// PATCH /api/tasks/:id/status (EMPLOYEE only)
router.patch('/:id/status', (0, auth_1.requireRole)(client_1.Role.EMPLOYEE), async (req, res) => {
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
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { userId: req.user.userId },
        });
        if (!employee) {
            return res.status(404).json({ error: 'Employee profile not found.' });
        }
        const existingTask = await prisma_1.prisma.task.findUnique({
            where: { id },
        });
        if (!existingTask) {
            return res.status(404).json({ error: 'Task not found.' });
        }
        if (existingTask.employeeId !== employee.id) {
            return res.status(403).json({ error: 'Forbidden: You do not own this task.' });
        }
        const completedAt = status === client_1.TaskStatus.COMPLETED ? new Date() : null;
        const updatedTask = await prisma_1.prisma.task.update({
            where: { id },
            data: {
                status,
                completedAt,
                ...(completionNotes !== undefined && { completionNotes }),
            },
        });
        return res.status(200).json(updatedTask);
    }
    catch (error) {
        console.error('Update task status error:', error);
        return res.status(500).json({ error: 'Failed to update task status.' });
    }
});
// PATCH /api/tasks/:id/approve (OWNER only)
router.patch('/:id/approve', (0, auth_1.requireRole)(client_1.Role.OWNER), async (req, res) => {
    try {
        const { id } = req.params;
        const existingTask = await prisma_1.prisma.task.findUnique({
            where: { id },
            include: { employee: true },
        });
        if (!existingTask) {
            return res.status(404).json({ error: 'Task not found.' });
        }
        const updatedTask = await prisma_1.prisma.task.update({
            where: { id },
            data: {
                status: client_1.TaskStatus.COMPLETED,
                completedAt: new Date(),
            },
        });
        // Send confirmation email to the employee in the background
        (0, email_1.sendMail)({
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
    }
    catch (error) {
        console.error('Approve task error:', error);
        return res.status(500).json({ error: 'Failed to approve task.' });
    }
});
// POST /api/tasks (OWNER or EMPLOYEE self-allocation)
router.post('/', (0, auth_1.requireRole)([client_1.Role.OWNER, client_1.Role.EMPLOYEE]), async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        // If requester is an employee, override/force employeeId to their own ID
        if (req.user.role === client_1.Role.EMPLOYEE) {
            const employee = await prisma_1.prisma.employee.findUnique({
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
        const { employeeId, title, description, dueDate, priority, estimatedHours, category, frequency } = parseResult.data;
        const employeeExists = await prisma_1.prisma.employee.findUnique({
            where: { id: employeeId },
        });
        if (!employeeExists) {
            return res.status(404).json({ error: 'Assigned employee not found.' });
        }
        const task = await prisma_1.prisma.task.create({
            data: {
                employeeId,
                title,
                description,
                dueDate: new Date(dueDate),
                status: client_1.TaskStatus.PENDING,
                priority: priority || client_1.Priority.MEDIUM,
                estimatedHours: estimatedHours ?? null,
                category: category ?? null,
                frequency: frequency || client_1.TaskFrequency.ONE_TIME,
            },
        });
        // Handle Email Notifications in the background (asynchronously)
        if (req.user.role === client_1.Role.EMPLOYEE) {
            // Send task self-allocation email to Owner in background
            prisma_1.prisma.ownerProfile.findFirst().then((ownerProfile) => {
                if (ownerProfile) {
                    (0, email_1.sendMail)({
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
        }
        else {
            // Send task assignment email to employee in background
            (0, email_1.sendMail)({
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
    }
    catch (error) {
        console.error('Create task error:', error);
        return res.status(500).json({ error: 'Failed to create task.' });
    }
});
// GET /api/tasks (OWNER only - optional filters: employeeId, status)
router.get('/', (0, auth_1.requireRole)(client_1.Role.OWNER), async (req, res) => {
    try {
        const { employeeId, status } = req.query;
        const whereClause = {};
        if (employeeId && typeof employeeId === 'string') {
            whereClause.employeeId = employeeId;
        }
        if (status && typeof status === 'string' && Object.values(client_1.TaskStatus).includes(status)) {
            whereClause.status = status;
        }
        const tasks = await prisma_1.prisma.task.findMany({
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
        const updatedTasks = await (0, taskHelper_1.updateOverdueTasks)(tasks);
        return res.status(200).json(updatedTasks);
    }
    catch (error) {
        console.error('List tasks error:', error);
        return res.status(500).json({ error: 'Failed to fetch tasks.' });
    }
});
exports.default = router;
