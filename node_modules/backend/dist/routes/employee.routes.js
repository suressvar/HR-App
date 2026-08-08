"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const email_1 = require("../services/email");
const router = (0, express_1.Router)();
const createEmployeeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    email: zod_1.z.string().email('Invalid email address'),
    phone: zod_1.z.string().min(1, 'Phone is required'),
    address: zod_1.z.string().min(1, 'Address is required'),
    role: zod_1.z.string().min(1, 'Role title is required'),
});
// All routes require OWNER role
router.use(auth_1.requireAuth, (0, auth_1.requireRole)(client_1.Role.OWNER));
// POST /api/employees — Create a new employee with User account in transaction
router.post('/', async (req, res) => {
    try {
        const parseResult = createEmployeeSchema.safeParse(req.body);
        if (!parseResult.success) {
            const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
            return res.status(400).json({ error: errorMessage });
        }
        const { name, email, phone, address, role } = parseResult.data;
        // Check if user already exists
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'A user with this email already exists.' });
        }
        // Generate temporary password
        const tempPassword = crypto_1.default.randomBytes(8).toString('hex');
        const passwordHash = await bcryptjs_1.default.hash(tempPassword, 10);
        // Create User & Employee in a single Prisma transaction
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    role: client_1.Role.EMPLOYEE,
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
            await (0, email_1.sendMail)({
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
        }
        catch (emailErr) {
            console.error('Non-critical email dispatch failure:', emailErr);
        }
        return res.status(201).json(result);
    }
    catch (error) {
        console.error('Create employee error:', error);
        return res.status(500).json({ error: 'Failed to create employee.' });
    }
});
// GET /api/employees — List all employees
router.get('/', async (req, res) => {
    try {
        const employees = await prisma_1.prisma.employee.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
        });
        return res.status(200).json(employees);
    }
    catch (error) {
        console.error('List employees error:', error);
        return res.status(500).json({ error: 'Failed to fetch employees.' });
    }
});
// GET /api/employees/:id — Single employee detail
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await prisma_1.prisma.employee.findUnique({
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
    }
    catch (error) {
        console.error('Get employee detail error:', error);
        return res.status(500).json({ error: 'Failed to fetch employee details.' });
    }
});
exports.default = router;
