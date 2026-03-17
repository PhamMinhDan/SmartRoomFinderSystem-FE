import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

import { FavouriteService } from '../../services/favourites.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../components/toast/toast.service';

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
  hot: boolean;
}

@Component({
  selector: 'app-featured-listings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './featured-listings.component.html',
})
export class FeaturedListingsComponent implements OnInit {
  listings: Listing[] = [];

  page = 0;
  totalPages = 0;

  savedIds = new Set<number>();
  togglingIds = new Set<number>();

  constructor(
    private http: HttpClient,
    private router: Router,
    private favouriteService: FavouriteService,
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.favouriteService.loadSavedIds();
    }

    this.favouriteService.savedIds.subscribe((ids) => {
      this.savedIds = ids;
    });

    this.loadRooms();
  }

  loadRooms() {
    this.http
      .get<any>(`${environment.apiUrl}/rooms/featured?page=${this.page}&size=6`)
      .subscribe((res) => {
        const pageData = res.data;

        this.totalPages = pageData.totalPages;

        this.listings = pageData.content.map((r: any) => ({
          id: r.roomId,

          image: r.images?.[0]?.imageUrl || 'https://via.placeholder.com/600x400',

          price: (r.pricePerMonth / 1000000).toFixed(1) + 'tr',

          title: r.title,

          location: `${r.address}, ${r.wardName}, ${r.districtName}, ${r.cityName}`,

          rating: r.averageRating || 0,

          reviews: r.totalReviews || 0,

          tags: r.amenities?.map((a: any) => a.amenityName) || [],

          status: r.availabilityStatus === 'available' ? 'Còn trống' : 'Đã thuê',

          statusColor: r.availabilityStatus === 'available' ? 'bg-[#00A896]' : 'bg-gray-400',

          hot: r.viewCount > 100 || r.averageRating >= 4.5,
        }));
      });
  }

  changePage(p: number) {
    this.page = p;
    this.loadRooms();
  }

  goDetail(id: number) {
    this.router.navigate(['/room-detail', id]);
  }

  goToSearch() {
    this.router.navigate(['/search']);
  }

  toggleFavourite(roomId: number) {
    if (!this.authService.isLoggedIn()) {
      this.toastService.show('Vui lòng đăng nhập để lưu tin', 'info');
      return;
    }

    if (this.togglingIds.has(roomId)) return;

    this.togglingIds.add(roomId);

    this.favouriteService.toggle(roomId).subscribe({
      next: (res) => {
        const saved = res?.data?.saved ?? false;

        this.toastService.show(
          saved ? '❤️ Đã lưu tin' : '🤍 Đã bỏ lưu tin',
          saved ? 'success' : 'info',
        );

        this.togglingIds.delete(roomId);
      },

      error: () => {
        this.toastService.show('Có lỗi xảy ra', 'error');
        this.togglingIds.delete(roomId);
      },
    });
  }

  isSaved(id: number) {
    return this.savedIds.has(id);
  }
}
