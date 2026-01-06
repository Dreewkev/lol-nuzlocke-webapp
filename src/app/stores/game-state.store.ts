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
import {GameStats} from '../models/game-stats.model';

@Injectable({providedIn: 'root'})
export class GameStateStore {
  private readonly db = inject(Firestore);

  readonly members = signal<GameMember[]>([]);
  readonly myPlayer = signal<GameMember | null>(null);
  readonly state = signal<GameState | null>(null);
  readonly stats = signal<GameStats | null>(null);
  readonly error = signal<string | null>(null);

  private membersUnsub?: () => void;
  private stateUnsub?: () => void;
  private statsUnsub?: () => void;

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

    this.statsUnsub = docData(doc(this.db, `games/${gameId}/stats/main`)).subscribe({
      next: s => this.stats.set((s as GameStats) ?? null),
      error: e => this.error.set(e?.message ?? 'Stats listen failed')
    }).unsubscribe;
  }

  stop() {
    this.membersUnsub?.();
    this.stateUnsub?.();
    this.statsUnsub?.();
    this.membersUnsub = undefined;
    this.stateUnsub = undefined;
    this.statsUnsub = undefined;

    this.members.set([]);
    this.myPlayer.set(null);
    this.state.set(null);
    this.stats.set(null);
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

    if (outcome === 'WIN') {
      await setDoc(doc(this.db, `games/${gameId}/stats/main`), {
        wins: increment(1),
        overallWins: increment(1),
      }, {merge: true});
    } else {
      await setDoc(doc(this.db, `games/${gameId}/stats/main`), {
        loses: increment(1),
        overallLoses: increment(1),
      }, {merge: true});
    }

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

    // 5) check if run is over
    await this.checkRunOver(gameId);
  }

  async checkRunOver(gameId: string) {
    const state = this.state();
    if(!state) return;

    if((state.round ?? 0) <= 0) return;
    if(state.phase !== 'summary') return;
    if(!this.allSubmitted()) return;

    const eliminated = this.members().find(m => (m.aliveChampions?.length ?? 0) === 0);
    if (!eliminated) return;

    await this.failRunAndReset(gameId);
  }

  async failRunAndReset(gameId: string) {
    if (this.myPlayer()?.role !== 'owner') return;

    const batch = writeBatch(this.db);

    batch.set(doc(this.db, `games/${gameId}/state/main`), {
      phase: 'idle',
      round: 0,
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(this.db, `games/${gameId}/stats/main`), {
      loses: 0,
      wins: 0,
      run: increment(1),
    }, {merge: true});

    for (const member of this.members()) {
      batch.update(doc(this.db, `games/${gameId}/members/${member.uid}`), {
        aliveChampions: [],
        graveChampions: [],
        mainRole: null,
        secondaryRole: null,
        summary: null,
        summarySubmittedRound: null,
      });
    }

    await batch.commit();

  }


  /**
   * Owner rolls roles for all players
   */
  async rollForAll(gameId: string) {
    if (this.myPlayer()?.role !== 'owner') throw new Error('Only owner can roll');

    const members = this.members();
    const n = members.length;
    if (n === 0 || n > 5) return;

    const uids = this.shuffle(members.map(m => m.uid));
    const rolesShuffled = this.shuffle([...ROLES]); // copy!

    const batch = writeBatch(this.db);

    // Main roles: unique for everyone (up to 5)
    const mains = rolesShuffled.slice(0, n);

    if (n === 5) {
      uids.forEach((uid, i) => {
        batch.update(doc(this.db, `games/${gameId}/members/${uid}`), {
          mainRole: mains[i],
          secondaryRole: null,
          locked: false,
        });
      });

      await batch.commit();
      return;
    }

    // Secondary roles: try to use remaining unique roles first
    const remaining = this.shuffle(
      ROLES.filter(r => !mains.includes(r))
    ); // roles not used as main

    uids.forEach((uid, i) => {
      const main = mains[i];

      // best effort: unique secondary from remaining pool
      let secondary = remaining[i] ?? null;

      // fallback: if we ran out (e.g. 4 players -> remaining has 1 role),
      // pick random role != main
      if (!secondary) {
        const pool = ROLES.filter(r => r !== main);
        secondary = this.shuffle([...pool])[0];
      }

      batch.update(doc(this.db, `games/${gameId}/members/${uid}`), {
        mainRole: main,
        secondaryRole: secondary,
        locked: false,
      });
    });

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
