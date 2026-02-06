// quick-filters.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Filter {
  icon: string;
  label: string;
  color: string;
}

@Component({
  selector: 'app-quick-filters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-filters.component.html'
})
export class QuickFiltersComponent {
  filters: Filter[] = [
    { icon: 'map-pin', label: 'Gần ĐH Bách Khoa', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { icon: 'map-pin', label: 'Quận 7', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { icon: 'map-pin', label: 'Cầu Giấy', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { icon: 'map-pin', label: 'Gần Vincom', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { icon: 'dollar-sign', label: 'Dưới 4 triệu', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { icon: 'wind', label: 'Có điều hòa', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { icon: 'clock', label: 'Giờ tự do', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { icon: 'trending-up', label: 'Hot nhất tuần', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  ];

  getIconPath(icon: string): string {
    const icons: {[key: string]: string} = {
      'map-pin': 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
      'dollar-sign': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'wind': 'M14.5 2a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 01.5-.5zM2.5 9a.5.5 0 000 1h3a.5.5 0 000-1h-3zM9 2.5a.5.5 0 011 0v2a.5.5 0 01-1 0v-2zM2.5 15a.5.5 0 000 1h3a.5.5 0 000-1h-3z',
      'clock': 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      'trending-up': 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
    };
    return icons[icon] || '';
  }
}