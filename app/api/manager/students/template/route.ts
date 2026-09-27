import { templateHandler } from "@/lib/studentRoutes";

// GET /api/manager/students/template — import template CSV (MANAGER).
export const GET = () => templateHandler("MANAGER");
