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
import { ToastService } from '../toast/toast.service';

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

  phone = '';
  isLoading = false;
  errorMessage = '';
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
    private toast: ToastService,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {}

  loginWithGoogle(): void {
    if (!this.isBrowser || typeof google === 'undefined') return;

    this.errorMessage = '';

    const client = google.accounts.oauth2.initTokenClient({
      client_id: environment.googleClientId,
      scope: 'openid profile email',
      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          this.ngZone.run(() => {
            this.errorMessage = 'Đăng nhập Google thất bại. Vui lòng thử lại.';
          });
          return;
        }

        if (tokenResponse.access_token) {
          this.ngZone.run(() => {
            this.isLoading = true;
            this.authService.loginWithGoogle(tokenResponse.access_token).subscribe({
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
      },
    });

    client.requestAccessToken();
  }

  closeModal(): void {
    this.phone = '';
    this.errorMessage = '';
    this.close.emit();
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
  onPhoneLogin(): void {
    if (!this.phone) {
      this.toast.show('Vui lòng nhập số điện thoại', 'error');
      return;
    }

    this.toast.show('Chức năng đăng nhập bằng số điện thoại đang phát triển', 'info');
  }

  handleFacebookLogin(): void {
    this.toast.show('Chức năng đăng nhập Facebook đang phát triển', 'info');
  }
}
