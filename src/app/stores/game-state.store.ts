import {computed, inject, Injectable, signal} from '@angular/core';
import {
  arrayRemove,
  arrayUnion,
  collection,
  collectionData,
  doc, docData,
  Firestore,
  increment, serverTimestamp, setDoc,
  updateDoc,
  writeBatch
} from '@angular/fire/firestore';
import {GameMember} from '../models/game-member.model';
import {ROLES} from '../enums/role';
import {CHAMPIONS} from '../enums/champions';
import {GameState} from '../models/game-state.model';
import {RoundSummarySubmit} from '../models/round-summary-submit.model';

@Injectable({providedIn: 'root'})
export class GameStateStore {
  private readonly db = inject(Firestore);

  readonly members = signal<GameMember[]>([]);
  readonly myPlayer = signal<GameMember | null>(null);
  readonly state = signal<GameState | null>(null);
  readonly error = signal<string | null>(null);

  private membersUnsub?: () => void;
  private stateUnsub?: () => void;

  readonly allSubmitted = computed(() => {
    const s = this.state();
    if (!s) return false;
    const r = s.round;
    return this.members().length > 0 &&
      this.members().every(m => m.summarySubmittedRound === r);
  });


  /**
   * Start listening to game members (single source of truth)
   */
  listen(gameId: string, uid: string) {
    this.stop();

    this.membersUnsub = collectionData(
      collection(this.db, `games/${gameId}/members`),
      {idField: 'uid'}
    ).subscribe({
      next: (ms) => {
        const members = ms as GameMember[];
        this.members.set(members);
        this.myPlayer.set(members.find(m => m.uid === uid) ?? null);
      },
      error: e => this.error.set(e?.message ?? 'Members listen failed')
    }).unsubscribe;

    this.stateUnsub = docData(doc(this.db, `games/${gameId}/state/main`)).subscribe({
      next: s => this.state.set((s as GameState) ?? null),
      error: e => this.error.set(e?.message ?? 'State listen failed')
    }).unsubscribe;
  }

  stop() {
    this.membersUnsub?.();
    this.stateUnsub?.();
    this.membersUnsub = undefined;
    this.stateUnsub = undefined;

    this.members.set([]);
    this.myPlayer.set(null);
    this.state.set(null);
    this.error.set(null);
  }

  /**
   * Owner starts new run
   */
  async startRun(gameId: string) {
    if (this.myPlayer()?.role !== 'owner') {
      throw new Error('Only owner can start round');
    }

    const batch = writeBatch(this.db);
    for (const member of this.members()) {
      const rolledChampions = this.shuffle(CHAMPIONS).slice(0, 3);

      batch.update(
        doc(this.db, `games/${gameId}/members/${member.uid}`),
        {
          aliveChampions: rolledChampions,
        }
      );

      batch.set(doc(this.db, `games/${gameId}/state/main`), {
          phase: 'rolling',
          round: 0,
        },
        {merge: true}
      );
    }

    await batch.commit();
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
        mainRole: null,
        secondaryRole: null,
      });
    }

    batch.set(doc(this.db, `games/${gameId}/state/main`), {
        phase: 'locked',
        round: increment(1),
      },
      {merge: true}
    );

    await batch.commit();
    await this.rollForAll(gameId);
  }

  /**
   * Owner ends round
   */
  async endRound(gameId: string, outcome: 'WIN' | 'LOSS') {
    if (this.myPlayer()?.role !== 'owner') throw new Error('Only owner');

    await setDoc(doc(this.db, `games/${gameId}/state/main`), {
      phase: 'summary',
      outcome,
      updatedAt: serverTimestamp()
    }, {merge: true});
  }

  async submitSummary(gameId: string, payload: RoundSummarySubmit) {
    const me = this.myPlayer();
    const s = this.state();
    if (!me || !s) throw new Error('Missing state');
    if (s.phase !== 'summary') throw new Error('Not in summary phase');

    const memberRef = doc(this.db, `games/${gameId}/members/${me.uid}`);

    // 1) build summary without undefined fields
    const summary: any = {
      ...payload,
      round: s.round,
      outcome: payload.outcome,
      submittedAt: serverTimestamp()
    };
    if (summary.gainedChamp === undefined) delete summary.gainedChamp;
    if (summary.playedChamp === undefined) delete summary.playedChamp;

    // 2) always save summary + submitted flag
    await updateDoc(memberRef, {
      summary,
      summarySubmittedRound: s.round
    });

    // 3) LOSS -> move played champ to grave
    if (payload.outcome === 'LOSS') {
      await updateDoc(memberRef, {
        aliveChampions: arrayRemove(payload.playedChamp),
        graveChampions: arrayUnion(payload.playedChamp)
      });
    }

    // 4) KP50 -> gained champ to alive (WIN or LOSS)
    if (payload.kp50 && payload.gainedChamp) {
      await updateDoc(memberRef, {
        aliveChampions: arrayUnion(payload.gainedChamp)
      });
    }
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
      {locked: true}
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
