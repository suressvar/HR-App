import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.OWNER_SEED_EMAIL || 'owner';
  const rawOwnerPassword = process.env.OWNER_SEED_PASSWORD || 'owner123';
  const empEmail = process.env.EMPLOYEE_SEED_EMAIL || 'sur';
  const rawEmpPassword = process.env.EMPLOYEE_SEED_PASSWORD || 'sur123';

  console.log(`Seeding database with Owner (${ownerEmail}) and Employee (${empEmail})...`);

  // 1. Seed or update Owner account
  const ownerPasswordHash = await bcrypt.hash(rawOwnerPassword, 10);
  const existingOwner = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: ownerEmail, mode: 'insensitive' } },
        { role: Role.OWNER },
      ],
    },
    include: { owner: true },
  });

  if (!existingOwner) {
    await prisma.user.create({
      data: {
        email: ownerEmail,
        passwordHash: ownerPasswordHash,
        role: Role.OWNER,
        owner: {
          create: {
            name: 'Owner',
            email: ownerEmail,
            phone: '+1-555-0199',
            personalInfo: 'Primary System Administrator & Owner Account',
          },
        },
      },
    });
    console.log(`Successfully created Owner account: ${ownerEmail}`);
  } else {
    await prisma.user.update({
      where: { id: existingOwner.id },
      data: {
        email: ownerEmail,
        passwordHash: ownerPasswordHash,
      },
    });
    console.log(`Successfully updated Owner account credentials: ${ownerEmail}`);
  }

  // 2. Seed or update Employee account (sur)
  const empPasswordHash = await bcrypt.hash(rawEmpPassword, 10);
  const existingEmp = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: empEmail, mode: 'insensitive' } },
        { employee: { name: { equals: empEmail, mode: 'insensitive' } } },
      ],
    },
    include: { employee: true },
  });

  if (!existingEmp) {
    const newEmp = await prisma.user.create({
      data: {
        email: empEmail,
        passwordHash: empPasswordHash,
        role: Role.EMPLOYEE,
        employee: {
          create: {
            name: empEmail,
            email: empEmail,
            phone: '+1-555-0100',
            address: 'ICC Industries HQ',
            role: 'Employee',
            status: 'ACTIVE',
          },
        },
      },
      include: { employee: true },
    });
    console.log(`Successfully created Employee user: ${empEmail} (Name: ${newEmp.employee?.name})`);
  } else {
    await prisma.user.update({
      where: { id: existingEmp.id },
      data: {
        email: empEmail,
        passwordHash: empPasswordHash,
      },
    });
    if (existingEmp.employee) {
      await prisma.employee.update({
        where: { id: existingEmp.employee.id },
        data: {
          name: empEmail,
          email: empEmail,
          status: 'ACTIVE',
        },
      });
    }
    console.log(`Successfully updated Employee account: ${empEmail} with password`);
  }
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
