import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  visible: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private _toast = new BehaviorSubject<ToastState>({
    message: '',
    type: 'info',
    visible: false,
  });

  toastState$ = this._toast.asObservable();

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3000) {
    this._toast.next({
      message,
      type,
      visible: true,
    });

    setTimeout(() => {
      this.hide();
    }, duration);
  }

  hide() {
    this._toast.next({
      message: '',
      type: 'info',
      visible: false,
    });
  }
}
