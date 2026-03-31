import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../components/toast/toast.service';
import { ReportModalComponent } from '../reportmodal/report-modal.component';
import mapboxgl from 'mapbox-gl';
import { LoginModalComponent } from '../../components/login-modal/login-modal.component';
import { FavouriteService } from '../../services/favourites.service';

// ── Interfaces ────────────────────────────────────────────────────
interface RoomImage {
  imageId: number;
  imageUrl: string;
  imageOrder: number;
  isPrimary: boolean;
}

interface Amenity {
  amenityId: number;
  amenityName: string;
  iconUrl: string;
  category: string;
}

/** Khớp với RoomAddressResponse.java */
interface RoomAddress {
  room_address_id: number;
  street_address: string;
  city_name: string;
  district_name: string;
  ward_name: string;
  latitude: number | null;
  longitude: number | null;
}

interface Room {
  roomId: number;
  title: string;
  description: string;

  /** Địa chỉ nằm trong object riêng */
  address: RoomAddress;

  areaSize: number;
  pricePerMonth: number;
  depositAmount: number;
  capacity: number;
  roomType: string;
  furnishLevel: string;
  availableFrom: string;
  availabilityStatus: string;
  isVerified: boolean;
  isApproved: boolean;
  isActive: boolean;
  viewCount: number;
  averageRating: number;
  totalReviews: number;
  landlordId: string;
  landlordName: string;
  landlordAvatar: string;
  phoneNumber: string;
  images: RoomImage[];
  amenities: Amenity[];
  createdAt: string;
  updatedAt: string;
  expiredAt?: string;
}

