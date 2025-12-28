import {inject, Injectable, signal} from '@angular/core';
import {doc, docData, Firestore, increment, serverTimestamp, setDoc} from '@angular/fire/firestore';
import {Subscription} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GameStateStore {
  private readonly db = inject(Firestore);
  private stateSub?: Subscription;
  private playerSub?: Subscription;

  readonly state = signal<any | null>(null);
  readonly myPlayer = signal<any | null>(null);
  readonly error = signal<string | null>(null);

  listen(gameId: string, uid: string) {
    this.stop();

    this.stateSub = docData(doc(this.db, `games/${gameId}/state/main`)).subscribe({
      next: s => this.state.set(s),
      error: e => this.error.set(e?.message ?? 'State listen failed')
    });

    this.playerSub = docData(doc(this.db, `games/${gameId}/players/${uid}`)).subscribe({
      next: p => this.myPlayer.set(p),
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
      phase: 'rolling',
      round: increment(1),
      lastActionAt: serverTimestamp()
    }, { merge: true });
  }

}
