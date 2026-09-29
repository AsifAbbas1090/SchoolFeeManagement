// Campus isolation — the ONE rule every query follows.
// Campuses are fully separate: an admin or manager only ever reads or writes rows of their own
// campus. campusId always comes from the signed-in user (getActor), never from the request.
import type { Actor } from "@/lib/auth";

export type CampusScope = { campusId: string };

export function campusWhere(actor: Pick<Actor, "campusId">): CampusScope {
  if (!actor.campusId) throw new Error("campusWhere: missing campusId");
  return { campusId: actor.campusId };
}
