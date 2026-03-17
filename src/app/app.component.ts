import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { ToastComponent } from './components/toast/toast.component';
import { ChatbotWidgetComponent } from './components/chatbot-widget/chatbot-widget.component'; // 👈 thêm
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, ToastComponent, ChatbotWidgetComponent], // 👈 thêm
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  isAdminRoute = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.authService.tryRefreshOnStart();

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.isAdminRoute = e.urlAfterRedirects.startsWith('/admin');

        const user = this.authService.currentUserValue;
        if (user?.role_name === 'ADMIN' && !this.isAdminRoute) {
          this.router.navigate(['/admin']);
        }
      });

    this.isAdminRoute = this.router.url.startsWith('/admin');

    const user = this.authService.currentUserValue;
    if (user?.role_name === 'ADMIN' && !this.isAdminRoute) {
      this.router.navigate(['/admin']);
    }
  }
}