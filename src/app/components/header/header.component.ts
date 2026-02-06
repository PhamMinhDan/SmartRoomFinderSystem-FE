import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoginModalComponent } from '../login-modal/login-modal.component'; // ← Import component

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoginModalComponent  // ← Thêm vào imports để Angular biết <app-login-modal>
  ],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  isOpen = false;               // mobile menu
  isLoginModalOpen = false;     // ← Thêm state cho modal

  toggleMenu(): void {
    this.isOpen = !this.isOpen;
  }

  openLoginModal(): void {
    console.log('[Header] Nút Đăng nhập được click → mở modal');
    this.isLoginModalOpen = true;
  }

  closeLoginModal(): void {
    console.log('[Header] Đóng modal từ output');
    this.isLoginModalOpen = false;
  }
}