import type { Id, Link, Task } from '../src/model.ts';

/** An incomplete task in list 'L', titled with its ID. */
export function task(id: Id, opts: Partial<Task> = {}): Task {
  return { id, listId: 'L', title: id, notes: '', completedAt: null, ...opts };
}

/** A completed task. */
export function done(id: Id, opts: Partial<Task> = {}): Task {
  return task(id, { completedAt: '2026-01-01T00:00:00Z', ...opts });
}

/** A hard link from `pre` to `post`, with ID `pre->post`. */
export function link(pre: Id, post: Id, opts: Partial<Link> = {}): Link {
  return { id: `${pre}->${post}`, prerequisiteId: pre, postrequisiteId: post, kind: 'hard', reason: '', ...opts };
}

/** Tasks t0 … t(n-1) and links t0→t1→…→t(n-1). */
export function chain(n: number): { tasks: Task[]; links: Link[] } {
  const tasks = Array.from({ length: n }, (_, i) => task(`t${String(i)}`));
  const links = tasks.slice(1).map((t, i) => link(`t${String(i)}`, t.id));
  return { tasks, links };
}
