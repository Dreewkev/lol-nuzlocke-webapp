import { inject, Injectable, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from '@angular/fire/auth';
import { doc, Firestore, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { UserStore } from './user.store';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(Auth);
  private readonly db = inject(Firestore);
  private readonly userStore = inject(UserStore);

  readonly authUser = signal<any | null>(null);
  readonly initialized = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, (u) => {
      this.authUser.set(u);

      if (u) {
        this.userStore.loadUser(u.uid);
      } else {
        this.userStore.clearUser();
      }

      this.initialized.set(true);
    });
  }

  async login(email: string, password: string) {
    this.error.set(null);
    this.busy.set(true);

    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (err: any) {
      this.error.set(err?.code ?? err?.message ?? 'Unable to login');
    } finally {
      this.busy.set(false);
    }
  }

  async register(username: string, email: string, password: string) {
    this.error.set(null);
    this.busy.set(true);

    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);

      await updateProfile(cred.user, { displayName: username });

      await setDoc(doc(this.db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        username,
        email: cred.user.email,
        createdAt: serverTimestamp()
      });

      this.userStore.loadUser(cred.user.uid);
    } catch (err: any) {
      this.error.set(err?.code ?? err?.message ?? 'Unable to register');
    } finally {
      this.busy.set(false);
    }
  }

  async logout() {
    this.error.set(null);
    this.busy.set(true);

    try {
      await signOut(this.auth);
    } catch (err: any) {
      this.error.set(err?.code ?? err?.message ?? 'Unable to logout');
    } finally {
      this.busy.set(false);
    }
  }
}
