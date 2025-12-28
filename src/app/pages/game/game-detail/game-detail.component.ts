import {Component, inject, signal} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {collection, collectionData, doc, docData, Firestore} from '@angular/fire/firestore';
import {Subscription} from 'rxjs';
import {Game} from '../../../models/game.model';
import {GameMember} from '../../../models/game-member.model';
import {GameStateStore} from '../../../stores/game-state.store';
import {AuthStore} from '../../../stores/auth.store';

@Component({
  selector: 'app-game-detail',
  templateUrl: './game-detail.component.html',
})
export class GameDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly db = inject(Firestore);
  private readonly auth = inject(AuthStore);
  readonly gameStateStore = inject(GameStateStore);

  private subGame?: Subscription;
  private subMembers?: Subscription;

  readonly gameId = this.route.snapshot.paramMap.get('id')!;

  // Lobby stuff
  readonly game = signal<Game | null>(null);
  readonly members = signal<GameMember[]>([]);
  readonly error = signal<string | null>(null);

  // Shared state + my player (nur weiterreichen)
  readonly state = this.gameStateStore.state;
  readonly myPlayer = this.gameStateStore.myPlayer;

  constructor() {
    // Game doc
    const gameRef = doc(this.db, `games/${this.gameId}`);
    this.subGame = docData(gameRef).subscribe({
      next: (data) => this.game.set((data as Game) ?? null),
      error: (e) => this.error.set(e?.message ?? 'Failed to load game')
    });

    // Members
    const membersRef = collection(this.db, `games/${this.gameId}/members`);
    this.subMembers = collectionData(membersRef).subscribe({
      next: (rows) => this.members.set(rows as GameMember[]),
      error: (e) => this.error.set(e?.message ?? 'Failed to load members')
    });

    // ✅ GameStateStore starten
    const uid = this.auth.authUser()?.uid;
    if (!uid) {
      this.error.set('Not logged in');
      return;
    }
    this.gameStateStore.listen(this.gameId, uid);
  }

  startRound() {
    this.gameStateStore.startRound(this.gameId);
  }

  async copyInviteCode() {
    const code = this.game()?.inviteCode;
    if (!code) return;
    await navigator.clipboard.writeText(code);
  }

  ngOnDestroy() {
    this.subGame?.unsubscribe();
    this.subMembers?.unsubscribe();
    this.gameStateStore.stop(); // ✅ wichtig
  }
}
