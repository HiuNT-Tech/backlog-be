export type ProductResponseSource = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  priceCents: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class ProductResponseDto {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  priceCents: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  constructor(product: ProductResponseSource) {
    this.id = product.id;
    this.sku = product.sku;
    this.name = product.name;
    this.description = product.description;
    this.priceCents = product.priceCents;
    this.stock = product.stock;
    this.isActive = product.isActive;
    this.createdAt = product.createdAt.toISOString();
    this.updatedAt = product.updatedAt.toISOString();
  }
}
