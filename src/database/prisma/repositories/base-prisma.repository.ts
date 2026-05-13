import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '@common/dto/response.dto';

type RequiredOperation<TArgs, TResult> = (args: TArgs) => PromiseLike<TResult>;

type OptionalOperation<TArgs, TResult> = (args?: TArgs) => PromiseLike<TResult>;

type FindUniqueDelegate<TArgs, TResult> = {
  findUnique: RequiredOperation<TArgs, TResult>;
};

type FindFirstDelegate<TArgs, TResult> = {
  findFirst: OptionalOperation<TArgs, TResult>;
};

type FindManyDelegate<TArgs, TResult> = {
  findMany: OptionalOperation<TArgs, TResult>;
};

type CountDelegate<TArgs, TResult> = {
  count: OptionalOperation<TArgs, TResult>;
};

type CreateDelegate<TArgs, TResult> = {
  create: RequiredOperation<TArgs, TResult>;
};

type CreateManyDelegate<TArgs, TResult> = {
  createMany: RequiredOperation<TArgs, TResult>;
};

type UpdateDelegate<TArgs, TResult> = {
  update: RequiredOperation<TArgs, TResult>;
};

type UpdateManyDelegate<TArgs, TResult> = {
  updateMany: RequiredOperation<TArgs, TResult>;
};

type UpsertDelegate<TArgs, TResult> = {
  upsert: RequiredOperation<TArgs, TResult>;
};

type DeleteDelegate<TArgs, TResult> = {
  delete: RequiredOperation<TArgs, TResult>;
};

type DeleteManyDelegate<TArgs, TResult> = {
  deleteMany: RequiredOperation<TArgs, TResult>;
};

type ArrayItem<T> = T extends Array<infer TItem> ? TItem : never;

type FindManyBaseArgs = {
  where?: unknown;
};

export type PrismaPaginationParams<TArgs> = {
  page: number;
  limit: number;
  args?: TArgs;
};

export abstract class BasePrismaRepository<TDelegate> {
  protected constructor(protected readonly delegate: TDelegate) {}

  findOne<TArgs extends Prisma.Args<TDelegate, 'findUnique'>>(
    args: TArgs,
  ): Promise<Prisma.Result<TDelegate, TArgs, 'findUnique'>> {
    type TResult = Prisma.Result<TDelegate, TArgs, 'findUnique'>;
    const delegate = this.delegate as unknown as FindUniqueDelegate<
      TArgs,
      TResult
    >;

    return Promise.resolve(delegate.findUnique(args));
  }

  findFirst<
    TArgs extends Prisma.Args<TDelegate, 'findFirst'> = Prisma.Args<
      TDelegate,
      'findFirst'
    >,
  >(args?: TArgs): Promise<Prisma.Result<TDelegate, TArgs, 'findFirst'>> {
    type TResult = Prisma.Result<TDelegate, TArgs, 'findFirst'>;
    const delegate = this.delegate as unknown as FindFirstDelegate<
      TArgs,
      TResult
    >;

    return Promise.resolve(delegate.findFirst(args));
  }

  findMany<
    TArgs extends Prisma.Args<TDelegate, 'findMany'> = Prisma.Args<
      TDelegate,
      'findMany'
    >,
  >(args?: TArgs): Promise<Prisma.Result<TDelegate, TArgs, 'findMany'>> {
    type TResult = Prisma.Result<TDelegate, TArgs, 'findMany'>;
    const delegate = this.delegate as unknown as FindManyDelegate<
      TArgs,
      TResult
    >;

    return Promise.resolve(delegate.findMany(args));
  }

  count<
    TArgs extends Prisma.Args<TDelegate, 'count'> = Prisma.Args<
      TDelegate,
      'count'
    >,
  >(args?: TArgs): Promise<Prisma.Result<TDelegate, TArgs, 'count'>> {
    type TResult = Prisma.Result<TDelegate, TArgs, 'count'>;
    const delegate = this.delegate as unknown as CountDelegate<TArgs, TResult>;

    return Promise.resolve(delegate.count(args));
  }

