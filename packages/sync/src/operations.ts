import type { FieldError, Id } from '@tdl/domain';
import { z } from 'zod';
import { HLC_PATTERN } from './hlc.ts';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]),
);

// Any RFC 9562 UUID (lowercase hex, 8-4-4-4-12); ids are UUIDv7 in practice.
const uuidSchema: z.ZodType<Id> = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

const hlcSchema = z.string().regex(HLC_PATTERN);

export const recordRefSchema = z.object({
  type: z.enum(['list', 'task', 'link', 'grant']),
  id: uuidSchema,
});
export type RecordRef = z.infer<typeof recordRefSchema>;

export const metaChangeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('createList') }),
  z.object({ kind: z.literal('createTask'), listId: uuidSchema }),
  z.object({ kind: z.literal('moveTask'), listId: uuidSchema }),
  z.object({ kind: z.literal('createLink'), prerequisiteId: uuidSchema, postrequisiteId: uuidSchema }),
  z.object({ kind: z.literal('removeLink') }),
  z.object({
    kind: z.literal('grant'),
    userId: uuidSchema,
    target: z.object({ kind: z.enum(['list', 'task']), id: uuidSchema }),
    role: z.enum(['editor', 'commenter', 'viewer']),
  }),
  z.object({ kind: z.literal('revokeGrant') }),
]);
export type MetaChange = z.infer<typeof metaChangeSchema>;

export const contentChangeSchema = z.object({ field: z.string(), value: jsonValueSchema });
export type ContentChange = z.infer<typeof contentChangeSchema>;

const operationShape = z.object({
  id: uuidSchema,
  hlc: hlcSchema,
  record: recordRefSchema,
  meta: metaChangeSchema.nullable(),
  content: contentChangeSchema.nullable(),
});

const exactlyOne = (op: { meta: unknown; content: unknown }): boolean => (op.meta === null) !== (op.content === null);
const exactlyOneMessage = { message: 'exactly one of meta and content must be set' };

export const operationSchema = operationShape.refine(exactlyOne, exactlyOneMessage);
export type Operation = z.infer<typeof operationSchema>;

/** Elements are parsed one by one with `operationSchema`, so one malformed operation doesn't fail the others. */
export const pushRequestSchema = z.object({ ops: z.array(z.unknown()).max(500) });
export type PushRequest = z.infer<typeof pushRequestSchema>;

const fieldErrorSchema: z.ZodType<FieldError> = z.object({
  field: z.string(),
  code: z.enum([
    'required',
    'invalid',
    'unknown-field',
    'too-short',
    'too-long',
    'whitespace',
    'uppercase',
    'taken',
    'already-shared',
    'forbidden',
  ]),
});

export const pushResultSchema = z.discriminatedUnion('status', [
  z.object({ id: uuidSchema, status: z.literal('accepted'), seq: z.number().int() }),
  z.object({
    id: uuidSchema,
    status: z.literal('rejected'),
    code: z.enum(['not-found', 'forbidden', 'invalid', 'duplicate-link']),
    errors: z.array(fieldErrorSchema).optional(),
    existingLinkId: uuidSchema.optional(),
  }),
]);
export type PushResult = z.infer<typeof pushResultSchema>;

export const pushResponseSchema = z.object({ results: z.array(pushResultSchema) });
export type PushResponse = z.infer<typeof pushResponseSchema>;

export const feedEntrySchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.number().int(),
    kind: z.literal('op'),
    op: operationShape.extend({ seq: z.number().int(), authorId: uuidSchema }).refine(exactlyOne, exactlyOneMessage),
  }),
  z.object({ id: z.number().int(), kind: z.literal('forget'), record: recordRefSchema }),
]);
export type FeedEntry = z.infer<typeof feedEntrySchema>;

/** An entry this version's schemas refuse (a newer record type, kind of change or entry kind). `raw` is kept as it came. */
export interface UnknownEntry {
  kind: 'unknown';
  id: number;
  raw: JsonValue;
}

/** Entries are parsed one by one with `parseFeedEntry`, so one entry this version doesn't know doesn't fail the page. */
export const pullPageSchema = z.object({
  entries: z.array(z.unknown()),
  cursor: z.number().int(),
  more: z.boolean(),
});

/** A pulled page, after `parseFeedEntry` has sorted its entries. */
export interface PullPage {
  entries: (FeedEntry | UnknownEntry)[];
  cursor: number;
  more: boolean;
}

/**
 * A valid entry; or, for something with an integer `id` that the schema refuses, an unknown
 * entry; or null for anything without an integer `id`, which is a malformed page.
 */
export function parseFeedEntry(raw: unknown): FeedEntry | UnknownEntry | null {
  const entry = feedEntrySchema.safeParse(raw);
  if (entry.success) return entry.data;
  const json = jsonValueSchema.safeParse(raw);
  if (!json.success || typeof json.data !== 'object' || json.data === null || Array.isArray(json.data)) return null;
  const { id } = json.data;
  return typeof id === 'number' && Number.isInteger(id) ? { kind: 'unknown', id, raw: json.data } : null;
}

export const feedNotificationSchema = z.object({ type: z.literal('feed'), id: z.number().int() });
export type FeedNotification = z.infer<typeof feedNotificationSchema>;

export const errorBodySchema = z.object({ code: z.string(), errors: z.array(fieldErrorSchema).optional() });
export type ErrorBody = z.infer<typeof errorBodySchema>;
