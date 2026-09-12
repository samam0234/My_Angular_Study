import { Component } from '@angular/core';
import { FruitListPracticeComponent } from '../../components/fruit-list-practice/fruit-list-practice.component';

@Component({
  selector: 'app-home',
  imports: [FruitListPracticeComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {}
