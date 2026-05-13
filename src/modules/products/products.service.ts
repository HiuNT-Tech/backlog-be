import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PaginatedResponse } from '@common/dto/response.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsRepository } from './repositories/products.repository';

const PRODUCT_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'sku',
  'name',
  'priceCents',
] as const;
type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const existingProduct = await this.productsRepository.findBySku(dto.sku);

    if (existingProduct) {
      throw new BusinessException(
        ErrorCode.PRODUCT_SKU_EXISTS,
        HttpStatus.CONFLICT,
      );
    }

    try {
      const product = await this.productsRepository.createProduct({
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        stock: dto.stock,
        isActive: dto.isActive,
      });

      return this.toResponse(product);
    } catch (error: unknown) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    const products = await this.productsRepository.findPage({
      page: query.page,
      limit: query.limit,
      sortBy: this.normalizeSortBy(query.sortBy),
      sortOrder: query.sortOrder,
    });

    return {
      items: products.items.map((product) => this.toResponse(product)),
      meta: products.meta,
    };
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.findExistingById(id);
    return this.toResponse(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    await this.findExistingById(id);

    if (dto.sku) {
      const productWithSku = await this.productsRepository.findBySku(dto.sku);

      if (productWithSku && productWithSku.id !== id) {
        throw new BusinessException(
          ErrorCode.PRODUCT_SKU_EXISTS,
          HttpStatus.CONFLICT,
        );
      }
    }

    try {
      const product = await this.productsRepository.updateProduct(id, {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        stock: dto.stock,
        isActive: dto.isActive,
      });

      return this.toResponse(product);
    } catch (error: unknown) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async remove(id: string): Promise<ProductResponseDto> {
    await this.findExistingById(id);
    const product = await this.productsRepository.softDelete(id);
    return this.toResponse(product);
  }

  private async findExistingById(id: string): Promise<Product> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new BusinessException(
        ErrorCode.PRODUCT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return product;
  }

  private normalizeSortBy(sortBy: string): ProductSortField {
    return PRODUCT_SORT_FIELDS.includes(sortBy as ProductSortField)
      ? (sortBy as ProductSortField)
      : 'createdAt';
  }

  private handleUniqueError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BusinessException(
        ErrorCode.PRODUCT_SKU_EXISTS,
        HttpStatus.CONFLICT,
      );
    }
  }

  private toResponse(product: Product): ProductResponseDto {
    return new ProductResponseDto(product);
  }
}
