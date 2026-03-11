import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

type PostStatus = 'approved' | 'pending' | 'rejected';

interface Post {
  id: number;
  image: string;
  title: string;
  price: string;
  address: string;
  poster: string;
  status: PostStatus;
  date: string;
  views: number;
}

@Component({
  selector: 'app-all-posts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './all-posts.component.html',
  styleUrls: ['./all-posts.component.css'],
})
export class AllPostsComponent implements OnInit {
  searchTerm = signal('');
  loading = false;
  allPosts: Post[] = [];

  // Pagination
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 15;

  // Toast
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadRooms();
  }

  // GET /admin/rooms (không filter isApproved → lấy tất cả)
  async loadRooms() {
    this.loading = true;
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/admin/rooms`, {
          params: { page: this.currentPage, size: this.pageSize },
        })
      );
      const rooms = res.data.content;
      this.totalPages = res.data.totalPages;
      this.totalElements = res.data.totalElements;

      this.allPosts = rooms.map((r: any) => ({
        id: r.roomId,
        image: r.imageUrls?.[0] || '',
        title: r.title,
        price: this.formatPrice(r.pricePerMonth),
        address: `${r.districtName}, ${r.cityName}`,
        poster: r.landlordName || r.landlordEmail,
        status: (r.isApproved ? 'approved' : r.isActive ? 'pending' : 'rejected') as PostStatus,
        date: this.formatDate(r.createdAt),
        views: 0, // API chưa trả views
      }));
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Lỗi tải dữ liệu', 'error');
    } finally {
      this.loading = false;
    }
  }

  // Client-side search filter
  filteredPosts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.allPosts;
    return this.allPosts.filter(
      p =>
        p.title.toLowerCase().includes(term) ||
        p.address.toLowerCase().includes(term) ||
        p.poster.toLowerCase().includes(term)
    );
  });

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
  getStatusLabel(status: PostStatus): string {
    return { approved: 'Đã duyệt', pending: 'Chờ duyệt', rejected: 'Từ chối' }[status];
  }

  formatPrice(price: number): string {
    if (!price) return '—';
    if (price >= 1_000_000) return (price / 1_000_000).toFixed(1).replace('.0', '') + ' triệu';
    return price.toLocaleString('vi-VN') + ' đ';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  showToast(msg: string, type: 'success' | 'error') {
    this.toastMsg = msg;
    this.toastType = type;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}