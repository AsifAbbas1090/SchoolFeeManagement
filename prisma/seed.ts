import { PrismaClient, Role, FeeType, SubmissionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// The three campuses (same ids the campuses migration creates). Fully separate from each other.
const CAMPUSES = [
  { id: "campus_boys", code: "boys", name: "Al-Abbas Boys Higher Secondary School Shah Jamal" },
  { id: "campus_girls", code: "girls", name: "Al-Abbas Girls Higher Secondary School Shah Jamal" },
  { id: "campus_kids", code: "kids", name: "Al-Abbas Kids Grammar Public School" },
] as const;

// One admin per campus (admins aren't created from the UI). Change these passwords before real use.
const ADMINS = [
  { username: "admin", name: "Admin (Boys)", campusId: "campus_boys", phone: "0300-0000000" },
  { username: "admin.girls", name: "Admin (Girls)", campusId: "campus_girls", phone: "0300-0000001" },
  { username: "admin.kids", name: "Admin (Kids)", campusId: "campus_kids", phone: "0300-0000002" },
] as const;

async function main() {
  // ---- 1. Campuses ----
  for (const c of CAMPUSES) {
    await prisma.campus.upsert({ where: { id: c.id }, update: { name: c.name, code: c.code }, create: c });
  }

  // ---- 2. Campus admins ----
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admins: Record<string, string> = {};
  for (const a of ADMINS) {
    const u = await prisma.user.upsert({
      where: { username: a.username },
      update: {},
      create: { ...a, passwordHash: adminPasswordHash, role: Role.ADMIN },
    });
    admins[a.campusId] = u.id;
  }
  const admin = { id: admins.campus_boys };
  const campusId = "campus_boys"; // demo managers + data live in the Boys campus

  // ---- 3. Demo managers (Boys campus) ----
  const managerPasswordHash = await bcrypt.hash("manager123", 10);
  const managerA = await prisma.user.upsert({
    where: { username: "manager1" },
    update: {},
    create: { name: "Bilal Ahmed", username: "manager1", passwordHash: managerPasswordHash, role: Role.MANAGER, phone: "0301-1111111", campusId },
  });
  const managerB = await prisma.user.upsert({
    where: { username: "manager2" },
    update: {},
    create: { name: "Sana Tariq", username: "manager2", passwordHash: managerPasswordHash, role: Role.MANAGER, phone: "0302-2222222", campusId },
  });

  // ---- 4+. Demo data — only on an empty DB, so re-running the seed never duplicates rows ----
  if ((await prisma.student.count()) > 0) {
    console.log("Students already exist — skipping demo data (campuses + users ensured).");
    return;
  }

  const studentsData = [
    { name: "Ahmed Raza", className: "Class 5", fatherName: "Raza Khan", phoneNumber: "0311-1111111", admissionFee: 5000, monthlyFee: 2000, createdById: admin.id },
    { name: "Fatima Noor", className: "Class 3", fatherName: "Noor Muhammad", phoneNumber: "0312-2222222", admissionFee: 3000, monthlyFee: 1800, createdById: admin.id },
    { name: "Bilal Hassan", className: "Nursery", fatherName: "Hassan Ali", phoneNumber: "0313-3333333", admissionFee: null, monthlyFee: 1500, createdById: managerA.id },
    { name: "Ayesha Malik", className: "Class 8", fatherName: "Malik Iqbal", phoneNumber: "0314-4444444", admissionFee: 4000, monthlyFee: 2200, createdById: managerA.id },
    { name: "Usman Tariq", className: "Class 5", fatherName: "Tariq Mehmood", phoneNumber: "0315-5555555", admissionFee: null, monthlyFee: 1700, createdById: managerB.id },
  ];
  const students: { id: string }[] = [];
  for (const s of studentsData) {
    students.push(await prisma.student.create({ data: { ...s, campusId, admissionDate: new Date() } }));
  }

  const now = new Date();
  const forMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pay = (i: number, by: string, amount: number, feeType: FeeType, month?: string) => ({
    studentId: students[i].id,
    collectedById: by,
    amount,
    feeType,
    forMonth: month ?? null,
    campusId,
  });
  await prisma.feePayment.createMany({
    data: [
      pay(0, managerA.id, 5000, FeeType.ADMISSION),
      pay(0, managerA.id, 2000, FeeType.MONTHLY, forMonth),
      pay(1, managerA.id, 1800, FeeType.MONTHLY, forMonth),
      pay(2, managerA.id, 1500, FeeType.MONTHLY, forMonth),
      pay(3, managerB.id, 2200, FeeType.MONTHLY, forMonth),
      pay(4, managerB.id, 1700, FeeType.MONTHLY, forMonth),
    ],
  });

  await prisma.submission.create({
    data: { submittedById: managerA.id, amount: 6000, status: SubmissionStatus.PENDING, notes: "Partial submission for today's collection", campusId },
  });

  await prisma.expense.createMany({
    data: [
      { title: "Electricity bill", category: "Utilities", amount: 15000, addedById: admin.id, campusId },
      { title: "Staff salaries", category: "Salary", amount: 120000, addedById: admin.id, campusId },
    ],
  });

  console.log("Seed complete (demo data inserted).");
}

function printLogins() {
  console.log("Logins (change before real use):");
  console.log("  Boys admin   -> admin       / admin123");
  console.log("  Girls admin  -> admin.girls / admin123");
  console.log("  Kids admin   -> admin.kids  / admin123");
  console.log("  Manager 1    -> manager1    / manager123  (Boys)");
  console.log("  Manager 2    -> manager2    / manager123  (Boys)");
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
