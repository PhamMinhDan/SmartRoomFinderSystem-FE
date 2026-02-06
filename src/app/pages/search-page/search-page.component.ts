// search-page.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Listing {
  id: number;
  image: string;
  price: string;
  title: string;
  location: string;
  distance: string;
  rating: number;
  reviews: number;
  tags: string[];
  owner: string;
  verified: boolean;
  status: string;
  area: number;
}

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-page.component.html'
})
export class SearchPageComponent {
  view: 'grid' | 'list' = 'grid';
  city = 'Hà Nội';
  district = '';
  priceMin = 2;
  priceMax = 10;
  areaMin = 10;
  areaMax = 100;
  roomType = '';
  amenities: string[] = [];

  districts: { [key: string]: string[] } = {
    'Hà Nội': ['Cầu Giấy', 'Đống Đa', 'Thanh Xuân', 'Hoàng Mai', 'Long Biên', 'Ba Đình'],
    'TP.HCM': ['Quận 1', 'Quận 7', 'Bình Thạnh', 'Tân Bình', 'Phú Nhuận', 'Gò Vấp'],
    'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Liên Chiểu', 'Ngũ Hành Sơn']
  };

  amenitiesList = [
    'Điều hòa', 'Nóng lạnh', 'Wifi miễn phí', 'Giờ tự do',
    'Gác lửng', 'Ban công', 'Bếp riêng', 'Máy giặt', 'Camera an ninh'
  ];

  listings: Listing[] = [
    {
      id: 1,
      image: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '3.5tr',
      title: 'Phòng trọ 25m² full nội thất gần ĐH Kinh tế',
      location: 'Cầu Giấy, Hà Nội',
      distance: '2.5km tới trung tâm',
      rating: 4.8,
      reviews: 24,
      tags: ['WiFi', 'Điều hòa', 'Gác lửng'],
      owner: 'Anh Minh',
      verified: true,
      status: 'Còn trống',
      area: 25
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '5.2tr',
      title: 'Căn hộ mini 35m² hiện đại, view đẹp',
      location: 'Quận 7, TP.HCM',
      distance: '1.8km tới trung tâm',
      rating: 4.9,
      reviews: 38,
      tags: ['WiFi', 'Bếp riêng', 'Ban công'],
      owner: 'Chị Lan',
      verified: true,
      status: 'Hot',
      area: 35
    },
    {
      id: 3,
      image: 'https://images.pexels.com/photos/1918291/pexels-photo-1918291.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '2.8tr',
      title: 'Phòng trọ sinh viên sạch sẽ, an ninh',
      location: 'Đống Đa, Hà Nội',
      distance: '1.2km tới BX',
      rating: 4.6,
      reviews: 15,
      tags: ['WiFi', 'Nóng lạnh', 'Giờ tự do'],
      owner: 'Anh Tuấn',
      verified: false,
      status: 'Còn trống',
      area: 20
    },
    {
      id: 4,
      image: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '4.0tr',
      title: 'Phòng có gác 30m², gần Metro, siêu thị',
      location: 'Thanh Xuân, Hà Nội',
      distance: '0.8km tới Metro',
      rating: 4.7,
      reviews: 29,
      tags: ['WiFi', 'Điều hòa', 'Gác lửng'],
      owner: 'Chị Hương',
      verified: true,
      status: 'Mới hôm nay',
      area: 30
    },
    {
      id: 5,
      image: 'https://images.pexels.com/photos/1428348/pexels-photo-1428348.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '6.5tr',
      title: 'Studio 40m² full nội thất cao cấp',
      location: 'Bình Thạnh, TP.HCM',
      distance: '3.2km',
      rating: 4.9,
      reviews: 42,
      tags: ['WiFi', 'Gym', 'Hồ bơi'],
      owner: 'Anh Phát',
      verified: true,
      status: 'Hot',
      area: 40
    },
    {
      id: 6,
      image: 'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '3.2tr',
      title: 'Phòng đẹp gần BX Mỹ Đình, giá tốt',
      location: 'Nam Từ Liêm, Hà Nội',
      distance: '2.1km tới BX',
      rating: 4.5,
      reviews: 18,
      tags: ['WiFi', 'Nóng lạnh', 'An ninh'],
      owner: 'Anh Hùng',
      verified: true,
      status: 'Còn trống',
      area: 22
    }
  ];

  toggleAmenity(amenity: string): void {
    const index = this.amenities.indexOf(amenity);
    if (index > -1) {
      this.amenities.splice(index, 1);
    } else {
      this.amenities.push(amenity);
    }
  }

  isAmenitySelected(amenity: string): boolean {
    return this.amenities.includes(amenity);
  }

  resetFilters(): void {
    this.district = '';
    this.priceMin = 2;
    this.priceMax = 10;
    this.areaMin = 10;
    this.areaMax = 100;
    this.roomType = '';
    this.amenities = [];
  }

  getDistricts(): string[] {
    return this.districts[this.city] || [];
  }

  createRange(n: number): number[] {
    return Array(n).fill(0).map((_, i) => i + 1);
  }
}