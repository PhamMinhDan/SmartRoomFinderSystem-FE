import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { AuthService, UserResponse } from '../../services/auth.service';
import { ConfirmLogoutModalComponent } from '../logout/confirm-logout-modal.component';
import { UserAvatarDropdownComponent } from '../user-avatar-dropdown/user-avatar-dropdown.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoginModalComponent,
    ConfirmLogoutModalComponent,
    UserAvatarDropdownComponent,   // ← shared dropdown
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  isOpen = false;
  isLoginModalOpen = false;
  isConfirmLogoutOpen = false;
  currentUser: UserResponse | null = null;

  private userSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });

    if (this.authService.isLoggedIn() && !this.currentUser) {
      this.authService.getCurrentUser().subscribe({
        error: () => this.authService.logout().subscribe(),
      });
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
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
    const user = this.authService.currentUserValue;
    if (user?.role_name === 'ADMIN') {
      this.router.navigate(['/admin']);
    }
  }

  confirmLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.isConfirmLogoutOpen = false;
        this.router.navigate(['/']);
      },
      error: () => {
        this.isConfirmLogoutOpen = false;
        this.router.navigate(['/']);
      },
    });
  }

  goToPostRoom(): void {
    if (!this.currentUser) {
      this.openLoginModal();
      return;
    }
    this.router.navigate(
      this.currentUser.identity_verified ? ['/post-room'] : ['/identity-verify']
    );
  }

  goToChat(): void {
    if (!this.currentUser) {
      this.openLoginModal();
      return;
    }
    this.router.navigate(['/chat']);
  }
}
