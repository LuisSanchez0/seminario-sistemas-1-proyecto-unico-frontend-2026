import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-home-page',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent implements OnInit {
  
  isLoadingTopProducts = signal(false);
  topProductsError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadTopProducts();
  }

  private loadTopProducts(): void {
    this.isLoadingTopProducts.set(true);
    this.topProductsError.set(null);


  }
}
