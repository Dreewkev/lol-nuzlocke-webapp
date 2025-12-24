import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AuthStore} from '../../stores/auth.store';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  private readonly auth = inject(AuthStore);


}
