import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(): boolean {
    const user = this.authService.currentUserValue;

    if (!user) {
      this.router.navigate(['/']);
      return false;
    }

    if (user.role_name !== 'ADMIN') {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }
}
