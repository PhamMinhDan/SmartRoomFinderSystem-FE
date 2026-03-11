import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

interface MenuItem {
  id: string;
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  adminName = 'Admin';
  adminInitials = 'AD';

  menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard',     route: '/admin/dashboard', icon: 'home'         },
    { id: 'pending',   label: 'Chờ duyệt',     route: '/admin/pending',   icon: 'clock'        },
    { id: 'approved',  label: 'Đã duyệt',      route: '/admin/approved',  icon: 'check-circle' },
    { id: 'all-posts', label: 'Tất cả tin',    route: '/admin/all-posts', icon: 'list'         },
    { id: 'users',     label: 'Người dùng',    route: '/admin/users',     icon: 'users'        },
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.adminName = user.full_name || user.email || 'Admin';
      this.adminInitials = this.getInitials(this.adminName);
    }
  }

  logout() {
    this.authService.logout();
  }

  close() {
    this.closed.emit();
  }

  private getInitials(name: string): string {
    if (!name) return 'AD';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
}