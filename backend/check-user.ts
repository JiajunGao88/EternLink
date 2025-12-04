import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  const email = '1377925603@qq.com';

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      accountType: true,
      createdAt: true,
      lastLoginAt: true,
    }
  });

  if (user) {
    console.log('✅ User found:');
    console.log(JSON.stringify(user, null, 2));
  } else {
    console.log('❌ User not found with email:', email);
  }

  await prisma.$disconnect();
}

checkUser().catch(console.error);
