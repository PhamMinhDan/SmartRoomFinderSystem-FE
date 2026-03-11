import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface StatCard {
  label: string;
  value: string;
  change: string;
  trending: 'up' | 'down' | 'warning';
  icon: string;
  colorClass: string;
  bgClass: string;
}

interface RecentPost {
  id: number;
  image: string;
  title: string;
  price: string;
  address: string;
  time: string;
  roomId: number;
}

interface District {
  name: string;
  posts: number;
  percent: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  stats: StatCard[] = [];
  chartBars = [45, 62, 48, 73, 56, 81, 67];
  chartDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  topDistricts: District[] = [];
  recentActivity: RecentPost[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRecentPending();
  }

  // GET /admin/stats
  async loadStats() {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/admin/stats`)
      );
      const s = res.data;
      const approvedRate = s.totalRooms > 0
        ? ((s.approvedRooms / s.totalRooms) * 100).toFixed(1) + '%'
        : '0%';

      this.stats = [
        { label: 'Tổng tin đăng',  value: s.totalRooms.toLocaleString(),          change: '+12.5%',               trending: 'up',      icon: 'list',   colorClass: 'blue',   bgClass: 'bg-blue'   },
        { label: 'Tin chờ duyệt',  value: s.pendingRooms.toLocaleString(),         change: `+${s.pendingRooms}`,   trending: 'warning', icon: 'clock',  colorClass: 'yellow', bgClass: 'bg-yellow' },
        { label: 'Tin đã duyệt',   value: s.approvedRooms.toLocaleString(),        change: approvedRate,           trending: 'up',      icon: 'check',  colorClass: 'green',  bgClass: 'bg-green'  },
        { label: 'Người dùng',     value: s.totalUsers.toLocaleString(),           change: '+23',                  trending: 'up',      icon: 'users',  colorClass: 'purple', bgClass: 'bg-purple' },
        { label: 'Chờ xác thực',   value: s.pendingVerifications.toLocaleString(), change: String(s.pendingVerifications), trending: s.pendingVerifications > 0 ? 'warning' : 'up', icon: 'eye', colorClass: 'indigo', bgClass: 'bg-indigo' },
        { label: 'Tỷ lệ duyệt',   value: approvedRate,                            change: `+${s.approvedRooms}`,  trending: 'up',      icon: 'dollar', colorClass: 'red',    bgClass: 'bg-red'    },
      ];
    } catch (err) {
      console.error('Lỗi tải stats', err);
    }
  }

  // GET /admin/rooms?isApproved=false&page=0&size=3
  async loadRecentPending() {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/admin/rooms`, {
          params: { isApproved: false, page: 0, size: 3 },
        })
      );
      const rooms = res.data.content;

      this.recentActivity = rooms.map((r: any) => ({
        id: r.roomId,
        roomId: r.roomId,
        image: r.imageUrls?.[0] || '',
        title: r.title,
        price: this.formatPrice(r.pricePerMonth),
        address: `${r.districtName}, ${r.cityName}`,
        time: this.timeAgo(r.createdAt),
      }));

      // Top districts từ danh sách phòng chờ duyệt
      const map: Record<string, number> = {};
      rooms.forEach((r: any) => {
        const key = r.districtName || 'Khác';
        map[key] = (map[key] || 0) + 1;
      });
      const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const max = sorted[0]?.[1] || 1;
      this.topDistricts = sorted.map(([name, posts]) => ({
        name, posts,
        percent: Math.round((posts / max) * 100),
      }));
    } catch (err) {
      console.error('Lỗi tải tin gần đây', err);
    }
  }

  // PATCH /admin/rooms/:id/approve — nút Duyệt trong recent cards
  async approveRoom(roomId: number) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/admin/rooms/${roomId}/approve`, {})
      );
      this.loadStats();
      this.loadRecentPending();
    } catch (err) {
      console.error('Duyệt thất bại', err);
    }
  }

  formatPrice(price: number): string {
    if (!price) return '—';
    if (price >= 1_000_000) return (price / 1_000_000).toFixed(1).replace('.0', '') + ' triệu';
    return price.toLocaleString('vi-VN') + ' đ';
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Vừa xong';
    if (diff < 60) return `${diff} phút trước`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.floor(h / 24)} ngày trước`;
  }
}