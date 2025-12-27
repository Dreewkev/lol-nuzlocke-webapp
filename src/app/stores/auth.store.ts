import {inject, Injectable, signal} from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private auth = inject(Auth);

  readonly user = signal<any | null>(null);
  readonly loading = signal(true); // nur für initialen Auth-Check
  readonly error = signal<string | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, (u) => {
      this.user.set(u);
      this.loading.set(false);
    });
  }

  async login(email: string, password: string) {
    this.error.set(null);
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async register(email: string, password: string) {
    this.error.set(null);
    await createUserWithEmailAndPassword(this.auth, email, password);
  }

  async logout() {
    await signOut(this.auth);
  }
}

