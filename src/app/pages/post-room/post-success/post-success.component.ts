import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface RoomImage {
  imageUrl: string;
}

interface RoomDetail {
  title: string;
  pricePerMonth: number;
  postTier?: string;
  durationDays?: number;
  expiredAt?: string;
  images: RoomImage[];
}

@Component({
  selector: 'app-post-success',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './post-success.component.html',
})
export class PostSuccessComponent implements OnInit {
  room: RoomDetail | null = null;

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    // Try to get the latest room from /rooms/my
    this.http.get<any>(`${environment.apiUrl}/rooms/my?page=0&size=1`).subscribe({
      next: (res) => {
        const content = res?.data?.content;
        if (content?.length) {
          this.room = content[0];
        }
      },
    });
  }

  goManage() {
    this.router.navigate(['/my-posts']);
  }
}
