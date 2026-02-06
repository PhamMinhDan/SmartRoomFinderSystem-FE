import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.css']
})
export class LoginModalComponent {
  @Input() isLoginOpen = false;          // Input để binding từ header
  @Output() close = new EventEmitter<void>();  // Output để emit sự kiện đóng

  // Các hàm được gọi từ template HTML
  closeModal(): void {
    console.log('[LoginModal] Đóng modal được gọi');
    this.close.emit();  // Emit ra cho HeaderComponent nhận
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();  // Ngăn click lan ra backdrop
  }
}