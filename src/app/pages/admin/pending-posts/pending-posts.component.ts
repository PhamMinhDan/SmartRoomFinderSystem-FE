import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

type Tab = 'all' | 'verifications' | 'reports';

interface PendingPost {
  id: number;
  image: string;
  title: string;
  price: string;
  priceRaw: number;
  address: string;
  poster: { name: string; avatar: string; avatarUrl: string | null };
  time: string;
  area: string;
  roomId: number;
  reportCount: number;
  landlordIdentityVerified: boolean;
  hasPendingVerification: boolean;
  pendingVerificationId: number | null;
}

interface VerificationItem {
  verificationId: number;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  documentType: string;
  frontImageUrl: string;
  backImageUrl: string;
  selfieImageUrl: string | null;
  phoneNumber: string;
  status: string;
  createdAt: string;
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

  // Approve verify inline
  showVerifyWarningModal = false;
  verifyWarningRoomId: number | null = null;
  verifyWarningPost: PendingPost | null = null;

  // Reject verification modal
  showRejectVerifyModal = false;
  rejectVerifyTargetId: number | null = null;
  rejectVerifyReason = '';

  posts: PendingPost[] = [];
  verifications: VerificationItem[] = [];
  reports: ReportItem[] = [];

  // Pagination — posts
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 15;

  // Pagination — verifications
  verifyPage = 0;
  verifyTotalPages = 0;
  verifyTotal = 0;

