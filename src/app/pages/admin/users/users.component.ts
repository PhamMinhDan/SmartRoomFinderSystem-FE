import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type UserStatus = 'active' | 'banned';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  posts: number;
  status: UserStatus;
  joinDate: string;
  lastActive: string;
}

interface UserStat {
  label: string;
  value: string;
  change: string;
  icon: string;
  colorClass: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent {
  userStats: UserStat[] = [
    { label: 'Tổng người dùng', value: '892', change: '+23', icon: 'users', colorClass: 'blue' },
    { label: 'User mới tuần này', value: '47', change: '+12', icon: 'user-plus', colorClass: 'green' },
    { label: 'Top user đăng tin', value: '125', change: 'Hoàng Văn E', icon: 'trending', colorClass: 'purple' },
  ];

  users: User[] = [
    { id: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', phone: '0901234567', avatar: 'NA', posts: 12, status: 'active', joinDate: '15/01/2026', lastActive: '2 giờ trước' },
    { id: 2, name: 'Trần Thị B', email: 'tranthib@email.com', phone: '0912345678', avatar: 'TB', posts: 8, status: 'active', joinDate: '22/01/2026', lastActive: '5 giờ trước' },
    { id: 3, name: 'Lê Văn C', email: 'levanc@email.com', phone: '0923456789', avatar: 'LC', posts: 15, status: 'active', joinDate: '10/12/2025', lastActive: '1 ngày trước' },
    { id: 4, name: 'Phạm Thị D', email: 'phamthid@email.com', phone: '0934567890', avatar: 'PD', posts: 6, status: 'active', joinDate: '05/02/2026', lastActive: '3 giờ trước' },
    { id: 5, name: 'Hoàng Văn E', email: 'hoangvane@email.com', phone: '0945678901', avatar: 'HE', posts: 20, status: 'active', joinDate: '08/11/2025', lastActive: '30 phút trước' },
    { id: 6, name: 'Võ Thị F', email: 'vothif@email.com', phone: '0956789012', avatar: 'VF', posts: 3, status: 'banned', joinDate: '20/02/2026', lastActive: '1 tuần trước' },
  ];
}