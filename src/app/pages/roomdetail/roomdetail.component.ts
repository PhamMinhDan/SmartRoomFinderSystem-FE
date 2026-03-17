import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { ReportModalComponent } from '../reportmodal/report-modal.component';
import mapboxgl from 'mapbox-gl';

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

interface Room {
  roomId: number;
  title: string;
  description: string;
  address: string;
  cityName: string;
  districtName: string;
  wardName: string;
  latitude: number;
  longitude: number;
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
  createdAt: string;
}

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReportModalComponent],
  templateUrl: './roomdetail.component.html',
  styleUrl: './roomdetail.component.css',
})
export class RoomDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  room: Room | null = null;
  loading = true;
  error = '';

  // Image gallery
  currentImageIndex = 0;
  showPhoneNumber = false;

  // Map
  private map: any;
  private L: any;
  private MAPBOX_TOKEN =
    'pk.eyJ1IjoibHVvbmcyMyIsImEiOiJjbW1raDNueWcxZGJ3MnFwemg1aTI2cXF1In0.P4Zv9Up4zZaXXn7wG3ue4g';

  // ── Review / Comment ────────────────────────────────────
  commentText = '';
  reviews: ReviewItem[] = [];
  reviewPage = 0;
  reviewTotalPages = 0;
  reviewsLoading = false;

  // Rating popup
  showRatingPopup = false;
  pendingRating: number = 5;
  hoverRating: number = 0;
  submittingReview = false;
  reviewError = '';

  // Similar rooms
  similarRooms: Room[] = [];

  // User role
  currentRole: string = '';
  currentUserId: string = '';

  // Map section toggle
  showMap = false;
  mapInitialized = false;

  // Landlord actions
  updatingStatus = false;
  openReviewMenu: number | null = null;

  // Report modal
  showReportModal = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    public authService: AuthService,
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
  }

  async ngAfterViewInit(): Promise<void> {}

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  maskPhone(phone?: string): string {
    if (!phone) return 'Chưa cập nhật';
    if (phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 2);
  }

  loadRoom(id: number) {
    this.loading = true;
    this.mapInitialized = false;
    this.showMap = false;
    this.currentImageIndex = 0;
    this.reviews = [];
    this.reviewPage = 0;

    this.http.get<any>(`${environment.apiUrl}/rooms/${id}`).subscribe({
      next: (res) => {
        this.room = res?.data ?? res;
        this.http.post(`${environment.apiUrl}/rooms/${id}/view`, {}).subscribe({
          next: (view: any) => {
            if (this.room) {
              this.room.viewCount = view?.data ?? this.room.viewCount + 1;
            }
          },
        });
        this.loading = false;
        this.loadReviews(true);
        this.loadSimilarRooms();
        setTimeout(() => this.initMap(), 200);
      },
      error: () => {
        this.error = 'Không tìm thấy phòng hoặc đã xảy ra lỗi.';
        this.loading = false;
      },
    });
  }

  // ── Reviews ────────────────────────────────────────────
  loadReviews(reset = false) {
    if (!this.room) return;
    if (reset) {
      this.reviews = [];
      this.reviewPage = 0;
    }
    this.reviewsLoading = true;
    this.http
      .get<any>(`${environment.apiUrl}/rooms/${this.room.roomId}/reviews`, {
        params: { page: this.reviewPage.toString(), size: '10' },
      })
      .subscribe({
        next: (res) => {
          const page = res?.data;
          const content: ReviewItem[] = page?.content ?? [];
          this.reviews = reset ? content : [...this.reviews, ...content];
          this.reviewTotalPages = page?.totalPages ?? 0;
          this.reviewsLoading = false;
        },
        error: () => {
          this.reviewsLoading = false;
        },
      });
  }

  loadMoreReviews() {
    if (this.reviewPage + 1 < this.reviewTotalPages) {
      this.reviewPage++;
      this.loadReviews(false);
    }
  }

  // Called when user presses Enter or clicks send in comment box
  submitComment() {
    if (!this.commentText.trim()) return;
    if (!this.authService.currentUserValue) {
      this.router.navigate(['/login']);
      return;
    }
    this.showRatingPopup = true;
  }

  // Called when user closes the rating popup (cancel)
  cancelRatingPopup() {
    this.showRatingPopup = false;
    this.reviewError = '';
  }

  // Star hover for popup
  setHoverRating(star: number) {
    this.hoverRating = star;
  }

  clearHoverRating() {
    this.hoverRating = 0;
  }

  selectRating(star: number) {
    this.pendingRating = star;
  }

  // Submit rating + comment
  confirmSubmitReview() {
    if (!this.room) return;
    if (this.pendingRating < 1 || this.pendingRating > 5) {
      this.reviewError = 'Vui lòng chọn số sao từ 1 đến 5.';
      return;
    }
    this.submittingReview = true;
    this.reviewError = '';

    const payload = {
      rating: this.pendingRating,
      comment: this.commentText.trim(),
    };

    this.http
      .post<any>(`${environment.apiUrl}/rooms/${this.room.roomId}/reviews`, payload)
      .subscribe({
        next: (res) => {
          const newReview: ReviewItem = res?.data;
          if (newReview) {
            // Always add as a new review at the top
            this.reviews.unshift(newReview);
          }

          // Update room stats from server
          this.refreshRatingStats();

          this.commentText = '';
          this.pendingRating = 5;
          this.hoverRating = 0;
          this.showRatingPopup = false;
          this.submittingReview = false;
        },
        error: (err) => {
          this.reviewError = err?.error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.';
          this.submittingReview = false;
        },
      });
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

  deleteReview(reviewId: number) {
    if (!this.room) return;
    if (!confirm('Xóa đánh giá này?')) return;
    this.http
      .delete<any>(`${environment.apiUrl}/rooms/${this.room.roomId}/reviews/${reviewId}`)
      .subscribe({
        next: () => {
          this.reviews = this.reviews.filter((r) => r.reviewId !== reviewId);
          this.refreshRatingStats();
        },
      });
  }

  // Star display helpers
  getStarArray(rating: number): ('full' | 'half' | 'empty')[] {
    return [1, 2, 3, 4, 5].map((i) => {
      if (rating >= i) return 'full';
      if (rating > i - 1 && rating < i) return 'half';
      return 'empty';
    });
  }

  getRatingArray(rating: number): boolean[] {
    return [1, 2, 3, 4, 5].map((i) => i <= Math.round(rating || 0));
  }

  getDisplayRating(star: number): boolean {
    const active = this.hoverRating || this.pendingRating;
    return star <= active;
  }

  // ── Similar Rooms ─────────────────────────────────────
  loadSimilarRooms() {
    if (!this.room) return;
    this.http
      .get<any>(`${environment.apiUrl}/rooms`, {
        params: {
          city: this.room.cityName,
          district: this.room.districtName,
          page: '0',
          size: '6',
        },
      })
      .subscribe({
        next: (res) => {
          const all: Room[] = res?.data?.content ?? [];
          this.similarRooms = all.filter((r) => r.roomId !== this.room!.roomId).slice(0, 5);
        },
        error: () => {},
      });
  }

  // ── Image gallery ─────────────────────────────────────
  get primaryImage(): string {
    if (!this.room?.images?.length) return '';
    const img = this.room.images[this.currentImageIndex];
    return img?.imageUrl || this.room.images[0].imageUrl;
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

  // ── Map ───────────────────────────────────────────────
  async toggleMap() {
    this.showMap = !this.showMap;
    if (this.showMap && !this.mapInitialized) {
      setTimeout(() => this.initMap(), 150);
    }
  }

  async initMap() {
    if (!this.room) return;

    mapboxgl.accessToken = this.MAPBOX_TOKEN;

    const roomLat = Number(this.room.latitude);
    const roomLng = Number(this.room.longitude);

    this.map = new mapboxgl.Map({
      container: 'roomDetailMap',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [roomLng, roomLat],
      zoom: 15,
    });

    this.map.on('load', () => {
      const roomEl = document.createElement('div');
      roomEl.className = 'pulse-marker';

      new mapboxgl.Marker({ element: roomEl, anchor: 'center' })
        .setLngLat([roomLng, roomLat])
        .setPopup(
          new mapboxgl.Popup().setHTML(
            `<b>📍 Phòng trọ</b><br>${this.room?.address}, ${this.room?.wardName}, ${this.room?.districtName}, ${this.room?.cityName}`,
          ),
        )
        .addTo(this.map);

      if (this.isRenter) {
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

  // ── Role helpers ─────────────────────────────────────
  get isRenter(): boolean {
    const role = this.currentRole?.toUpperCase();
    return role === 'RENTER' || role === 'USER';
  }

  get isLandlord(): boolean {
    return this.currentRole?.toUpperCase() === 'LANDLORD';
  }

  get isMyRoom(): boolean {
    return !!this.currentUserId && this.room?.landlordId === this.currentUserId;
  }

  // ── Actions ───────────────────────────────────────────
  contactLandlord() {
    if (!this.room) return;
    this.router.navigate(['/chat'], {
      queryParams: {
        roomId: this.room.roomId,
        receiverId: this.room.landlordId,
        partnerName: this.room.landlordName,
        partnerAvatar: this.room.landlordAvatar,
      },
    });
  }

  editRoom() {
    if (!this.room) return;
    this.router.navigate(['/rooms/edit', this.room.roomId]);
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
    this.showReportModal = true;
  }

  togglePhone() {
    this.showPhoneNumber = !this.showPhoneNumber;
  }

  // ── Display helpers ───────────────────────────────────
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
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= 3
      ? 'bg-red-100 text-red-600 border-red-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }

  getExpireText(dateStr?: string): string {
    if (!dateStr) return '';
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Đã hết hạn';
    if (days === 0) return 'Hết hạn hôm nay';
    return `Còn ${days} ngày`;
  }

  isVideo(url: string): boolean {
    return url?.includes('/video/upload/') || url?.endsWith('.mp4');
  }

  toggleReviewMenu(reviewId: number) {
    this.openReviewMenu = this.openReviewMenu === reviewId ? null : reviewId;
  }
  reportReview(reviewId: number) {
    this.openReviewMenu = null;
    alert('Chức năng báo cáo sẽ được phát triển sau.');
  }
}