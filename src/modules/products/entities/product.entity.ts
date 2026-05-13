export class ProductEntity {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  priceCents: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
