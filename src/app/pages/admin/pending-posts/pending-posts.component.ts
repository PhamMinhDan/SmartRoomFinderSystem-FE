import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

type Tab = 'all' | 'suspicious' | 'cheap';

interface PendingPost {
  id: number;
  image: string;
  title: string;
  price: string;
  priceRaw: number;
  address: string;
  poster: { name: string; avatar: string };
  time: string;
  area: string;
  suspicious: boolean;
  roomId: number;
}

@Component({
  selector: 'app-pending-posts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-posts.component.html',
  styleUrls: ['./pending-posts.component.css'],
})
export class PendingPostsComponent implements OnInit {
  selectedTab = signal<Tab>('all');
  selectedPosts = signal<number[]>([]);
  loading = false;

  // Toast
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  // Reject modal
  showRejectModal = false;
  rejectReason = '';
  rejectTargetId: number | null = null;

  posts: PendingPost[] = [];

  // Pagination
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 15;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadRooms();
  }

  // GET /admin/rooms?isApproved=false
  async loadRooms() {
    this.loading = true;
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/admin/rooms`, {
          params: { isApproved: false, page: this.currentPage, size: this.pageSize },
        })
      );
      const rooms = res.data.content;
      this.totalPages = res.data.totalPages;
      this.totalElements = res.data.totalElements;

      this.posts = rooms.map((r: any) => ({
        id: r.roomId,
        roomId: r.roomId,
        image: r.imageUrls?.[0] || '',
        title: r.title,
        price: this.formatPrice(r.pricePerMonth),
        priceRaw: r.pricePerMonth,
        address: `${r.address}, ${r.districtName}, ${r.cityName}`,
        poster: {
          name: r.landlordName || r.landlordEmail,
          avatar: this.getInitials(r.landlordName || r.landlordEmail),
        },
        time: this.timeAgo(r.createdAt),
        area: r.areaSize ? `${r.areaSize}m²` : '—',
        suspicious: !r.landlordIdentityVerified,
      }));
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Lỗi tải dữ liệu', 'error');
    } finally {
      this.loading = false;
    }
  }

  // Computed filters
  suspiciousCount = computed(() => this.posts.filter(p => p.suspicious).length);
  cheapCount = computed(() => this.posts.filter(p => p.priceRaw > 0 && p.priceRaw < 2_000_000).length);

  filteredPosts = computed(() => {
    const tab = this.selectedTab();
    if (tab === 'suspicious') return this.posts.filter(p => p.suspicious);
    if (tab === 'cheap') return this.posts.filter(p => p.priceRaw > 0 && p.priceRaw < 2_000_000);
    return this.posts;
  });

  // PATCH /admin/rooms/:id/approve
  async approveRoom(roomId: number) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/admin/rooms/${roomId}/approve`, {})
      );
      this.showToast('Tin đã được duyệt!', 'success');
      this.loadRooms();
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Duyệt thất bại', 'error');
    }
  }

  // Mở modal reject
  openRejectModal(roomId: number) {
    this.rejectTargetId = roomId;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal() {
    this.showRejectModal = false;
    this.rejectTargetId = null;
    this.rejectReason = '';
  }

  // PATCH /admin/rooms/:id/reject
  async confirmReject() {
    if (!this.rejectTargetId) return;
    try {
      await firstValueFrom(
        this.http.patch(
          `${environment.apiUrl}/admin/rooms/${this.rejectTargetId}/reject`,
          {},
          { params: { reason: this.rejectReason || 'Không đạt yêu cầu' } }
        )
      );
      this.showToast('Đã từ chối tin đăng', 'success');
      this.loadRooms();
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Từ chối thất bại', 'error');
    } finally {
      this.closeRejectModal();
    }
  }

  // Pagination
  changePage(page: number) {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.loadRooms();
  }

  pageRange(): number[] {
    const start = Math.max(0, this.currentPage - 2);
    const end = Math.min(this.totalPages - 1, this.currentPage + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // Checkbox selection
  isSelected(id: number): boolean {
    return this.selectedPosts().includes(id);
  }

  toggleSelect(id: number) {
    this.selectedPosts.update(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  selectAll() {
    const filtered = this.filteredPosts();
    if (this.selectedPosts().length === filtered.length) {
      this.selectedPosts.set([]);
    } else {
      this.selectedPosts.set(filtered.map(p => p.id));
    }
  }

  isAllSelected(): boolean {
    return (
      this.selectedPosts().length === this.filteredPosts().length &&
      this.filteredPosts().length > 0
    );
  }

  // Helpers
  formatPrice(price: number): string {
    if (!price) return '—';
    if (price >= 1_000_000) return (price / 1_000_000).toFixed(1).replace('.0', '') + ' triệu';
    return price.toLocaleString('vi-VN') + ' đ';
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Vừa xong';
    if (diff < 60) return `${diff} phút trước`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.floor(h / 24)} ngày trước`;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  showToast(msg: string, type: 'success' | 'error') {
    this.toastMsg = msg;
    this.toastType = type;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}