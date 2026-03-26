import { Component, OnInit, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import mapboxgl from 'mapbox-gl';
import { LocationService } from '../../../services/location.service';
import { ToastService } from '../../../components/toast/toast.service';
interface Amenity {
  amenityId: number;
  amenityName: string;
  iconUrl?: string;
  category?: string;
}

@Component({
  selector: 'app-post-room',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './post-story.component.html',
  styleUrls: ['./post-story.component.css'],
})
export class PostRoomComponent implements OnInit {
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

  roomForm!: FormGroup;
  locationForm!: FormGroup;
  submitted = false;
  submitLoading = false;
  errorMsg = '';

  // Images
  imagePreviews: string[] = [];
  imageFiles: File[] = [];
  videoFile: File | null = null;
  videoPreview: string | null = null;
  videoUploading = false;
  videoProgress = 0;

  imageError = '';
  videoError = '';

  // Location modal
  showLocationModal = false;
  openLocDropdown: string | null = null;
  fullAddress = '';

  cities: any[] = [];
  districts: any[] = [];
  wards: any[] = [];
  selectedCity: any = null;
  selectedDistrict: any = null;
  selectedWard: any = null;
  citySearch = '';
  districtSearch = '';
  wardSearch = '';

  // Amenities
  amenities: Amenity[] = [];
  selectedAmenityIds: Set<number> = new Set();
  customAmenities: string[] = [];
  customAmenityInput = '';
  showCustomInput = false;

  // Map
  private map: any;
  private L: any;
  private MAPBOX_TOKEN =
    'pk.eyJ1IjoibHVvbmcyMyIsImEiOiJjbW1raDNueWcxZGJ3MnFwemg1aTI2cXF1In0.P4Zv9Up4zZaXXn7wG3ue4g';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private locationService: LocationService,
    private authService: AuthService,
    private toastService: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    this.roomForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],

      pricePerMonth: [
        null,
        [
          Validators.required,
          Validators.min(1000),
          Validators.max(1000000000), // max 1 tỷ
          Validators.pattern(/^\d{1,10}$/), // tối đa 10 số
        ],
      ],

      depositAmount: [
        null,
        [Validators.min(0), Validators.max(1000000000), Validators.pattern(/^\d{1,10}$/)],
      ],

      areaSize: [null, [Validators.required, Validators.min(1), Validators.max(1000)]],

      roomType: ['', Validators.required],

      capacity: [1, [Validators.min(1), Validators.max(5)]],

      furnishLevel: [''],
    });

    this.locationForm = this.fb.group({
      streetName: ['', Validators.required],
      houseNumber: [''],
    });

    this.loadCities();
    this.loadAmenities();

    this.roomForm.valueChanges.subscribe(() => {
      this.errorMsg = '';
    });
  }

  // ── Amenities ─────────────────────────────────────────────────
  loadAmenities() {
    this.http.get<any>(`${environment.apiUrl}/amenities`).subscribe({
      next: (res) => {
        this.amenities = res.data || [];
      },
      error: (err) => {
        console.error('Amenity API error', err);
      },
    });
  }

  isAmenitySelected(id: number) {
    return this.selectedAmenityIds.has(id);
  }

  toggleAmenity(id: number) {
    if (this.selectedAmenityIds.has(id)) this.selectedAmenityIds.delete(id);
    else this.selectedAmenityIds.add(id);
  }

  addCustomAmenity() {
    const val = this.customAmenityInput.trim();
    if (val && !this.customAmenities.includes(val)) {
      this.customAmenities.push(val);
      this.customAmenityInput = '';
    }
  }

  removeCustomAmenity(i: number) {
    this.customAmenities.splice(i, 1);
  }

  // ── Images ────────────────────────────────────────────────────
  triggerImageInput() {
    this.imageInput.nativeElement.click();
  }

  onImagesSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    this.imageError = '';

    if (this.imageFiles.length + files.length > 10) {
      this.imageError = 'Chỉ được chọn tối đa 10 ảnh';
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        this.imageError = 'File phải là ảnh';
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        this.imagePreviews.push(e.target?.result as string);
        this.imageFiles.push(file);
      };

      reader.readAsDataURL(file);
    });
  }

  onVideoSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file) return;

    if (!file.type.startsWith('video/')) {
      this.videoError = 'File phải là video';
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      this.videoError = 'Video phải nhỏ hơn 20MB';
      return;
    }

    this.videoFile = file;
    this.videoPreview = URL.createObjectURL(file);
  }

  onImageDrop(event: DragEvent) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []);
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviews.push(e.target?.result as string);
        this.imageFiles.push(file);
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(i: number, e: Event) {
    e.stopPropagation();
    this.imagePreviews.splice(i, 1);
    this.imageFiles.splice(i, 1);
  }

  // ── Location ──────────────────────────────────────────────────
  loadCities() {
    this.locationService.getCities().subscribe((data) => {
      this.cities = data;
    });
  }

  openLocationModal() {
    this.showLocationModal = true;
  }
  closeLocationModal() {
    this.showLocationModal = false;
    this.openLocDropdown = null;
  }

  toggleLocDropdown(type: string) {
    this.openLocDropdown = this.openLocDropdown === type ? null : type;
  }

  selectCity(city: any) {
    this.selectedCity = city;
    this.selectedDistrict = null;
    this.selectedWard = null;
    this.openLocDropdown = null;
    this.locationService.getDistricts(city.code).subscribe((data) => {
      this.districts = data.districts;
      this.wards = [];
    });
  }

  selectDistrict(district: any) {
    this.selectedDistrict = district;
    this.selectedWard = null;
    this.openLocDropdown = null;
    this.locationService.getWards(district.code).subscribe((data) => {
      this.wards = data.wards;
    });
  }

  selectWard(ward: any) {
    this.selectedWard = ward;
    this.openLocDropdown = null;
  }

  filteredCities() {
    return this.cities.filter((c) => c.name.toLowerCase().includes(this.citySearch.toLowerCase()));
  }
  filteredDistricts() {
    return this.districts.filter((d) =>
      d.name.toLowerCase().includes(this.districtSearch.toLowerCase()),
    );
  }
  filteredWards() {
    return this.wards.filter((w) => w.name.toLowerCase().includes(this.wardSearch.toLowerCase()));
  }

  confirmLocation() {
    this.locationForm.markAllAsTouched();
    if (!this.selectedCity || !this.selectedDistrict || !this.selectedWard) return;
    if (this.locationForm.get('streetName')?.invalid) return;

    const parts = [
      this.locationForm.value.houseNumber,
      this.locationForm.value.streetName,
      this.selectedWard.name,
      this.selectedDistrict.name,
      this.selectedCity.name,
    ].filter(Boolean);

    this.fullAddress = parts.join(', ');
    this.closeLocationModal();

    setTimeout(() => {
      this.initMap();
    }, 200);
  }

  async initMap() {
    if (!this.fullAddress) return;

    mapboxgl.accessToken = this.MAPBOX_TOKEN;

    if (!this.map) {
      this.map = new mapboxgl.Map({
        container: 'postRoomMap',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [105.8542, 21.0285],
        zoom: 14,
      });
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(this.fullAddress)}.json?access_token=${this.MAPBOX_TOKEN}`;

    this.http.get<any>(url).subscribe((res) => {
      const feature = res.features?.[0];
      if (!feature) return;

      const [lng, lat] = feature.center;

      this.map.flyTo({
        center: [lng, lat],
        zoom: 16,
      });

      new mapboxgl.Marker({ color: '#e11d48' }).setLngLat([lng, lat]).addTo(this.map);
    });
  }

  // ── Submit ────────────────────────────────────────────────────
  async submitRoom() {
    this.submitted = true;
    this.roomForm.markAllAsTouched();

    const error = this.validateForm();

    if (error) {
      this.errorMsg = error;
      return;
    }

    this.submitLoading = true;
    this.errorMsg = '';

    try {
      // Upload images via POST /api/upload
      const mediaUrls: string[] = [];
      const uploadTasks = this.imageFiles.map((file) => {
        const formData = new FormData();
        formData.append('file', file);

        return firstValueFrom(this.http.post(`${environment.apiUrl}/upload`, formData));
      });

      const results: any[] = await Promise.all(uploadTasks);

      results.forEach((r) => mediaUrls.push(r.url));

      if (this.videoFile) {
        const formData = new FormData();
        formData.append('file', this.videoFile);

        const res: any = await firstValueFrom(
          this.http.post(`${environment.apiUrl}/upload`, formData),
        );

        mediaUrls.push(res.url);
      }

      const payload = {
        ...this.roomForm.value,
        address: this.locationForm.value.houseNumber
          ? `${this.locationForm.value.houseNumber} ${this.locationForm.value.streetName}`
          : this.locationForm.value.streetName,
        cityName: this.selectedCity?.name,
        districtName: this.selectedDistrict?.name,
        wardName: this.selectedWard?.name,
        mediaUrls,
        amenityIds: Array.from(this.selectedAmenityIds),
        customAmenities: this.customAmenities,
      };

      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/rooms`, payload));
      this.toastService.show('Đăng tin thành công !', 'success');

      setTimeout(() => {
        this.router.navigate(['/my-posts']);
      }, 500);
    } catch (err: any) {
      console.error('Submit error:', err);

      if (err?.error?.message) {
        this.errorMsg = err.error.message;
      } else if (err?.error?.errors) {
        this.errorMsg = Object.values(err.error.errors).join(', ');
      } else {
        this.errorMsg = 'Dữ liệu không hợp lệ (có thể số quá lớn)';
      }
    } finally {
      this.submitLoading = false;
    }
  }

  validateForm(): string {
    const f = this.roomForm;

    if (f.get('title')?.invalid) {
      return 'Vui lòng nhập tiêu đề';
    }

    if (f.get('pricePerMonth')?.errors?.['required']) {
      return 'Vui lòng nhập giá thuê';
    }

    if (f.get('pricePerMonth')?.errors?.['max']) {
      return 'Giá thuê quá lớn (tối đa 1 tỷ)';
    }

    if (f.get('pricePerMonth')?.errors?.['pattern']) {
      return 'Giá thuê không hợp lệ';
    }

    if (f.get('depositAmount')?.errors?.['max']) {
      return 'Tiền cọc quá lớn';
    }

    if (f.get('areaSize')?.errors?.['min']) {
      return 'Diện tích phải lớn hơn 0';
    }

    if (!this.fullAddress) {
      return 'Vui lòng chọn địa chỉ';
    }

    if (this.imageFiles.length === 0) {
      return 'Vui lòng chọn ít nhất 1 ảnh';
    }

    return '';
  }
}
