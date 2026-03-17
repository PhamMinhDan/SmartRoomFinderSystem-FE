import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
          params: { page: this.currentPage.toString(), size: this.pageSize.toString() },
        })
      );

      console.log('API Response:', res); // Debug log

      // FIX: Kiểm tra cấu trúc response
      if (!res || !res.data) {
        throw new Error('Invalid response structure');
      }

      const pageData = res.data;
      const rooms = pageData.content || [];

      this.totalPages = pageData.totalPages || 0;
      this.totalElements = pageData.totalElements || 0;

      console.log(`Loaded ${rooms.length} rooms, total: ${this.totalElements}`); // Debug log

      this.allPosts = rooms.map((r: any) => {
        // FIX: Logic xác định status chính xác hơn
        let status: PostStatus;
        if (r.isApproved === true) {
          status = 'approved';
        } else if (r.isActive === false) {
          // Đã bị reject/ẩn
          status = 'rejected';
        } else {
          // Đang chờ duyệt (isApproved=false, isActive=true)
          status = 'pending';
        }

        return {
          id: r.roomId,
          image: r.imageUrls && r.imageUrls.length > 0 ? r.imageUrls[0] : '/assets/placeholder.jpg',
          title: r.title || 'Không có tiêu đề',
          price: this.formatPrice(r.pricePerMonth),
          address: `${r.districtName || ''}, ${r.cityName || ''}`,
          poster: r.landlordName || r.landlordEmail || 'Unknown',
          status: status,
          date: this.formatDate(r.createdAt),
          views: r.viewCount || 0,
        };
      });

    } catch (err: any) {
      console.error('Load rooms error:', err); // Debug log

      // FIX: Xử lý lỗi HTTP chi tiết hơn
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401 || err.status === 403) {
          this.showToast('Bạn không có quyền truy cập. Vui lòng đăng nhập lại.', 'error');
        } else if (err.status === 500) {
          this.showToast('Lỗi server. Vui lòng thử lại sau.', 'error');
        } else {
          this.showToast(err.error?.message || 'Lỗi tải dữ liệu', 'error');
        }
      } else {
        this.showToast(err?.message || 'Lỗi không xác định', 'error');
      }

      // Reset về empty state
      this.allPosts = [];
      this.totalPages = 0;
      this.totalElements = 0;

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
    return { 
      approved: 'Đã duyệt', 
      pending: 'Chờ duyệt', 
      rejected: 'Từ chối' 
    }[status];
  }

  formatPrice(price: number | null | undefined): string {
    if (!price) return '—';
    if (price >= 1_000_000) {
      return (price / 1_000_000).toFixed(1).replace('.0', '') + ' triệu';
    }
    return price.toLocaleString('vi-VN') + ' đ';
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  showToast(msg: string, type: 'success' | 'error') {
    this.toastMsg = msg;
    this.toastType = type;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toastMsg = ''), 3000);
  }

  ngOnDestroy() {
    clearTimeout(this.toastTimer);
  }
}