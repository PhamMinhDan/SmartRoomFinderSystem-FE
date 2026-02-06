// featured-listings.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Listing {
  id: number;
  image: string;
  price: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  tags: string[];
  status: string;
  statusColor: string;
}

@Component({
  selector: 'app-featured-listings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './featured-listings.component.html'
})
export class FeaturedListingsComponent {
  listings: Listing[] = [
    {
      id: 1,
      image: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '3.5tr',
      title: 'Phòng trọ 25m² full nội thất gần ĐH Kinh tế',
      location: 'Cầu Giấy, Hà Nội',
      rating: 4.8,
      reviews: 24,
      tags: ['WiFi', 'Điều hòa', 'Gác lửng'],
      status: 'Còn trống',
      statusColor: 'bg-[#00A896]',
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '5.2tr',
      title: 'Căn hộ mini 35m² hiện đại, view đẹp',
      location: 'Quận 7, TP.HCM',
      rating: 4.9,
      reviews: 38,
      tags: ['WiFi', 'Bếp riêng', 'Ban công'],
      status: 'Hot',
      statusColor: 'bg-[#FF6B35]',
    },
    {
      id: 3,
      image: 'https://images.pexels.com/photos/1918291/pexels-photo-1918291.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '2.8tr',
      title: 'Phòng trọ sinh viên sạch sẽ, an ninh',
      location: 'Đống Đa, Hà Nội',
      rating: 4.6,
      reviews: 15,
      tags: ['WiFi', 'Nóng lạnh', 'Giờ tự do'],
      status: 'Còn trống',
      statusColor: 'bg-[#00A896]',
    },
    {
      id: 4,
      image: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '4.0tr',
      title: 'Phòng có gác 30m², gần Metro, siêu thị',
      location: 'Thanh Xuân, Hà Nội',
      rating: 4.7,
      reviews: 29,
      tags: ['WiFi', 'Điều hòa', 'Gác lửng'],
      status: 'Mới đăng',
      statusColor: 'bg-[#FFD60A] text-gray-800',
    },
    {
      id: 5,
      image: 'https://images.pexels.com/photos/1428348/pexels-photo-1428348.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '6.5tr',
      title: 'Studio 40m² full nội thất cao cấp',
      location: 'Bình Thạnh, TP.HCM',
      rating: 4.9,
      reviews: 42,
      tags: ['WiFi', 'Gym', 'Hồ bơi'],
      status: 'Hot',
      statusColor: 'bg-[#FF6B35]',
    },
    {
      id: 6,
      image: 'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=800',
      price: '3.2tr',
      title: 'Phòng đẹp gần BX Mỹ Đình, giá tốt',
      location: 'Nam Từ Liêm, Hà Nội',
      rating: 4.5,
      reviews: 18,
      tags: ['WiFi', 'Nóng lạnh', 'An ninh'],
      status: 'Còn trống',
      statusColor: 'bg-[#00A896]',
    },
  ];
}