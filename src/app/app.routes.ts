import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { SearchPageComponent } from './pages/search-page/search-page.component';
import { BlogPageComponent } from './pages/blog-page/blog-page.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { IdentityVerifyComponent } from './pages/post-room/identity-verify/identity-verify.component';
import { PostRoomComponent } from './pages/post-room/post-story/post-story.component';
import { AdminGuard } from './pages/admin/admin.guard';
import { PostSuccessComponent } from './pages/post-room/post-success/post-success.component';
import { ManagePostsComponent } from './pages/manage-posts/manage-posts.component';
import { ChatComponent } from './pages/chat/chat.component';
import { RoomDetailComponent } from './pages/roomdetail/roomdetail.component';
import { FavouritesComponent } from './pages/favourites/favourites.component';
import { EditRoomComponent } from './pages/edit-room/edit-room.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    title: 'RoomFinder.vn - Tìm phòng trọ nhanh chóng, dễ dàng',
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
  {
    path: 'profile',
    component: ProfileComponent,
    title: 'Thông tin cá nhân - RoomFinder.vn',
  },
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
  { path: 'saved', component: FavouritesComponent, title: 'Tin đã lưu - RoomFinder.vn' },
  {
    path: 'edit-room/:id',
    component: EditRoomComponent,
    title: 'Chỉnh sửa tin đăng - RoomFinder.vn',
  },

  // ── Admin (lazy-loaded layout với child routes) ───────────────
  {
    path: 'admin',
    canActivate: [AdminGuard],
    loadComponent: () =>
      import('./pages/admin/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        title: 'Dashboard - RoomFinder Admin',
        loadComponent: () =>
          import('./pages/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'pending',
        title: 'Chờ duyệt - RoomFinder Admin',
        loadComponent: () =>
          import('./pages/admin/pending-posts/pending-posts.component').then(
            (m) => m.PendingPostsComponent,
          ),
      },
      {
        path: 'approved',
        title: 'Đã duyệt - RoomFinder Admin',
        loadComponent: () =>
          import('./pages/admin/approved-posts/approved-post.component').then(
            (m) => m.ApprovedPostsComponent,
          ),
      },
      {
        path: 'all-posts',
        title: 'Tất cả tin - RoomFinder Admin',
        loadComponent: () =>
          import('./pages/admin/all-posts/all-posts.component').then((m) => m.AllPostsComponent),
      },
      {
        path: 'users',
        title: 'Người dùng - RoomFinder Admin',
        loadComponent: () =>
          import('./pages/admin/users/users.component').then((m) => m.UsersComponent),
      },
    ],
  },

  {
    path: 'chat',
    component: ChatComponent,
    title: 'Chat - RoomFinder.vn',
  },
  {
    path: 'room-detail/:id',
    component: RoomDetailComponent,
    title: 'Chi tiết phòng - RoomFinder.vn',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
