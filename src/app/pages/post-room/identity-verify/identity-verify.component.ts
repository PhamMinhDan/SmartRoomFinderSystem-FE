import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-identity-verify',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './identity-verify.component.html',
  styleUrls: ['./identity-verify.component.css'],
})
export class IdentityVerifyComponent implements OnInit, OnDestroy {
  @ViewChild('frontInput') frontInput!: ElementRef<HTMLInputElement>;
  @ViewChild('backInput') backInput!: ElementRef<HTMLInputElement>;
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  verifyForm!: FormGroup;
  currentStep = 1;
  alreadyVerified = false;
  // 'none' | 'pending' | 'rejected'
  verificationStatus: 'none' | 'pending' | 'rejected' = 'none';
  rejectReason = '';
  submitLoading = false;
  errorMsg = '';

  frontPreview: string | null = null;
  backPreview: string | null = null;
  selfiePreview: string | null = null;

  frontFile: File | null = null;
  backFile: File | null = null;

  cameraActive = false;
  private mediaStream: MediaStream | null = null;

  faceInstructions = [
    'Đảm bảo khuôn mặt bạn ở khu vực có ánh sáng tốt',
    'Tháo bỏ kính mắt hoặc mũ',
    'Giữ nét mặt trung lập',
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.verifyForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(0|\+84)[0-9]{9,10}$/)]],
      documentType: ['CCCD', Validators.required],
    });

    const user = this.authService.currentUserValue;
    if (user?.phone_number) {
      this.verifyForm.patchValue({ phoneNumber: user.phone_number });
    }

    if (user?.identity_verified) {
      this.alreadyVerified = true;
    } else {
      // Kiểm tra trạng thái xác thực hiện tại từ BE
      this.checkVerificationStatus();
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  /** Gọi API /me để lấy trạng thái xác thực mới nhất */
  private checkVerificationStatus(): void {
    this.http.get<any>(`${environment.apiUrl}/identity-verification/me`).subscribe({
      next: (res) => {
        const data = res?.data;
        if (!data) {
          this.verificationStatus = 'none';
          return;
        }
        if (data.status === 'pending') {
          this.verificationStatus = 'pending';
        } else if (data.status === 'rejected') {
          this.verificationStatus = 'rejected';
          this.rejectReason = data.rejectReason || '';
        } else if (data.status === 'approved') {
          this.alreadyVerified = true;
        } else {
          this.verificationStatus = 'none';
        }
      },
      error: () => {
        // Chưa có bản ghi nào → cho phép gửi mới
        this.verificationStatus = 'none';
      },
    });
  }

  triggerFileInput(side: 'front' | 'back') {
    if (side === 'front') this.frontInput.nativeElement.click();
    else this.backInput.nativeElement.click();
  }

  onFileSelect(event: Event, side: 'front' | 'back') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (side === 'front') {
        this.frontPreview = result;
        this.frontFile = file;
      } else {
        this.backPreview = result;
        this.backFile = file;
      }
    };
    reader.readAsDataURL(file);
  }

  async startCamera() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.cameraActive = true;
      setTimeout(() => {
        if (this.videoEl?.nativeElement) {
          this.videoEl.nativeElement.srcObject = this.mediaStream;
        }
      }, 100);
    } catch {
      this.errorMsg = 'Không thể truy cập camera. Vui lòng cấp quyền.';
    }
  }

  takeSelfie() {
    const video = this.videoEl?.nativeElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    this.selfiePreview = canvas.toDataURL('image/jpeg');
    this.stopCamera();
  }

  stopCamera() {
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    this.cameraActive = false;
  }

  /** Nút "Tiếp tục" */
  async proceedToStep2() {
    // Đã verified → vào thẳng post-room
    if (this.alreadyVerified) {
      this.router.navigate(['/post-room']);
      return;
    }

    // Đang pending → không làm gì, UI đã hiển thị trạng thái chờ
    if (this.verificationStatus === 'pending') {
      return;
    }

    // Validate form
    this.verifyForm.markAllAsTouched();
    if (this.verifyForm.invalid) return;
    if (!this.frontFile || !this.backFile) {
      this.errorMsg = 'Vui lòng tải ảnh mặt trước và mặt sau giấy tờ';
      return;
    }

    this.submitLoading = true;
    this.errorMsg = '';

    try {
      const frontUrl = await this.uploadImage(
        this.frontFile,
        `verify/front_${crypto.randomUUID()}`,
      );

      const backUrl = await this.uploadImage(this.backFile, `verify/back_${crypto.randomUUID()}`);
      let selfieUrl = '';
      if (this.selfiePreview) {
        selfieUrl = await this.uploadBase64Image(
          this.selfiePreview,
          `verify/selfie_${crypto.randomUUID()}`,
        );
      }

      const payload = {
        phoneNumber: this.verifyForm.value.phoneNumber,
        documentType: this.verifyForm.value.documentType,
        frontImageUrl: frontUrl,
        backImageUrl: backUrl,
        selfieImageUrl: selfieUrl || undefined,
      };

      await firstValueFrom(this.http.post(`${environment.apiUrl}/identity-verification`, payload));

      // Sau khi gửi thành công → chuyển sang trạng thái pending, KHÔNG navigate
      this.verificationStatus = 'pending';
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Gửi xác minh thất bại. Vui lòng thử lại.';
    } finally {
      this.submitLoading = false;
    }
  }

  private async uploadImage(file: File, secureId: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    formData.append('secureId', secureId);

    const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/upload`, formData));

    return res.url;
  }

  private async uploadBase64Image(base64: string, secureId: string): Promise<string> {
    const blob = await fetch(base64).then((r) => r.blob());
    const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });

    return this.uploadImage(file, secureId);
  }
}
