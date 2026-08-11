import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getTeamAccess } from "../teamAccess";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireOwnerUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  const access = await getTeamAccess(ctx.user.id);
  if (access.isMessengerOnly) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This account has Messenger-only access" });
  }

  if (access.isWorkspaceAdmin) {
    const db = await getDb();
    const [owner] = db ? await db.select().from(users).where(eq(users.id, access.ownerUserId)).limit(1) : [];
    if (!owner) throw new TRPCError({ code: "FORBIDDEN", message: "Workspace owner is unavailable" });
    return next({ ctx: { ...ctx, user: owner, actorUser: ctx.user, isMessengerOnly: false } });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      actorUser: ctx.user,
      isMessengerOnly: false,
    },
  });
});

const requireMessengerUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });

  const access = await getTeamAccess(ctx.user.id);
  if (!access.isMessengerOnly) {
    return next({ ctx: { ...ctx, user: ctx.user, actorUser: ctx.user, isMessengerOnly: false } });
  }

  const db = await getDb();
  const [owner] = db ? await db.select().from(users).where(eq(users.id, access.ownerUserId)).limit(1) : [];
  if (!owner) throw new TRPCError({ code: "FORBIDDEN", message: "Workspace owner is unavailable" });
  return next({ ctx: { ...ctx, user: owner, actorUser: ctx.user, isMessengerOnly: true } });
});

export const protectedProcedure = t.procedure.use(requireOwnerUser);
export const messengerProcedure = t.procedure.use(requireMessengerUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
