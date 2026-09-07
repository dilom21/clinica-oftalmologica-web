import { __decorate } from "tslib";
import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
let Login = class Login {
    fb;
    authService;
    router;
    passwordVisible = signal(false);
    loading = signal(false);
    serverError = signal(null);
    loginForm;
    constructor(fb, authService, router) {
        this.fb = fb;
        this.authService = authService;
        this.router = router;
        this.loginForm = this.fb.nonNullable.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required],
        });
    }
    togglePassword() {
        this.passwordVisible.update((visible) => !visible);
    }
    hasError(field, error) {
        const control = this.loginForm.get(field);
        return !!control && (control.dirty || control.touched) && control.hasError(error);
    }
    showErrorMessage(field) {
        const control = this.loginForm.get(field);
        if (!control || !(control.dirty || control.touched)) {
            return '';
        }
        if (control.hasError('required')) {
            return field === 'email'
                ? 'El correo electrónico es obligatorio.'
                : 'La contraseña es obligatoria.';
        }
        if (field === 'email' && control.hasError('email')) {
            return 'Ingresa un correo electrónico válido.';
        }
        return '';
    }
    onSubmit() {
        if (this.loading()) {
            return;
        }
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }
        this.serverError.set(null);
        this.loading.set(true);
        const { email, password } = this.loginForm.getRawValue();
        const request = {
            correo: email,
            password,
        };
        this.authService.login(request).subscribe({
            next: (response) => {
                localStorage.setItem('access_token', response.access_token);
                this.loading.set(false);
                this.router.navigate(['/inicio']);
            },
            error: (err) => {
                this.loading.set(false);
                this.handleLoginError(err);
            },
        });
    }
    handleLoginError(err) {
        const status = err && typeof err === 'object' && 'status' in err ? err.status : undefined;
        if (status === 401) {
            this.serverError.set('Correo o contraseña incorrectos.');
            return;
        }
        if (status === 403) {
            this.serverError.set('Usuario inactivo. Comuníquese con administración.');
            return;
        }
        if (status === 0) {
            this.serverError.set('No se pudo conectar con el servidor.');
            return;
        }
        this.serverError.set('Ocurrió un error al iniciar sesión.');
    }
};
Login = __decorate([
    Component({
        selector: 'app-login',
        imports: [ReactiveFormsModule, RouterLink],
        templateUrl: './login.html',
        styleUrl: './login.css',
    })
], Login);
export { Login };
