import {Routes} from '@angular/router';
import {RegisterComponent} from './pages/auth/register/register.component';
import {LoginComponent} from './pages/auth/login/login.component';
import {LayoutComponent} from './layout/app-layout.component';
import {HomeComponent} from './pages/home/home.component';
import {DashboardComponent} from './pages/dashboard/dashboard.component';
import {GameDetailComponent} from './pages/game/game-detail/game-detail.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'games/:id', component: GameDetailComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'login', component: LoginComponent },
    ]
  }
];
