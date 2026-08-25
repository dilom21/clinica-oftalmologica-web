import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
let RecuperarPassword = class RecuperarPassword {
    fb = inject(FormBuilder);
    authService = inject(AuthService);
    loading = signal(false);
    serverError = signal(null);
    successMessage = signal(null);
    recuperarForm = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
    });
    hasError(error) {
        const control = this.recuperarForm.get('email');
        return !!control && (control.dirty || control.touched) && control.hasError(error);
    }
    emailErrorMessage() {
        const control = this.recuperarForm.get('email');
        if (!control || !(control.dirty || control.touched)) {
            return '';
        }
        if (control.hasError('required')) {
            return 'El correo electrónico es obligatorio.';
        }
        if (control.hasError('email')) {
            return 'Ingresa un correo electrónico válido.';
        }
        return '';
    }
    onSubmit() {
        if (this.loading()) {
            return;
        }
        if (this.recuperarForm.invalid) {
            this.recuperarForm.markAllAsTouched();
            return;
        }
        const { email } = this.recuperarForm.getRawValue();
        this.serverError.set(null);
        this.successMessage.set(null);
        this.loading.set(true);
        this.authService.recuperarPassword({ correo: email }).subscribe({
            next: (response) => {
                this.loading.set(false);
                this.successMessage.set(response.mensaje);
            },
            error: (err) => {
                this.loading.set(false);
                this.handleError(err);
            },
        });
    }
    handleError(err) {
        const status = err && typeof err === 'object' && 'status' in err
            ? err.status
            : undefined;
        if (status === 0) {
            this.serverError.set('No se pudo conectar con el servidor.');
            return;
        }
        this.serverError.set('No fue posible procesar tu solicitud en este momento.');
    }
};
RecuperarPassword = __decorate([
    Component({
        selector: 'app-recuperar-password',
        imports: [ReactiveFormsModule, RouterLink],
        templateUrl: './recuperar-password.html',
        styleUrl: './recuperar-password.css',
        changeDetection: ChangeDetectionStrategy.OnPush,
    })
], RecuperarPassword);
export { RecuperarPassword };
