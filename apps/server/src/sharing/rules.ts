import { mayShare, roleOn, type AccessData, type Id, type ShareTarget } from '@tdl/domain';
import type { Decision } from '../sync/authorize.ts';

export { alreadyShared, mayRemoveGrant } from '@tdl/domain';
export type Target = ShareTarget;

/** Whether the user may invite people to the target, and if not, whether they can see it at all. */
export function shareDecision(access: AccessData, userId: Id, target: Target): Decision {
  if (roleOn(access, userId, target) === null) return 'not-found';
  return mayShare(access, userId, target) ? 'ok' : 'forbidden';
}
