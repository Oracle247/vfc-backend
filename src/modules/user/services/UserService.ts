import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { IUser } from "../models/UserModel";
import prisma from "../../../core/databases/prisma";

type User = Prisma.UserGetPayload<{}>;

export class UserService {
  /**
   * Create new user (Member or Worker/Admin)
   */
  async createUser(data: IUser): Promise<Partial<User>> {
    let hashedPassword: string | null = null;

    // Only hash password if provided (workers/admins)
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    // Map attendances if present to Prisma format
    let prismaData: any = {
      ...data,
      password: hashedPassword,
    };

    if (data.attendances) {
      prismaData.attendances = {
        create: data.attendances.map((attendance) => ({
          // Map attendance fields as needed, e.g.:
          // date: attendance.date,
          // status: attendance.status,
          ...attendance,
        })),
      };
    }

    const result = await prisma.user.create({
      data: prismaData,
    });

    if (!result) {
      throw new Error("Failed to create user");
    }

    // Strip password before returning
    const { password, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<Partial<User> | null> {
    const result = await prisma.user.findUnique({
      where: { id },
    });

    if (!result) {
      throw new Error("User not found");
    }

    const { password, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  async getUser(id: string): Promise<Partial<User> | null> {
    const result = await prisma.user.findUnique({
      where: { id },
    });

    if (!result) {
      throw new Error("User not found");
    }

    const { password, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await prisma.user.findUnique({
      where: { email },
    });

    return result;
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<Partial<User>[]> {
    const result = await prisma.user.findMany();

    if (!result) {
      throw new Error("Failed to get users");
    }

    return result.map(({ password, ...rest }) => rest);
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: Partial<IUser>): Promise<Partial<User>> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Map attendances if present to Prisma format
    let prismaData: any = { ...data };
    if (data.attendances) {
      prismaData.attendances = {
        set: data.attendances.map((attendance) => ({ id: attendance.id })),
      };
    }

    const result = await prisma.user.update({
      where: { id },
      data: prismaData,
    });

    if (!result) {
      throw new Error("Failed to update user");
    }

    const { password, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<Partial<User>> {
    const result = await prisma.user.delete({
      where: { id },
    });

    if (!result) {
      throw new Error("Failed to delete user");
    }

    const { password, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }
}
