import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AuthStore} from '../../stores/auth.store';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  protected auth = inject(AuthStore);

  readonly user = this.auth.user;

}
