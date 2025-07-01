import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  companyName = 'Paquetería DD';
  logoUrl = 'assets/images/logo.jpg';
  currentRoute = 'dashboard';
  
  isMobileMenuOpen = false;
  isProfileMenuOpen = false;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  get userName(): string {
    return this.authService.currentUserValue?.name || 'Usuario';
  }

  get userEmail(): string {
    return this.authService.currentUserValue?.email || '';
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    if (this.isProfileMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }

  toggleNotifications(): void {
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const navbar = target.closest('nav');
    
    if (!navbar) {
      this.closeMenus();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(): void {
    this.closeMenus();
  }

  private closeMenus(): void {
    this.isMobileMenuOpen = false;
    this.isProfileMenuOpen = false;
  }

  navigateTo(route: string): void {
    this.currentRoute = route;
    this.closeMenus();
    this.router.navigate([route === 'dashboard' ? '/' : `/${route}`]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.closeMenus();
  }
}
