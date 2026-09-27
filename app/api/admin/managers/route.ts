import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

// POST /api/admin/managers  { name, username, password, phone? }  — Admin only
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Only the Admin can add managers." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(body.name);
  const username = str(body.username).toLowerCase(); // login lowercases too
  const password = typeof body.password === "string" ? body.password : "";
  const phone = str(body.phone);

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Name is required.";
  else if (name.length > 100) errors.name = "Name is too long.";
  if (!USERNAME_RE.test(username))
    errors.username = "3–30 characters: lowercase letters, numbers, dot, dash or underscore.";
  if (password.length < 6) errors.password = "Password must be at least 6 characters.";
  else if (password.length > 72) errors.password = "Password must be 72 characters or fewer.";
  if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) errors.phone = "Enter a valid phone number.";

  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fields: errors }, { status: 400 });
  }

  const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (taken) {
    return NextResponse.json(
      { error: `Username "${username}" is already taken.`, fields: { username: "This username is already taken." } },
      { status: 409 }
    );
  }

  try {
    const manager = await prisma.user.create({
      data: { name, username, phone: phone || null, role: "MANAGER", passwordHash: await bcrypt.hash(password, 10) },
      select: { id: true, name: true, username: true },
    });
    return NextResponse.json({ manager }, { status: 201 });
  } catch (err) {
    // Two admins submitting the same username at once — the unique index catches it.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: `Username "${username}" is already taken.`, fields: { username: "This username is already taken." } },
        { status: 409 }
      );
    }
    console.error("Create manager failed:", err);
    return NextResponse.json({ error: "Could not create the manager. Try again." }, { status: 500 });
  }
}
