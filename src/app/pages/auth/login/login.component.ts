import {Component, inject, OnInit} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthStore} from '../../../stores/auth.store';

@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  protected auth = inject(AuthStore);
  protected fb = inject(FormBuilder);
  protected router = inject(Router);

  loginForm!: FormGroup;

  ngOnInit() {
    this.initForm();
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    })
  }

  async loginWithEmailAndPassword() {
    if (this.loginForm.invalid) return;

    const {email, password} = this.loginForm.value;

    await this.auth.login(email, password);

    // wenn du im Store error setzt, kannst du so prüfen
    if (!this.auth.error()) {
      await this.router.navigateByUrl('/');
    }
  }
}
