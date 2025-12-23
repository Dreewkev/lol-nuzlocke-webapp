import {inject, Injectable, signal} from '@angular/core';
import {Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut} from '@angular/fire/auth';

@Injectable({providedIn: 'root'})
export class AuthStore {
  private auth = inject(Auth);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async login(email: string, password: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (err: any) {
      this.error.set(err.message ?? 'Unable to login');
    } finally {
      this.loading.set(false);
    }
  }

  async register(email: string, password: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      await createUserWithEmailAndPassword(this.auth, email, password);
    } catch (err: any) {
      this.error.set(err.message ?? 'Unable to register');
    } finally {
      this.loading.set(false);
    }
  }

  async logout() {
    await signOut(this.auth);
  }
}
