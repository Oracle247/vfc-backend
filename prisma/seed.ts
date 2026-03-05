import { PrismaClient, UserRole, Gender, ChurchStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@vfc.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "User",
      email,
      password: hashedPassword,
      phoneNumber: "+2340000000000",
      gender: Gender.MALE,
      address: "Admin",
      churchStatus: ChurchStatus.MEMBER,
      role: UserRole.ADMIN,
    },
  });

  console.log(`Admin user created: ${admin.email} (${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
