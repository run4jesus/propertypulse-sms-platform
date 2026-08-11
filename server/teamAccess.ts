import { and, eq } from "drizzle-orm";
import { teamMembers, users } from "../drizzle/schema";
import { getDb } from "./db";

export type TeamAccess = {
  ownerUserId: number;
  memberUserId: number;
  role: "owner" | "workspace_admin" | "messenger_va";
  isMessengerOnly: boolean;
  isWorkspaceAdmin: boolean;
};

export async function getTeamAccess(userId: number): Promise<TeamAccess> {
  const db = await getDb();
  if (!db) return { ownerUserId: userId, memberUserId: userId, role: "owner", isMessengerOnly: false, isWorkspaceAdmin: false };

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.memberUserId, userId), eq(teamMembers.status, "active")))
    .limit(1);

  if (!membership) return { ownerUserId: userId, memberUserId: userId, role: "owner", isMessengerOnly: false, isWorkspaceAdmin: false };
  return {
    ownerUserId: membership.ownerUserId,
    memberUserId: userId,
    role: membership.role,
    isMessengerOnly: membership.role === "messenger_va",
    isWorkspaceAdmin: membership.role === "workspace_admin",
  };
}

export async function getUserEmail(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.email?.trim().toLowerCase() ?? null;
}
