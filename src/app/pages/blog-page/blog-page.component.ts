// blog-page.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Category {
  id: string;
  name: string;
}

interface Post {
  id: number;
  image: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  views: number;
  readTime: string;
}

@Component({
  selector: 'app-blog-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog-page.component.html'
})
export class BlogPageComponent {
  email = '';
  category = 'all';

  categories: Category[] = [
    { id: 'all', name: 'Tất cả' },
    { id: 'tips', name: 'Mẹo tìm phòng' },
    { id: 'review', name: 'Review khu vực' },
    { id: 'warning', name: 'Cảnh báo' },
    { id: 'legal', name: 'Pháp lý thuê' }
  ];

  featuredPost = {
    id: 1,
    image: 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=1200',
    title: '7 Dấu hiệu cảnh báo phòng trọ lừa đảo và cách tránh',
    excerpt: 'Những tín hiệu cần chú ý khi tìm phòng trọ để tránh bị lừa đảo, bên lề ký hợp đồng...',
    category: 'warning',
    author: 'Nguyễn Văn A',
    date: '2024-01-15',
    views: 2547,
    readTime: '5 min'
  };

  posts: Post[] = [
    {
      id: 2,
      image: 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=500',
      title: 'Cách thương lượng giá thuê phòng trọ hiệu quả',
      excerpt: 'Tips để thương lượng giá phòng trọ mà vẫn giữ mối quan hệ tốt với chủ nhà...',
      category: 'tips',
      author: 'Trần Thị B',
      date: '2024-01-14',
      views: 1823,
      readTime: '4 min'
    },
    {
      id: 3,
      image: 'https://images.pexels.com/photos/1537062/pexels-photo-1537062.jpeg?auto=compress&cs=tinysrgb&w=500',
      title: 'Review khu trọ Cầu Giấy: Địa chỉ yên tĩnh gần ĐH',
      excerpt: 'Tổng hợp thông tin về các phòng trọ ở khu Cầu Giấy, giá cả, tiện nghi và kinh nghiệm từ người ở...',
      category: 'review',
      author: 'Lê Minh C',
      date: '2024-01-13',
      views: 956,
      readTime: '6 min'
    },
    {
      id: 4,
      image: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=500',
      title: 'Những điều cần biết về hợp đồng thuê nhà tại Việt Nam',
      excerpt: 'Hướng dẫn chi tiết về quyền lợi và nghĩa vụ của người thuê theo luật Việt Nam...',
      category: 'legal',
      author: 'Phạm Quý D',
      date: '2024-01-12',
      views: 1234,
      readTime: '7 min'
    },
    {
      id: 5,
      image: 'https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg?auto=compress&cs=tinysrgb&w=500',
      title: 'Phòng trọ sinh viên ở Hà Nội: Tổng hợp các khu yên tĩnh',
      excerpt: 'Danh sách những khu phòng trọ phù hợp cho sinh viên, giá rẻ, yên tĩnh và an toàn...',
      category: 'review',
      author: 'Nguyễn Hữu E',
      date: '2024-01-11',
      views: 1567,
      readTime: '5 min'
    },
    {
      id: 6,
      image: 'https://images.pexels.com/photos/1918291/pexels-photo-1918291.jpeg?auto=compress&cs=tinysrgb&w=500',
      title: 'Chuẩn bị gì khi xem phòng trọ lần đầu',
      excerpt: 'Checklist đầy đủ những gì bạn cần kiểm tra khi đến xem phòng trọ để tránh phiền toái...',
      category: 'tips',
      author: 'Đỗ Thế F',
      date: '2024-01-10',
      views: 2103,
      readTime: '4 min'
    },
    {
      id: 7,
      image: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=500',
      title: 'Biến phòng trọ nhỏ thành không gian sống thoải mái',
      excerpt: 'Những cách thông minh để tối ưu hóa không gian sống trong phòng trọ nhỏ...',
      category: 'tips',
      author: 'Vũ Minh G',
      date: '2024-01-09',
      views: 1456,
      readTime: '5 min'
    }
  ];

  getCategoryColor(cat: string): string {
    const colors: { [key: string]: string } = {
      'tips': 'bg-blue-100 text-blue-700',
      'review': 'bg-green-100 text-green-700',
      'warning': 'bg-red-100 text-red-700',
      'legal': 'bg-purple-100 text-purple-700'
    };
    return colors[cat] || 'bg-gray-100 text-gray-700';
  }

  getCategoryName(id: string): string {
    return this.categories.find(c => c.id === id)?.name || '';
  }

  getLatestPosts(): Post[] {
    return this.posts.slice(0, 4);
  }

  createRange(n: number): number[] {
    return Array(n).fill(0).map((_, i) => i + 1);
  }
}