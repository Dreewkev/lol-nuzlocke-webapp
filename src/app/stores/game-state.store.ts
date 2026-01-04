import {inject, Injectable, signal} from '@angular/core';
import {
  collection,
  doc,
  docData,
  Firestore,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc
} from '@angular/fire/firestore';
import {Subscription} from 'rxjs';
import {GameState} from '../models/game-state.model';
import {PlayerState} from '../models/player-state.model';
import {Role} from '../enums/role';

@Injectable({ providedIn: 'root' })
export class GameStateStore {
  private readonly db = inject(Firestore);
  private stateSub?: Subscription;
  private playerSub?: Subscription;

  readonly state = signal<GameState | null>(null);
  readonly myPlayer = signal<PlayerState | null>(null);
  readonly error = signal<string | null>(null);

  listen(gameId: string, uid: string) {
    this.stop();

    this.stateSub = docData(doc(this.db, `games/${gameId}/state/main`)).subscribe({
      next: s => this.state.set((s as GameState) ?? null),
      error: e => {
        this.state.set(null);
        this.error.set(e?.message ?? 'State listen failed');
      }
    });

    this.playerSub = docData(doc(this.db, `games/${gameId}/players/${uid}`)).subscribe({
      next: p => this.myPlayer.set((p as PlayerState) ?? null),
      error: e => {
        this.myPlayer.set(null);
        this.error.set(e?.message ?? 'Player listen failed');
      }
    });
  }

  stop() {
    this.stateSub?.unsubscribe();
    this.playerSub?.unsubscribe();
    this.stateSub = undefined;
    this.playerSub = undefined;

    this.state.set(null);
    this.myPlayer.set(null);
    this.error.set(null);
  }

  async startRound(gameId: string) {
    if (this.myPlayer()?.role !== 'owner') {
      throw new Error('Only owner can start round');
    }

    await setDoc(doc(this.db, `games/${gameId}/state/main`), {
      phase: 'idle',
      round: increment(1),
      rollsByUid: {},
      lockedByUid: {},
      lastActionAt: serverTimestamp()
    }, { merge: true });

    await this.rollForAll(gameId);
  }

  async rollForAll(gameId: string) {
    if (this.myPlayer()?.role !== 'owner') {
      throw new Error('Only owner can roll');
    }

    const membersSnap = await getDocs(collection(this.db, `games/${gameId}/members`));
    const uids = membersSnap.docs.map(d => d.id);

    if (uids.length === 0) throw new Error('No members in game');
    if (uids.length > 5) throw new Error('Max 5 players supported');

    const allRoles: Role[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

    const shuffledUids = this.shuffle(uids);

    const rollsByUid: Record<string, { main: Role; secondary?: Role }> = {};

    if (shuffledUids.length === 5) {
      const roles = this.shuffle(allRoles);
      for (let i = 0; i < 5; i++) {
        const uid = shuffledUids[i];
        rollsByUid[uid] = { main: roles[i] };
      }
    } else {
      // 1–4 spieler
      const mains = this.shuffle(allRoles).slice(0, shuffledUids.length);

      for (let i = 0; i < shuffledUids.length; i++) {
        const uid = shuffledUids[i];
        const main = mains[i];

        const secondaryPool = allRoles.filter(r => r !== main);
        const secondary = secondaryPool[Math.floor(Math.random() * secondaryPool.length)];

        rollsByUid[uid] = { main, secondary };
      }
    }

    await setDoc(doc(this.db, `games/${gameId}/state/main`), {
      phase: 'rolling',
      rollsByUid,
      lockedByUid: {},
      lastActionAt: serverTimestamp()
    }, { merge: true });
  }

  // ✅ NEW: Spieler lockt seinen Roll
  async lockIn(gameId: string) {
    const uid = this.myPlayer()?.uid;
    if (!uid) throw new Error('Not logged in');

    const s = this.state();
    if (!s || s.phase !== 'rolling') return;

    const stateRef = doc(this.db, `games/${gameId}/state/main`);

    // mark locked
    await updateDoc(stateRef, {
      [`lockedByUid.${uid}`]: true,
      lastActionAt: serverTimestamp()
    });

    // optional: nach lock prüfen ob alle gelockt -> phase locked
    await this.maybeFinishLocking(gameId);
  }

  private async maybeFinishLocking(gameId: string) {
    const s = this.state();
    if (!s?.rollsByUid) return;

    const uids = Object.keys(s.rollsByUid);
    if (uids.length === 0) return;

    const locked = s.lockedByUid ?? {};
    const allLocked = uids.every(uid => locked[uid]);

    if (!allLocked) return;

    await setDoc(doc(this.db, `games/${gameId}/state/main`), {
      phase: 'locked',
      lastActionAt: serverTimestamp()
    }, { merge: true });
  }

  private shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

}
