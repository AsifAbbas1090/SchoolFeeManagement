import { createStudentHandler } from "@/lib/studentRoutes";

// POST /api/manager/students — add one student (MANAGER).
export const POST = (req: Request) => createStudentHandler(req, "MANAGER");
