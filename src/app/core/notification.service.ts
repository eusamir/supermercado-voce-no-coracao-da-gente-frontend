import { Injectable, inject } from '@angular/core';
import { NgxToastifyService } from '@andreasnicolaou/ngx-toastify';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toastify = inject(NgxToastifyService);

  success(title: string, message: string): void {
    this.toastify.success({ title, message });
  }

  error(title: string, message: string): void {
    this.toastify.error({ title, message });
  }

  warning(title: string, message: string): void {
    this.toastify.warning({ title, message });
  }
}
