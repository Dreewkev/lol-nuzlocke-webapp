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

  loginWithEmailAndPassword() {
    if(this.loginForm.valid) {
      const userData = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      }

      try {
        this.auth.login(userData.email, userData.password).then((res: any) => {
          if(res.success) {
            this.router.navigateByUrl('');
          }
        }).catch((error: any) => {
          console.error(error);
        })
      } catch(error) {
        console.error(error);
      }
    }
  }
}
