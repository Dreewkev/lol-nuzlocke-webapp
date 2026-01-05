import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { doc, docData, Firestore } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { Game } from '../../../models/game.model';
import { AuthStore } from '../../../stores/auth.store';
import {GameStateStore} from '../../../stores/game-state.store';

@Component({
  selector: 'app-game-detail',
  templateUrl: './game-detail.component.html',
})
export class GameDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly db = inject(Firestore);
  private readonly auth = inject(AuthStore);
  readonly gameStore = inject(GameStateStore);

  private subGame?: Subscription;

  readonly gameId = this.route.snapshot.paramMap.get('id')!;

  readonly game = signal<Game | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    // Game-Dokument (Meta: Name, InviteCode, etc.)
    const gameRef = doc(this.db, `games/${this.gameId}`);
    this.subGame = docData(gameRef).subscribe({
      next: (data) => this.game.set((data as Game) ?? null),
      error: (e) => this.error.set(e?.message ?? 'Failed to load game')
    });

    // Store starten
    const uid = this.auth.authUser()?.uid;
    if (!uid) {
      this.error.set('Not logged in');
      return;
    }

    this.gameStore.listen(this.gameId, uid);
  }

  // ---- Aktionen ----

  startRound() {
    this.gameStore.startRound(this.gameId);
  }

  rollForAll() {
    this.gameStore.rollForAll(this.gameId);
  }

  lockIn() {
    this.gameStore.lockIn(this.gameId);
  }

  async copyInviteCode() {
    const code = this.game()?.inviteCode;
    if (!code) return;
    await navigator.clipboard.writeText(code);
  }

  ngOnDestroy() {
    this.subGame?.unsubscribe();
    this.gameStore.stop();
  }
}
