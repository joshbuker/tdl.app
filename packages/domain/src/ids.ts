import { v7 } from 'uuid';
import type { Id } from './model.ts';

/** A new UUIDv7: generated on the device, and sorts in creation order. */
export function newId(): Id {
  return v7();
}
