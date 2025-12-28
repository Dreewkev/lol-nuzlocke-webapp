import {Component, effect, inject} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {GamesStore} from '../../stores/games.store';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {AuthStore} from '../../stores/auth.store';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  readonly gamesStore = inject(GamesStore);
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  readonly joinCode = new FormControl<string>('', { nonNullable: true });

  constructor() {
    effect(() => {
      const uid = this.authStore.authUser()?.uid ?? null;
      this.gamesStore.listenMyGames(uid);
    });
  }

  async createGame() {
    const name = prompt('Game Name?')?.trim();
    if(!name) return;

    const id = await this.gamesStore.createGame(name);
    await this.router.navigate(['/games', id]);
  }

  async joinGame() {
    const code = this.joinCode.value.trim();
    if (!code) return;

    try {
      const gameId = await this.gamesStore.joinByCode(code);
      this.joinCode.setValue('');
      await this.router.navigate(['/games', gameId]);
    } catch (e: any) {
      alert(e?.message ?? 'Join failed');
    }
  }
}
