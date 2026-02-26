import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserResponse } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  user: UserResponse | null = null;
  loading = true;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUserValue;

    if (this.user) {
      this.loading = false;
      this.authService.getCurrentUser().subscribe({
        next: (res) => {
          this.user = res.data;
        },
        error: (err) => {
          console.error('Background refresh failed:', err);
        },
      });
    } else {
      this.authService.getCurrentUser().subscribe({
        next: (res) => {
          this.user = res.data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load user:', err);
          this.loading = false;
          this.router.navigate(['/']);
        },
      });
    }
  }

  display(value: any): string {
    if (value === null || value === undefined || value === '') {
      return 'Chưa cập nhật';
    }
    return String(value);
  }
}
