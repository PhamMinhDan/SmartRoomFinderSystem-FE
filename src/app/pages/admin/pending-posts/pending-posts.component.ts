import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

type Tab = 'all' | 'reports';

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
  roomId: number;
  reportCount: number;
}

interface ReportItem {
  reportId: number;
  roomId: number;
  roomTitle: string;
  roomAddress: string;
  roomImageUrl: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  reason: string;
  reasonLabel: string;
  details: string;
  status: string;
  statusLabel: string;
  adminNote: string;
  createdAt: string;
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

  // Resolve report modal
  showResolveModal = false;
  resolveTargetId: number | null = null;
  resolveStatus: 'RESOLVED' | 'DISMISSED' = 'RESOLVED';
  resolveNote = '';

  posts: PendingPost[] = [];
  reports: ReportItem[] = [];

  // Pagination — posts
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 15;

  // Pagination — reports
  reportPage = 0;
  reportTotalPages = 0;
  reportTotal = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadRooms();
    this.loadReports();
  }

  // ── Load pending posts ───────────────────────────────────────
  async loadRooms() {
    this.loading = true;
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/admin/rooms`, {
          params: { 
            isApproved: 'false', 
            page: this.currentPage.toString(), 
            size: this.pageSize.toString() 
          },
        })
      );

      console.log('Pending rooms API Response:', res); // Debug log

      // FIX: Kiểm tra cấu trúc response
      if (!res || !res.data) {
        throw new Error('Invalid response structure');
      }

      const pageData = res.data;
      const rooms = pageData.content || [];

      this.totalPages = pageData.totalPages || 0;
      this.totalElements = pageData.totalElements || 0;

      console.log(`Loaded ${rooms.length} pending rooms, total: ${this.totalElements}`); // Debug log

      this.posts = rooms.map((r: any) => ({
        id: r.roomId,
        roomId: r.roomId,
        image: r.imageUrls && r.imageUrls.length > 0 ? r.imageUrls[0] : '/assets/placeholder.jpg',
        title: r.title || 'Không có tiêu đề',
        price: this.formatPrice(r.pricePerMonth),
        priceRaw: r.pricePerMonth || 0,
        address: `${r.address || ''}, ${r.districtName || ''}, ${r.cityName || ''}`,
        poster: {
          name: r.landlordName || r.landlordEmail || 'Unknown',
          avatar: this.getInitials(r.landlordName || r.landlordEmail || '?'),
        },
        time: this.timeAgo(r.createdAt),
        area: r.areaSize ? `${r.areaSize}m²` : '—',
        reportCount: r.reportCount ?? 0,
      }));

    } catch (err: any) {
      console.error('Load pending rooms error:', err); // Debug log

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
      this.posts = [];
      this.totalPages = 0;
      this.totalElements = 0;

    } finally {
      this.loading = false;
    }
  }

  // ── Load reports (PENDING) ───────────────────────────────────
  async loadReports() {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/admin/reports`, {
          params: { 
            status: 'PENDING', 
            page: this.reportPage.toString(), 
            size: this.pageSize.toString() 
          },
        })
      );

      console.log('Reports API Response:', res); // Debug log

      // FIX: Kiểm tra response
      if (res && res.data) {
        this.reports = res.data.content || [];
        this.reportTotalPages = res.data.totalPages || 0;
        this.reportTotal = res.data.totalElements || 0;
      } else {
        this.reports = [];
        this.reportTotalPages = 0;
        this.reportTotal = 0;
      }

    } catch (err: any) {
      console.error('Load reports error:', err); // Debug log

      // FIX: Không hiện toast error cho reports vì có thể endpoint chưa có
      // Chỉ log ra console
      this.reports = [];
      this.reportTotalPages = 0;
      this.reportTotal = 0;
    }
  }

  // Computed
