import 'dotenv/config';
import mongoose from 'mongoose';
import { Role } from '@common/enums/role.enum';
import { hashPassword } from '@common/utils/crypto.util';
import { UserMongo, UserSchema } from '@modules/users/schemas/user.schema';

const UserModel = mongoose.model(UserMongo.name, UserSchema);

async function main(): Promise<void> {
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(mongodbUri);

  const email = 'admin@example.com';
  const password = await hashPassword('Admin@123456');

  await UserModel.updateOne(
    { email },
    {
      $setOnInsert: {
        email,
        name: 'Admin',
        password,
        role: Role.ADMIN,
      },
    },
    { upsert: true, runValidators: true },
  ).exec();
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
