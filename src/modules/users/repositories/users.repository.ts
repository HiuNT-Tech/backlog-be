import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';
import { Role } from '@common/enums/role.enum';
import { UserEntity } from '../entities/user.entity';
import { UserMongo, UserMongoDocument } from '../schemas/user.schema';

type FindManyUsersParams = {
  skip: number;
  take: number;
  sortBy: keyof Pick<UserEntity, 'createdAt' | 'updatedAt' | 'email' | 'name'>;
  sortOrder: SortOrder;
};

type CreateUserData = {
  email: string;
  name: string;
  password: string;
  phone?: string;
  role: Role;
  verifyToken: string;
};

type UpdateUserData = Partial<
  Pick<UserEntity, 'name' | 'phone' | 'role' | 'isActive'>
>;

type MongoUpdateValue = string | boolean | null;

type MongoUpdateData = Partial<Record<keyof UpdateUserData, MongoUpdateValue>>;

const omitUndefined = (data: UpdateUserData): MongoUpdateData =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(UserMongo.name)
    private readonly userModel: Model<UserMongo>,
  ) {}

  async findMany(params: FindManyUsersParams): Promise<UserEntity[]> {
    const users = await this.userModel
      .find({ isActive: true })
      .skip(params.skip)
      .limit(params.take)
      .sort({ [params.sortBy]: params.sortOrder })
      .exec();

    return users.map((user) => this.toEntity(user));
  }

  countActive(): Promise<number> {
    return this.userModel.countDocuments({ isActive: true }).exec();
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.userModel.findById(id).exec();
    return user ? this.toEntity(user) : null;
  }

  async findActiveById(id: string): Promise<UserEntity | null> {
    const user = await this.userModel
      .findOne({ _id: id, isActive: true })
      .exec();
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.userModel.findOne({ email }).exec();
    return user ? this.toEntity(user) : null;
  }

  async verifyAccount(id: string, token: string): Promise<UserEntity | null> {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: id, verifyToken: token },
        {
          $set: {
            isActive: true,
            verifyToken: null,
          },
        },
        { new: true, runValidators: true },
      )
      .exec();

    return user ? this.toEntity(user) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const nameFromEmail = data.email.split('@')[0];
    const displayName = data.name || nameFromEmail;
    const user = await this.userModel.create({
      ...data,
      username: nameFromEmail,
      displayName,
      avatar: null,
      userCode: data.verifyToken,
      _destroy: false,
    });
    return this.toEntity(user);
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity | null> {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: id, isActive: true },
        { $set: omitUndefined(data) },
        { new: true, runValidators: true },
      )
      .exec();

    return user ? this.toEntity(user) : null;
  }

  async softDelete(id: string): Promise<UserEntity | null> {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: id, isActive: true },
        {
          $set: {
            isActive: false,
          },
        },
        { new: true },
      )
      .exec();

    return user ? this.toEntity(user) : null;
  }

  private toEntity(user: UserMongoDocument): UserEntity {
    const id = user._id.toString();
    const emailName = user.email.split('@')[0];
    const displayName =
      user.displayName ?? user.name ?? user.username ?? emailName;
    const username = user.username ?? emailName;

    return {
      id,
      _id: id,
      email: user.email,
      name: user.name ?? displayName,
      username,
      displayName,
      avatar: user.avatar ?? null,
      userCode: user.userCode ?? null,
      password: user.password,
      phone: user.phone ?? null,
      role: user.role ?? Role.USER,
      verifyToken: user.verifyToken,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt ?? null,
    };
  }
}
