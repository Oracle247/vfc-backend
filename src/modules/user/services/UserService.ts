import { Prisma, ChurchStatus, Gender, MembershipType, UserRole, WorkerType } from "@prisma/client";
import bcrypt from "bcrypt";
import { IUser } from "../models/UserModel";
import prisma from "../../../core/databases/prisma";
import { paginate } from "../../../core/utils/paginate";
import XLSX from "xlsx";
import fs from "node:fs";
import { analyzeTransactions } from "../../../core/utils/transaction";

type User = Prisma.UserGetPayload<{}>;

export class UserService {
  /**
   * Create new user
   */
  async createUser(data: IUser): Promise<Partial<User>> {
    let hashedPassword: string | null = null;

    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    let prismaData: any = {
      ...data,
      password: hashedPassword,
    };

    if (data.attendances) {
      prismaData.attendances = {
        create: data.attendances.map((attendance) => ({
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

    const { password, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  /**
   * Get user by ID (without password)
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

  /**
   * Get user by ID with password (for auth verification only)
   */
  async getUserByIdWithPassword(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async getUserByName(name: string): Promise<Partial<User>[] | null> {
    const results = await prisma.user.findMany({
      where: {
        OR: [
          {
            firstName: {
              contains: name,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: name,
              mode: "insensitive",
            },
          },
        ],
      },
    });

    if (!results) {
      throw new Error("User not found");
    }

    return results.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
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

  async analyzeExpenses(filePath: string): Promise<any> {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const transactions = XLSX.utils.sheet_to_json(sheet, {
      range: 7,
      defval: null
    });

    const totals = analyzeTransactions(transactions);

    fs.unlinkSync(filePath);

    return totals;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
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
   * Get users with filters and pagination
   */
  async getFilteredUsers(params: {
    page?: number;
    limit?: number;
    churchStatus?: ChurchStatus;
    membershipType?: MembershipType;
    role?: UserRole;
    search?: string;
  }) {
    const where: any = {};

    if (params.churchStatus) where.churchStatus = params.churchStatus;
    if (params.membershipType) where.membershipType = params.membershipType;
    if (params.role) where.role = params.role;
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    return paginate(prisma.user, {
      page: params.page || 1,
      limit: params.limit || 10,
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: Partial<IUser>): Promise<Partial<User>> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

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
   * Update church journey (churchStatus, membershipType, workerType, role)
   */
  async updateChurchJourney(id: string, data: {
    churchStatus?: ChurchStatus;
    membershipType?: MembershipType;
    workerType?: WorkerType;
    role?: UserRole;
  }): Promise<Partial<User>> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("User not found");

    const result = await prisma.user.update({
      where: { id },
      data,
    });

    const { password, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  /**
   * Set password for a user (admin action for promoting to WORKER/ADMIN)
   */
  async setPassword(id: string, newPassword: string): Promise<Partial<User>> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("User not found");

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    const { password, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  /**
   * Bulk import members from Excel
   * Expected columns: firstName, lastName, email, phoneNumber, gender, address, churchStatus (optional)
   */
  async bulkImportFromExcel(filePath: string): Promise<{
    created: number;
    skipped: string[];
    errors: string[];
  }> {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    fs.unlinkSync(filePath);

    if (!rows.length) throw new Error("Excel file is empty");

    const results = { created: 0, skipped: [] as string[], errors: [] as string[] };

    for (const row of rows) {
      try {
        const email = row.email?.toString().trim().toLowerCase();
        if (!email) {
          results.errors.push(`Row skipped: missing email`);
          continue;
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          results.skipped.push(email);
          continue;
        }

        if (!row.firstName || !row.lastName || !row.phoneNumber || !row.gender || !row.address) {
          results.errors.push(`"${email}": missing required fields (firstName, lastName, phoneNumber, gender, address)`);
          continue;
        }

        const gender = row.gender?.toString().toUpperCase();
        if (gender !== "MALE" && gender !== "FEMALE") {
          results.errors.push(`"${email}": invalid gender "${row.gender}". Must be MALE or FEMALE`);
          continue;
        }

        let churchStatus: ChurchStatus = ChurchStatus.VISITOR;
        if (row.churchStatus) {
          const status = row.churchStatus.toString().toUpperCase().replace(/\s+/g, "_");
          if (Object.values(ChurchStatus).includes(status as ChurchStatus)) {
            churchStatus = status as ChurchStatus;
          }
        }

        await prisma.user.create({
          data: {
            firstName: row.firstName.toString().trim(),
            lastName: row.lastName.toString().trim(),
            email,
            phoneNumber: row.phoneNumber.toString().trim(),
            gender: gender as Gender,
            address: row.address.toString().trim(),
            churchStatus,
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
            matricNumber: row.matricNumber?.toString().trim() || null,
            department: row.department?.toString().trim() || null,
            level: row.level?.toString().trim() || null,
            faculty: row.faculty?.toString().trim() || null,
            nationality: row.nationality?.toString().trim() || null,
            stateOfOrigin: row.stateOfOrigin?.toString().trim() || null,
            emergencyContact: row.emergencyContact?.toString().trim() || null,
          },
        });

        results.created++;
      } catch (error: any) {
        results.errors.push(`"${row.email}": ${error.message}`);
      }
    }

    return results;
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
