import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { newId, type FieldError, type Id } from '@tdl/domain';
import { and, asc, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { invitations, user } from '../db/schema.ts';
import { sendError } from '../errors.ts';
import { sessionOf, type RequireSession } from '../session-guard.ts';
import { alreadyShared, shareDecision, type Target } from '../sharing/rules.ts';
import { collectTarget } from '../sync/access-loader.ts';
import { writeServerOps, type Tx } from '../sync/apply.ts';
import type { FeedTransaction } from '../sync/feed-transaction.ts';

const targetSchema = z.object({ kind: z.enum(['list', 'task']), id: z.uuid() });
const roleSchema = z.enum(['editor', 'commenter', 'viewer']);
const invitationRequestSchema = z.object({ target: targetSchema, username: z.string(), role: roleSchema });
type InvitationRequest = z.infer<typeof invitationRequestSchema>;
const invitationViewSchema = z.object({ id: z.uuid(), inviter: z.object({ username: z.string() }), target: targetSchema, role: roleSchema });
const idParamsSchema = z.object({ id: z.string() });

/** Why a sharing request was refused, as an error-contract response. */
interface Refusal {
  status: 403 | 404 | 422;
  code: string;
  errors?: FieldError[];
}
const notFound: Refusal = { status: 404, code: 'not-found' };
const invalid = (field: string, code: FieldError['code']): Refusal => ({ status: 422, code: 'invalid', errors: [{ field, code }] });
const refuse = (reply: FastifyReply, refusal: Refusal) => sendError(reply, refusal.status, refusal.code, refusal.errors);
const isRefusal = (value: unknown): value is Refusal => typeof value === 'object' && value !== null && 'status' in value;

export interface InvitationDeps {
  db: Db;
  feedTransaction: FeedTransaction;
  now: () => number;
}

export function registerInvitationRoutes(app: FastifyInstance, { db, feedTransaction, now }: InvitationDeps, requireSession: RequireSession): void {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    '/invitations',
    { preHandler: requireSession, schema: { body: invitationRequestSchema, response: { 201: z.object({ id: z.uuid() }) } } },
    async (request, reply) => {
      const { userId } = sessionOf(request);
      const result = await db.transaction((tx) => createInvitation(tx, userId, request.body));
      return isRefusal(result) ? refuse(reply, result) : reply.code(201).send({ id: result });
    },
  );

  typed.get(
    '/invitations',
    { preHandler: requireSession, schema: { response: { 200: z.array(invitationViewSchema) } } },
    async (request) => receivedInvitations(db, sessionOf(request).userId),
  );

  typed.post('/invitations/:id/accept', { preHandler: requireSession, schema: { params: idParamsSchema } }, async (request, reply) => {
    const { userId } = sessionOf(request);
    const refusal = await feedTransaction((tx) => acceptInvitation(tx, userId, request.params.id, now));
    return refusal === null ? reply.code(204).send() : refuse(reply, refusal);
  });

  typed.post('/invitations/:id/decline', { preHandler: requireSession, schema: { params: idParamsSchema } }, async (request, reply) => {
    const { userId } = sessionOf(request);
    const refusal = await db.transaction((tx) => declineInvitation(tx, userId, request.params.id));
    return refusal === null ? reply.code(204).send() : refuse(reply, refusal);
  });
}

/** Records an invitation from `inviterId`, after checking they may share the target with that user. Returns its ID. */
async function createInvitation(tx: Tx, inviterId: Id, { target, username, role }: InvitationRequest): Promise<Id | Refusal> {
  const access = await collectTarget(tx, target);
  const decision = shareDecision(access, inviterId, target);
  if (decision !== 'ok') return decision === 'forbidden' ? { status: 403, code: 'forbidden' } : notFound;

  // The username plugin stores usernames lowercased, so this ignores case.
  const [invitee] = await tx.select({ id: user.id }).from(user).where(eq(user.username, username.toLowerCase()));
  if (invitee === undefined || invitee.id === inviterId) return invalid('username', 'invalid');
  if (alreadyShared(access, invitee.id, target, role)) return invalid('username', 'already-shared');

  const id = newId();
  await tx.insert(invitations).values({ id, inviterId, inviteeId: invitee.id, targetKind: target.kind, targetId: target.id, role });
  return id;
}

/** The invitations the user has received, oldest first. Titles stay on devices, so only the target's ID is given. */
async function receivedInvitations(db: Db, userId: Id): Promise<z.infer<typeof invitationViewSchema>[]> {
  const rows = await db
    .select({
      id: invitations.id,
      targetKind: invitations.targetKind,
      targetId: invitations.targetId,
      role: invitations.role,
      username: user.username,
      displayUsername: user.displayUsername,
    })
    .from(invitations)
    .innerJoin(user, eq(user.id, invitations.inviterId))
    .where(eq(invitations.inviteeId, userId))
    .orderBy(asc(invitations.createdAt));
  return rows.map((row) => ({
    id: row.id,
    inviter: { username: row.displayUsername ?? row.username ?? '' },
    target: targetSchema.parse({ kind: row.targetKind, id: row.targetId }),
    role: roleSchema.parse(row.role),
  }));
}

/**
 * Deletes the user's invitation, returning it, or null if they have none with that ID. Deleting
 * first means a concurrent accept or decline of the same invitation finds nothing.
 */
async function takeInvitation(tx: Tx, inviteeId: Id, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const [taken] = await tx
    .delete(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.inviteeId, inviteeId)))
    .returning();
  return taken ?? null;
}

/**
 * Turns the invitation into a grant, made by the server and authored by the invitee. An invitation
 * whose inviter may no longer share its target is gone: it is deleted, and answers not-found.
 */
async function acceptInvitation(tx: Tx, inviteeId: Id, id: string, now: () => number): Promise<Refusal | null> {
  const invitation = await takeInvitation(tx, inviteeId, id);
  if (invitation === null) return notFound;
  const target: Target = targetSchema.parse({ kind: invitation.targetKind, id: invitation.targetId });
  if (shareDecision(await collectTarget(tx, target), invitation.inviterId, target) !== 'ok') return notFound;

  const role = roleSchema.parse(invitation.role);
  const grant = { id: newId(), record: { type: 'grant' as const, id: newId() }, meta: { kind: 'grant' as const, userId: inviteeId, target, role }, content: null };
  await writeServerOps(tx, inviteeId, [grant], now);
  return null;
}

async function declineInvitation(tx: Tx, inviteeId: Id, id: string): Promise<Refusal | null> {
  return (await takeInvitation(tx, inviteeId, id)) === null ? notFound : null;
}
