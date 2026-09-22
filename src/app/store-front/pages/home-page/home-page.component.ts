import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SellService } from '../../../sell/services/sell.service';
import { TopProduct } from '../../../sell/interfaces/sell.interface';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent implements OnInit {
  private readonly sellService = inject(SellService);

  topProducts = signal<TopProduct[]>([]);
  isLoadingTopProducts = signal(false);
  topProductsError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadTopProducts();
  }

  private loadTopProducts(): void {
    this.isLoadingTopProducts.set(true);
    this.topProductsError.set(null);

    this.sellService.getTopProducts().subscribe({
      next: (res) => {
        this.topProducts.set(res.products);
        this.isLoadingTopProducts.set(false);
      },
      error: () => {
        this.topProductsError.set('No pudimos cargar los productos más vendidos.');
        this.isLoadingTopProducts.set(false);
      },
    });
  }
}
