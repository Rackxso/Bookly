import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private auth = inject(AuthService);

  email = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMsg = signal('');

  submit() {
    if (this.isLoading()) return;
    if (!this.email().trim() || !this.password()) {
      this.errorMsg.set('Por favor, rellena todos los campos.');
      return;
    }

    this.isLoading.set(true);
    this.errorMsg.set('');

    this.auth.login(this.email().trim(), this.password()).subscribe({
      next: () => {}, // router redirect handled by AuthService
      error: err => {
        this.errorMsg.set(err.error?.error ?? 'Error al iniciar sesión. Inténtalo de nuevo.');
        this.isLoading.set(false);
      },
    });
  }
}
