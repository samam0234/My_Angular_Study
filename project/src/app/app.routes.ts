import { Routes } from '@angular/router';
import { PostListPageComponent } from './features/posts/post-list-page/post-list-page.component';
import { PostDetailPageComponent } from './features/posts/post-detail-page/post-detail-page.component';
import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { MyPageComponent } from './features/auth/my-page/my-page.component';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', component: PostListPageComponent },
  { path: 'posts/:id', component: PostDetailPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'mypage', component: MyPageComponent, canActivate: [authGuard] },
];
