import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginData: LoginRequest = {
    email: '',
    password: ''
  };

  loading = false;
  error = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/']);
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.validateForm()) return;

    this.loading = true;
    this.error = '';

    try {
      const response = await this.authService.login(this.loginData).toPromise();
      
      if (response?.success) {
        this.router.navigate(['/']);
      } else {
        this.error = response?.message || 'Error en el login';
      }
    } catch (error: any) {
      console.error('Error en login:', error);
      this.error = error?.error?.message || 'Error de conexión. Verifica tus credenciales.';
    } finally {
      this.loading = false;
    }
  }

  validateForm(): boolean {
    if (!this.loginData.email.trim()) {
      this.error = 'El email es requerido';
      return false;
    }

    if (!this.isValidEmail(this.loginData.email)) {
      this.error = 'Ingresa un email válido';
      return false;
    }

    if (!this.loginData.password.trim()) {
      this.error = 'La contraseña es requerida';
      return false;
    }

    if (this.loginData.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return false;
    }

    return true;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  clearError(): void {
    this.error = '';
  }
}
