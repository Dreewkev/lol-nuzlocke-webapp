import { inject, Injectable, signal } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  increment,
  updateDoc,
  writeBatch
} from '@angular/fire/firestore';
import { GameMember } from '../models/game-member.model';
import { ROLES } from '../enums/role';

@Injectable({ providedIn: 'root' })
export class GameStateStore {
  private readonly db = inject(Firestore);

  readonly members = signal<GameMember[]>([]);
  readonly myPlayer = signal<GameMember | null>(null);
  readonly error = signal<string | null>(null);

  /**
   * Start listening to game members (single source of truth)
   */
  listen(gameId: string, uid: string) {
    collectionData(
      collection(this.db, `games/${gameId}/members`),
      { idField: 'uid' }
    ).subscribe({
      next: (ms) => {
        const members = ms as GameMember[];
        this.members.set(members);
        this.myPlayer.set(members.find(m => m.uid === uid) ?? null);
      },
      error: e => this.error.set(e?.message ?? 'Listen failed')
    });
  }

  stop() {
    this.members.set([]);
    this.myPlayer.set(null);
    this.error.set(null);
  }

  /**
   * Owner starts a new round
   */
  async startRound(gameId: string) {
    if (this.myPlayer()?.role !== 'owner') {
      throw new Error('Only owner can start round');
    }

    const batch = writeBatch(this.db);

    for (const m of this.members()) {
      batch.update(doc(this.db, `games/${gameId}/members/${m.uid}`), {
        round: increment(1),
        mainRole: null,
        secondaryRole: null,
        locked: false
      });
    }

    await batch.commit();
    await this.rollForAll(gameId);
  }

  /**
   * Owner rolls roles for all players
   */
  async rollForAll(gameId: string) {
    if (this.myPlayer()?.role !== 'owner') {
      throw new Error('Only owner can roll');
    }

    const members = this.members();
    if (members.length === 0 || members.length > 5) return;

    const uids = members.map(m => m.uid);
    const shuffledUids = this.shuffle(uids);
    const roles = this.shuffle(ROLES);

    const batch = writeBatch(this.db);

    if (members.length === 5) {
      // everyone gets exactly one unique role
      shuffledUids.forEach((uid, i) => {
        batch.update(doc(this.db, `games/${gameId}/members/${uid}`), {
          mainRole: roles[i],
          secondaryRole: null,
          locked: false
        });
      });
    } else {
      // 1–4 players: main unique, secondary allowed duplicate (not same as main)
      shuffledUids.forEach((uid, i) => {
        const main = roles[i];
        const secondary = this.shuffle(
          ROLES.filter(r => r !== main)
        )[0];

        batch.update(doc(this.db, `games/${gameId}/members/${uid}`), {
          mainRole: main,
          secondaryRole: secondary,
          locked: false
        });
      });
    }

    await batch.commit();
  }

  /**
   * Player locks in their roles
   */
  async lockIn(gameId: string) {
    const me = this.myPlayer();
    if (!me) return;

    await updateDoc(
      doc(this.db, `games/${gameId}/members/${me.uid}`),
      { locked: true }
    );
  }

  /**
   * Generic Fisher–Yates shuffle (type-safe)
   */
  private shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
