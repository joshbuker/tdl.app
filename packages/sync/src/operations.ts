import type { FieldError, Id } from '@tdl/domain';
import { z } from 'zod';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]),
);

// Any RFC 9562 UUID (lowercase hex, 8-4-4-4-12); ids are UUIDv7 in practice.
const uuidSchema: z.ZodType<Id> = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

const hlcSchema = z.string().min(1);

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

export const pushRequestSchema = z.object({ ops: z.array(operationSchema).max(500) });
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

export const pullPageSchema = z.object({
  entries: z.array(feedEntrySchema),
  cursor: z.number().int(),
  more: z.boolean(),
});
export type PullPage = z.infer<typeof pullPageSchema>;

export const feedNotificationSchema = z.object({ type: z.literal('feed'), id: z.number().int() });
export type FeedNotification = z.infer<typeof feedNotificationSchema>;

export const errorBodySchema = z.object({ code: z.string(), errors: z.array(fieldErrorSchema).optional() });
export type ErrorBody = z.infer<typeof errorBodySchema>;
