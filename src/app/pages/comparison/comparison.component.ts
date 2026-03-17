import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../components/toast/toast.service';

interface Room {
  roomId: number;
  title: string;
  address: string;
  pricePerMonth: number;
  areaSize: number;
  capacity: number;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  landlordName: string;
  landlordAvatar: string;
  images: any[];
  amenities: any[];
}

interface ComparisonResponse {
  totalRooms: number;
  rooms: Room[];
  lowestPrice: number;
  highestPrice: number;
  smallestArea: number;
  largestArea: number;
}

@Component({
  selector: 'app-comparison',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comparison.component.html',
  styleUrls: ['./comparison.component.css'],
})
export class ComparisonComponent implements OnInit {
  loading = true;
  comparison: ComparisonResponse | null = null;
  roomIds: number[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    // FIX: Dùng history.state thay vì router.getCurrentNavigation()
    // vì navigation đã kết thúc khi ngOnInit chạy, getCurrentNavigation() luôn trả về null
    const state = history.state;

    if (!state?.roomIds || state.roomIds.length === 0) {
      this.toastService.show('Vui lòng chọn phòng để so sánh', 'warning');
      this.router.navigate(['/saved']);
      return;
    }

    this.roomIds = state.roomIds;
    this.loadComparison();
  }

/*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Loads comparison data from the server.
   *
   * This function is called when the component is initialized.
   * It makes a GET request to the server with the room IDs
   * as query parameters. The response is then stored in the
   * `comparison` property.
   *
   * If the request is successful, it sets `loading` to false.
   * If the request fails, it shows an error toast and navigates
   * back to the saved page.
   */
/*******  664c74e6-f19e-4692-9646-48a75cf48c53  *******/  loadComparison() {
    this.loading = true;
    const params = this.roomIds.join(',');

    this.http
      .get<any>(`${environment.apiUrl}/comparison?roomIds=${params}`)
      .subscribe({
        next: (res) => {
          this.comparison = res?.data;
          this.loading = false;
        },
        error: () => {
          this.toastService.show('Không thể tải dữ liệu so sánh', 'error');
          this.loading = false;
          this.router.navigate(['/saved']);
        },
      });
  }

  formatPrice(price: number): string {
    if (price >= 1_000_000) {
      const m = price / 1_000_000;
      return (m % 1 === 0 ? `${m}` : `${m.toFixed(1)}`) + 'tr';
    }
    return `${(price / 1000).toFixed(0)}k`;
  }

  goBack() {
    this.router.navigate(['/saved']);
  }

  viewRoom(roomId: number) {
    this.router.navigate(['/room-detail', roomId]);
  }
}