// src/app/services/modal.service.ts
import { DOCUMENT } from '@angular/common';
import {
  ComponentFactoryResolver,
  Inject,
  Injectable,
  Injector,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { Subject } from 'rxjs';
import { LoginModalComponent } from '../components/login-modal/login-modal.component';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private modalNotifier?: Subject<any>;

  constructor(
    private resolver: ComponentFactoryResolver,
    private injector: Injector,
    @Inject(DOCUMENT) private document: Document
  ) {}

  openLoginModal() {
    const factory = this.resolver.resolveComponentFactory(LoginModalComponent);
    const componentRef = factory.create(this.injector);

    // Gắn component vào body
    this.document.body.appendChild(componentRef.location.nativeElement);

    // Detect changes để render
    componentRef.hostView.detectChanges();

    // Lắng nghe sự kiện close từ LoginModalComponent
    const subscription = componentRef.instance.close.subscribe(() => {
      this.closeModal(componentRef);
    });

    // Trả về observable để theo dõi kết quả nếu cần (ví dụ: login thành công)
    this.modalNotifier = new Subject<any>();
    return this.modalNotifier.asObservable();
  }

  private closeModal(componentRef: any) {
    componentRef.destroy();
    this.modalNotifier?.complete();
    this.modalNotifier = undefined;
  }
}