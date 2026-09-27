import { importStudentsHandler } from "@/lib/studentRoutes";

// POST /api/admin/students/import — bulk import from .csv/.xlsx (ADMIN).
export const POST = (req: Request) => importStudentsHandler(req, "ADMIN");
