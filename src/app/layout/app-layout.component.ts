import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {HeaderComponent} from '../shared/header/header.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: 'app-layout.component.html',
})
export class LayoutComponent {

}
