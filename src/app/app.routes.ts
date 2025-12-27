import {Routes} from '@angular/router';
import {RegisterComponent} from './pages/auth/register/register.component';
import {LoginComponent} from './pages/auth/login/login.component';
import {LayoutComponent} from './layout/app-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'register', component: RegisterComponent },
      { path: 'login', component: LoginComponent },
    ]
  }
];
