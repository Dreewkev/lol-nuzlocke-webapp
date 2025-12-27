import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AuthStore} from '../../stores/auth.store';
import {UserStore} from '../../stores/user.store';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  protected authStore = inject(AuthStore);
  protected userStore = inject(UserStore);

  readonly user = this.userStore.user;

}
