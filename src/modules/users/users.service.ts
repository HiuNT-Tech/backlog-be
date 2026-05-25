import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';
import { PaginatedResponse } from '@common/dto/response.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { Role } from '@common/enums/role.enum';
import { hashPassword, generateRandomToken } from '@common/utils/crypto.util';
import { normalizeEmail } from '@common/utils/string.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersRepository } from './repositories/users.repository';

const USER_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'email',
  'displayName',
] as const;
type UserSortField = (typeof USER_SORT_FIELDS)[number];

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.createForRegistration(dto);

    return this.toResponse(user);
  }

  async createForRegistration(dto: CreateUserDto): Promise<UserEntity> {
    const password = await hashPassword(dto.password);

    return await this.usersRepository.createUser({
      email: dto.email,
      displayName: dto.displayName,
      password,
      phone: dto.phone,
      role: Role.USER,
      verifyToken: generateRandomToken(),
    });
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const sortBy = this.normalizeSortBy(query.sortBy);

    const [users, total] = await Promise.all([
      this.usersRepository.findManyUsers({
        skip,
        take: limit,
        sortBy,
        sortOrder: query.sortOrder,
      }),
      this.usersRepository.countActiveUsers(),
    ]);

    return {
      items: users.map((user) => this.toResponse(user)),
      total,
    };
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.findExistingById(id);
    return this.toResponse(user);
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(normalizeEmail(email));
  }

  findByIdForAuth(id: number): Promise<UserEntity | null> {
    return this.usersRepository.findById(id);
  }

  async verifyAccount(id: number, token: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.verifyAccount(id, token);

    if (!user) {
      this.throwUserNotFound();
    }

    return this.toResponse(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    await this.findExistingById(id);

    const user = await this.usersRepository.updateUser(id, {
      displayName: dto.displayName,
      phone: dto.phone,
      isActive: dto.isActive,
    });

    if (!user) {
      this.throwUserNotFound();
    }

    return this.toResponse(user);
  }

  async remove(id: number): Promise<UserResponseDto> {
    await this.findExistingById(id);
    const user = await this.usersRepository.softDelete(id);

    if (!user) {
      this.throwUserNotFound();
    }

    return this.toResponse(user);
  }

  private async findExistingById(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findActiveById(id);

    if (!user) {
      this.throwUserNotFound();
    }

    return user;
  }

  private normalizeSortBy(sortBy: string): UserSortField {
    return USER_SORT_FIELDS.includes(sortBy as UserSortField)
      ? (sortBy as UserSortField)
      : 'createdAt';
  }

  private toResponse(user: UserEntity): UserResponseDto {
    return new UserResponseDto(user);
  }

  private throwUserNotFound(): never {
    throw new BusinessException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
}
