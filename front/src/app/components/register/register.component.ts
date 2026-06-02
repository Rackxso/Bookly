import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private auth = inject(AuthService);

  name = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  isLoading = signal(false);
  errorMsg = signal('');

  submit() {
    if (this.isLoading()) return;
    this.errorMsg.set('');

    if (!this.name().trim() || !this.email().trim() || !this.password()) {
      this.errorMsg.set('Por favor, rellena todos los campos.');
      return;
    }
    if (this.password().length < 6) {
      this.errorMsg.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.password() !== this.confirmPassword()) {
      this.errorMsg.set('Las contraseñas no coinciden.');
      return;
    }

    this.isLoading.set(true);

    this.auth.register(this.name().trim(), this.email().trim(), this.password()).subscribe({
      next: () => {},
      error: err => {
        this.errorMsg.set(err.error?.error ?? 'Error al crear la cuenta. Inténtalo de nuevo.');
        this.isLoading.set(false);
      },
    });
  }
}
