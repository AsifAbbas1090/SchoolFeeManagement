import { createStudentHandler } from "@/lib/studentRoutes";

// POST /api/admin/students — add one student (ADMIN).
export const POST = (req: Request) => createStudentHandler(req, "ADMIN");
