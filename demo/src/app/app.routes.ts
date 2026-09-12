import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { FruitCatalogPageComponent } from './pages/fruit-catalog/fruit-catalog.component';
import { FruitDetailPageComponent } from './pages/fruit-detail/fruit-detail.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'fruits', component: FruitCatalogPageComponent },
  { path: 'fruits/:id', component: FruitDetailPageComponent },
];
