import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { UserAvatarDropdownComponent } from '../../../components/user-avatar-dropdown/user-avatar-dropdown.component';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

interface NotificationItem {
  id: number;
  title: string;
  content: string;
  redirectUrl: string;
  isRead: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, UserAvatarDropdownComponent],
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.css'],
})
export class AdminHeaderComponent implements OnInit, OnDestroy {
  @Output() menuClicked = new EventEmitter<void>();

  searchTerm = '';

  // Notification state
  unreadCount = signal(0);
  notifications = signal<NotificationItem[]>([]);
  showNotifDropdown = signal(false);
  loadingNotifs = false;

  private pollSub?: Subscription;
  private stompClient!: Client;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.fetchUnreadCount();
    this.startPolling();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.stompClient?.deactivate();
  }

  onMenuClick() {
    this.menuClicked.emit();
  }

  // ── Lấy số chưa đọc ──────────────────────────────────────────
  fetchUnreadCount() {
    this.http.get<number>(`${environment.apiUrl}/notifications/me/unread-count`).subscribe({
      next: (count) => this.unreadCount.set(count),
      error: () => {},
    });
  }

  // ── Poll mỗi 30s (fallback khi WS không kết nối được) ────────
  startPolling() {
    this.pollSub = interval(30_000)
      .pipe(
        switchMap(() =>
          this.http.get<number>(`${environment.apiUrl}/notifications/me/unread-count`),
        ),
      )
      .subscribe({
        next: (count) => this.unreadCount.set(count),
        error: () => {},
      });
  }

  // ── WebSocket realtime ────────────────────────────────────────
  connectWebSocket() {
    const user = this.authService.currentUserValue;
    if (!user?.user_id) return;

    const socket = new SockJS(environment.wsUrl);

    this.stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
    });

    this.stompClient.onConnect = () => {
      console.log('WS connected');

      this.stompClient.subscribe(`/topic/unread-count.${user.user_id}`, (message) => {
        this.unreadCount.set(JSON.parse(message.body));
      });

      this.stompClient.subscribe(`/topic/notification.${user.user_id}`, () => {
        this.unreadCount.update((v) => v + 1);

        if (this.showNotifDropdown()) {
          this.fetchNotifications();
        }
      });
    };

    this.stompClient.onStompError = (err) => {
      console.error('WS error:', err);
    };

    this.stompClient.activate();
  }

  // ── Toggle dropdown ───────────────────────────────────────────
  toggleNotifDropdown(event: Event) {
    event.stopPropagation();
    const next = !this.showNotifDropdown();
    this.showNotifDropdown.set(next);

    if (next) {
      this.fetchNotifications();
    }
  }

  // ── Fetch danh sách thông báo ─────────────────────────────────
  fetchNotifications() {
    this.loadingNotifs = true;
    this.http.get<NotificationItem[]>(`${environment.apiUrl}/notifications/me`).subscribe({
      next: (list) => {
        this.notifications.set(list);
        this.loadingNotifs = false;
      },
      error: () => {
        this.loadingNotifs = false;
      },
    });
  }

  // ── Đánh dấu tất cả đã đọc ───────────────────────────────────
  markAllRead(event: Event) {
    event.stopPropagation();
    this.http.patch(`${environment.apiUrl}/notifications/me/read-all`, {}).subscribe({
      next: () => {
        this.unreadCount.set(0);
        this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
      },
    });
  }

  // ── Click vào thông báo → navigate + mark read ────────────────
  onNotifClick(notif: NotificationItem) {
    if (!notif.isRead) {
      this.http
        .patch(`${environment.apiUrl}/notifications/${notif.id}/read`, null, {
          params: { userId: this.authService.currentUserValue?.user_id || '' },
        })
        .subscribe({
          next: () => {
            this.notifications.update((list) =>
              list.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
            );
            this.unreadCount.update((v) => Math.max(0, v - 1));
          },
        });
    }

    if (notif.redirectUrl) {
      window.location.href = notif.redirectUrl;
    }
    this.showNotifDropdown.set(false);
  }

  // ── Đóng dropdown khi click ngoài ────────────────────────────
  @HostListener('document:click')
  onDocumentClick() {
    this.showNotifDropdown.set(false);
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
      if (diff < 1) return 'Vừa xong';
      if (diff < 60) return `${diff} phút trước`;
      const h = Math.floor(diff / 60);
      if (h < 24) return `${h} giờ trước`;
      return `${Math.floor(h / 24)} ngày trước`;
    } catch {
      return '';
    }
  }
}
