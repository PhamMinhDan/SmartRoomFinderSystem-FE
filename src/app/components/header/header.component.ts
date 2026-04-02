import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { AuthService, UserResponse } from '../../services/auth.service';
import { ConfirmLogoutModalComponent } from '../logout/confirm-logout-modal.component';
import { UserAvatarDropdownComponent } from '../user-avatar-dropdown/user-avatar-dropdown.component';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoginModalComponent,
    ConfirmLogoutModalComponent,
    UserAvatarDropdownComponent,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  isOpen = false;
  isLoginModalOpen = false;
  isConfirmLogoutOpen = false;
  currentUser: UserResponse | null = null;

  notifications: any[] = [];
  unreadCount = 0;
  showNotification = false;

  private userSub?: Subscription;
  private notiSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private chatService: ChatService,
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.chatService.connect(user.user_id);

        if (!this.notiSub) {
          this.notiSub = this.chatService.notification$.subscribe((noti) => {
            this.notifications.unshift(noti);
            if (!this.showNotification) {
              this.unreadCount++;
            }
          });
        }
      }
    });

    if (this.authService.isLoggedIn() && !this.currentUser) {
      this.authService.getCurrentUser().subscribe({
        error: () => this.authService.logout().subscribe(),
      });
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.notiSub?.unsubscribe();
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

  /**
   * Ấn "Đăng tin" trên header:
   * 1. Chưa login → mở modal login
   * 2. Đã verified → vào /post-room
   * 3. Chưa verified → kiểm tra trạng thái pending từ BE
   *    - Nếu pending → vào /identity-verify (trang sẽ hiển thị trạng thái chờ duyệt)
   *    - Nếu chưa gửi / rejected → vào /identity-verify (hiển thị form gửi)
   */
  goToPostRoom(): void {
    if (!this.currentUser) {
      this.openLoginModal();
      return;
    }

    // Đã xác minh danh tính → vào thẳng post-room
    if (this.currentUser.identity_verified) {
      this.router.navigate(['/post-room']);
      return;
    }

    // Chưa verified → navigate sang identity-verify (component sẽ tự handle trạng thái)
    this.router.navigate(['/identity-verify']);
  }

  goToChat(): void {
    if (!this.currentUser) {
      this.openLoginModal();
      return;
    }
    this.router.navigate(['/chat']);
  }

  loadNotifications() {
    if (!this.currentUser?.user_id) return;
    this.http
      .get(`${environment.apiUrl}/notifications?userId=${this.currentUser.user_id}`)
      .subscribe((res: any) => (this.notifications = res));

    this.http
      .get(`${environment.apiUrl}/notifications/unread-count?userId=${this.currentUser.user_id}`)
      .subscribe((res: any) => (this.unreadCount = res));
  }

  toggleNotification() {
    this.showNotification = !this.showNotification;

    if (this.showNotification) {
      this.loadNotifications();
      this.http
        .patch(
          `${environment.apiUrl}/notifications/read-all?userId=${this.currentUser?.user_id}`,
          {},
        )
        .subscribe(() => {
          this.unreadCount = 0;
          this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
        });
    }
  }

  markAllAsRead() {
    if (!this.currentUser?.user_id) return;

    this.http
      .patch(`${environment.apiUrl}/notifications/read-all?userId=${this.currentUser.user_id}`, {})
      .subscribe(() => {
        this.unreadCount = 0;
        this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
      });
  }

  goToNotification(n: any) {
    n.isRead = true;
    this.showNotification = false;
    if (n.redirectUrl) {
      this.router.navigateByUrl(n.redirectUrl);
    }
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: any) {
    if (!event.target.closest('.relative')) {
      this.showNotification = false;
    }
  }
}
