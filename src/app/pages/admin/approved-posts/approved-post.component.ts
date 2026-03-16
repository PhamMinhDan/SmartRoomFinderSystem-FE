import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface ApprovedPost {
  id: number;
  image: string;
  title: string;
  price: string;
  address: string;
  poster: { name: string; avatar: string };
  approvedDate: string;
  views: number;
  area: string;
  type: string;
}

@Component({
  selector: 'app-approved-posts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approved-post.component.html',
  styleUrls: ['./approved-post.component.css'],
})
export class ApprovedPostsComponent implements OnInit {
  filterOpen = signal(false);
  loading = false;
  posts: ApprovedPost[] = [];

  // Pagination
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 15;

  // Toast
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRooms();
  }

  // GET /admin/rooms?isApproved=true
  async loadRooms() {
    this.loading = true;
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/admin/rooms`, {
          params: { isApproved: true, page: this.currentPage, size: this.pageSize },
        })
      );
      const rooms = res.data.content;
      this.totalPages = res.data.totalPages;
      this.totalElements = res.data.totalElements;

      this.posts = rooms.map((r: any) => ({
        id: r.roomId,
        image: r.imageUrls?.[0] || '',
        title: r.title,
        price: this.formatPrice(r.pricePerMonth),
        address: `${r.districtName}, ${r.cityName}`,
        poster: {
          name: r.landlordName || r.landlordEmail,
          avatar: this.getInitials(r.landlordName || r.landlordEmail),
        },
        approvedDate: this.timeAgo(r.createdAt),
        views: 0, // API chưa trả views
        area: r.areaSize ? `${r.areaSize}m²` : '—',
        type: r.furnishLevel || 'Phòng trọ',
      }));
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Lỗi tải dữ liệu', 'error');
    } finally {
      this.loading = false;
    }
  }

  // Xem chi tiết phòng
  viewRoomDetail(roomId: number) {
    this.router.navigate(['/room', roomId]);
  }

  // PATCH /admin/rooms/:id/active (Ẩn phòng)
  async hideRoom(roomId: number) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/admin/rooms/${roomId}/active`, { isActive: false })
      );
      this.showToast('Đã ẩn phòng', 'success');
      this.loadRooms();
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Ẩn phòng thất bại', 'error');
    }
  }

  // DELETE /admin/rooms/:id
  async deleteRoom(roomId: number) {
    if (!confirm('Bạn có chắc chắn muốn xóa phòng này?')) return;
    
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/admin/rooms/${roomId}`)
      );
      this.showToast('Đã xóa phòng', 'success');
      this.loadRooms();
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Xóa phòng thất bại', 'error');
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