import {inject, Injectable, signal} from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut, updateProfile
} from '@angular/fire/auth';
import {doc, Firestore, setDoc, serverTimestamp} from '@angular/fire/firestore';
import {UserStore} from './user.store';

@Injectable({providedIn: 'root'})
export class AuthStore {
  private auth = inject(Auth);
  private fireStore = inject(Firestore);
  private userStore = inject(UserStore);

  readonly authUser = signal<any | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, (u) => {
      this.authUser.set(u);
      console.log('projectId', (this.fireStore as any)?._app?.options?.projectId);

      if (u) {
        // Firestore-User laden
        this.userStore.loadUser(u.uid);
      } else {
        this.userStore.clearUser();
      }

      this.loading.set(false);
    });
  }

  async login(email: string, password: string) {
    this.error.set(null);
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (err: any) {
      this.error.set(err.message ?? 'Unable to login');
    }
  }

  async register(username: string, email: string, password: string) {
    this.error.set(null);
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);

      // Auth-Profil
      await updateProfile(cred.user, {displayName: username});

      // Firestore-User (Domain!)
      try {
        await setDoc(doc(this.fireStore, 'users', cred.user.uid), {
          uid: cred.user.uid,
          username,
          email: cred.user.email,
          createdAt: serverTimestamp()
        });
        console.log('✅ setDoc done', cred.user.uid);
      } catch(err: any) {
        console.error('❌ setDoc failed', {
          code: err?.code,
          message: err?.message,
          name: err?.name,
          err
        });
        this.error.set(err?.code ?? err?.message ?? 'Firestore write failed');
      }
      // authUser NICHT manuell setzen – onAuthStateChanged übernimmt das
    } catch (err: any) {
      console.error('REGISTER FAILED', err);
      this.error.set(err.message ?? 'Unable to register');
    }
  }

  async logout() {
    this.error.set(null);
    try {
      await signOut(this.auth);
    } catch (err: any) {
      this.error.set(err.message ?? 'Unable to logout');
    }
  }
}

