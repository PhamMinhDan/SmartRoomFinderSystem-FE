import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  NgZone,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.css'],
})
export class LoginModalComponent implements OnInit {
  @Input() isLoginOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() loginSuccess = new EventEmitter<void>();

  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.initializeGoogleSignIn();
    }
  }

  initializeGoogleSignIn(): void {
    if (typeof google === 'undefined') return;

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: this.handleGoogleSignIn.bind(this),
      use_fedcm_for_prompt: false,
    });
  }

  loginWithGoogle(): void {
    if (!this.isBrowser || typeof google === 'undefined') return;

    this.errorMessage = '';
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        this.errorMessage = 'Không thể mở đăng nhập Google';
      }
    });
  }

  handleGoogleSignIn(response: any): void {
    this.ngZone.run(() => {
      this.isLoading = true;
      this.errorMessage = '';

      const idToken = response.credential;

      this.authService.loginWithGoogle(idToken).subscribe({
        next: () => {
          this.isLoading = false;
          this.loginSuccess.emit();
          this.closeModal();
          this.router.navigate(['/']);
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';
        },
      });
    });
  }

  onEmailLogin(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Vui lòng nhập email và mật khẩu';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    setTimeout(() => {
      this.errorMessage = 'Chức năng đăng nhập bằng email chưa được triển khai';
      this.isLoading = false;
    }, 1000);
  }

  closeModal(): void {
    this.email = '';
    this.password = '';
    this.errorMessage = '';
    this.close.emit();
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
}
