import { Component, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { AuthService, UserResponse } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, LoginModalComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  isOpen = false;
  isLoginModalOpen = false;
  currentUser: UserResponse | null = null;
  isUserMenuOpen = false;

  private userSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private eRef: ElementRef,
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
      console.log('Current user updated:', user);
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
    console.log('[Header] Nút Đăng nhập được click → mở modal');
    this.isLoginModalOpen = true;
  }

  closeLoginModal(): void {
    console.log('[Header] Đóng modal từ output');
    this.isLoginModalOpen = false;
  }

  onLoginSuccess(): void {
    console.log('[Header] Login successful');
    this.isLoginModalOpen = false;
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  logout(): void {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
      this.authService.logout().subscribe({
        next: () => {
          console.log('Logout successful');
          this.isUserMenuOpen = false;
        },
        error: (error) => {
          console.error('Logout error:', error);
        },
      });
    }
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
