import { Component, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { AuthService, UserResponse } from '../../services/auth.service';
import { ConfirmLogoutModalComponent } from '../logout/confirm-logout-modal.component';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, LoginModalComponent, ConfirmLogoutModalComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  isOpen = false;
  isLoginModalOpen = false;
  currentUser: UserResponse | null = null;
  isUserMenuOpen = false;
  isConfirmLogoutOpen = false;

  private userSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private eRef: ElementRef,
    private router: Router,
  ) {}

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isUserMenuOpen = false;
    }
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });

    if (this.authService.isLoggedIn() && !this.currentUser) {
      this.authService.getCurrentUser().subscribe({
        next: (response) => {
          console.log('User info loaded:', response);
        },
        error: (error) => {
          console.error('Failed to load user info:', error);
          this.authService.logout().subscribe();
        },
      });
    }
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  toggleMenu(): void {
    this.isOpen = !this.isOpen;
  }

  openLoginModal(): void {
    this.isLoginModalOpen = true;
  }

  closeLoginModal(): void {
    this.isLoginModalOpen = false;
  }

  onLoginSuccess(): void {
    this.isLoginModalOpen = false;
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  onProfileClick(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = false;
  }

  logout(): void {
    this.isConfirmLogoutOpen = true;
  }

  confirmLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.isConfirmLogoutOpen = false;
        this.isUserMenuOpen = false;
        this.router.navigate(['/']);
      },
      error: () => {
        this.isConfirmLogoutOpen = false;
        this.router.navigate(['/']);
      },
    });
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }
}
