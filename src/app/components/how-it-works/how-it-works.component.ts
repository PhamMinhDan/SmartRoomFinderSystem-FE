// how-it-works.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Step {
  number: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './how-it-works.component.html'
})
export class HowItWorksComponent {
  steps: Step[] = [
    {
      number: '01',
      icon: 'search',
      title: 'Tìm kiếm & lọc phòng',
      description: 'Sử dụng công cụ tìm kiếm thông minh để lọc theo vị trí, giá cả, và tiện nghi phù hợp với bạn',
      color: 'from-[#FF6B35] to-[#FF8C61]',
    },
    {
      number: '02',
      icon: 'eye',
      title: 'Xem ảnh, đánh giá & chat',
      description: 'Xem hình ảnh thực tế, đọc review từ người thuê trước và chat trực tiếp với chủ nhà',
      color: 'from-[#00A896] to-[#00C9B7]',
    },
    {
      number: '03',
      icon: 'phone',
      title: 'Liên hệ & xem phòng',
      description: 'Đặt lịch xem phòng trực tiếp, thỏa thuận và hoàn tất hợp đồng thuê',
      color: 'from-[#FFD60A] to-[#FFE347]',
    },
  ];

  getIconPath(icon: string): string {
    const icons: {[key: string]: string} = {
      'search': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      'eye': 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
      'phone': 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
    };
    return icons[icon] || '';
  }
}