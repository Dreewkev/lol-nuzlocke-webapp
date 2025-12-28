import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class GamesStore {
  private readonly db = inject(Firestore);
  private readonly auth = inject(AuthStore);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async createGame(name: string): Promise<string> {
    const u = this.auth.authUser();
    if (!u) throw new Error('Not logged in');

    this.loading.set(true);
    this.error.set(null);

    try {
      const gameDoc = await addDoc(collection(this.db, 'games'), {
        name,
        ownerUid: u.uid,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Member (Owner)
      await setDoc(doc(this.db, `games/${gameDoc.id}/members/${u.uid}`), {
        uid: u.uid,
        role: 'owner',
        joinedAt: serverTimestamp()
      });

      // GameRef (Index)
      await setDoc(doc(this.db, `users/${u.uid}/gameRefs/${gameDoc.id}`), {
        gameId: gameDoc.id,
        role: 'owner',
        joinedAt: serverTimestamp()
      });

      return gameDoc.id;
    } catch (e: any) {
      this.error.set(e?.message ?? 'Create game failed');
      throw e;
    } finally {
      this.loading.set(false);
    }
  }
}
