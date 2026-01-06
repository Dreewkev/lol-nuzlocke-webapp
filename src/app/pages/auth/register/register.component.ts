import {Component, inject, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthStore} from '../../../stores/auth.store';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit {
  protected auth = inject(AuthStore);
  protected fb = inject(FormBuilder);
  protected router = inject(Router);
  registerForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^[a-zA-Z0-9_]+$/)
      ]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  /*registerWithGoogle() {
    this.authService.signInWithGoogle().then((res: any) => {
      this.isSignInSuccess = true;

      this.showSuccessToast();
      setTimeout(() => {
        this.router.navigateByUrl('/login');
      }, 5000);
    }).catch((error: any) => {
      console.error(error);
    });
  }*/

  protected async registerWithEmailAndPassword() {
    console.log('SUBMIT', this.registerForm.value, this.registerForm.valid);
    if (!this.registerForm.valid) return;

    const {username, email, password} = this.registerForm.value;

    try {
      await this.auth.register(username ,email!, password!);

      this.showSuccessToast();
      setTimeout(() => {
        this.router.navigateByUrl('/login');
      }, 2000);
    } catch (err) {
      console.error(err);
    }

    if (!this.auth.error()) {
      await this.router.navigateByUrl('/');
    }
  }

  showSuccessToast() {
    const el = document.getElementById('successToast');
    if (!el) {
      console.warn('Toast element not found');
      return;
    }

    const bs = (window as any).bootstrap;
    if (!bs?.Toast) {
      console.warn('Bootstrap Toast not available');
      return;
    }

    const toast = new bs.Toast(el);
    toast.show();
  }

}
