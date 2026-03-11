import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserResponse } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-avatar-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-avatar-dropdown.component.html',
  styleUrls: ['./user-avatar-dropdown.component.css'],
})
export class UserAvatarDropdownComponent implements OnInit, OnDestroy {
  /**
   * Kích thước avatar: 'sm' (header thường) | 'md' (admin header)
   * Mặc định: 'md'
   */
  @Input() size: 'sm' | 'md' = 'md';

  /**
   * Emit khi user đăng xuất thành công (header cha có thể xử lý thêm)
   */
  @Output() loggedOut = new EventEmitter<void>();

  currentUser: UserResponse | null = null;
  isOpen = false;
  isAdmin = false;

  private sub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private eRef: ElementRef,
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  ngOnInit(): void {
    this.sub = this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
      this.isAdmin = user?.role_name === 'ADMIN';
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggle(event: Event) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }

  navigateTo(path: string, event?: Event) {
    event?.stopPropagation();
    this.isOpen = false;
    this.router.navigate([path]);
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.isOpen = false;
        this.loggedOut.emit();
        this.router.navigate(['/']);
      },
      error: () => {
        this.isOpen = false;
        this.loggedOut.emit();
        this.router.navigate(['/']);
      },
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }
}