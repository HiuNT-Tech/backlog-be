import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '@common/enums/role.enum';

@Schema({
  collection: 'users',
  timestamps: true,
})
export class UserMongo {
  _id: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, default: null, trim: true })
  phone: string | null;

  @Prop({ enum: Object.values(Role), default: Role.USER })
  role: Role;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}

export type UserMongoDocument = HydratedDocument<UserMongo>;
export const UserSchema = SchemaFactory.createForClass(UserMongo);

UserSchema.index({ email: 1 }, { unique: true });
