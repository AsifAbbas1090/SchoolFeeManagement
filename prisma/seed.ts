import { PrismaClient, Role, FeeType, SubmissionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ---- 1. Hardcoded Admin ----
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "Admin",
      username: "admin",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      phone: "0300-0000000",
    },
  });

  // ---- 2. Dummy Managers ----
  const managerPasswordHash = await bcrypt.hash("manager123", 10);
  const managerA = await prisma.user.upsert({
    where: { username: "manager1" },
    update: {},
    create: {
      name: "Bilal Ahmed",
      username: "manager1",
      passwordHash: managerPasswordHash,
      role: Role.MANAGER,
      phone: "0301-1111111",
    },
  });

  const managerB = await prisma.user.upsert({
    where: { username: "manager2" },
    update: {},
    create: {
      name: "Sana Tariq",
      username: "manager2",
      passwordHash: managerPasswordHash,
      role: Role.MANAGER,
      phone: "0302-2222222",
    },
  });

  // ---- 3+. Demo data — only on an empty DB, so re-running the seed never duplicates rows ----
  if ((await prisma.student.count()) > 0) {
    console.log("Students already exist — skipping demo data (users ensured).");
    return;
  }

  // ---- 3. Dummy Students ----
  const studentsData = [
    { name: "Ahmed Raza", className: "Class 5", fatherName: "Raza Khan", phoneNumber: "0311-1111111", admissionFee: 5000, monthlyFee: 2000, createdById: admin.id },
    { name: "Fatima Noor", className: "Class 3", fatherName: "Noor Muhammad", phoneNumber: "0312-2222222", admissionFee: 3000, monthlyFee: 1800, createdById: admin.id },
    { name: "Bilal Hassan", className: "Nursery", fatherName: "Hassan Ali", phoneNumber: "0313-3333333", admissionFee: null, monthlyFee: 1500, createdById: managerA.id },
    { name: "Ayesha Malik", className: "Class 8", fatherName: "Malik Iqbal", phoneNumber: "0314-4444444", admissionFee: 4000, monthlyFee: 2200, createdById: managerA.id },
    { name: "Usman Tariq", className: "Class 5", fatherName: "Tariq Mehmood", phoneNumber: "0315-5555555", admissionFee: null, monthlyFee: 1700, createdById: managerB.id },
  ];

  const students = [];
  for (const s of studentsData) {
    const student = await prisma.student.create({ data: { ...s, admissionDate: new Date() } });
    students.push(student);
  }

  // ---- 4. Dummy Fee Payments (this month, collected by both managers) ----
  const now = new Date();
  const forMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  await prisma.feePayment.createMany({
    data: [
      { studentId: students[0].id, collectedById: managerA.id, amount: 5000, feeType: FeeType.ADMISSION },
      { studentId: students[0].id, collectedById: managerA.id, amount: 2000, feeType: FeeType.MONTHLY, forMonth },
      { studentId: students[1].id, collectedById: managerA.id, amount: 1800, feeType: FeeType.MONTHLY, forMonth },
      { studentId: students[2].id, collectedById: managerA.id, amount: 1500, feeType: FeeType.MONTHLY, forMonth },
      { studentId: students[3].id, collectedById: managerB.id, amount: 2200, feeType: FeeType.MONTHLY, forMonth },
      { studentId: students[4].id, collectedById: managerB.id, amount: 1700, feeType: FeeType.MONTHLY, forMonth },
    ],
  });

  // ---- 5. A submission from managerA to Admin ----
  await prisma.submission.create({
    data: {
      submittedById: managerA.id,
      amount: 6000,
      status: SubmissionStatus.PENDING,
      notes: "Partial submission for today's collection",
    },
  });

  // ---- 6. Dummy Expenses ----
  await prisma.expense.createMany({
    data: [
      { title: "Electricity bill", category: "Utilities", amount: 15000, addedById: admin.id },
      { title: "Staff salaries", category: "Salary", amount: 120000, addedById: admin.id },
    ],
  });

  console.log("Seed complete (demo data inserted).");
}

function printLogins() {
  console.log("Logins:");
  console.log("  Admin login  -> username: admin   / password: admin123");
  console.log("  Manager 1    -> username: manager1 / password: manager123");
  console.log("  Manager 2    -> username: manager2 / password: manager123");
}

main()
  .then(printLogins)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