  async paginate<
    TArgs extends Prisma.Args<TDelegate, 'findMany'> = Prisma.Args<
      TDelegate,
      'findMany'
    >,
  >(
    params: PrismaPaginationParams<TArgs>,
  ): Promise<
    PaginatedResponse<ArrayItem<Prisma.Result<TDelegate, TArgs, 'findMany'>>>
  > {
    const page = Math.max(params.page, 1);
    const limit = Math.max(params.limit, 1);
    const skip = (page - 1) * limit;
    const findManyArgs = {
      ...(params.args ?? {}),
      skip,
      take: limit,
    } as TArgs;
    const countArgs = this.toCountArgs(params.args);

    const [items, total] = await Promise.all([
      this.findMany(findManyArgs),
      this.count(countArgs),
    ]);

    return {
      items: items as ArrayItem<Prisma.Result<TDelegate, TArgs, 'findMany'>>[],
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  create<TArgs extends Prisma.Args<TDelegate, 'create'>>(
    args: TArgs,
  ): Promise<Prisma.Result<TDelegate, TArgs, 'create'>> {
    type TResult = Prisma.Result<TDelegate, TArgs, 'create'>;
    const delegate = this.delegate as unknown as CreateDelegate<TArgs, TResult>;

    return Promise.resolve(delegate.create(args));
  }

  createMany<TArgs extends Prisma.Args<TDelegate, 'createMany'>>(
    args: TArgs,
  ): Promise<Prisma.Result<TDelegate, TArgs, 'createMany'>> {
    type TResult = Prisma.Result<TDelegate, TArgs, 'createMany'>;
    const delegate = this.delegate as unknown as CreateManyDelegate<
      TArgs,
      TResult
    >;

    return Promise.resolve(delegate.createMany(args));
  }

  update<TArgs extends Prisma.Args<TDelegate, 'update'>>(
    args: TArgs,
  ): Promise<Prisma.Result<TDelegate, TArgs, 'update'>> {
    type TResult = Prisma.Result<TDelegate, TArgs, 'update'>;
    const delegate = this.delegate as unknown as UpdateDelegate<TArgs, TResult>;

    return Promise.resolve(delegate.update(args));
  }

  updateMany<TArgs extends Prisma.Args<TDelegate, 'updateMany'>>(
    args: TArgs,
  ): Promise<Prisma.Result<TDelegate, TArgs, 'updateMany'>> {
    type TResult = Prisma.Result<TDelegate, TArgs, 'updateMany'>;
    const delegate = this.delegate as unknown as UpdateManyDelegate<
      TArgs,
      TResult
    >;

    return Promise.resolve(delegate.updateMany(args));
  }

  upsert<TArgs extends Prisma.Args<TDelegate, 'upsert'>>(
    args: TArgs,
  ): Promise<Prisma.Result<TDelegate, TArgs, 'upsert'>> {
    type TResult = Prisma.Result<TDelegate, TArgs, 'upsert'>;
    const delegate = this.delegate as unknown as UpsertDelegate<TArgs, TResult>;

    return Promise.resolve(delegate.upsert(args));
  }

  delete<TArgs extends Prisma.Args<TDelegate, 'delete'>>(
    args: TArgs,
  ): Promise<Prisma.Result<TDelegate, TArgs, 'delete'>> {
    type TResult = Prisma.Result<TDelegate, TArgs, 'delete'>;
    const delegate = this.delegate as unknown as DeleteDelegate<TArgs, TResult>;

    return Promise.resolve(delegate.delete(args));
  }

  deleteMany<TArgs extends Prisma.Args<TDelegate, 'deleteMany'>>(
    args: TArgs,
  ): Promise<Prisma.Result<TDelegate, TArgs, 'deleteMany'>> {
    type TResult = Prisma.Result<TDelegate, TArgs, 'deleteMany'>;
    const delegate = this.delegate as unknown as DeleteManyDelegate<
      TArgs,
      TResult
    >;

    return Promise.resolve(delegate.deleteMany(args));
  }

  private toCountArgs<TArgs extends FindManyBaseArgs | undefined>(
    args: TArgs,
  ): Prisma.Args<TDelegate, 'count'> {
    return {
      where: args?.where,
    } as Prisma.Args<TDelegate, 'count'>;
  }
}
