import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FavouriteService } from '../../services/favourites.service';
import { ToastService } from '../../components/toast/toast.service';

interface RoomImage {
  imageId: number;
  imageUrl: string;
  imageOrder: number;
  isPrimary: boolean;
}

interface Room {
  roomId: number;
  title: string;
  address: string;
  cityName: string;
  districtName: string;
  wardName: string;
  areaSize: number;
  pricePerMonth: number;
  capacity: number;
  availabilityStatus: string;
  isVerified: boolean;
  averageRating: number;
  totalReviews: number;
  landlordName: string;
  landlordAvatar: string;
  images: RoomImage[];
}

interface FavouriteItem {
  favId: number;
  roomId: number;
  saved: boolean;
  createdAt: string;
  room: Room;
}

@Component({
  selector: 'app-favourites',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './favourites.component.html',
})
export class FavouritesComponent implements OnInit {
  items: FavouriteItem[] = [];
  loading = true;
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 12;
  removingIds = new Set<number>();

  constructor(
    private favouriteService: FavouriteService,
    private toastService: ToastService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.load();
  }

  load(page = 0) {
    this.loading = true;
    this.favouriteService.getMyFavourites(page, this.pageSize).subscribe({
      next: (res) => {
        const data = res?.data;
        this.items = data?.content ?? [];
        this.totalElements = data?.totalElements ?? 0;
        this.totalPages = data?.totalPages ?? 0;
        this.currentPage = page;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  remove(event: Event, roomId: number) {
    event.stopPropagation();
    if (this.removingIds.has(roomId)) return;
    this.removingIds.add(roomId);

    this.favouriteService.toggle(roomId).subscribe({
      next: () => {
        this.items = this.items.filter((i) => i.roomId !== roomId);
        this.totalElements = Math.max(0, this.totalElements - 1);
        this.toastService.show('🤍 Đã bỏ lưu tin', 'info');
        this.removingIds.delete(roomId);
      },
      error: () => {
        this.toastService.show('Có lỗi xảy ra', 'error');
        this.removingIds.delete(roomId);
      },
    });
  }

  viewRoom(roomId: number) {
    this.router.navigate(['/room-detail', roomId]);
  }

  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages) return;
    this.load(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPageRange(): number[] {
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(0, this.currentPage - half);
    let end = Math.min(this.totalPages - 1, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(0, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  formatPrice(price: number): string {
    if (!price) return 'Liên hệ';
    if (price >= 1_000_000) {
      const m = price / 1_000_000;
      return (m % 1 === 0 ? `${m}` : `${m.toFixed(1)}`) + 'tr/tháng';
    }
    return `${(price / 1000).toFixed(0)}k/tháng`;
  }

  formatRelative(dateStr: string): string {
    if (!dateStr) return '';
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 30) return `${days} ngày trước`;
    return `${Math.floor(days / 30)} tháng trước`;
  }
}
