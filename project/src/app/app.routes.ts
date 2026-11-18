import { Routes } from '@angular/router';
import { PostListPageComponent } from './features/posts/post-list-page/post-list-page.component';
import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { MyPageComponent } from './features/auth/my-page/my-page.component';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
  { path: '', component: PostListPageComponent },
  {
    path: 'posts/:id',
    loadComponent: () =>
      import('./features/posts/post-detail-page/post-detail-page.component').then(
        (module) => module.PostDetailPageComponent,
      ),
  },
  { path: 'login', component: LoginPageComponent },
  { path: 'mypage', component: MyPageComponent, canActivate: [authGuard] },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/auth/admin-page/admin-page.component').then((module) => module.AdminPageComponent),
  },
  {
    path: 'lab',
    loadComponent: () => import('./features/lab/lab-page.component').then((module) => module.LabPageComponent),
  },
];
