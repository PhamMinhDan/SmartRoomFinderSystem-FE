import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hero.component.html',
})
export class HeroComponent implements OnInit {
  cities: any[] = [];
  filteredCities: any[] = [];

  selectedCity: any = null;

  showCityDropdown = false;
  citySearch = '';

  roomTypes = [
    { value: '', label: 'Tất cả loại phòng' },
    { value: 'MOTEL', label: 'Phòng trọ' },
    { value: 'MINI_APARTMENT', label: 'Căn hộ mini' },
    { value: 'APARTMENT', label: 'Chung cư' },
  ];

  selectedRoomType = '';
  showRoomTypeDropdown = false;
  showPriceDropdown = false;

  selectedRoomTypeLabel = '';
  selectedPriceLabel = '';
  constructor(private locationService: LocationService) {}

  ngOnInit(): void {
    this.loadCities();
  }

  loadCities() {
    this.locationService.getCities().subscribe((res) => {
      this.cities = res;
      this.filteredCities = res;
    });
  }
  filterCities() {
    const keyword = this.citySearch.toLowerCase();

    this.filteredCities = this.cities.filter((c) => c.name.toLowerCase().includes(keyword));
  }

  selectCity(city: any) {
    this.selectedCity = city;
    this.showCityDropdown = false;
    this.citySearch = '';
    this.filteredCities = this.cities;
  }

  toggleCityDropdown() {
    this.showCityDropdown = !this.showCityDropdown;
  }

  @HostListener('document:click', ['$event'])
  closeDropdown(event: any) {
    if (!event.target.closest('.city-dropdown')) {
      this.showCityDropdown = false;
    }
  }
  priceRanges = [
    { label: 'Dưới 2 triệu', value: '0-2000000' },
    { label: '2 - 4 triệu', value: '2000000-4000000' },
    { label: '4 - 6 triệu', value: '4000000-6000000' },
    { label: '6 - 10 triệu', value: '6000000-10000000' },
    { label: 'Trên 10 triệu', value: '10000000+' },
  ];

  toggleRoomTypeDropdown() {
    this.showRoomTypeDropdown = !this.showRoomTypeDropdown;
  }

  togglePriceDropdown() {
    this.showPriceDropdown = !this.showPriceDropdown;
  }

  selectRoomType(type: any) {
    this.selectedRoomType = type.value;
    this.selectedRoomTypeLabel = type.label;
    this.showRoomTypeDropdown = false;
  }

  selectPrice(price: any) {
    this.selectedPriceLabel = price.label;
    this.showPriceDropdown = false;
  }
}
