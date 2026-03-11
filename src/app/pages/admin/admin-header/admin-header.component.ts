import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserAvatarDropdownComponent } from '../../../components/user-avatar-dropdown/user-avatar-dropdown.component';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    UserAvatarDropdownComponent,   // ← shared dropdown
  ],
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.css'],
})
export class AdminHeaderComponent {
  @Output() menuClicked = new EventEmitter<void>();

  searchTerm = '';

  onMenuClick() {
    this.menuClicked.emit();
  }
}