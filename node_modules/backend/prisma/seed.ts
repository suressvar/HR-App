import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_SEED_EMAIL || 'owner@iccindustries.com';
  const rawPassword = process.env.OWNER_SEED_PASSWORD || 'OwnerSecurePassword123!';

  console.log(`Seeding database with Owner account: ${email}...`);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log('Owner account already exists, skipping seed.');
    return;
  }

  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.OWNER,
      owner: {
        create: {
          name: 'ICC Executive Owner',
          email,
          phone: '+1-555-0199',
          personalInfo: 'Primary System Administrator & Owner Account',
        },
      },
    },
    include: {
      owner: true,
    },
  });

  console.log(`Successfully seeded Owner user (ID: ${user.id}) with OwnerProfile.`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
