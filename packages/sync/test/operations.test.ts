import { describe, expect, test } from 'vitest';
import {
  errorBodySchema,
  feedNotificationSchema,
  operationSchema,
  parseFeedEntry,
  pullPageSchema,
  pushRequestSchema,
  pushResponseSchema,
} from '../src/operations.ts';

const id = '0190a1b2-c3d4-7e5f-8a6b-7c8d9e0f1a2b';
const otherId = '0190a1b2-c3d4-7e5f-8a6b-7c8d9e0f1a2c';
const hlc = '000001700000000:000000:node-a';

const createTask = {
  id,
  hlc,
  record: { type: 'task', id: otherId },
  meta: { kind: 'createTask', listId: id },
  content: null,
};

describe('operationSchema', () => {
  test('a valid createTask operation parses', () => {
    expect(operationSchema.safeParse(createTask).success).toBe(true);
  });

  test('a content operation parses', () => {
    const op = { ...createTask, meta: null, content: { field: 'title', value: { nested: [1, 'a', null, true] } } };
    expect(operationSchema.safeParse(op).success).toBe(true);
  });

  test('both meta and content fails', () => {
    const op = { ...createTask, content: { field: 'title', value: 'x' } };
    expect(operationSchema.safeParse(op).success).toBe(false);
  });

  test('neither meta nor content fails', () => {
    expect(operationSchema.safeParse({ ...createTask, meta: null }).success).toBe(false);
  });

  test('a non-UUID record id fails', () => {
    expect(operationSchema.safeParse({ ...createTask, record: { type: 'task', id: 'nope' } }).success).toBe(false);
  });

  test('a malformed hlc fails', () => {
    for (const bad of ['z', '9', '', '9999999999999999:000000:node-a', '000001700000000:0:node-a', '000001700000000:000000:']) {
      expect(operationSchema.safeParse({ ...createTask, hlc: bad }).success).toBe(false);
    }
  });

  test('a non-UUID operation id fails', () => {
    expect(operationSchema.safeParse({ ...createTask, id: 'nope' }).success).toBe(false);
  });

  test('parses grant and createLink metadata', () => {
    const grant = {
      ...createTask,
      record: { type: 'grant', id: otherId },
      meta: { kind: 'grant', userId: id, target: { kind: 'list', id: otherId }, role: 'editor' },
    };
    const link = {
      ...createTask,
      record: { type: 'link', id: otherId },
      meta: { kind: 'createLink', prerequisiteId: id, postrequisiteId: otherId },
    };
    expect(operationSchema.safeParse(grant).success).toBe(true);
    expect(operationSchema.safeParse(link).success).toBe(true);
    expect(operationSchema.safeParse({ ...grant, meta: { ...grant.meta, role: 'owner' } }).success).toBe(false);
  });
});

describe('pushRequestSchema', () => {
  test('a push of 500 operations parses', () => {
    expect(pushRequestSchema.safeParse({ ops: Array.from({ length: 500 }, () => createTask) }).success).toBe(true);
  });

  test('a push of 501 operations fails', () => {
    expect(pushRequestSchema.safeParse({ ops: Array.from({ length: 501 }, () => createTask) }).success).toBe(false);
  });
});

describe('responses', () => {
  test('push results parse', () => {
    const results = [
      { id, status: 'accepted', seq: 3 },
      { id, status: 'rejected', code: 'invalid', errors: [{ field: 'title', code: 'required' }] },
      { id, status: 'rejected', code: 'duplicate-link', existingLinkId: otherId },
    ];
    expect(pushResponseSchema.safeParse({ results }).success).toBe(true);
    expect(pushResponseSchema.safeParse({ results: [{ id, status: 'rejected', code: 'bogus' }] }).success).toBe(false);
  });

  test('pull pages parse both entry kinds', () => {
    const entries = [
      { id: 1, kind: 'op', op: { ...createTask, seq: 1, authorId: id } },
      { id: 2, kind: 'forget', record: { type: 'list', id } },
    ];
    expect(pullPageSchema.safeParse({ entries, cursor: 2, more: false }).success).toBe(true);
  });

  test('pull pages keep entries as they came, for parseFeedEntry', () => {
    const entries = [{ id: 1, kind: 'bogus' }, 'junk'];
    expect(pullPageSchema.safeParse({ entries, cursor: 1, more: false }).success).toBe(true);
  });

  test('notifications and error bodies parse', () => {
    expect(feedNotificationSchema.safeParse({ type: 'feed', id: 4 }).success).toBe(true);
    expect(errorBodySchema.safeParse({ code: 'x' }).success).toBe(true);
    expect(errorBodySchema.safeParse({ code: 'x', errors: [{ field: 'f', code: 'taken' }] }).success).toBe(true);
  });
});

describe('parseFeedEntry', () => {
  const known = { id: 1, kind: 'op', op: { ...createTask, seq: 1, authorId: id } };

  test('a valid entry parses as itself', () => {
    expect(parseFeedEntry(known)).toEqual(known);
    const forget = { id: 2, kind: 'forget', record: { type: 'list', id } };
    expect(parseFeedEntry(forget)).toEqual(forget);
  });

  test('an unknown record type is an unknown entry', () => {
    const raw = { id: 3, kind: 'op', op: { ...known.op, record: { type: 'tag', id: otherId } } };
    expect(parseFeedEntry(raw)).toEqual({ kind: 'unknown', id: 3, raw });
  });

  test('an unknown kind of change is an unknown entry', () => {
    const raw = { id: 4, kind: 'op', op: { ...known.op, meta: { kind: 'createTag' } } };
    expect(parseFeedEntry(raw)).toEqual({ kind: 'unknown', id: 4, raw });
  });

  test('an unknown entry kind is an unknown entry', () => {
    const raw = { id: 5, kind: 'rename', record: { type: 'list', id } };
    expect(parseFeedEntry(raw)).toEqual({ kind: 'unknown', id: 5, raw });
  });

  test('a known kind with a malformed value is null, not unknown', () => {
    expect(parseFeedEntry({ ...known, op: { ...known.op, hlc: 'bad' } })).toBeNull();
    expect(parseFeedEntry({ ...known, op: { ...known.op, id: 'not-a-uuid' } })).toBeNull();
    expect(parseFeedEntry({ id: 2, kind: 'forget', record: { type: 'list', id: 'x' } })).toBeNull();
  });

  test('an entry without an integer id is null', () => {
    expect(parseFeedEntry({ kind: 'op' })).toBeNull();
    expect(parseFeedEntry({ id: 'x', kind: 'op' })).toBeNull();
    expect(parseFeedEntry('junk')).toBeNull();
    expect(parseFeedEntry(null)).toBeNull();
  });
});
