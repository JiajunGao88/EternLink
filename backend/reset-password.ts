import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetPassword() {
  const email = '1377925603@qq.com';
  const newPassword = 'qwerasdf'; // 新密码

  console.log(`\nResetting password for: ${email}`);
  console.log(`New password: ${newPassword}\n`);

  // Hash the new password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update the user's password
  const updated = await prisma.user.update({
    where: { email },
    data: { passwordHash },
    select: {
      email: true,
      updatedAt: true,
    }
  });

  console.log('✅ Password reset successfully!');
  console.log(JSON.stringify(updated, null, 2));
  console.log(`\nYou can now login with:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${newPassword}`);

  await prisma.$disconnect();
}

resetPassword().catch(console.error);
