import {
  ConflictException,
  Injectable,
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
  role: Role;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
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

    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      password: dto.password,
      phone: dto.phone,
      role: Role.USER,
    });

    return this.buildAuthResponse(user);
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

  async me(payload: JwtPayload): Promise<AuthUserResponse> {
    const user = await this.usersService.findOne(payload.sub);

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
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private toAuthUser(user: UserResponseDto): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
