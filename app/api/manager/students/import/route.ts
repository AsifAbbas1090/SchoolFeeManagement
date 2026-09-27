import { importStudentsHandler } from "@/lib/studentRoutes";

// POST /api/manager/students/import — bulk import from .csv/.xlsx (MANAGER).
export const POST = (req: Request) => importStudentsHandler(req, "MANAGER");
