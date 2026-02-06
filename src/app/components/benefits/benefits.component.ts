import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Benefit {
  icon: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

@Component({
  selector: 'app-benefits',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Tại sao chọn <span class="text-[#FF6B35]">RoomFinder</span>?
          </h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Nền tảng tìm trọ hiện đại, minh bạch và đáng tin cậy nhất Việt Nam
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div *ngFor="let benefit of benefits"
            class="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div [ngClass]="[benefit.bgColor, benefit.color]" 
              class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="getIconPath(benefit.icon)"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-3 text-center">
              {{ benefit.title }}
            </h3>
            <p class="text-gray-600 text-center leading-relaxed">
              {{ benefit.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BenefitsComponent {
  benefits: Benefit[] = [
    {
      icon: 'shield',
      title: 'Minh bạch thông tin',
      description: 'Mọi tin đăng đều được kiểm duyệt kỹ lưỡng. Không tin ảo, không giá ảo.',
      color: 'text-[#00A896]',
      bgColor: 'bg-[#00A896]/10',
    },
    {
      icon: 'star',
      title: 'Đánh giá từ người thuê thật',
      description: 'Hệ thống review chân thực từ người dùng thực tế, giúp bạn quyết định đúng đắn.',
      color: 'text-[#FFD60A]',
      bgColor: 'bg-[#FFD60A]/10',
    },
    {
      icon: 'message-circle',
      title: 'Chat trực tiếp với chủ nhà',
      description: 'Liên hệ ngay lập tức với chủ nhà qua hệ thống chat, không qua trung gian.',
      color: 'text-[#FF6B35]',
      bgColor: 'bg-[#FF6B35]/10',
    },
    {
      icon: 'map-pinned',
      title: 'Bản đồ định vị chính xác',
      description: 'Tích hợp Google Maps giúp bạn dễ dàng tìm đường và đánh giá vị trí.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  getIconPath(icon: string): string {
    const icons: {[key: string]: string} = {
      'shield': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      'star': 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      'message-circle': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      'map-pinned': 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z'
    };
    return icons[icon] || '';
  }
}