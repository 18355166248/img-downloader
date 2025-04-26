import { Injectable } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  private readonly users: User[] = [];

  create(createUserDto: CreateUserDto): User {
    const user = new User();
    user.id = this.users.length + 1;
    user.username = createUserDto.username;
    user.email = createUserDto.email;
    user.password = createUserDto.password; // 实际应用中应该加密
    user.createdAt = new Date();
    user.updatedAt = new Date();

    this.users.push(user);
    return user;
  }

  findAll(): User[] {
    return this.users;
  }

  findOne(id: number): User | null {
    return this.users.find((user) => user.id === id) ?? null;
  }

  update(id: number, updateUserDto: UpdateUserDto): User | null {
    const user = this.findOne(id);
    if (!user) return null;

    Object.assign(user, updateUserDto);
    user.updatedAt = new Date();

    return user;
  }

  remove(id: number): boolean {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) return false;

    this.users.splice(index, 1);
    return true;
  }
}
