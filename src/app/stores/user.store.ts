import { inject, Injectable, signal } from '@angular/core';
import {Firestore, doc, docData} from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserStore {
  private firestore = inject(Firestore);
  private sub?: Subscription;

  readonly user = signal<User | null>(null);

  loadUser(uid: string) {
    this.sub?.unsubscribe();

    const ref = doc(this.firestore, `users/${uid}`);

    this.sub = docData(ref).subscribe((data) => {
      this.user.set((data as User) ?? null);
    });
  }

  clearUser() {
    this.sub?.unsubscribe();
    this.sub = undefined;
    this.user.set(null);
  }
}
