import {
  Component,
  OnInit,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
} from '@angular/forms';
import { AuthService, UserResponse } from '../../services/auth.service';
import { AddressService, AddressResponse } from '../../services/address.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit, AfterViewInit {
  user: UserResponse | null = null;
  loading = true;

  // Address
  address: AddressResponse | null = null;
  addressForm!: FormGroup;
  showAddressForm = false;
  addressLoading = false;
  addressError = '';
  addressSuccess = '';

  // Map
  map: any;
  marker: any;
  private L: any;
  private redIcon: any;

  cities: any[] = [];
  districts: any[] = [];
  wards: any[] = [];

  selectedCity: any;
  selectedDistrict: any;
  selectedWard: any;

  citySearch = '';
  districtSearch = '';
  wardSearch = '';

  showCityDropdown = false;
  showDistrictDropdown = false;
  showWardDropdown = false;

  constructor(
    private authService: AuthService,
    private addressService: AddressService,
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    this.buildAddressForm();
    this.loadCities();

    this.authService.currentUser.subscribe((user) => {
      this.user = user;
      if (user) {
        this.loading = false;
        this.syncAddressFromUser(user);
      }
    });

    if (!this.authService.currentUserValue) {
      if (!this.authService.isLoggedIn()) {
        this.loading = false;
        this.router.navigate(['/']);
        return;
      }

      this.authService.getCurrentUser().subscribe({
        next: (res) => {
          this.user = res.data;
          this.loading = false;
          this.syncAddressFromUser(res.data);
        },
        error: () => {
          this.loading = false;
          this.router.navigate(['/']);
        },
      });
    }

    this.loadAddress();
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent) {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);

    if (!clickedInside) {
      this.showCityDropdown = false;
      this.showDistrictDropdown = false;
      this.showWardDropdown = false;
    }
  }

  loadCities() {
    this.http.get<any[]>('/province-api/api/v1/p/').subscribe((data) => {
      this.cities = data;
    });
  }

  loadDistricts(cityCode: number) {
    this.http.get<any>(`/province-api/api/v1/p/${cityCode}?depth=2`).subscribe((data) => {
      this.districts = data.districts;
      this.wards = [];
    });
  }

  loadWards(districtCode: number) {
    this.http.get<any>(`/province-api/api/v1/d/${districtCode}?depth=2`).subscribe((data) => {
      this.wards = data.wards;
    });
  }

  toggleCityDropdown() {
    this.showCityDropdown = !this.showCityDropdown;

    this.showDistrictDropdown = false;
    this.showWardDropdown = false;
  }

  toggleDistrictDropdown() {
    if (!this.selectedCity) return;

    this.showDistrictDropdown = !this.showDistrictDropdown;
    this.showCityDropdown = false;
    this.showWardDropdown = false;
  }

  toggleWardDropdown() {
    if (!this.selectedDistrict) return;

    this.showWardDropdown = !this.showWardDropdown;
    this.showCityDropdown = false;
    this.showDistrictDropdown = false;
  }

  selectCity(city: any) {
    this.selectedCity = city;
    this.selectedDistrict = null;
    this.selectedWard = null;

    this.showCityDropdown = false;

    this.addressForm.patchValue({
      cityName: city.name,
      districtName: '',
      wardName: '',
    });

    this.loadDistricts(city.code);
  }

  selectDistrict(district: any) {
    this.selectedDistrict = district;
    this.selectedWard = null;

    this.showDistrictDropdown = false;

    this.addressForm.patchValue({
      districtName: district.name,
      wardName: '',
    });

    this.loadWards(district.code);
  }

  selectWard(ward: any) {
    this.selectedWard = ward;

    this.showWardDropdown = false;

    this.addressForm.patchValue({
      wardName: ward.name,
    });
  }

  filteredCities() {
    return this.cities.filter((city) =>
      city.name.toLowerCase().includes(this.citySearch.toLowerCase()),
    );
  }

  filteredDistricts() {
    return this.districts.filter((d) =>
      d.name.toLowerCase().includes(this.districtSearch.toLowerCase()),
    );
  }

  filteredWards() {
    return this.wards.filter((w) => w.name.toLowerCase().includes(this.wardSearch.toLowerCase()));
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.initMap(21.0285, 105.8542);

    if (this.address?.latitude != null && this.address?.longitude != null) {
      this.setMarker(
        this.address.latitude,
        this.address.longitude,
        this.buildDisplayAddress(this.address),
      );
    } else {
      console.log(' [DB] Không có tọa độ trong database, dùng mặc định Hà Nội: 21.0285, 105.8542');
    }
  }

  buildAddressForm() {
    this.addressForm = this.fb.group({
      streetAddress: ['', Validators.required],
      cityName: ['', Validators.required],
      districtName: ['', Validators.required],
      wardName: ['', Validators.required],
    });
  }

  syncAddressFromUser(user: UserResponse) {
    if (user.address) {
      this.address = user.address;
      this.addressForm.patchValue({
        streetAddress: user.address.street_address,
        cityName: user.address.city_name,
        districtName: user.address.district_name,
        wardName: user.address.ward_name,
      });

      if (user.address.latitude != null && user.address.longitude != null && this.map && this.L) {
        this.setMarker(
          user.address.latitude,
          user.address.longitude,
          this.buildDisplayAddress(user.address),
        );
      } else {
      }
    } else {
      this.address = null;
      console.log(' [SYNC] User không có address trong DB');
    }
  }

  loadAddress() {
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.syncAddressFromUser(currentUser);
    }
  }

  openAddressForm() {
    this.addressError = '';
    this.addressSuccess = '';
    if (this.address) {
      this.addressForm.patchValue({
        streetAddress: this.address.street_address,
        cityName: this.address.city_name,
        districtName: this.address.district_name,
        wardName: this.address.ward_name,
      });

      // Restore selected city
      const city = this.cities.find((c) => c.name === this.address!.city_name);
      if (city) {
        this.selectedCity = city;
        // Load districts then restore selected district & ward
        this.http.get<any>(`/province-api/api/v1/p/${city.code}?depth=2`).subscribe((data) => {
          this.districts = data.districts;
          const district = this.districts.find((d) => d.name === this.address!.district_name);
          if (district) {
            this.selectedDistrict = district;
            this.http
              .get<any>(`/province-api/api/v1/d/${district.code}?depth=2`)
              .subscribe((wardData) => {
                this.wards = wardData.wards;
                const ward = this.wards.find((w) => w.name === this.address!.ward_name);
                if (ward) {
                  this.selectedWard = ward;
                }
              });
          }
        });
      }
    } else {
      // New address — reset selections
      this.selectedCity = null;
      this.selectedDistrict = null;
      this.selectedWard = null;
      this.districts = [];
      this.wards = [];
    }
    this.showAddressForm = true;
  }

  closeAddressForm() {
    this.showAddressForm = false;
    this.addressError = '';
    this.addressSuccess = '';

    this.addressForm.reset();

    this.selectedCity = null;
    this.selectedDistrict = null;
    this.selectedWard = null;

    this.citySearch = '';
    this.districtSearch = '';
    this.wardSearch = '';

    this.districts = [];
    this.wards = [];
  }

  submitAddress() {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.addressLoading = true;
    this.addressError = '';
    this.addressSuccess = '';

    this.addressService.upsertAddress(this.addressForm.value).subscribe({
      next: (saved) => {
        this.address = saved;
        this.addressLoading = false;
        this.addressSuccess = 'Cập nhật địa chỉ thành công!';
        if (saved.latitude != null && saved.longitude != null) {
          this.setMarker(saved.latitude, saved.longitude, this.buildDisplayAddress(saved));
        }
        this.authService.getCurrentUser().subscribe();

        setTimeout(() => {
          this.closeAddressForm();
        }, 1000);
      },
      error: (err) => {
        this.addressLoading = false;
        this.addressError = err?.error?.message || 'Cập nhật thất bại. Vui lòng thử lại.';
      },
    });
  }

  deleteAddress() {
    if (!confirm('Bạn có chắc muốn xóa địa chỉ này không?')) return;

    this.addressService.deleteAddress().subscribe({
      next: () => {
        this.address = null;
        this.addressForm.reset();
        this.showAddressForm = false;
        this.initMap(21.0285, 105.8542);
        this.authService.getCurrentUser().subscribe();
      },
      error: (err) => {
        this.addressError = err?.error?.message || 'Xóa thất bại.';
      },
    });
  }

  buildDisplayAddress(addr: AddressResponse): string {
    return [addr.street_address, addr.ward_name, addr.district_name, addr.city_name]
      .filter(Boolean)
      .join(', ');
  }

  async initMap(lat: number, lng: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.L = await import('leaflet');

    this.redIcon = this.L.icon({
      iconUrl:
        'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [40, 40],
    });

    if (this.map) {
      this.map.setView([lat, lng], 15);
      return;
    }

    this.map = this.L.map('profileMap').setView([lat, lng], 15);

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.marker = this.L.marker([lat, lng], { icon: this.redIcon })
      .addTo(this.map)
      .bindPopup('Vị trí của bạn')
      .openPopup();
  }

  setMarker(lat: number, lng: number, text: string) {
    if (!this.map || !this.L) return;

    this.map.setView([lat, lng], 15);

    if (this.marker) {
      this.map.removeLayer(this.marker);
    }

    this.marker = this.L.marker([lat, lng], { icon: this.redIcon })
      .addTo(this.map)
      .bindPopup(text)
      .openPopup();
  }

  useCurrentLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.setMarker(
          position.coords.latitude,
          position.coords.longitude,
          'Vị trí hiện tại của bạn',
        );
      },
      () => {
        console.log('User từ chối location');
      },
    );
  }

  display(value: any): string {
    if (value === null || value === undefined || value === '') {
      return 'Chưa cập nhật';
    }
    return String(value);
  }
}
