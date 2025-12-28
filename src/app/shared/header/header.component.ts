import {Component, ElementRef, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AuthStore} from '../../stores/auth.store';
import {UserStore} from '../../stores/user.store';
declare const bootstrap: any;


@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  protected authStore = inject(AuthStore);
  protected userStore = inject(UserStore);

  readonly user = this.userStore.user;

  toggleBsDropdown(btn: HTMLButtonElement | ElementRef<HTMLButtonElement>) {
    const el = btn instanceof ElementRef ? btn.nativeElement : btn;
    bootstrap.Dropdown.getOrCreateInstance(el).toggle();
  }
}
