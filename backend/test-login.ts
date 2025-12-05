import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testLogin() {
  const email = '1377925603@qq.com';
  const testPasswords = ['qwerasdf', 'Qwerasdf', 'qwerasdf123', '12345678'];

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      passwordHash: true,
    }
  });

  if (!user) {
    console.log('❌ User not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Testing passwords...\n');

  for (const password of testPasswords) {
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log(`Password: "${password}" - ${isMatch ? '✅ MATCH' : '❌ No match'}`);
  }

  await prisma.$disconnect();
}

testLogin().catch(console.error);
