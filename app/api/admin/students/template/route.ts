import { templateHandler } from "@/lib/studentRoutes";

// GET /api/admin/students/template — import template CSV (ADMIN).
export const GET = () => templateHandler("ADMIN");
