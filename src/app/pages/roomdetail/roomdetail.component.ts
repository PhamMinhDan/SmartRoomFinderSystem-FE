import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

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
  images: RoomImage[];
  amenities: Amenity[];
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './roomdetail.component.html',
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

  // Comments
  commentText = '';
  comments: any[] = [];

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

  loadRoom(id: number) {
    this.loading = true;
    this.mapInitialized = false;
    this.showMap = false;
    this.currentImageIndex = 0;
    this.http.get<any>(`${environment.apiUrl}/rooms/${id}`).subscribe({
      next: (res) => {
        this.room = res?.data ?? res;
        this.loading = false;
        this.loadSimilarRooms();
      },
      error: () => {
        this.error = 'Không tìm thấy phòng hoặc đã xảy ra lỗi.';
        this.loading = false;
      },
    });
  }

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

  // ── Image gallery ────────────────────────────────────
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
    if (!isPlatformBrowser(this.platformId) || !this.room) return;
    this.L = await import('leaflet');

    const roomLat = Number(this.room.latitude);
    const roomLng = Number(this.room.longitude);

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.map = this.L.map('roomDetailMap').setView([roomLat, roomLng], 15);

    this.L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${this.MAPBOX_TOKEN}`,
      { attribution: '© Mapbox © OpenStreetMap', tileSize: 512, zoomOffset: -1 },
    ).addTo(this.map);

    const redIcon = this.L.icon({
      iconUrl:
        'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [40, 40],
    });

    this.L.marker([roomLat, roomLng], { icon: redIcon })
      .addTo(this.map)
      .bindPopup(`<b>Vị trí phòng trọ</b><br>${this.room.address}`)
      .openPopup();

    // Nếu RENTER có địa chỉ → vẽ đường đi
    const user = this.authService.currentUserValue;
    if (this.isRenter && user?.address?.latitude && user?.address?.longitude) {
      const userLat = Number(user.address.latitude);
      const userLng = Number(user.address.longitude);

      const blueIcon = this.L.icon({
        iconUrl:
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [40, 40],
      });

      this.L.marker([userLat, userLng], { icon: blueIcon })
        .addTo(this.map)
        .bindPopup('<b>Vị trí của bạn</b>');

      // Polyline tạm
      const tempLine = this.L.polyline(
        [
          [userLat, userLng],
          [roomLat, roomLng],
        ],
        { color: '#00C897', weight: 3, dashArray: '8 5', opacity: 0.5 },
      ).addTo(this.map);
      this.map.fitBounds(tempLine.getBounds(), { padding: [50, 50] });

      // Lấy route thực từ Mapbox Directions
      this.fetchRoute(userLat, userLng, roomLat, roomLng);
    }

    this.mapInitialized = true;
  }

  fetchRoute(fromLat: number, fromLng: number, toLat: number, toLng: number) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${this.MAPBOX_TOKEN}`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        if (!data?.routes?.[0] || !this.map || !this.L) return;
        // Xóa polyline tạm
        this.map.eachLayer((layer: any) => {
          if (layer instanceof this.L.Polyline) this.map.removeLayer(layer);
        });

        const coords = data.routes[0].geometry.coordinates;
        const latlngs = coords.map((c: number[]) => [c[1], c[0]]);
        const dist = (data.routes[0].distance / 1000).toFixed(1);
        const dur = Math.round(data.routes[0].duration / 60);

        const routeLine = this.L.polyline(latlngs, { color: '#00C897', weight: 5 }).addTo(this.map);
        routeLine
          .bindTooltip(`🚗 ${dist} km • ~${dur} phút`, { permanent: true, direction: 'center' })
          .openTooltip();
        this.map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
      },
      error: () => {},
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
    // Sử dụng DELETE (soft delete) hoặc custom endpoint nếu có
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

  submitComment() {
    if (!this.commentText.trim()) return;
    const user = this.authService.currentUserValue;
    this.comments.unshift({
      name: user?.full_name || 'Bạn',
      avatar: user?.avatar_url || '',
      text: this.commentText,
      rating: 5,
      createdAt: new Date().toISOString(),
    });
    this.commentText = '';
  }

  reportRoom() {
    alert('Chức năng báo cáo đang được phát triển.');
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
    const map: { [k: string]: string } = {
      private: 'Phòng riêng',
      shared: 'Phòng chung',
      single: 'Phòng đơn',
      double: 'Phòng đôi',
    };
    return map[type] || type || 'Chưa cập nhật';
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

  getRatingArray(rating: number): boolean[] {
    return [1, 2, 3, 4, 5].map((i) => i <= Math.round(rating || 0));
  }
}
