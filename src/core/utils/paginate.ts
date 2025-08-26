import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type PaginateOptions<T> = {
    page?: number;
    limit?: number;
} & T; // This allows passing other Prisma options like 'include', 'where', etc.

export async function paginate<ModelName extends keyof PrismaClient, Args>(
    model: PrismaClient[ModelName],
    args: PaginateOptions<Args>
) {
    const page = args.page || 1;
    const limit = args.limit || 10;
    const skip = (page - 1) * limit;

    // Clone args without page and limit
    const queryArgs = { ...args } as any;
    delete queryArgs.page;
    delete queryArgs.limit;

    const [data, total] = await Promise.all([
        (model as any).findMany({
            skip,
            take: limit,
            ...queryArgs,
        }),
        (model as any).count({
            where: queryArgs.where, // count usually needs just the where
        }),
    ]);

    if (!data) {
        throw new Error('No data found');
    }

    return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}
