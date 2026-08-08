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
});
const updateTaskStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.TaskStatus),
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
        const { status } = parseResult.data;
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
            },
        });
        return res.status(200).json(updatedTask);
    }
    catch (error) {
        console.error('Update task status error:', error);
        return res.status(500).json({ error: 'Failed to update task status.' });
    }
});
// POST /api/tasks (OWNER only)
router.post('/', (0, auth_1.requireRole)(client_1.Role.OWNER), async (req, res) => {
    try {
        const parseResult = createTaskSchema.safeParse(req.body);
        if (!parseResult.success) {
            const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
            return res.status(400).json({ error: errorMessage });
        }
        const { employeeId, title, description, dueDate } = parseResult.data;
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
            },
        });
        // Send task assignment email to employee
        try {
            await (0, email_1.sendMail)({
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
        }
        catch (emailErr) {
            console.error('Non-critical task email dispatch failure:', emailErr);
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
