import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const REASON_MAP: Record<string, string> = {
  'Lừa đảo': 'FRAUD',
  'Trùng lặp': 'DUPLICATE',
  'Bất động sản đã cho thuê': 'RENTED',
  'Không liên lạc được': 'UNREACHABLE',
  'Thông tin bất động sản không đúng thực tế': 'WRONG_INFO',
  'Thông tin người đăng không đúng thực tế': 'WRONG_POSTER',
  'Lý do khác': 'OTHER',
};

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-modal.component.html',
  styleUrls: ['./report-modal.component.css'],
})
export class ReportModalComponent {
  @Input() roomId!: number;
  @Input() isMobile = false;
  @Input() targetId!: number | null;
  @Input() type: 'ROOM' | 'REVIEW' = 'ROOM';
  @Output() closed = new EventEmitter<void>();

  selectedReason = '';
  otherDetails = '';
  phone = '';
  email = '';
  showError = false;
  errorMessage = 'Vui lòng điền đầy đủ thông tin';
  focusedField: string | null = null;
  submitting = false;
  submitted = false;

  readonly reasons = Object.keys(REASON_MAP);

  constructor(private http: HttpClient) {}

  get charCount(): number {
    return this.otherDetails.length;
  }
  get isOverLimit(): boolean {
    return this.charCount > 500;
  }

  onSubmit(): void {
    const isOtherMissing = this.selectedReason === 'Lý do khác' && !this.otherDetails.trim();
    if (!this.selectedReason || !this.phone || !this.email || isOtherMissing || this.isOverLimit) {
      this.errorMessage = 'Vui lòng điền đầy đủ thông tin';
      this.showError = true;
      setTimeout(() => (this.showError = false), 3000);
      return;
    }

    this.submitting = true;
    const payload = {
      reason: REASON_MAP[this.selectedReason],
      details: this.selectedReason === 'Lý do khác' ? this.otherDetails.trim() : null,
      reporterPhone: this.phone,
      reporterEmail: this.email,
    };

    this.http.post(`${environment.apiUrl}/rooms/${this.roomId}/reports`, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
        setTimeout(() => this.close(), 2000);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.error?.message || 'Gửi báo cáo thất bại. Vui lòng thử lại.';
        this.showError = true;
        setTimeout(() => (this.showError = false), 4000);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
