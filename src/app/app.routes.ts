import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { SearchPageComponent } from './pages/search-page/search-page.component';
import { BlogPageComponent } from './pages/blog-page/blog-page.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { IdentityVerifyComponent } from './pages/post-room/identity-verify/identity-verify.component';
import { PostRoomComponent } from './pages/post-room/post-story/post-story.component';
import { AdminGuard } from './pages/admin/admin.guard';
import { AdminComponent } from './pages/admin/admin.component';
import { PostSuccessComponent } from './pages/post-room/post-success/post-success.component';
import { ManagePostsComponent } from './pages/manage-posts/manage-posts.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    title: 'RoomFinder. vn - Tìm phòng trọ nhanh chóng, dễ dàng',
  },
  {
    path: 'search',
    component: SearchPageComponent,
    title: 'Tìm phòng - RoomFinder.vn',
  },
  {
    path: 'blog',
    component: BlogPageComponent,
    title: 'Blog - RoomFinder.vn',
  },
  { path: 'profile', component: ProfileComponent, title: 'Thông tin cá nhân - RoomFinder.vn' },
  {
    path: 'identity-verify',
    component: IdentityVerifyComponent,
    title: 'Xác minh danh tính - RoomFinder.vn',
  },
  {
    path: 'post-room',
    component: PostRoomComponent,
    title: 'Đăng tin phòng - RoomFinder.vn',
  },
  {
    path: 'post-success',
    component: PostSuccessComponent,
    title: 'Đăng tin thành công - RoomFinder.vn',
  },
  {
    path: 'my-posts',
    component: ManagePostsComponent,
    title: 'Quản lý tin đăng - RoomFinder.vn',
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AdminGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
