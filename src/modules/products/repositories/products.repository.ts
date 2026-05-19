import { Injectable } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PaginatedResponse } from '@common/dto/response.dto';
import { BasePrismaRepository } from '@database/prisma/repositories';
import { PrismaService } from '@database/prisma/prisma.service';

type ProductSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'sku'
  | 'name'
  | 'priceCents';

type FindPageParams = {
  page: number;
  limit: number;
  sortBy: ProductSortField;
  sortOrder: Prisma.SortOrder;
  includeInactive?: boolean;
};

@Injectable()
export class ProductsRepository extends BasePrismaRepository<
  PrismaService['product']
> {
  constructor(prisma: PrismaService) {
    super(prisma.product);
  }

  findPage(params: FindPageParams): Promise<PaginatedResponse<Product>> {
    return this.paginate({
      page: params.page,
      limit: params.limit,
      args: {
        where: params.includeInactive ? {} : { isActive: true },
        orderBy: {
          [params.sortBy]: params.sortOrder,
        },
      },
    });
  }

  findById(id: string): Promise<Product | null> {
    return this.findFirst({
      where: { id, isActive: true },
    });
  }

  findBySku(sku: string): Promise<Product | null> {
    return this.findOne({
      where: { sku },
    });
  }

  createProduct(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.create({
      data,
    });
  }

  updateProduct(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.update({
      where: { id },
      data,
    });
  }

  softDelete(id: string): Promise<Product> {
    return this.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
