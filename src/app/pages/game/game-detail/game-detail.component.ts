import {Component, effect, inject, signal} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { doc, docData, Firestore } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { Game } from '../../../models/game.model';
import { AuthStore } from '../../../stores/auth.store';
import {GameStateStore} from '../../../stores/game-state.store';
import {EndRoundModalComponent} from '../end-round-modal/end-round-modal.component';
import {GameSummaryModalComponent} from '../game-summary-modal/game-summary-modal.component';
import {RoundSummarySubmit} from '../../../models/round-summary-submit.model';

@Component({
  selector: 'app-game-detail',
  templateUrl: './game-detail.component.html',
  imports: [
    EndRoundModalComponent,
    GameSummaryModalComponent
  ]
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
  readonly showEndRoundModal = signal(false);
  readonly showSummaryModal = signal(false);

  protected winrate = 0;

  constructor() {
    // Game-Dokument (Meta: Name, InviteCode, etc.)
    const gameRef = doc(this.db, `games/${this.gameId}`);
    this.subGame = docData(gameRef).subscribe({
      next: (data) => this.game.set((data as Game) ?? null),
      error: (e) => this.error.set(e?.message ?? 'Failed to load game')
    });

    // Store starten
    effect(() => {
      const uid = this.auth.authUser()?.uid;

      if (!uid) return;
      this.gameStore.listen(this.gameId, uid);
    });

    effect(() => {
      const state = this.gameStore.state();
      const me = this.gameStore.myPlayer();

      if (!state || !me) {
        this.showSummaryModal.set(false);
        return;
      }

      const shouldOpen =
        state.phase === 'summary' &&
        me.summarySubmittedRound !== state.round;

      this.showSummaryModal.set(shouldOpen);
    });

    effect(() => {
      this.winrate = this.calculateWinrate();
    });
  }

  // ---- Aktionen ----

  startRun() {
    this.gameStore.startRun(this.gameId);
  }

  startRound() {
    this.gameStore.startRound(this.gameId);
  }

  endRound() {
    this.showEndRoundModal.set(true);
  }

  onRoundDecision(result: 'WIN'|'LOSS') {
    this.showEndRoundModal.set(false);
    this.gameStore.endRound(this.gameId, result);
  }

  onSubmitSummary(payload: RoundSummarySubmit) {
    this.gameStore.submitSummary(this.gameId, payload);
  }

  calculateWinrate() {
    const wins = this.gameStore.stats()!.wins;
    const losses = this.gameStore.stats()!.loses;
    const games = wins + losses;

    return games === 0 ? 0 : Math.round((wins / games) * 100 * 100) / 100;
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
