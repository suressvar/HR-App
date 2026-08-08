"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    personalInfo: zod_1.z.string().optional(),
});
router.use(auth_1.requireAuth);
// GET /api/profile
router.get('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        if (req.user.role === client_1.Role.OWNER) {
            const ownerProfile = await prisma_1.prisma.ownerProfile.findUnique({
                where: { userId: req.user.userId },
                include: {
                    user: {
                        select: { id: true, email: true, role: true, createdAt: true },
                    },
                },
            });
            if (!ownerProfile) {
                return res.status(404).json({ error: 'Owner profile not found.' });
            }
            return res.status(200).json(ownerProfile);
        }
        else {
            const employeeProfile = await prisma_1.prisma.employee.findUnique({
                where: { userId: req.user.userId },
                include: {
                    user: {
                        select: { id: true, email: true, role: true, createdAt: true },
                    },
                },
            });
            if (!employeeProfile) {
                return res.status(404).json({ error: 'Employee profile not found.' });
            }
            return res.status(200).json(employeeProfile);
        }
    }
    catch (error) {
        console.error('Fetch profile error:', error);
        return res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});
// PATCH /api/profile — Update caller's own details (no role or userId mutation allowed)
router.patch('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        const parseResult = updateProfileSchema.safeParse(req.body);
        if (!parseResult.success) {
            const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
            return res.status(400).json({ error: errorMessage });
        }
        const dataToUpdate = parseResult.data;
        if (req.user.role === client_1.Role.OWNER) {
            const updated = await prisma_1.prisma.ownerProfile.update({
                where: { userId: req.user.userId },
                data: {
                    ...(dataToUpdate.name && { name: dataToUpdate.name }),
                    ...(dataToUpdate.email && { email: dataToUpdate.email }),
                    ...(dataToUpdate.phone && { phone: dataToUpdate.phone }),
                    ...(dataToUpdate.personalInfo !== undefined && { personalInfo: dataToUpdate.personalInfo }),
                },
            });
            return res.status(200).json(updated);
        }
        else {
            const updated = await prisma_1.prisma.employee.update({
                where: { userId: req.user.userId },
                data: {
                    ...(dataToUpdate.name && { name: dataToUpdate.name }),
                    ...(dataToUpdate.email && { email: dataToUpdate.email }),
                    ...(dataToUpdate.phone && { phone: dataToUpdate.phone }),
                    ...(dataToUpdate.address && { address: dataToUpdate.address }),
                },
            });
            return res.status(200).json(updated);
        }
    }
    catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({ error: 'Failed to update profile.' });
    }
});
exports.default = router;
