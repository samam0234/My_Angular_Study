import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { FruitCatalogPageComponent } from './pages/fruit-catalog/fruit-catalog.component';
import { FruitDetailLayoutComponent } from './pages/fruit-detail-layout/fruit-detail-layout.component';
import { FruitOverviewComponent } from './pages/fruit-detail-layout/overview/fruit-overview.component';
import { FruitReviewsComponent } from './pages/fruit-detail-layout/reviews/fruit-reviews.component';
import { LoginPageComponent } from './pages/login/login.component';
import { MyPageComponent } from './pages/my-page/my-page.component';
import { PostListPageComponent } from './pages/post-list/post-list.component';
import { PostDetailPageComponent } from './pages/post-detail/post-detail.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'fruits', component: FruitCatalogPageComponent },
  {
    path: 'fruits/:id',
    component: FruitDetailLayoutComponent,
    children: [
      { path: '', component: FruitOverviewComponent },
      { path: 'reviews', component: FruitReviewsComponent },
    ],
  },
  { path: 'login', component: LoginPageComponent },
  { path: 'mypage', component: MyPageComponent, canActivate: [authGuard] },
  { path: 'posts', component: PostListPageComponent },
  { path: 'posts/:id', component: PostDetailPageComponent },
];
