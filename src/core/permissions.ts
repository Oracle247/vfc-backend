import { UserRole } from "@prisma/client";
import prisma from "./databases/prisma";

/**
 * Canonical permission keys. Mirror the seed in prisma/seed.ts. Defined here
 * so route handlers can pass `PERM.canManageMembers` instead of bare strings
 * (catches typos at compile time).
 */
export const PERM = {
  canManageMembers:      "canManageMembers",
  canManageAttendance:   "canManageAttendance",
  canViewAnalytics:      "canViewAnalytics",
  canManageTasks:        "canManageTasks",
  canManageResources:    "canManageResources",
  canMakeAnnouncements:  "canMakeAnnouncements",
  canApproveRequests:    "canApproveRequests",
  canManageDeptSettings: "canManageDeptSettings",
} as const;

export type PermissionKey = (typeof PERM)[keyof typeof PERM];

const ALL_KEYS: PermissionKey[] = Object.values(PERM);

// Implicit grants for the legacy two-rung hierarchy. Heads get everything;
// assistants get all but settings (per Wave 1 plan).
const HEAD_GRANTS = new Set<PermissionKey>(ALL_KEYS);
const ASSISTANT_GRANTS = new Set<PermissionKey>(
  ALL_KEYS.filter((k) => k !== PERM.canManageDeptSettings),
);

/**
 * Resolve every permission a user holds for a given department. Combines:
 *  1) ADMIN role → everything (deptId still required for shape parity).
 *  2) Head/assistant implicit grants from existing relations.
 *  3) Union of permissions across every Position the user holds in this dept.
 *
 * Returns an empty Set when the user has no relation to the department.
 */
export async function userPermissionsInDept(
  userId: string,
  departmentId: string,
): Promise<Set<PermissionKey>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return new Set();
  if (user.role === UserRole.ADMIN) return new Set(ALL_KEYS);

  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: {
      headId: true,
      assistantHeads: { select: { id: true } },
    },
  });
  if (!dept) return new Set();

  if (dept.headId === userId) return new Set(HEAD_GRANTS);

  const grants = new Set<PermissionKey>();
  if (dept.assistantHeads.some((u) => u.id === userId)) {
    ASSISTANT_GRANTS.forEach((k) => grants.add(k));
  }

  // Layer on Position-derived permissions. A user can hold multiple Positions
  // in the same department — union their permission sets.
  const positions = await prisma.departmentPosition.findMany({
    where: { userId, departmentId },
    select: {
      position: {
        select: {
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  });
  for (const dp of positions) {
    for (const pp of dp.position.permissions) {
      grants.add(pp.permission.key as PermissionKey);
    }
  }

  return grants;
}

export async function userCan(
  userId: string,
  departmentId: string,
  key: PermissionKey,
): Promise<boolean> {
  const grants = await userPermissionsInDept(userId, departmentId);
  return grants.has(key);
}

/**
 * Bulk version: resolve permissions for every department the user touches via
 * head/assistant/member/positions in a single fan-out. Used by /user/me so
 * the frontend doesn't have to make N calls.
 */
export async function permissionsByDepartmentForUser(
  userId: string,
): Promise<Record<string, PermissionKey[]>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      headedDepartments:    { select: { id: true } },
      assistantDepartments: { select: { id: true } },
      departments:          { select: { id: true } },
      deptPositions: {
        select: {
          departmentId: true,
          position: {
            select: {
              permissions: { select: { permission: { select: { key: true } } } },
            },
          },
        },
      },
    },
  });
  if (!user) return {};

  // Every department the user touches in any capacity.
  const allDeptIds = new Set<string>([
    ...user.headedDepartments.map((d) => d.id),
    ...user.assistantDepartments.map((d) => d.id),
    ...user.departments.map((d) => d.id),
    ...user.deptPositions.map((p) => p.departmentId),
  ]);

  const result: Record<string, PermissionKey[]> = {};

  // ADMIN role grants everything in every dept they belong to.
  const isAdmin = user.role === UserRole.ADMIN;

  for (const deptId of allDeptIds) {
    const grants = new Set<PermissionKey>();
    if (isAdmin) {
      ALL_KEYS.forEach((k) => grants.add(k));
    } else {
      const isHead = user.headedDepartments.some((d) => d.id === deptId);
      const isAssist = user.assistantDepartments.some((d) => d.id === deptId);
      if (isHead) HEAD_GRANTS.forEach((k) => grants.add(k));
      else if (isAssist) ASSISTANT_GRANTS.forEach((k) => grants.add(k));

      for (const p of user.deptPositions) {
        if (p.departmentId !== deptId) continue;
        for (const pp of p.position.permissions) {
          grants.add(pp.permission.key as PermissionKey);
        }
      }
    }
    result[deptId] = Array.from(grants);
  }

  return result;
}
