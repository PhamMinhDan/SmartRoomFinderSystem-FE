// testimonials.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  rating: number;
  content: string;
}

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonials.component.html'
})
export class TestimonialsComponent {
  currentIndex = 0;

  testimonials: Testimonial[] = [
    {
      name: 'Nguyễn Minh Anh',
      role: 'Sinh viên ĐH Ngoại Thương',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5,
      content: 'Tìm được phòng đẹp, chủ nhà tốt, giá đúng như đăng. Không phải chạy khắp nơi như các trang khác. Rất hài lòng!',
    },
    {
      name: 'Trần Hoàng Long',
      role: 'Nhân viên văn phòng, Hà Nội',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5,
      content: 'App rất tiện, chat trực tiếp với chủ nhà nên dễ trao đổi. Review từ người thuê trước giúp mình yên tâm hơn nhiều.',
    },
    {
      name: 'Lê Thị Thu Hà',
      role: 'Sinh viên ĐH Kinh tế Quốc dân',
      avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5,
      content: 'So với các trang khác thì RoomFinder minh bạch hơn nhiều. Có bản đồ, có review, liên hệ nhanh. Recommend cho bạn bè!',
    },
    {
      name: 'Phạm Đức Anh',
      role: 'Kỹ sư IT, TP.HCM',
      avatar: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5,
      content: 'Giao diện đẹp, dễ dùng. Tìm phòng gần công ty chỉ mất 2 ngày. Không tin ảo như mấy trang môi giới.',
    },
    {
      name: 'Võ Thị Lan',
      role: 'Nhân viên Marketing',
      avatar: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5,
      content: 'Đã giới thiệu cho 3 người bạn và họ đều tìm được phòng ưng ý. Hệ thống đánh giá rất hữu ích!',
    },
  ];

  nextSlide(): void {
    this.currentIndex = (this.currentIndex + 1) % this.testimonials.length;
  }

  prevSlide(): void {
    this.currentIndex = (this.currentIndex - 1 + this.testimonials.length) % this.testimonials.length;
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
  }

  getVisibleTestimonials(): Testimonial[] {
    const visible: Testimonial[] = [];
    for (let i = 0; i < 3; i++) {
      visible.push(this.testimonials[(this.currentIndex + i) % this.testimonials.length]);
    }
    return visible;
  }

  createRange(n: number): number[] {
    return Array(n).fill(0).map((_, i) => i);
  }
}