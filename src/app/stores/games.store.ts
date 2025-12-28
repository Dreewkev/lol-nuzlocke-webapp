import {Injectable, inject, signal} from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  collectionData, limit, where, getDocs
} from '@angular/fire/firestore';
import {firstValueFrom, Subscription} from 'rxjs';
import {AuthStore} from './auth.store';
import {GameRef} from '../models/game-ref.model';

@Injectable({providedIn: 'root'})
export class GamesStore {
  private readonly db = inject(Firestore);
  private readonly auth = inject(AuthStore);

  private sub?: Subscription;

  readonly myGames = signal<GameRef[]>([]);
  readonly listError = signal<string | null>(null);

  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  listenMyGames(uid: string | null) {
    this.sub?.unsubscribe();
    this.sub = undefined;

    if (!uid) {
      this.myGames.set([]);
      return;
    }

    this.listError.set(null);

    const ref = collection(this.db, `users/${uid}/gameRefs`);
    const q = query(ref, orderBy('joinedAt', 'desc'));

    this.sub = collectionData(q).subscribe({
      next: rows => this.myGames.set(rows as GameRef[]),
      error: e => this.listError.set(e?.message ?? 'Failed to load games')
    });
  }

  private buildInitialPlayerState(
    uid: string,
    username: string | null,
    role: 'owner' | 'member'
  ) {
    return {
      uid,
      username,
      role,
      joinedAt: serverTimestamp(),
      aliveChampionIds: [],
      graveChampionIds: [],
      stats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        roleCounts: { top: 0, jg: 0, mid: 0, adc: 0, sup: 0 },
        champCounts: {},
        champWins: {}
      }
    };
  }

  private buildInitialGameState() {
    return {
      phase: 'idle',
      round: 0,
      startedAt: null,
      lastActionAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
  }

  async createGame(name: string): Promise<string> {
    const u = this.auth.authUser();
    if (!u) throw new Error('Not logged in');

    this.creating.set(true);
    this.createError.set(null);

    const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

    try {
      const gameDoc = await addDoc(collection(this.db, 'games'), {
        name,
        ownerUid: u.uid,
        status: 'active',
        inviteCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const username = this.auth.authUser()?.displayName ?? null;

      await setDoc(doc(this.db, `games/${gameDoc.id}/members/${u.uid}`), {
        uid: u.uid,
        role: 'owner',
        username,
        joinedAt: serverTimestamp()
      });

      await setDoc(doc(this.db, `users/${u.uid}/gameRefs/${gameDoc.id}`), {
        gameId: gameDoc.id,
        role: 'owner',
        joinedAt: serverTimestamp()
      });

      // 1) shared game state
      await setDoc(doc(this.db, `games/${gameDoc.id}/state/main`),
        this.buildInitialGameState()
      );

      // 2) owner player state
      await setDoc(doc(this.db, `games/${gameDoc.id}/players/${u.uid}`),
        this.buildInitialPlayerState(u.uid, username, 'owner')
      );

      return gameDoc.id;
    } catch (e: any) {
      this.createError.set(e?.message ?? 'Create game failed');
      throw e;
    } finally {
      this.creating.set(false);
    }
  }

  async joinByCode(codeRaw: string): Promise<string> {
    const u = this.auth.authUser();
    if (!u) throw new Error('Not logged in');

    const code = codeRaw.trim().toUpperCase();
    if (!code) throw new Error('Code missing');

    const gamesRef = collection(this.db, 'games');
    const q = query(gamesRef, where('inviteCode', '==', code), limit(1));

    const rows = await firstValueFrom(collectionData(q, {idField: 'id'})) as any[];
    if (!rows.length) throw new Error('Invalid code');

    const gameId = rows[0].id as string;

    const membersRef = collection(this.db, `games/${gameId}/members`);
    const members = await firstValueFrom(collectionData(membersRef));

    const MAX_PLAYERS = 5;
    if (members.length >= MAX_PLAYERS) {
      throw new Error('Game is full');
    }

    const username = this.auth.authUser()?.displayName ?? null;

    await setDoc(doc(this.db, `games/${gameId}/members/${u.uid}`), {
      uid: u.uid,
      role: 'member',
      username,
      joinedAt: serverTimestamp()
    });

    await setDoc(doc(this.db, `users/${u.uid}/gameRefs/${gameId}`), {
      gameId,
      role: 'member',
      joinedAt: serverTimestamp()
    });

    await setDoc(doc(this.db, `games/${gameId}/players/${u.uid}`),
      this.buildInitialPlayerState(u.uid, username, 'member')
    );

    return gameId;
  }
}
