// search-page.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface RoomImage {
  imageId: number;
  imageUrl: string;
  imageOrder: number;
  isPrimary: boolean;
}

interface Room {
  roomId: number;
  title: string;
  description: string;
  address: string;
  cityName: string;
  districtName: string;
  wardName: string;
  areaSize: number;
  pricePerMonth: number;
  depositAmount: number;
  capacity: number;
  furnishLevel: string;
  availabilityStatus: string;
  isVerified: boolean;
  isApproved: boolean;
  isActive: boolean;
  viewCount: number;
  totalReviews: number;
  landlordId: string;
  landlordName: string;
  landlordAvatar: string;
  images: RoomImage[];
  amenities: string[];
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-page.component.html',
})
export class SearchPageComponent implements OnInit {
  // ── View ─────────────────────────────────────────
  view: 'grid' | 'list' = 'grid';

  // ── Filters ──────────────────────────────────────
  city = '';
  district = '';
  priceMin: number | null = null;
  priceMax: number | null = null;
  areaMin: number | null = null;
  areaMax: number | null = null;
  roomType = '';
  amenities: string[] = [];
  sortOrder: 'newest' | 'price_asc' | 'price_desc' = 'newest';
  minRating: number | null = null;
  showAllAmenities = false;

  // ── Pagination ────────────────────────────────────
  currentPage = 0;
  pageSize = 12;
  totalPages = 0;
  totalElements = 0;

  // ── Data ─────────────────────────────────────────
  rooms: Room[] = [];
  loading = false;
  hasSearched = false;

  // ── Static options ────────────────────────────────
  districts: { [key: string]: string[] } = {
    'Hà Nội': [
      'Cầu Giấy',
      'Đống Đa',
      'Thanh Xuân',
      'Hoàng Mai',
      'Long Biên',
      'Ba Đình',
      'Hà Đông',
      'Nam Từ Liêm',
    ],
    'TP. Hồ Chí Minh': ['Quận 1', 'Quận 7', 'Bình Thạnh', 'Tân Bình', 'Phú Nhuận', 'Gò Vấp'],
    'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Liên Chiểu', 'Ngũ Hành Sơn'],
  };

  roomTypes = [
    { value: '', label: 'Tất cả' },
    { value: 'private', label: 'Phòng riêng' },
    { value: 'shared', label: 'Phòng chung' },
  ];

  amenitiesList = [
    'Wi-Fi',
    'Điều hòa',
    'Ban công',
    'Bếp riêng',
    'Gác lửng',
    'Camera an ninh',
    'Máy giặt',
    'Nóng lạnh',
    'Giờ tự do',
    'Chỗ để xe',
  ];

  get visibleAmenities(): string[] {
    return this.showAllAmenities ? this.amenitiesList : this.amenitiesList.slice(0, 5);
  }

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit() {
    // Load tất cả phòng khi vào trang, không filter
    this.fetchRooms(new HttpParams());
  }

  // ── Core fetch (dùng chung) ───────────────────────
  private fetchRooms(filterParams: HttpParams) {
    this.loading = true;
    const params = filterParams
      .set('page', this.currentPage.toString())
      .set('size', this.pageSize.toString());

    this.http.get<any>(`${environment.apiUrl}/rooms`, { params }).subscribe({
      next: (res) => {
        const page = res?.data;
        this.rooms = page?.content ?? [];
        this.totalElements = page?.totalElements ?? 0;
        this.totalPages = page?.totalPages ?? 0;
        this.hasSearched = true;
        this.loading = false;
      },
      error: () => {
        this.rooms = [];
        this.totalElements = 0;
        this.totalPages = 0;
        this.hasSearched = true;
        this.loading = false;
      },
    });
  }

  // ── Khi bấm "Áp dụng bộ lọc" ────────────────────
  search(resetPage = true) {
    if (resetPage) this.currentPage = 0;

    let params = new HttpParams();
    if (this.city) params = params.set('city', this.city);
    if (this.district) params = params.set('district', this.district);
    if (this.roomType) params = params.set('roomType', this.roomType);
    if (this.priceMin != null)
      params = params.set('priceMin', (this.priceMin * 1_000_000).toString());
    if (this.priceMax != null)
      params = params.set('priceMax', (this.priceMax * 1_000_000).toString());
    if (this.areaMin != null) params = params.set('areaMin', this.areaMin.toString());
    if (this.areaMax != null) params = params.set('areaMax', this.areaMax.toString());
    if (this.amenities.length) params = params.set('amenities', this.amenities.join(','));
    if (this.sortOrder) params = params.set('sort', this.sortOrder);
    if (this.minRating != null) params = params.set('minRating', this.minRating.toString());

    this.fetchRooms(params);
  }

  // ── Pagination ────────────────────────────────────
  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.search(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPageRange(): number[] {
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(0, this.currentPage - half);
    let end = Math.min(this.totalPages - 1, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(0, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ── Navigation ────────────────────────────────────
  viewRoom(id: number) {
    this.router.navigate(['/room-detail', id]);
  }

  contactRoom(room: any) {
    this.router.navigate(['/chat'], {
      queryParams: {
        roomId: room.roomId,
        receiverId: room.landlordId,
        partnerName: room.landlordName,
        partnerAvatar: room.landlordAvatar,
      },
    });
  }

  // ── Filter helpers ────────────────────────────────
  onCityChange() {
    this.district = '';
  }

  toggleAmenity(amenity: string) {
    const i = this.amenities.indexOf(amenity);
    if (i > -1) this.amenities.splice(i, 1);
    else this.amenities.push(amenity);
  }

  isAmenitySelected(amenity: string): boolean {
    return this.amenities.includes(amenity);
  }

  resetFilters() {
    this.city = '';
    this.district = '';
    this.priceMin = null;
    this.priceMax = null;
    this.areaMin = null;
    this.areaMax = null;
    this.roomType = '';
    this.amenities = [];
    this.sortOrder = 'newest';
    this.minRating = null;
    this.currentPage = 0;
    this.fetchRooms(new HttpParams());
  }

  getDistricts(): string[] {
    return this.districts[this.city] || [];
  }

  // ── Display helpers ───────────────────────────────
  formatPrice(price: number): string {
    if (price >= 1_000_000) {
      const m = price / 1_000_000;
      return m % 1 === 0 ? `${m}tr` : `${m.toFixed(1)}tr`;
    }
    return `${(price / 1000).toFixed(0)}k`;
  }

  formatFurnish(level: string): string {
    const map: { [key: string]: string } = {
      'fully-furnished': 'Full nội thất',
      'semi-furnished': 'Nội thất cơ bản',
      unfurnished: 'Không nội thất',
    };
    return map[level] || level || 'Chưa cập nhật';
  }
}
