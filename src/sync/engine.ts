import type { Snapshot } from '../db/persistence';
import { openJSON, sealJSON } from '../crypto/keys';
import { mergeThreeWay, normalizeSnapshot, sameSnapshot } from './merge';
import type { Remote } from './remote';

/** What this device last agreed on with the server. Stored locally (encrypted when the lock is on). */
export interface SyncState {
  version: number;
  base: Snapshot | null;
}

export const EMPTY_SYNC_STATE: SyncState = { version: 0, base: null };

export interface SyncContext {
  remote: Remote;
  /** Data key derived from the master secret. */
  enc: CryptoKey;
  getLocal: () => Snapshot;
  /** Replace local data with a merged result. */
  applyLocal: (s: Snapshot) => Promise<void>;
  state: SyncState;
}

export type SyncOutcome = { state: SyncState; changedLocal: boolean; pushed: boolean };

const MAX_ATTEMPTS = 4;

/**
 * One sync round: pull, merge three-way if the server moved on, push if anything differs.
 * A push only succeeds against the version we merged with; otherwise we pull again.
 */
export async function syncOnce(ctx: SyncContext): Promise<SyncOutcome> {
  let state = ctx.state;
  let changedLocal = false;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const remote = await ctx.remote.pull();
    let target = normalizeSnapshot(ctx.getLocal());
    let version = state.version;

    if (remote && remote.version !== state.version) {
      const remoteSnap = await openJSON<Snapshot>(ctx.enc, remote);
      target = normalizeSnapshot(mergeThreeWay(state.base, target, remoteSnap));
      version = remote.version;
      if (!sameSnapshot(target, ctx.getLocal())) {
        await ctx.applyLocal(target);
        changedLocal = true;
      }
      if (sameSnapshot(target, remoteSnap)) {
        state = { version, base: target };
        return { state, changedLocal, pushed: false };
      }
    } else if (remote && state.base && sameSnapshot(target, state.base)) {
      return { state, changedLocal, pushed: false }; // nothing new on either side
    }

    const sealed = await sealJSON(ctx.enc, target);
    const pushed = await ctx.remote.push(remote ? remote.version : 0, sealed.iv, sealed.data);
    if (pushed !== null) {
      state = { version: pushed, base: target };
      return { state, changedLocal, pushed: true };
    }
    // Someone pushed in between: loop, pull their version and merge again.
    state = { ...state, version };
  }
  throw new Error('Sync did not settle after several attempts');
}
