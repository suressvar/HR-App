"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username or email is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const parseResult = loginSchema.safeParse(req.body);
        if (!parseResult.success) {
            const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
            return res.status(400).json({ error: errorMessage });
        }
        const { username, password } = parseResult.data;
        const cleanUsername = username.trim();
        let user = null;
        // 1. Try to find active employee by name or email (case-insensitive)
        const employee = await prisma_1.prisma.employee.findFirst({
            where: {
                OR: [
                    { name: { equals: cleanUsername, mode: 'insensitive' } },
                    { email: { equals: cleanUsername, mode: 'insensitive' } },
                ],
            },
        });
        if (employee) {
            user = await prisma_1.prisma.user.findUnique({
                where: { id: employee.userId },
                include: {
                    employee: true,
                    owner: true,
                },
            });
        }
        // 2. Try to find owner profile by name or email (case-insensitive)
        if (!user) {
            const owner = await prisma_1.prisma.ownerProfile.findFirst({
                where: {
                    OR: [
                        { name: { equals: cleanUsername, mode: 'insensitive' } },
                        { email: { equals: cleanUsername, mode: 'insensitive' } },
                    ],
                },
            });
            if (owner) {
                user = await prisma_1.prisma.user.findUnique({
                    where: { id: owner.userId },
                    include: {
                        employee: true,
                        owner: true,
                    },
                });
            }
        }
        // 3. Fallback: Try to find by user email (case-insensitive)
        if (!user) {
            user = await prisma_1.prisma.user.findFirst({
                where: {
                    email: {
                        equals: cleanUsername,
                        mode: 'insensitive',
                    },
                },
                include: {
                    employee: true,
                    owner: true,
                },
            });
        }
        // 4. Employee alias fallback (e.g. employee / employe)
        if (!user && (cleanUsername.toLowerCase() === 'employee' || cleanUsername.toLowerCase() === 'employe')) {
            user = await prisma_1.prisma.user.findFirst({
                where: {
                    role: client_1.Role.EMPLOYEE,
                },
                include: {
                    employee: true,
                    owner: true,
                },
            });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        const payload = { userId: user.id, role: user.role };
        const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        const profile = user.role === client_1.Role.OWNER ? user.owner : user.employee;
        return res.status(200).json({
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                profile,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
});
// GET /api/auth/me
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated.' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                employee: true,
                owner: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const profile = user.role === client_1.Role.OWNER ? user.owner : user.employee;
        return res.status(200).json({
            id: user.id,
            email: user.email,
            role: user.role,
            profile,
        });
    }
    catch (error) {
        console.error('Auth /me error:', error);
        return res.status(500).json({ error: 'Internal server error fetching user details.' });
    }
});
exports.default = router;
