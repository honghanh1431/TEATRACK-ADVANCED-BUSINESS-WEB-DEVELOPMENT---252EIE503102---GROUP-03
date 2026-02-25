import { Injectable } from '@angular/core';
import { ProductItem } from './Pages/product/product';

@Injectable({ providedIn: 'root' })
export class ProductStateService {
  private nextProduct: ProductItem | null = null;

  setNextProduct(p: ProductItem | null): void {
    this.nextProduct = p;
  }

  getAndClearNextProduct(): ProductItem | null {
    const p = this.nextProduct;
    this.nextProduct = null;
    return p;
  }
}