filteredPosts() {
  return this.posts;
}

  // ── Approve room ─────────────────────────────────────────────
  async approveRoom(roomId: number) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/admin/rooms/${roomId}/approve`, {})
      );
      this.showToast('Tin đã được duyệt!', 'success');
      
      // Reload để cập nhật danh sách
      await this.loadRooms();
      
    } catch (err: any) {
      console.error('Approve room error:', err);
      
      if (err instanceof HttpErrorResponse) {
        this.showToast(err.error?.message || 'Duyệt thất bại', 'error');
      } else {
        this.showToast('Duyệt thất bại', 'error');
      }
    }
  }

  // ── Reject room ──────────────────────────────────────────────
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
      
      // Reload để cập nhật danh sách
      await this.loadRooms();
      
    } catch (err: any) {
      console.error('Reject room error:', err);
      
      if (err instanceof HttpErrorResponse) {
        this.showToast(err.error?.message || 'Từ chối thất bại', 'error');
      } else {
        this.showToast('Từ chối thất bại', 'error');
      }
    } finally {
      this.closeRejectModal();
    }
  }

  // ── Resolve report ───────────────────────────────────────────
  openResolveModal(reportId: number, defaultStatus: 'RESOLVED' | 'DISMISSED' = 'RESOLVED') {
    this.resolveTargetId = reportId;
    this.resolveStatus = defaultStatus;
    this.resolveNote = '';
    this.showResolveModal = true;
  }

  closeResolveModal() {
    this.showResolveModal = false;
    this.resolveTargetId = null;
    this.resolveNote = '';
  }

  async confirmResolve() {
    if (!this.resolveTargetId) return;
    
    try {
      await firstValueFrom(
        this.http.patch(
          `${environment.apiUrl}/admin/reports/${this.resolveTargetId}/resolve`,
          { status: this.resolveStatus, adminNote: this.resolveNote || null }
        )
      );
      this.showToast(
        this.resolveStatus === 'RESOLVED' ? 'Đã xử lý báo cáo' : 'Đã bỏ qua báo cáo',
        'success'
      );
      
      // Reload
      await this.loadReports();
      
    } catch (err: any) {
      console.error('Resolve report error:', err);
      
      if (err instanceof HttpErrorResponse) {
        this.showToast(err.error?.message || 'Xử lý thất bại', 'error');
      } else {
        this.showToast('Xử lý thất bại', 'error');
      }
    } finally {
      this.closeResolveModal();
    }
  }

  // ── Pagination ───────────────────────────────────────────────
  changePage(page: number) {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.loadRooms();
  }

  changeReportPage(page: number) {
    if (page < 0 || page >= this.reportTotalPages) return;
    this.reportPage = page;
    this.loadReports();
  }

  pageRange(): number[] {
    const start = Math.max(0, this.currentPage - 2);
    const end = Math.min(this.totalPages - 1, this.currentPage + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  reportPageRange(): number[] {
    const start = Math.max(0, this.reportPage - 2);
    const end = Math.min(this.reportTotalPages - 1, this.reportPage + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ── Checkbox ─────────────────────────────────────────────────
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
    if (this.selectedPosts().length === filtered.length && filtered.length > 0) {
      this.selectedPosts.set([]);
    } else {
      this.selectedPosts.set(filtered.map(p => p.id));
    }
  }

  isAllSelected(): boolean {
    const filtered = this.filteredPosts();
    return this.selectedPosts().length === filtered.length && filtered.length > 0;
  }

  // ── Helpers ──────────────────────────────────────────────────
  formatPrice(price: number | null | undefined): string {
    if (!price) return '—';
    if (price >= 1_000_000) {
      return (price / 1_000_000).toFixed(1).replace('.0', '') + ' triệu';
    }
    return price.toLocaleString('vi-VN') + ' đ';
  }

  timeAgo(dateStr: string | null | undefined): string {
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

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge-pending',
      RESOLVED: 'badge-resolved',
      DISMISSED: 'badge-dismissed',
    };
    return map[status] || '';
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