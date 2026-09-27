import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homePathFor } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  redirect(session ? homePathFor(session.role) : "/login");
}
