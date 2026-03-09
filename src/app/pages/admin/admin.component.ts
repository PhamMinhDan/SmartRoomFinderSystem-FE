import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface PendingVerification {
  verificationId: number;
  documentType: string;
  frontImageUrl: string;
  backImageUrl: string;
  selfieImageUrl?: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
}

interface AdminRoom {
  roomId: number;
  title: string;
  description?: string;
  address: string;
  cityName: string;
  districtName: string;
  wardName: string;
  pricePerMonth: number;
  depositAmount?: number;
  areaSize?: number;
  furnishLevel?: string;
  availabilityStatus?: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
  landlordId: string;
  landlordName: string | null;
  landlordEmail: string;
  landlordPhone?: string;
  landlordAvatar?: string;
  landlordIdentityVerified: boolean;
  pendingVerification?: PendingVerification;
  imageUrls: string[];
}

interface AdminStats {
  totalRooms: number;
  pendingRooms: number;
  approvedRooms: number;
  pendingVerifications: number;
  totalUsers: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit {
  // State
  activeTab: 'pending' | 'approved' | 'all' = 'pending';
  loading = false;
  rooms: AdminRoom[] = [];
  stats: AdminStats | null = null;

  // Pagination
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 15;

  // Detail modal
  selectedRoom: AdminRoom | null = null;
  activeImageIdx = 0;

  // Reject modal
  showRejectModal = false;
  rejectReason = '';
  rejectTarget: { type: 'room' | 'verification'; id: number } | null = null;

  // Toast
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser.subscribe((user) => {
      if (!user) return;

      if (user.role_name !== 'ADMIN') {
        this.router.navigate(['/']);
        return;
      }

      this.loadStats();
      this.loadRooms();
    });
  }

  // ── Tab ───────────────────────────────────────────────────────
  setTab(tab: 'pending' | 'approved' | 'all') {
    this.activeTab = tab;
    this.currentPage = 0;
    this.loadRooms();
  }

  // ── Load stats ────────────────────────────────────────────────
  async loadStats() {
    try {
      const res: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/admin/stats`));
      this.stats = res.data;
    } catch {}
  }

  // ── Load rooms ────────────────────────────────────────────────
  async loadRooms() {
    this.loading = true;
    try {
      let isApproved: boolean | null = null;
      if (this.activeTab === 'pending') isApproved = false;
      else if (this.activeTab === 'approved') isApproved = true;

      const params: any = { page: this.currentPage, size: this.pageSize };
      if (isApproved !== null) params.isApproved = isApproved;

      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/admin/rooms`, { params }),
      );
      this.rooms = res.data.content;
      this.totalPages = res.data.totalPages;
      this.totalElements = res.data.totalElements;
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Lỗi tải dữ liệu', 'error');
    } finally {
      this.loading = false;
    }
  }

  // ── Detail modal ──────────────────────────────────────────────
  async openDetail(room: AdminRoom) {
    this.activeImageIdx = 0;
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/admin/rooms/${room.roomId}`),
      );
      this.selectedRoom = res.data;
    } catch {
      this.selectedRoom = room;
    }
  }

  closeDetail() {
    this.selectedRoom = null;
  }

  // ── Approve room ──────────────────────────────────────────────
  async approveRoom(roomId: number) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/admin/rooms/${roomId}/approve`, {}),
      );
      this.showToast('Tin đã được duyệt thành công!', 'success');
      this.closeDetail();
      this.loadRooms();
      this.loadStats();
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Duyệt thất bại', 'error');
    }
  }

  // Quick approve từ card
  async quickApprove(room: AdminRoom, event: Event) {
    event.stopPropagation();
    await this.approveRoom(room.roomId);
  }

  // ── Reject room ───────────────────────────────────────────────
  openRejectRoomModal(roomId: number) {
    this.rejectTarget = { type: 'room', id: roomId };
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  quickReject(room: AdminRoom, event: Event) {
    event.stopPropagation();
    this.openRejectRoomModal(room.roomId);
  }

  // ── Approve verification ──────────────────────────────────────
  async approveVerification(verificationId: number) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/admin/verifications/${verificationId}/approve`, {}),
      );
      this.showToast('Xác thực đã được duyệt, user được nâng lên LANDLORD!', 'success');
      if (this.selectedRoom) {
        const res: any = await firstValueFrom(
          this.http.get(`${environment.apiUrl}/admin/rooms/${this.selectedRoom.roomId}`),
        );
        this.selectedRoom = res.data;
      }
      this.loadRooms();
      this.loadStats();
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Duyệt xác thực thất bại', 'error');
    }
  }

  // ── Reject verification ───────────────────────────────────────
  openRejectVerifModal(verificationId: number) {
    this.rejectTarget = { type: 'verification', id: verificationId };
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  // ── Confirm reject (room or verification) ─────────────────────
  async confirmReject() {
    if (!this.rejectTarget) return;

    try {
      const params = { reason: this.rejectReason || 'Không đạt yêu cầu' };

      if (this.rejectTarget.type === 'room') {
        await firstValueFrom(
          this.http.patch(
            `${environment.apiUrl}/admin/rooms/${this.rejectTarget.id}/reject`,
            {},
            { params },
          ),
        );
        this.showToast('Đã từ chối tin đăng', 'success');
        this.closeDetail();
      } else {
        await firstValueFrom(
          this.http.patch(
            `${environment.apiUrl}/admin/verifications/${this.rejectTarget.id}/reject`,
            {},
            { params },
          ),
        );
        this.showToast('Đã từ chối xác thực', 'success');
        if (this.selectedRoom) {
          const res: any = await firstValueFrom(
            this.http.get(`${environment.apiUrl}/admin/rooms/${this.selectedRoom.roomId}`),
          );
          this.selectedRoom = res.data;
        }
      }
      this.loadRooms();
      this.loadStats();
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Thao tác thất bại', 'error');
    } finally {
      this.closeRejectModal();
    }
  }

  closeRejectModal() {
    this.showRejectModal = false;
    this.rejectTarget = null;
    this.rejectReason = '';
  }

  // ── Pagination ────────────────────────────────────────────────
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

  // ── Helpers ───────────────────────────────────────────────────
  formatPrice(price: number): string {
    if (!price) return '—';
    if (price >= 1_000_000) return (price / 1_000_000).toFixed(1).replace('.0', '') + ' triệu';
    return price.toLocaleString('vi-VN') + ' đ';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  showToast(msg: string, type: 'success' | 'error') {
    this.toastMsg = msg;
    this.toastType = type;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}
