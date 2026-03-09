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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    this.roomForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      pricePerMonth: [null, [Validators.required, Validators.min(1)]],
      depositAmount: [null],
      areaSize: [null],
      furnishLevel: [''],
    });

    this.locationForm = this.fb.group({
      streetName: ['', Validators.required],
      houseNumber: [''],
    });

    this.loadCities();
    this.loadAmenities();
  }

  // ── Amenities ─────────────────────────────────────────────────
  loadAmenities() {
    this.http.get<any>(`${environment.apiUrl}/amenities`).subscribe({
      next: (res) => {
        this.amenities = res.data || [];
        console.log('Loaded amenities:', this.amenities);
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
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviews.push(e.target?.result as string);
        this.imageFiles.push(file);
      };
      reader.readAsDataURL(file);
    });
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
    this.http.get<any[]>('/province-api/api/v1/p/').subscribe((data) => (this.cities = data));
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
    this.http.get<any>(`/province-api/api/v1/p/${city.code}?depth=2`).subscribe((data) => {
      this.districts = data.districts;
      this.wards = [];
    });
  }

  selectDistrict(district: any) {
    this.selectedDistrict = district;
    this.selectedWard = null;
    this.openLocDropdown = null;
    this.http.get<any>(`/province-api/api/v1/d/${district.code}?depth=2`).subscribe((data) => {
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

    // Init map
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initMap(), 300);
    }
  }

  async initMap() {
    if (this.map) return;
    this.L = await import('leaflet');
    this.map = this.L.map('postRoomMap').setView([21.0285, 105.8542], 14);
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);
  }

  // ── Submit ────────────────────────────────────────────────────
  async submitRoom() {
    this.submitted = true;
    this.roomForm.markAllAsTouched();

    if (this.roomForm.invalid || !this.fullAddress || this.imageFiles.length === 0) {
      this.errorMsg = 'Vui lòng điền đầy đủ thông tin bắt buộc';
      return;
    }

    this.submitLoading = true;
    this.errorMsg = '';

    try {
      // Upload images via POST /api/upload
      const imageUrls: string[] = [];
      for (const file of this.imageFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const res: any = await firstValueFrom(
          this.http.post(`${environment.apiUrl}/upload`, formData),
        );
        imageUrls.push(res.url);
      }

      const payload = {
        ...this.roomForm.value,
        address: this.locationForm.value.houseNumber
          ? `${this.locationForm.value.houseNumber} ${this.locationForm.value.streetName}`
          : this.locationForm.value.streetName,
        cityName: this.selectedCity?.name,
        districtName: this.selectedDistrict?.name,
        wardName: this.selectedWard?.name,
        imageUrls,
        amenityIds: Array.from(this.selectedAmenityIds),
        customAmenities: this.customAmenities,
      };

      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/rooms`, payload));
      this.router.navigate(['/rooms', res.data.roomId], {
        queryParams: { posted: 'success' },
      });
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Đăng tin thất bại. Vui lòng thử lại.';
    } finally {
      this.submitLoading = false;
    }
  }
}
