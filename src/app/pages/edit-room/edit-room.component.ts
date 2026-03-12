import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LocationService } from '../../services/location.service';
import { ToastService } from '../../components/toast/toast.service';
import { firstValueFrom } from 'rxjs';

interface Amenity {
  amenityId: number;
  amenityName: string;
  iconUrl?: string;
  category?: string;
}

@Component({
  selector: 'app-edit-room',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './edit-room.component.html',
  styleUrls: ['../post-room/post-story/post-story.component.css'],
})
export class EditRoomComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('imageInput') imageInputRef!: ElementRef<HTMLInputElement>;

  // ── State ─────────────────────────────────────────────────────
  roomId!: number;
  loadingRoom = true;
  submitLoading = false;
  submitted = false;
  errorMsg = '';

  // ── Form ──────────────────────────────────────────────────────
  roomForm!: FormGroup;
  locationForm!: FormGroup;

  // ── Location modal ────────────────────────────────────────────
  showLocationModal = false;
  openLocDropdown: 'city' | 'district' | 'ward' | null = null;

  cities: any[] = [];
  districts: any[] = [];
  wards: any[] = [];
  selectedCity: any = null;
  selectedDistrict: any = null;
  selectedWard: any = null;
  citySearch = '';
  districtSearch = '';
  wardSearch = '';
  fullAddress = '';

  // ── Media ─────────────────────────────────────────────────────
  /** URL ảnh đã có trên server */
  existingImageUrls: string[] = [];
  /** File ảnh mới người dùng chọn thêm */
  newImageFiles: File[] = [];
  /** Preview blob URL cho file mới */
  newImagePreviews: string[] = [];
  imageError = '';

  /** Tổng preview = existing + new */
  get imagePreviews(): string[] {
    return [...this.existingImageUrls, ...this.newImagePreviews];
  }

  videoPreview: string | null = null;
  videoFile: File | null = null;
  videoUploading = false;
  videoProgress = 0;
  videoError = '';
  /** URL video đã có trên server (giữ lại nếu user không đổi) */
  existingVideoUrl: string | null = null;

  // ── Amenities ─────────────────────────────────────────────────
  amenities: Amenity[] = [];
  selectedAmenityIds: number[] = [];
  showCustomInput = false;
  customAmenityInput = '';
  customAmenities: string[] = [];

  // ── Map ───────────────────────────────────────────────────────
  private map: any = null;
  private marker: any = null;
  private readonly MAPBOX_TOKEN =
    'pk.eyJ1IjoibHVvbmcyMyIsImEiOiJjbW1raDNueWcxZGJ3MnFwemg1aTI2cXF1In0.P4Zv9Up4zZaXXn7wG3ue4g';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private locationService: LocationService,
    private toastService: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    this.roomId = Number(this.route.snapshot.paramMap.get('id'));

    this.roomForm = this.fb.group({
      title: ['', Validators.required],
      pricePerMonth: [null, Validators.required],
      depositAmount: [null],
      description: [''],
      areaSize: [null],
      roomType: [''],
      capacity: [1],
      furnishLevel: [''],
      availableFrom: [null],
    });

    this.locationForm = this.fb.group({
      streetName: ['', Validators.required],
      houseNumber: [''],
    });

    // Load danh sách tỉnh/thành trước, rồi load room (preselect cần cities[])
    this.locationService.getCities().subscribe((data) => {
      this.cities = data;
      this.loadRoom();
    });

    this.loadAmenities();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // ── Load dữ liệu phòng hiện tại ───────────────────────────────
  loadRoom(): void {
    this.http.get<any>(`${environment.apiUrl}/rooms/${this.roomId}`).subscribe({
      next: (res) => {
        const r = res?.data ?? res;
        if (!r) {
          this.loadingRoom = false;
          return;
        }

        // Patch form fields
        this.roomForm.patchValue({
          title: r.title ?? '',
          pricePerMonth: r.pricePerMonth ?? null,
          depositAmount: r.depositAmount ?? null,
          description: r.description ?? '',
          areaSize: r.areaSize ?? null,
          roomType: r.roomType ?? '',
          capacity: r.capacity ?? 1,
          furnishLevel: r.furnishLevel ?? '',
          availableFrom: r.availableFrom ?? null,
        });

        // Địa chỉ hiển thị
        const parts = [r.address, r.wardName, r.districtName, r.cityName].filter(Boolean);
        this.fullAddress = parts.join(', ');

        // Patch locationForm để modal hiện đúng giá trị
        const addrParts = (r.address ?? '').split(' ');
        const houseNumber = /^\d/.test(addrParts[0]) ? addrParts[0] : '';
        const streetName = houseNumber ? addrParts.slice(1).join(' ') : (r.address ?? '');
        this.locationForm.patchValue({ streetName, houseNumber });

        // Preselect city/district/ward
        this.preselectLocation(r.cityName, r.districtName, r.wardName);

        // Phân loại media (ảnh vs video)
        if (r.images?.length) {
          r.images.forEach((img: any) => {
            const url: string = img.imageUrl ?? '';
            if (url.includes('/video/upload/') || /\.(mp4|webm|mov)$/i.test(url)) {
              this.existingVideoUrl = url;
              this.videoPreview = url;
            } else {
              this.existingImageUrls.push(url);
            }
          });
        }

        // Tiện ích đã chọn
        if (r.amenities?.length) {
          this.selectedAmenityIds = r.amenities.map((a: any) => a.amenityId);
        }

        this.loadingRoom = false;
        setTimeout(() => this.initMap(), 300);
      },
      error: () => {
        this.errorMsg = 'Không tải được dữ liệu phòng.';
        this.loadingRoom = false;
      },
    });
  }

  /** Preselect dropdown dựa vào tên thành phố/quận/phường */
  private preselectLocation(cityName: string, districtName: string, wardName: string): void {
    const city = this.cities.find((c) => c.name === cityName);
    if (!city) return;
    this.selectedCity = city;

    this.locationService.getDistricts(city.code).subscribe((res) => {
      this.districts = res.districts ?? res ?? [];
      const dist = this.districts.find((d: any) => d.name === districtName);
      if (!dist) return;
      this.selectedDistrict = dist;

      this.locationService.getWards(dist.code).subscribe((wRes) => {
        this.wards = wRes.wards ?? wRes ?? [];
        const ward = this.wards.find((w: any) => w.name === wardName);
        if (ward) this.selectedWard = ward;
      });
    });
  }

  loadAmenities(): void {
    this.http.get<any>(`${environment.apiUrl}/amenities`).subscribe({
      next: (res) => {
        this.amenities = res?.data ?? res ?? [];
      },
      error: () => {},
    });
  }

  // ── Location modal ────────────────────────────────────────────
  openLocationModal(): void {
    this.showLocationModal = true;
  }
  closeLocationModal(): void {
    this.showLocationModal = false;
    this.openLocDropdown = null;
  }

  toggleLocDropdown(type: 'city' | 'district' | 'ward'): void {
    this.openLocDropdown = this.openLocDropdown === type ? null : type;
  }

  filteredCities(): any[] {
    return this.cities.filter((c) => c.name.toLowerCase().includes(this.citySearch.toLowerCase()));
  }
  filteredDistricts(): any[] {
    return this.districts.filter((d) =>
      d.name.toLowerCase().includes(this.districtSearch.toLowerCase()),
    );
  }
  filteredWards(): any[] {
    return this.wards.filter((w) => w.name.toLowerCase().includes(this.wardSearch.toLowerCase()));
  }

  selectCity(city: any): void {
    this.selectedCity = city;
    this.selectedDistrict = null;
    this.selectedWard = null;
    this.districts = [];
    this.wards = [];
    this.openLocDropdown = null;
    this.citySearch = '';
    this.locationService.getDistricts(city.code).subscribe((res) => {
      this.districts = res.districts ?? res ?? [];
    });
  }

  selectDistrict(d: any): void {
    this.selectedDistrict = d;
    this.selectedWard = null;
    this.wards = [];
    this.openLocDropdown = null;
    this.districtSearch = '';
    this.locationService.getWards(d.code).subscribe((res) => {
      this.wards = res.wards ?? res ?? [];
    });
  }

  selectWard(w: any): void {
    this.selectedWard = w;
    this.openLocDropdown = null;
    this.wardSearch = '';
  }

  confirmLocation(): void {
    if (!this.selectedCity || !this.selectedDistrict || !this.selectedWard) return;
    if (this.locationForm.get('streetName')?.invalid) {
      this.locationForm.markAllAsTouched();
      return;
    }

    const { streetName, houseNumber } = this.locationForm.value;
    const streetParts = [houseNumber, streetName].filter(Boolean);
    this.fullAddress = [
      streetParts.join(' '),
      this.selectedWard.name,
      this.selectedDistrict.name,
      this.selectedCity.name,
    ].join(', ');

    this.closeLocationModal();
    setTimeout(() => this.initMap(), 200);
  }

  // ── Mapbox ────────────────────────────────────────────────────
  initMap(): void {
    if (!isPlatformBrowser(this.platformId) || !this.fullAddress) return;
    const el = document.getElementById('editRoomMap');
    if (!el) return;

    const geocodeUrl =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(this.fullAddress)}.json` +
      `?access_token=${this.MAPBOX_TOKEN}&country=vn&limit=1`;

    this.http.get<any>(geocodeUrl).subscribe((res) => {
      const coords = res?.features?.[0]?.center;
      if (!coords) return;
      const [lng, lat] = coords;

      import('mapbox-gl').then((mapboxgl) => {
        if (this.map) {
          this.map.remove();
          this.map = null;
        }
        (mapboxgl as any).default.accessToken = this.MAPBOX_TOKEN;
        this.map = new (mapboxgl as any).default.Map({
          container: 'editRoomMap',
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [lng, lat],
          zoom: 15,
        });
        this.map.on('load', () => {
          this.marker = new (mapboxgl as any).default.Marker({ color: '#00C897' })
            .setLngLat([lng, lat])
            .addTo(this.map);
        });
      });
    });
  }

  // ── Media ─────────────────────────────────────────────────────
  triggerImageInput(): void {
    this.imageInputRef?.nativeElement.click();
  }

  onImagesSelect(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    const total = this.existingImageUrls.length + this.newImageFiles.length + files.length;
    if (total > 10) {
      this.imageError = 'Tối đa 10 ảnh';
      return;
    }
    this.imageError = '';
    files.forEach((file) => {
      this.newImageFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e) => this.newImagePreviews.push(e.target?.result as string);
      reader.readAsDataURL(file);
    });
    (event.target as HTMLInputElement).value = '';
  }

  removeImage(index: number, event: Event): void {
    event.stopPropagation();
    const existCount = this.existingImageUrls.length;
    if (index < existCount) {
      this.existingImageUrls.splice(index, 1);
    } else {
      const newIdx = index - existCount;
      this.newImageFiles.splice(newIdx, 1);
      this.newImagePreviews.splice(newIdx, 1);
    }
  }

  onVideoSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      this.videoError = 'Video tối đa 20MB';
      return;
    }
    this.videoError = '';
    this.videoFile = file;
    this.videoPreview = URL.createObjectURL(file);
    this.existingVideoUrl = null; // dùng file mới thay thế
  }

  // ── Amenities ─────────────────────────────────────────────────
  isAmenitySelected(id: number): boolean {
    return this.selectedAmenityIds.includes(id);
  }

  toggleAmenity(id: number): void {
    const i = this.selectedAmenityIds.indexOf(id);
    i > -1 ? this.selectedAmenityIds.splice(i, 1) : this.selectedAmenityIds.push(id);
  }

  addCustomAmenity(): void {
    const v = this.customAmenityInput.trim();
    if (v) {
      this.customAmenities.push(v);
      this.customAmenityInput = '';
      this.showCustomInput = false;
    }
  }

  removeCustomAmenity(i: number): void {
    this.customAmenities.splice(i, 1);
  }

  // ── Submit (PUT /api/rooms/{id}) ──────────────────────────────
  async submitRoom(): Promise<void> {
    this.submitted = true;
    this.errorMsg = '';

    if (this.roomForm.invalid || !this.fullAddress) {
      this.roomForm.markAllAsTouched();
      return;
    }

    this.submitLoading = true;

    try {
      // Upload ảnh mới lên Cloudinary
      const uploadedNewUrls: string[] = [];
      for (const file of this.newImageFiles) {
        const url = await this.uploadFile(file);
        uploadedNewUrls.push(url);
      }

      // Upload video mới nếu có
      let videoUrl: string | null = this.existingVideoUrl;
      if (this.videoFile) {
        videoUrl = await this.uploadFile(this.videoFile);
      }

      // Ghép tất cả media URL: ảnh cũ + ảnh mới + video
      const allMediaUrls = [...this.existingImageUrls, ...uploadedNewUrls];
      if (videoUrl) allMediaUrls.push(videoUrl);

      const { streetName, houseNumber } = this.locationForm.value;
      const address = [houseNumber, streetName].filter(Boolean).join(' ').trim();

      const fv = this.roomForm.value;
      const payload = {
        title: fv.title,
        pricePerMonth: fv.pricePerMonth,
        depositAmount: fv.depositAmount,
        description: fv.description,
        areaSize: fv.areaSize,
        roomType: fv.roomType,
        capacity: fv.capacity,
        furnishLevel: fv.furnishLevel,
        availableFrom: fv.availableFrom,
        address,
        wardName: this.selectedWard?.name ?? '',
        districtName: this.selectedDistrict?.name ?? '',
        cityName: this.selectedCity?.name ?? '',
        amenityIds: this.selectedAmenityIds,
        mediaUrls: allMediaUrls,
        // KHÔNG gửi displayUntil → backend giữ nguyên giá trị cũ
      };

      this.http.put<any>(`${environment.apiUrl}/rooms/${this.roomId}`, payload).subscribe({
        next: () => {
          this.toastService.show('✅ Cập nhật tin thành công!', 'success');
          this.router.navigate(['/my-posts']);
        },
        error: (err) => {
          this.errorMsg = err?.error?.message || 'Cập nhật thất bại, vui lòng thử lại.';
          this.submitLoading = false;
        },
      });
    } catch {
      this.errorMsg = 'Upload ảnh thất bại, vui lòng thử lại.';
      this.submitLoading = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/my-posts']);
  }

  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/upload`, formData));

    return res.url;
  }
}
