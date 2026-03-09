import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

interface RoomImage {
  imageUrl: string;
}

interface Room {
  roomId: number;
  title: string;
  pricePerMonth: number;
  address: string;
  createdAt: string;
  expiredAt?: string;
  postTier?: string;
  isApproved: boolean;
  images: RoomImage[];
}

interface CalendarDay {
  date: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

interface ScheduleEvent {
  time: string;
  title: string;
  guest: string;
}

interface Tab {
  key: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-manage-posts',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DatePipe],
  templateUrl: './manage-posts.component.html',
})
export class ManagePostsComponent implements OnInit, OnDestroy {
  // ── User info (from AuthService) ──────────────────
  userName = '';
  userEmail = '';
  userAvatar = '';

  // ── Posts ─────────────────────────────────────────
  rooms: Room[] = [];
  filteredRooms: Room[] = [];
  loading = true;
  searchQuery = '';
  activeTab = 'all';
  openMenuId: number | null = null;

  // ── Tabs ──────────────────────────────────────────
  tabs: Tab[] = [
    { key: 'all', label: 'Đang hiển thị', count: 0 },
    { key: 'expired', label: 'Hết hạn', count: 0 },
    { key: 'rejected', label: 'Bị từ chối', count: 0 },
    { key: 'payment', label: 'Cần thanh toán', count: 0 },
    { key: 'inbox', label: 'Tin nhắn', count: 0 },
    { key: 'pending', label: 'Chờ duyệt', count: 0 },
  ];

  // ── Calendar ──────────────────────────────────────
  dayLabels = ['CN', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7'];
  calendarDays: CalendarDay[] = [];
  currentMonthLabel = '';
  private currentYear = new Date().getFullYear();
  private currentMonth = new Date().getMonth();

  // ── Schedule ──────────────────────────────────────
  todaySchedule: ScheduleEvent[] = [
    { time: '10:00 AM', title: 'Tên tin đăng', guest: 'Tên khách hẹn' },
  ];

  private userSub!: Subscription;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    // Subscribe to current user from AuthService
    this.userSub = this.authService.currentUser.subscribe((user) => {
      if (user) {
        this.userName = user.full_name || user.username || '';
        this.userEmail = user.email || '';
        this.userAvatar = user.avatar_url || '';
      }
    });

    // If no user cached, fetch from API
    if (!this.authService.currentUserValue) {
      this.authService.getCurrentUser().subscribe();
    }

    this.buildCalendar();
    this.loadRooms();
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }

  // ── Data ─────────────────────────────────────────
  loadRooms() {
    this.http.get<any>(`${environment.apiUrl}/rooms/my`).subscribe({
      next: (res) => {
        this.rooms = res.data?.content ?? [];
        this.updateTabCounts();
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.rooms = [];
        this.loading = false;
      },
    });
  }

  updateTabCounts() {
    this.tabs[0].count = this.rooms.filter((r) => r.isApproved).length;
    this.tabs[5].count = this.rooms.filter((r) => !r.isApproved).length;
  }

  onSearch() {
    this.applyFilters();
  }

  applyFilters() {
    let list = [...this.rooms];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.address.toLowerCase().includes(q),
      );
    }

    if (this.activeTab === 'pending') {
      list = list.filter((r) => !r.isApproved);
    } else if (this.activeTab === 'all') {
      list = list.filter((r) => r.isApproved);
    }

    this.filteredRooms = list;
  }

  // ── Actions ───────────────────────────────────────
  deleteRoom(id: number) {
    if (!confirm('Bạn có chắc muốn xóa bài đăng này?')) return;
    this.http.delete(`${environment.apiUrl}/rooms/${id}`).subscribe({
      next: () => {
        this.rooms = this.rooms.filter((r) => r.roomId !== id);
        this.updateTabCounts();
        this.applyFilters();
      },
    });
    this.openMenuId = null;
  }

  editRoom(id: number) {
    this.router.navigate(['/edit-room', id]);
  }

  viewRoom(id: number) {
    this.router.navigate(['/room', id]);
    this.openMenuId = null;
  }

  extendRoom(id: number) {
    this.router.navigate(['/extend-room', id]);
  }

  openMenu(id: number) {
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu() {
    this.openMenuId = null;
  }

  // ── Calendar ──────────────────────────────────────
  buildCalendar() {
    const monthNames = [
      'Tháng 1',
      'Tháng 2',
      'Tháng 3',
      'Tháng 4',
      'Tháng 5',
      'Tháng 6',
      'Tháng 7',
      'Tháng 8',
      'Tháng 9',
      'Tháng 10',
      'Tháng 11',
      'Tháng 12',
    ];

    this.currentMonthLabel = `${monthNames[this.currentMonth]} ${this.currentYear}`;

    const today = new Date();
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

    const days: CalendarDay[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: daysInPrevMonth - i, inMonth: false, isToday: false, isWeekend: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(this.currentYear, this.currentMonth, d).getDay();
      days.push({
        date: d,
        inMonth: true,
        isToday:
          d === today.getDate() &&
          this.currentMonth === today.getMonth() &&
          this.currentYear === today.getFullYear(),
        isWeekend: dow === 0 || dow === 6,
      });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: d, inMonth: false, isToday: false, isWeekend: false });
    }

    this.calendarDays = days;
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.buildCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.buildCalendar();
  }
}
