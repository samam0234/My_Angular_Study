import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FRUIT_CATALOG } from '../../data/fruit-catalog';

@Component({
  selector: 'app-fruit-catalog-page',
  imports: [RouterLink],
  templateUrl: './fruit-catalog.component.html',
})
export class FruitCatalogPageComponent {
  fruits = FRUIT_CATALOG;
}
