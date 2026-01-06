import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  collectionData,
  limit,
  where
} from '@angular/fire/firestore';
import { Subscription, firstValueFrom } from 'rxjs';
import { AuthStore } from './auth.store';
import { GameRef } from '../models/game-ref.model';

@Injectable({ providedIn: 'root' })
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

    const ref = collection(this.db, `users/${uid}/gameRefs`);
    const q = query(ref, orderBy('joinedAt', 'desc'));

    this.sub = collectionData(q).subscribe({
      next: rows => this.myGames.set(rows as GameRef[]),
      error: e => this.listError.set(e?.message ?? 'Failed to load games')
    });
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
        inviteCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const username = u.displayName ?? null;

      // ✅ SINGLE SOURCE OF TRUTH
      await setDoc(doc(this.db, `games/${gameDoc.id}/members/${u.uid}`), {
        uid: u.uid,
        role: 'owner',
        username,
        joinedAt: serverTimestamp(),
      });

      await setDoc(doc(this.db, `users/${u.uid}/gameRefs/${gameDoc.id}`), {
        gameId: gameDoc.id,
        gameName: name,
        role: 'owner',
        joinedAt: serverTimestamp()
      });

      await setDoc(doc(this.db, `games/${gameDoc.id}/state/main`), {
        phase: 'idle',
        round: 0,
        outcome: null,
        updatedAt: serverTimestamp()
      });

      await setDoc(doc(this.db, `games/${gameDoc.id}/stats/main`), {
        wins: 0,
        loses: 0,
        overallWins: 0,
        overallLoses: 0,
        run: 1,
      });

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

    const rows = await firstValueFrom(collectionData(q, { idField: 'id' })) as any[];
    if (!rows.length) throw new Error('Invalid code');

    const gameId = rows[0].id as string;

    const membersRef = collection(this.db, `games/${gameId}/members`);
    const members = await firstValueFrom(collectionData(membersRef));

    if (members.length >= 5) {
      throw new Error('Game is full');
    }

    const username = u.displayName ?? null;

    await setDoc(doc(this.db, `games/${gameId}/members/${u.uid}`), {
      uid: u.uid,
      role: 'player',
      username,
      joinedAt: serverTimestamp(),
    });

    await setDoc(doc(this.db, `users/${u.uid}/gameRefs/${gameId}`), {
      gameId,
      role: 'player',
      joinedAt: serverTimestamp()
    });

    return gameId;
  }
}