interface ReviewItem {
  reviewId: number;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  imageUrls: string[];
  createdAt: string;
}

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReportModalComponent, LoginModalComponent],
  templateUrl: './roomdetail.component.html',
  styleUrl: './roomdetail.component.css',
})
export class RoomDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  room: Room | null = null;
  loading = true;
  error = '';

  currentImageIndex = 0;
  showPhoneNumber = false;

  private map: any;
  private MAPBOX_TOKEN =
    'pk.eyJ1IjoibHVvbmcyMyIsImEiOiJjbW1raDNueWcxZGJ3MnFwemg1aTI2cXF1In0.P4Zv9Up4zZaXXn7wG3ue4g';
  showMap = false;
  mapInitialized = false;

  reviews: ReviewItem[] = [];
  reviewPage = 0;
  reviewTotalPages = 0;
  reviewsLoading = false;

  commentText = '';
  pendingRating = 0;
  hoverRating = 0;
  submittingReview = false;
  reviewError = '';

  reviewImagePreviews: string[] = [];
  reviewImageUrls: string[] = [];
  reviewImageUploading: boolean[] = [];

  activeReviewFilter = 'all';
  lightboxImageUrl = '';
  openReviewMenu: number | null = null;

  similarRooms: Room[] = [];

  currentRole = '';
  currentUserId = '';
  updatingStatus = false;

  pages: number[] = [];
  ratingStats: { [key: number]: number } = {};
  reportTargetId: number | null = null;
  reportType: 'ROOM' | 'REVIEW' = 'ROOM';

  readonly reviewFilters = [
    { key: 'latest', label: 'Gần đây' },
    { key: 'all', label: 'Tất cả' },
    { key: '5', label: '5★' },
    { key: '4', label: '4★' },
    { key: '3', label: '3★' },
    { key: '2', label: '2★' },
    { key: '1', label: '1★' },
  ];

  showReportModal = false;
  isLoginOpen = false;

  savedIds = new Set<number>();
  toggling = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toast: ToastService,
    public authService: AuthService,
    private favouriteService: FavouriteService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentRole = user.role_name || '';
      this.currentUserId = user.user_id || '';
    }
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) this.loadRoom(id);
    });
    this.favouriteService.savedIds.subscribe((ids) => {
      this.savedIds = ids;
    });
    if (this.authService.isLoggedIn()) this.favouriteService.loadSavedIds();
  }

  async ngAfterViewInit(): Promise<void> {}

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  getReviewCountByStar(star: number): number {
    return this.reviews.filter((r) => r.rating >= star && r.rating < star + 1).length;
  }

  // ── Load room ────────────────────────────────────────────────
  loadRoom(id: number) {
    this.loading = true;
    this.mapInitialized = false;
    this.showMap = false;
    this.currentImageIndex = 0;
    this.reviews = [];
    this.reviewPage = 0;
    this.resetReviewForm();

    this.http.get<any>(`${environment.apiUrl}/rooms/${id}`).subscribe({
      next: (res) => {
        this.room = res?.data ?? res;
        this.loading = false;
        this.loadReviews(true);
        this.loadSimilarRooms();
        this.loadRatingStats();
        setTimeout(() => this.initMap(), 200);
      },
      error: () => {
        this.error = 'Không tìm thấy phòng hoặc đã xảy ra lỗi.';
        this.loading = false;
      },
    });
  }

  loadRatingStats() {
    if (!this.room) return;
    this.http
      .get<any>(`${environment.apiUrl}/rooms/${this.room.roomId}/reviews/stats-count`)
      .subscribe((res) => {
        this.ratingStats = res.data;
      });
  }

  // ── Reviews ──────────────────────────────────────────────────
  loadReviews(reset = false) {
    if (!this.room) return;
    if (reset) this.reviews = [];
    this.reviewsLoading = true;

    let params: any = { page: this.reviewPage, size: 5 };
    if (['5', '4', '3', '2', '1'].includes(this.activeReviewFilter))
      params.star = this.activeReviewFilter;
    params.sort =
      this.activeReviewFilter === 'high'
        ? 'high'
        : this.activeReviewFilter === 'low'
          ? 'low'
          : 'latest';

    this.http
      .get<any>(`${environment.apiUrl}/rooms/${this.room.roomId}/reviews`, { params })
      .subscribe((res) => {
        const page = res.data;
        this.reviews = page.content;
        this.reviewTotalPages = page.totalPages;
        this.pages = Array.from({ length: this.reviewTotalPages }, (_, i) => i);
        this.reviewsLoading = false;
      });
  }

  loadMoreReviews() {
    if (this.reviewPage + 1 < this.reviewTotalPages) {
      this.reviewPage++;
      this.loadReviews(false);
    }
  }

  changePage(page: number) {
    this.reviewPage = page;
    this.loadReviews(true);
  }

  refreshRatingStats() {
    if (!this.room) return;
    this.http.get<any>(`${environment.apiUrl}/rooms/${this.room.roomId}/reviews/stats`).subscribe({
      next: (res) => {
        const stats = res?.data;
        if (this.room && stats) {
          this.room.averageRating = stats.averageRating;
          this.room.totalReviews = stats.totalReviews;
        }
      },
    });
  }

  get ratingBars(): { star: number; count: number; percent: number }[] {
    const total = this.reviews.length;
    return [5, 4, 3, 2, 1].map((star) => {
      const count = this.reviews.filter((r) => Math.floor(r.rating) === star).length;
      return { star, count, percent: total > 0 ? (count / total) * 100 : 0 };
    });
  }

  get filteredReviews(): ReviewItem[] {
    switch (this.activeReviewFilter) {
      case 'high':
        return [...this.reviews].sort((a, b) => b.rating - a.rating);
      case 'low':
        return [...this.reviews].sort((a, b) => a.rating - b.rating);
      default:
        return this.reviews;
    }
  }

  setReviewFilter(key: string) {
    this.activeReviewFilter = key;
    this.loadReviews(true);
  }

  selectRating(star: number) {
    this.pendingRating = star;
  }
  setHoverRating(star: number) {
    this.hoverRating = star;
  }
  clearHoverRating() {
    this.hoverRating = 0;
  }

  onRatingInput() {
    if (this.pendingRating < 0) this.pendingRating = 0;
    if (this.pendingRating > 5) this.pendingRating = 5;
    this.pendingRating = Math.round(this.pendingRating * 10) / 10;
  }

  getDisplayRating(star: number): boolean {
    return star <= (this.hoverRating || Math.floor(this.pendingRating));
  }

  // ── Image upload ─────────────────────────────────────────────
  onReviewImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const remaining = 3 - this.reviewImagePreviews.length;
    const files = Array.from(input.files).slice(0, remaining);

    files.forEach((file) => {
      const idx = this.reviewImagePreviews.length;
      this.reviewImagePreviews.push('');
      this.reviewImageUrls.push('');
      this.reviewImageUploading.push(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.reviewImagePreviews[idx] = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      this.uploadReviewImage(file, idx);
    });
    input.value = '';
  }

  uploadReviewImage(file: File, idx: number) {
    const formData = new FormData();
    formData.append('file', file);
    this.http.post<{ url: string }>(`${environment.apiUrl}/upload`, formData).subscribe({
      next: (res) => {
        this.reviewImageUrls[idx] = res.url;
        this.reviewImageUploading[idx] = false;
      },
      error: () => {
        this.reviewError = 'Upload ảnh thất bại. Vui lòng thử lại.';
        this.reviewImageUploading[idx] = false;
        this.reviewImagePreviews.splice(idx, 1);
        this.reviewImageUrls.splice(idx, 1);
        this.reviewImageUploading.splice(idx, 1);
      },
    });
  }

  removeReviewImage(idx: number) {
    this.reviewImagePreviews.splice(idx, 1);
    this.reviewImageUrls.splice(idx, 1);
    this.reviewImageUploading.splice(idx, 1);
  }

  submitReview() {
    if (!this.room) return;
    if (!this.authService.requireLogin(() => (this.isLoginOpen = true), undefined, this.router.url))
      return;
    if (this.pendingRating < 1 || this.pendingRating > 5) {
      this.reviewError = 'Vui lòng chọn số sao từ 1 đến 5.';
      return;
    }
    if (this.reviewImageUploading.includes(true)) {
      this.reviewError = 'Vui lòng đợi ảnh upload xong.';
      return;
    }

    this.submittingReview = true;
    this.reviewError = '';

    const payload = {
      rating: this.pendingRating,
      comment: this.commentText.trim(),
      imageUrls: this.reviewImageUrls.filter((url) => !!url) || null,
    };

    this.http
      .post<any>(`${environment.apiUrl}/rooms/${this.room.roomId}/reviews`, payload)
      .subscribe({
        next: () => {
          this.toast.show('Đánh giá thành công 🎉', 'success');
          this.reviewPage = 0;
          this.loadReviews(true);
          this.refreshRatingStats();
          this.resetReviewForm();
          this.submittingReview = false;
        },
        error: (err) => {
          this.reviewError = err?.error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.';
          this.submittingReview = false;
          this.toast.show(this.reviewError, 'error');
        },
      });
  }

  resetReviewForm() {
    this.commentText = '';
    this.pendingRating = 0;
    this.hoverRating = 0;
    this.reviewError = '';
    this.reviewImagePreviews = [];
    this.reviewImageUrls = [];
    this.reviewImageUploading = [];
  }

  deleteReview(reviewId: number) {
    if (!this.room || !confirm('Xóa đánh giá này?')) return;
    this.http
      .delete<any>(`${environment.apiUrl}/rooms/${this.room.roomId}/reviews/${reviewId}`)
      .subscribe({
        next: () => {
          this.reviews = this.reviews.filter((r) => r.reviewId !== reviewId);
          this.openReviewMenu = null;
          this.refreshRatingStats();
        },
      });
  }

  toggleReviewMenu(reviewId: number) {
    this.openReviewMenu = this.openReviewMenu === reviewId ? null : reviewId;
  }

  reportReview(reviewId: number) {
    this.openReviewMenu = null;
    this.authService.requireLogin(
      () => (this.isLoginOpen = true),
      () => {
        this.reportTargetId = reviewId;
        this.reportType = 'REVIEW';
        this.showReportModal = true;
      },
      this.router.url,
    );
  }

  openLightbox(url: string) {
    this.lightboxImageUrl = url;
  }
  closeLightbox() {
    this.lightboxImageUrl = '';
  }

  // ── Similar rooms ─────────────────────────────────────────────
  loadSimilarRooms() {
    if (!this.room) return;
    // Lọc theo city/district từ room.address object
    const city = this.room.address?.city_name ?? '';
    const district = this.room.address?.district_name ?? '';

    this.http
      .get<any>(`${environment.apiUrl}/rooms`, {
        params: { city, district, page: '0', size: '6' },
      })
      .subscribe({
        next: (res) => {
          const all: Room[] = res?.data?.content ?? [];
          this.similarRooms = all.filter((r) => r.roomId !== this.room!.roomId).slice(0, 5);
        },
        error: () => {},
      });
  }

  // ── Image gallery ─────────────────────────────────────────────
  get primaryImage(): string {
    if (!this.room?.images?.length) return '';
    return this.room.images[this.currentImageIndex]?.imageUrl || this.room.images[0].imageUrl;
  }

  prevImage() {
    if (!this.room?.images?.length) return;
    this.currentImageIndex =
      (this.currentImageIndex - 1 + this.room.images.length) % this.room.images.length;
  }

  nextImage() {
    if (!this.room?.images?.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.room.images.length;
  }

  selectImage(index: number) {
    this.currentImageIndex = index;
  }

  // ── Map ───────────────────────────────────────────────────────
  async toggleMap() {
    this.showMap = !this.showMap;
    if (this.showMap && !this.mapInitialized) setTimeout(() => this.initMap(), 150);
  }

  async initMap() {
    if (!this.room) return;

    mapboxgl.accessToken = this.MAPBOX_TOKEN;

    // ── Lấy tọa độ từ room.address object ──
    const roomLat = Number(this.room.address?.latitude);
    const roomLng = Number(this.room.address?.longitude);

    this.map = new mapboxgl.Map({
      container: 'roomDetailMap',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [roomLng, roomLat],
      zoom: 15,
    });

    this.map.on('load', () => {
      const roomEl = document.createElement('div');
      roomEl.className = 'pulse-marker';

      const addr = this.room?.address;
      const popupHtml = addr
        ? `<b>📍 Phòng trọ</b><br>${addr.street_address}, ${addr.ward_name}, ${addr.district_name}, ${addr.city_name}`
        : `<b>📍 Phòng trọ</b>`;

      new mapboxgl.Marker({ element: roomEl, anchor: 'center' })
        .setLngLat([roomLng, roomLat])
        .setPopup(new mapboxgl.Popup().setHTML(popupHtml))
        .addTo(this.map);

      if (this.canContact) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            const userEl = document.createElement('div');
            userEl.className = 'user-marker';
            new mapboxgl.Marker({ element: userEl, anchor: 'center' })
              .setLngLat([userLng, userLat])
              .setPopup(new mapboxgl.Popup().setHTML(`<b>📍 Vị trí hiện tại của bạn</b>`))
              .addTo(this.map);
            this.fetchRoute(userLat, userLng, roomLat, roomLng);
          },
          () => {
            const user = this.authService.currentUserValue;
            if (user?.address?.latitude && user?.address?.longitude) {
              const userLat = user.address.latitude;
              const userLng = user.address.longitude;
              const fullAddress = `${user.address.street_address}, ${user.address.ward_name}, ${user.address.district_name}, ${user.address.city_name}`;
              new mapboxgl.Marker({ color: 'blue' })
                .setLngLat([userLng, userLat])
                .setPopup(
                  new mapboxgl.Popup().setHTML(`<b>📍 Địa chỉ của bạn</b><br>${fullAddress}`),
                )
                .addTo(this.map);
              this.fetchRoute(userLat, userLng, roomLat, roomLng);
            }
          },
        );
      }
    });

    this.mapInitialized = true;
  }

  fetchRoute(fromLat: number, fromLng: number, toLat: number, toLng: number) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${this.MAPBOX_TOKEN}`;
    this.http.get<any>(url).subscribe((res) => {
      const route = res.routes[0];
      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMin = Math.round(route.duration / 60);
      const data = route.geometry;
      this.map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: data } });
      this.map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#c81e00', 'line-width': 5 },
      });
      new mapboxgl.Popup({ closeButton: false })
        .setLngLat([toLng, toLat])
        .setHTML(`🚗 ${distanceKm} km • ${durationMin} phút`)
        .addTo(this.map);
    });
  }

  // ── Role helpers ──────────────────────────────────────────────
  get isRenter(): boolean {
    return ['RENTER', 'USER'].includes(this.currentRole?.toUpperCase());
  }
  get isLandlord(): boolean {
    return this.currentRole?.toUpperCase() === 'LANDLORD';
  }
  get isMyRoom(): boolean {
    return !!this.currentUserId && this.room?.landlordId === this.currentUserId;
  }
  get canContact(): boolean {
    return !this.isMyRoom;
  }

  // ── Actions ───────────────────────────────────────────────────
  contactLandlord() {
    this.authService.requireLogin(
      () => (this.isLoginOpen = true),
      () => {
        this.router.navigate(['/chat'], {
          queryParams: {
            roomId: this.room?.roomId,
            receiverId: this.room?.landlordId,
            partnerName: this.room?.landlordName,
            partnerAvatar: this.room?.landlordAvatar,
          },
        });
      },
      this.router.url,
    );
  }

  editRoom() {
    if (!this.room) return;
    this.router.navigate(['/edit-room', this.room.roomId]);
  }

  toggleRoomActiveStatus() {
    if (!this.room) return;
    const newActive = !this.room.isActive;
    this.updatingStatus = true;
    this.http
      .patch(`${environment.apiUrl}/rooms/${this.room.roomId}/active`, { isActive: newActive })
      .subscribe({
        next: () => {
          this.room!.isActive = newActive;
          this.updatingStatus = false;
        },
        error: () => {
          this.updatingStatus = false;
          alert('Cập nhật trạng thái thất bại.');
        },
      });
  }

  viewSimilarRoom(id: number) {
    this.router.navigate(['/room', id]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack() {
    this.router.navigate(['/search']);
  }

  reportRoom() {
    this.authService.requireLogin(
      () => (this.isLoginOpen = true),
      () => {
        this.reportTargetId = this.room?.roomId || null;
        this.reportType = 'ROOM';
        this.showReportModal = true;
      },
      this.router.url,
    );
  }

  togglePhone() {
    this.showPhoneNumber = !this.showPhoneNumber;
  }

  maskPhone(phone?: string): string {
    if (!phone) return 'Chưa cập nhật';
    if (phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 2);
  }

  isSaved(roomId?: number): boolean {
    return roomId ? this.savedIds.has(roomId) : false;
  }

  toggleFavourite(event: Event) {
    event.stopPropagation();
    if (!this.room) return;
    if (!this.authService.isLoggedIn()) {
      this.toast.show('Vui lòng đăng nhập để lưu tin', 'info');
      return;
    }
    if (this.toggling) return;
    this.toggling = true;
    this.favouriteService.toggle(this.room.roomId).subscribe({
      next: (res) => {
        const saved = res?.data?.saved ?? false;
        this.toast.show(
          saved ? '❤️ Đã lưu vào yêu thích' : '🤍 Đã bỏ lưu',
          saved ? 'success' : 'info',
        );
        this.toggling = false;
      },
      error: () => {
        this.toast.show('Có lỗi xảy ra', 'error');
        this.toggling = false;
      },
    });
  }

  // ── Star helpers ──────────────────────────────────────────────
  getStarArray(rating: number): number[] {
    return [1, 2, 3, 4, 5].map((i) => {
      const diff = rating - (i - 1);
      if (diff >= 1) return 1;
      if (diff > 0) return diff;
      return 0;
    });
  }

  // ── Format helpers ────────────────────────────────────────────
  formatPrice(price: number): string {
    if (!price) return 'Liên hệ';
    if (price >= 1_000_000) {
      const m = price / 1_000_000;
      return (m % 1 === 0 ? `${m}` : `${m.toFixed(1)}`) + ' triệu/tháng';
    }
    return `${(price / 1000).toFixed(0)}k/tháng`;
  }

  formatPriceShort(price: number): string {
    if (!price) return 'Liên hệ';
    if (price >= 1_000_000) {
      const m = price / 1_000_000;
      return (m % 1 === 0 ? `${m}` : `${m.toFixed(1)}`) + 'tr';
    }
    return `${(price / 1000).toFixed(0)}k`;
  }

  formatFurnish(level: string): string {
    const map: { [k: string]: string } = {
      'fully-furnished': 'Full nội thất',
      'semi-furnished': 'Nội thất cơ bản',
      unfurnished: 'Không nội thất',
    };
    return map[level] || level || 'Chưa cập nhật';
  }

  formatRoomType(type: string): string {
    if (!type) return 'Chưa cập nhật';
    const map: { [k: string]: string } = {
      MOTEL: 'Phòng trọ',
      APARTMENT: 'Chung cư',
      MINI_APARTMENT: 'Căn hộ mini',
    };
    return map[type.toUpperCase()] || type;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'Chưa cập nhật';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  }

  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const diffDays = Math.floor(
      (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 30) return `${diffDays} ngày trước`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
    return `${Math.floor(diffDays / 365)} năm trước`;
  }

  getStatusLabel(status: string): string {
    const map: { [k: string]: string } = {
      available: 'Còn phòng',
      rented: 'Đã cho thuê',
      maintenance: 'Đang bảo trì',
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: { [k: string]: string } = {
      available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rented: 'bg-red-100 text-red-600 border-red-200',
      maintenance: 'bg-amber-100 text-amber-600 border-amber-200',
    };
    return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  }

  getExpireClass(dateStr?: string): string {
    if (!dateStr) return '';
    const days = Math.ceil(
      (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
    return days <= 3
      ? 'bg-red-100 text-red-600 border-red-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }

  getExpireText(dateStr?: string): string {
    if (!dateStr) return '';
    const days = Math.ceil(
      (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0) return 'Đã hết hạn';
    if (days === 0) return 'Hết hạn hôm nay';
    return `Còn ${days} ngày`;
  }

  isVideo(url: string): boolean {
    return url?.includes('/video/upload/') || url?.endsWith('.mp4');
  }

  scrollToReviews() {
    document
      .getElementById('reviewSection')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goToLogin() {
    this.isLoginOpen = true;
  }
  onLoginSuccess() {
    this.isLoginOpen = false;
  }
}
