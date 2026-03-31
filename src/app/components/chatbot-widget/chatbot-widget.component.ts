import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.css'],
})
export class ChatbotWidgetComponent {
  isOpen = false;
  isMinimized = false;
  isHidden = false; // 👈 thêm

  constructor(private router: Router) {
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.checkRoute(event.urlAfterRedirects || event.url);
      });
  }

  checkRoute(url: string) {
    console.log('URL:', url); // debug

    this.isHidden = url.startsWith('/chat');

    if (this.isHidden) {
      this.isOpen = false;
    }
  }
}
