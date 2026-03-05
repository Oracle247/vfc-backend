import prisma from "../../../core/databases/prisma";
import { paginate } from "../../../core/utils/paginate";
import XLSX from "xlsx";
import fs from "node:fs";

export class DepartmentService {
  /**
   * Create a new department
   */
  async createDepartment(data: { name: string; description?: string }) {
    const existing = await prisma.department.findUnique({ where: { name: data.name } });
    if (existing) throw new Error("A department with this name already exists");

    return prisma.department.create({ data });
  }

  /**
   * Get all departments (paginated) with head and members
   */
  async getAllDepartments(page = 1, limit = 10) {
    return paginate(prisma.department, {
      page,
      limit,
      include: {
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get department by ID with full relations
   */
  async getDepartmentById(id: string) {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!department) throw new Error("Department not found");
    return department;
  }

  /**
   * Update department
   */
  async updateDepartment(id: string, data: { name?: string; description?: string }) {
    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) throw new Error("Department not found");

    if (data.name && data.name !== department.name) {
      const existing = await prisma.department.findUnique({ where: { name: data.name } });
      if (existing) throw new Error("A department with this name already exists");
    }

    return prisma.department.update({ where: { id }, data });
  }

  /**
   * Delete department
   */
  async deleteDepartment(id: string) {
    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) throw new Error("Department not found");

    return prisma.department.delete({ where: { id } });
  }

  /**
   * Assign a head to a department (also connects user as member)
   */
  async assignHead(departmentId: string, userId: string) {
    const [department, user] = await Promise.all([
      prisma.department.findUnique({ where: { id: departmentId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!department) throw new Error("Department not found");
    if (!user) throw new Error("User not found");

    return prisma.department.update({
      where: { id: departmentId },
      data: {
        headId: userId,
        members: { connect: { id: userId } },
      },
      include: {
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /**
   * Remove head from a department
   */
  async removeHead(departmentId: string) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) throw new Error("Department not found");

    return prisma.department.update({
      where: { id: departmentId },
      data: { headId: null },
      include: {
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /**
   * Add members to a department
   */
  async addMembers(departmentId: string, userIds: string[]) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) throw new Error("Department not found");

    // Verify all users exist
    const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
    if (users.length !== userIds.length) {
      const foundIds = users.map(u => u.id);
      const missing = userIds.filter(id => !foundIds.includes(id));
      throw new Error(`Users not found: ${missing.join(", ")}`);
    }

    return prisma.department.update({
      where: { id: departmentId },
      data: {
        members: { connect: userIds.map(id => ({ id })) },
      },
      include: {
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /**
   * Remove members from a department (also clears headId if removing the head)
   */
  async removeMembers(departmentId: string, userIds: string[]) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) throw new Error("Department not found");

    const updateData: any = {
      members: { disconnect: userIds.map(id => ({ id })) },
    };

    // If the head is being removed, clear headId too
    if (department.headId && userIds.includes(department.headId)) {
      updateData.headId = null;
    }

    return prisma.department.update({
      where: { id: departmentId },
      data: updateData,
      include: {
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /**
   * Bulk create departments from Excel
   * Expected columns: name, description
   */
  async bulkCreateFromExcel(filePath: string): Promise<{
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
        const name = row.name?.toString().trim();
        if (!name) {
          results.errors.push("Row skipped: missing name");
          continue;
        }

        const existing = await prisma.department.findUnique({ where: { name } });
        if (existing) {
          results.skipped.push(name);
          continue;
        }

        await prisma.department.create({
          data: {
            name,
            description: row.description?.toString().trim() || null,
          },
        });

        results.created++;
      } catch (error: any) {
        results.errors.push(`"${row.name}": ${error.message}`);
      }
    }

    return results;
  }
}
