import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '@common/dto/response.dto';
import { PrismaService } from '@database/prisma/prisma.service';
import { BasePrismaRepository } from '@database/prisma/repositories';
import { toPaginatedResponse } from '@common/utils/pagination.util';
import { UserEntity } from '../entities/user.entity';

type FindPaginatedUsersParams = {
  page: number;
  limit: number;
  sortBy: keyof Pick<
    UserEntity,
    'createdAt' | 'updatedAt' | 'email' | 'displayName'
  >;
  sortOrder: 'asc' | 'desc';
};

type CreateUserData = {
  email: string;
  displayName?: string;
  password: string;
  phone?: string;
  verifyToken: string;
};

type UpdateUserData = Partial<
  Pick<UserEntity, 'displayName' | 'phone' | 'isActive'>
>;

type UpdateProfileData = Partial<
  Pick<UserEntity, 'displayName' | 'avatar' | 'phone'>
>;

const ACTIVE_FILTER: Prisma.UserWhereInput = {
  isActive: true,
  deletedAt: null,
};

const omitUndefined = <T extends Record<string, unknown>>(
  data: T,
): Partial<T> =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Partial<T>;

@Injectable()
export class UsersRepository extends BasePrismaRepository<
  PrismaService['user']
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.user);
  }

  async findPaginatedUsers(
    params: FindPaginatedUsersParams,
  ): Promise<PaginatedResponse<UserEntity>> {
    const result = await this.paginate({
      page: params.page,
      limit: params.limit,
      args: {
        where: ACTIVE_FILTER,
        orderBy: { [params.sortBy]: params.sortOrder },
      },
    });

    return toPaginatedResponse(
      result.items.map((user) => this.toEntity(user)),
      result.total,
    );
  }

  async findById(id: number): Promise<UserEntity | null> {
    const user = await this.delegate.findUnique({ where: { id } });
    return user ? this.toEntity(user) : null;
  }

  async findActiveById(id: number): Promise<UserEntity | null> {
    const user = await this.delegate.findFirst({
      where: { id, ...ACTIVE_FILTER },
    });
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.delegate.findUnique({ where: { email } });
    return user ? this.toEntity(user) : null;
  }

  async verifyAccount(id: number, token: string): Promise<UserEntity | null> {
    const existing = await this.delegate.findFirst({
      where: { id, verifyToken: token },
    });

    if (!existing) {
      return null;
    }

    const user = await this.delegate.update({
      where: { id },
      data: { isActive: true, verifyToken: null },
    });

    return this.toEntity(user);
  }

  async createUser(data: CreateUserData): Promise<UserEntity> {
    const defaultDisplayName = data.email.split('@')[0];
    const displayName = data.displayName?.trim() || defaultDisplayName;

    const user = await this.delegate.create({
      data: {
        email: data.email,
        displayName,
        avatar: null,
        userCode: null,
        password: data.password,
        phone: data.phone ?? null,
        verifyToken: data.verifyToken,
        isActive: false,
      },
    });

    return this.toEntity(user);
  }

  async updateUser(
    id: number,
    data: UpdateUserData,
  ): Promise<UserEntity | null> {
    const existing = await this.delegate.findFirst({
      where: { id, ...ACTIVE_FILTER },
    });

    if (!existing) {
      return null;
    }

    const cleanData = omitUndefined(data);

    const user = await this.delegate.update({
      where: { id },
      data: cleanData,
    });

    return this.toEntity(user);
  }

  async updateProfile(
    id: number,
    data: UpdateProfileData,
  ): Promise<UserEntity | null> {
    const existing = await this.delegate.findFirst({
      where: { id, ...ACTIVE_FILTER },
    });

    if (!existing) {
      return null;
    }

    const user = await this.delegate.update({
      where: { id },
      data: omitUndefined(data),
    });

    return this.toEntity(user);
  }

  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async setResetPasswordToken(
    id: number,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpiresAt: expiresAt,
      },
    });
  }

  async resetPassword(id: number, hashedPassword: string): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });
  }

  async softDelete(id: number): Promise<UserEntity | null> {
    const existing = await this.delegate.findFirst({
      where: { id, ...ACTIVE_FILTER },
    });

    if (!existing) {
      return null;
    }

    const user = await this.delegate.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    return this.toEntity(user);
  }

  private toEntity(user: Prisma.UserGetPayload<object>): UserEntity {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      userCode: user.userCode,
      password: user.password,
      phone: user.phone,
      verifyToken: user.verifyToken,
      resetPasswordToken: user.resetPasswordToken,
      resetPasswordExpiresAt: user.resetPasswordExpiresAt,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }
}
