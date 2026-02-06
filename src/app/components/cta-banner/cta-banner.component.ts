// cta-banner.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cta-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="py-20 bg-gradient-to-r from-[#FF6B35] via-[#FF8C61] to-[#00A896] relative overflow-hidden">
      <div class="absolute inset-0 bg-black/10"></div>

      <div class="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
        <div class="absolute top-10 left-10 w-32 h-32 bg-white rounded-full"></div>
        <div class="absolute bottom-10 right-10 w-48 h-48 bg-white rounded-full"></div>
        <div class="absolute top-1/2 left-1/3 w-24 h-24 bg-white rounded-full"></div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="text-center">
          <div class="inline-flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <svg class="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            <span class="text-white font-semibold">Đăng tin miễn phí</span>
          </div>

          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Bạn là chủ nhà?
          </h2>
          <p class="text-xl text-white/95 mb-8 max-w-2xl mx-auto">
            Đăng tin cho thuê phòng trọ miễn phí và tiếp cận hàng nghìn người thuê tiềm năng
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button class="bg-white text-[#FF6B35] px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-2xl hover:shadow-3xl transform hover:-translate-y-0.5 flex items-center">
              <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Đăng tin ngay
            </button>
            <button class="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm">
              Tìm hiểu thêm
            </button>
          </div>

          <div class="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div class="text-center">
              <div class="text-4xl font-bold text-white mb-2">100% Miễn phí</div>
              <div class="text-white/90">Không phí ẩn</div>
            </div>
            <div class="text-center">
              <div class="text-4xl font-bold text-white mb-2">24/7 Hỗ trợ</div>
              <div class="text-white/90">Luôn đồng hành</div>
            </div>
            <div class="text-center">
              <div class="text-4xl font-bold text-white mb-2">10K+ Người thuê</div>
              <div class="text-white/90">Mỗi ngày</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CtaBannerComponent {}