  // Pagination — reports
  reportPage = 0;
  reportTotalPages = 0;
  reportTotal = 0;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadRooms();
    this.loadVerifications();
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
            size: this.pageSize.toString(),
          },
        }),
      );

      if (!res || !res.data) throw new Error('Invalid response structure');

      const pageData = res.data;
      const rooms = pageData.content || [];
      this.totalPages = pageData.totalPages || 0;
      this.totalElements = pageData.totalElements || 0;

      this.posts = rooms.map((r: any) => ({
        id: r.roomId,
        roomId: r.roomId,
        image: r.imageUrls?.length > 0 ? r.imageUrls[0] : '/assets/placeholder.jpg',
        title: r.title || 'Không có tiêu đề',
        price: this.formatPrice(r.pricePerMonth),
        priceRaw: r.pricePerMonth || 0,
        address: [r.address, r.districtName, r.cityName].filter(Boolean).join(', '),
        poster: {
          name: r.landlordName || r.landlordEmail || 'Unknown',
          avatar: this.getInitials(r.landlordName || r.landlordEmail || '?'),
          avatarUrl: r.landlordAvatar || null,
        },
        time: this.timeAgo(r.createdAt),
        area: r.areaSize ? `${r.areaSize}m²` : '—',
        reportCount: r.reportCount ?? 0,
        landlordIdentityVerified: r.landlordIdentityVerified === true,
        hasPendingVerification: r.pendingVerification != null,
        pendingVerificationId: r.pendingVerification?.verificationId ?? null,
      }));
    } catch (err: any) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401 || err.status === 403) {
          this.showToast('Bạn không có quyền truy cập. Vui lòng đăng nhập lại.', 'error');
        } else {
          this.showToast(err.error?.message || 'Lỗi tải dữ liệu', 'error');
        }
      } else {
        this.showToast(err?.message || 'Lỗi không xác định', 'error');
      }
      this.posts = [];
      this.totalPages = 0;
      this.totalElements = 0;
    } finally {
      this.loading = false;
    }
  }

  // ── Load verifications ───────────────────────────────────────
  async loadVerifications() {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/admin/verifications`, {
          params: {
            status: 'pending',
            page: this.verifyPage.toString(),
            size: this.pageSize.toString(),
          },
        }),
      );

      if (res?.data) {
        this.verifications = res.data.content || [];
        this.verifyTotalPages = res.data.totalPages || 0;
        this.verifyTotal = res.data.totalElements || 0;
      } else {
        this.verifications = [];
        this.verifyTotalPages = 0;
        this.verifyTotal = 0;
      }
    } catch {
      this.verifications = [];
      this.verifyTotalPages = 0;
      this.verifyTotal = 0;
    }
  }

  // ── Load reports ─────────────────────────────────────────────
  async loadReports() {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/admin/reports`, {
          params: {
            status: 'PENDING',
            page: this.reportPage.toString(),
            size: this.pageSize.toString(),
          },
        }),
      );

      if (res?.data) {
        this.reports = res.data.content || [];
        this.reportTotalPages = res.data.totalPages || 0;
        this.reportTotal = res.data.totalElements || 0;
      } else {
        this.reports = [];
        this.reportTotalPages = 0;
        this.reportTotal = 0;
      }
    } catch {
      this.reports = [];
      this.reportTotalPages = 0;
      this.reportTotal = 0;
    }
  }

  filteredPosts() {
    return this.posts;
  }

  // ── Navigate to room detail ──────────────────────────────────
  viewRoomDetail(roomId: number) {
    this.router.navigate(['/admin/room-detail', roomId]);
  }

  // ── Approve room ─────────────────────────────────────────────
  async approveRoom(roomId: number) {
    const post = this.posts.find((p) => p.id === roomId);

    if (post && !post.landlordIdentityVerified) {
      this.verifyWarningPost = post;
      this.verifyWarningRoomId = roomId;
      this.showVerifyWarningModal = true;
      return;
    }

    await this.doApproveRoom(roomId);
  }

  private async doApproveRoom(roomId: number) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/admin/rooms/${roomId}/approve`, {}),
      );
      this.showToast('Tin đã được duyệt! Email thông báo đã gửi cho người đăng.', 'success');
      await this.loadRooms();
    } catch (err: any) {
      if (err instanceof HttpErrorResponse) {
        const msg = err.error?.message || '';
        if (msg.includes('LANDLORD_NOT_VERIFIED') || msg.includes('chưa xác thực')) {
          this.showToast(
            'Người đăng chưa xác thực danh tính. Vui lòng duyệt xác thực trước.',
            'error',
          );
        } else {
          this.showToast(msg || 'Duyệt thất bại', 'error');
        }
      } else {
        this.showToast('Duyệt thất bại', 'error');
      }
    }
  }

  // ── Go to verifications tab from warning modal ───────────────
  goToVerificationsTab() {
    this.closeVerifyWarningModal();
    this.selectedTab.set('verifications');
  }

  // ── Approve verification from card phòng ────────────────────
  async approveVerificationFromCard(verificationId: number, roomId: number) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/admin/verifications/${verificationId}/approve`, {}),
      );
      this.showToast('Đã duyệt xác thực danh tính! Tiến hành duyệt tin đăng...', 'success');
      this.closeVerifyWarningModal();

      await this.loadRooms();
      await this.loadVerifications();
      await this.doApproveRoom(roomId);
    } catch (err: any) {
      this.showToast(
        err instanceof HttpErrorResponse
          ? err.error?.message || 'Duyệt xác thực thất bại'
          : 'Duyệt xác thực thất bại',
        'error',
      );
    }
  }

  closeVerifyWarningModal() {
    this.showVerifyWarningModal = false;
    this.verifyWarningRoomId = null;
    this.verifyWarningPost = null;
  }

  // ── Approve verification from verification tab ───────────────
  async approveVerification(verificationId: number) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/admin/verifications/${verificationId}/approve`, {}),
      );
      this.showToast('Đã duyệt xác thực danh tính thành công!', 'success');
      await this.loadVerifications();
      await this.loadRooms();
    } catch (err: any) {
      this.showToast(
        err instanceof HttpErrorResponse
          ? err.error?.message || 'Duyệt xác thực thất bại'
          : 'Duyệt xác thực thất bại',
        'error',
      );
    }
  }

  // ── Reject verification ──────────────────────────────────────
  openRejectVerifyModal(verificationId: number) {
    this.rejectVerifyTargetId = verificationId;
    this.rejectVerifyReason = '';
    this.showRejectVerifyModal = true;
  }

  closeRejectVerifyModal() {
    this.showRejectVerifyModal = false;
    this.rejectVerifyTargetId = null;
    this.rejectVerifyReason = '';
  }

  async confirmRejectVerify() {
    if (!this.rejectVerifyTargetId) return;
    try {
      await firstValueFrom(
        this.http.patch(
          `${environment.apiUrl}/admin/verifications/${this.rejectVerifyTargetId}/reject`,
          {},
          { params: { reason: this.rejectVerifyReason || 'Hồ sơ không hợp lệ' } },
        ),
      );
      this.showToast('Đã từ chối yêu cầu xác thực.', 'success');
      await this.loadVerifications();
    } catch (err: any) {
      this.showToast(
        err instanceof HttpErrorResponse
          ? err.error?.message || 'Từ chối thất bại'
          : 'Từ chối thất bại',
        'error',
      );
    } finally {
      this.closeRejectVerifyModal();
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
          { params: { reason: this.rejectReason || 'Không đạt yêu cầu' } },
        ),
      );
      this.showToast('Đã từ chối tin đăng. Email thông báo đã gửi.', 'success');
      await this.loadRooms();
    } catch (err: any) {
      this.showToast(
        err instanceof HttpErrorResponse
          ? err.error?.message || 'Từ chối thất bại'
          : 'Từ chối thất bại',
        'error',
      );
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
        this.http.patch(`${environment.apiUrl}/admin/reports/${this.resolveTargetId}/resolve`, {
          status: this.resolveStatus,
          adminNote: this.resolveNote || null,
        }),
      );
      this.showToast(
        this.resolveStatus === 'RESOLVED' ? 'Đã xử lý báo cáo' : 'Đã bỏ qua báo cáo',
        'success',
      );
      await this.loadReports();
    } catch (err: any) {
      this.showToast(
        err instanceof HttpErrorResponse
          ? err.error?.message || 'Xử lý thất bại'
          : 'Xử lý thất bại',
        'error',
      );
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

  changeVerifyPage(page: number) {
    if (page < 0 || page >= this.verifyTotalPages) return;
    this.verifyPage = page;
    this.loadVerifications();
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

  verifyPageRange(): number[] {
    const start = Math.max(0, this.verifyPage - 2);
    const end = Math.min(this.verifyTotalPages - 1, this.verifyPage + 2);
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
    this.selectedPosts.update((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  selectAll() {
    const filtered = this.filteredPosts();
    if (this.selectedPosts().length === filtered.length && filtered.length > 0) {
      this.selectedPosts.set([]);
    } else {
      this.selectedPosts.set(filtered.map((p) => p.id));
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
    return name
      .split(' ')
      .map((w: string) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getDocumentTypeLabel(type: string): string {
    const map: Record<string, string> = {
      CCCD: 'CCCD/CMND',
      PASSPORT: 'Hộ chiếu',
      DRIVER_LICENSE: 'Giấy phép lái xe',
    };
    return map[type] || type || 'Giấy tờ tùy thân';
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
    this.toastTimer = setTimeout(() => (this.toastMsg = ''), 4000);
  }

  ngOnDestroy() {
    clearTimeout(this.toastTimer);
  }
}
