import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { SearchPageComponent } from './pages/search-page/search-page.component';
import { BlogPageComponent } from './pages/blog-page/blog-page.component';


export const routes:  Routes = [
  { 
    path: '', 
    component: HomePageComponent,
    title: 'RoomFinder. vn - Tìm phòng trọ nhanh chóng, dễ dàng'
  },
  { 
    path: 'search', 
    component: SearchPageComponent,
    title: 'Tìm phòng - RoomFinder.vn'
  },
  { 
    path: 'blog', 
    component: BlogPageComponent,
    title: 'Blog - RoomFinder.vn'
  },
  { 
    path:  '**', 
    redirectTo:  '' 
  }
];