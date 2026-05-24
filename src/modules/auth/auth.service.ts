import {
  ConflictException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@common/enums/role.enum';
import { comparePassword } from '@common/utils/crypto.util';
import { JwtPayload } from '@/types/jwt-payload.type';
import { UserEntity } from '@modules/users/entities/user.entity';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { UsersService } from '@modules/users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './token.service';

type AuthUserResponse = {
  id: string;
  email: string;
  name: string;
  username: string;
  displayName: string;
  avatar: string | null;
  userCode: string | null;
  role: Role;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
};

type LegacyUserResponse = {
  _id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string | null;
  userCode: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AuthUserSource = {
  id: string;
  email: string;
  name: string;
  username?: string;
  displayName?: string;
  avatar?: string | null;
  userCode?: string | null;
  role: Role | string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmailWithPassword(
      dto.email,
    );

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const newUser = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      password: dto.password,
      phone: dto.phone,
      role: Role.USER,
    });

    return this.buildAuthResponse(newUser);
  }

  async legacyRegister(dto: Pick<RegisterDto, 'email' | 'password'>) {
    const name = dto.email.split('@')[0];
    const existingUser = await this.usersService.findByEmailWithPassword(
      dto.email,
    );

    if (existingUser) {
      throw new ConflictException('Email already exists!');
    }

    const user = await this.usersService.create({
      email: dto.email,
      name,
      password: dto.password,
      role: Role.USER,
    });

    return this.toLegacyUser(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatched = await comparePassword(dto.password, user.password);

    if (!passwordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponseFromUser(user);
  }

  async legacyLogin(
    dto: LoginDto,
  ): Promise<
    LegacyUserResponse & Pick<AuthResponse, 'accessToken' | 'refreshToken'>
  > {
    const authResponse = await this.login(dto);
    const user = await this.usersService.findByIdForAuth(authResponse.user.id);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      ...this.toLegacyUser(new UserResponseDto(user)),
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
    };
  }

  async verifyAccount(dto: {
    email: string;
    token: string;
  }): Promise<LegacyUserResponse> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    if (user.isActive) {
      throw new NotAcceptableException('User already verified!');
    }

    if (dto.token !== user.verifyToken) {
      throw new NotAcceptableException('Invalid verification token!');
    }

    const verifiedUser = await this.usersService.verifyAccount(
      user.id,
      dto.token,
    );

    return this.toLegacyUser(verifiedUser);
  }

  async refreshToken(
    refreshToken: string | undefined,
  ): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid token');
    }

    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.usersService.findByIdForAuth(payload.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    const accessToken = await this.tokenService.signAccessToken(
      this.toPayload(this.toAuthUser(user)),
    );

    return { accessToken };
  }

  async me(payload: JwtPayload): Promise<AuthUserResponse> {
    const user = await this.usersService.findByIdForAuth(payload.userId);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Inactive user');
    }

    return this.toAuthUser(user);
  }

  private async buildAuthResponse(
    user: UserResponseDto,
  ): Promise<AuthResponse> {
    const authUser = this.toAuthUser(user);
    const payload = this.toPayload(authUser);
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken(payload),
      this.tokenService.signRefreshToken(payload),
    ]);

    return {
      accessToken,
      refreshToken,
      user: authUser,
    };
  }

  private async buildAuthResponseFromUser(
    user: UserEntity,
  ): Promise<AuthResponse> {
    return this.buildAuthResponse(new UserResponseDto(user));
  }

  private toPayload(user: AuthUserResponse): JwtPayload {
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private toAuthUser(user: AuthUserSource): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username ?? user.email.split('@')[0],
      displayName: user.displayName ?? user.name,
      avatar: user.avatar ?? null,
      userCode: user.userCode ?? null,
      role: user.role as Role,
    };
  }

  private toLegacyUser(user: UserResponseDto): LegacyUserResponse {
    return {
      _id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      userCode: user.userCode,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
