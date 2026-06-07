import { ChurchStatus, Gender, MembershipType, Prisma } from "@prisma/client";

export interface AttendanceFilterParams {
  departmentIds?: string[];
  gender?: Gender;
  membershipType?: MembershipType;
  churchStatus?: ChurchStatus;
  lateComers?: boolean;
  serviceOrder?: number;
}

export type AttendeeWithUser = Prisma.AttendanceGetPayload<{
  include: { user: { include: { departments: true } } };
}>;

/** Just the time fields needed for the late check on a single service. */
export type ServiceTimes = Pick<
  Prisma.SessionServiceGetPayload<{}>,
  "serviceTime" | "preServiceTime"
>;

/**
 * A single service's order + timing. Used by inferServiceOrder and the late
 * check across the codebase.
 */
export interface SessionServiceLite {
  order: number;
  serviceTime: Date;
  preServiceTime: Date | null;
  closesAt: Date | null;
}

/**
 * Pick the service an attendee belongs to based on their markedAt. Walks the
 * services in order and uses each service's closesAt (or the next service's
 * serviceTime, when closesAt is null) as the boundary into the next service.
 * Returns the order of the last service when markedAt is past every boundary.
 */
export function inferServiceOrder(
  markedAt: Date,
  services: SessionServiceLite[],
): number {
  if (services.length === 0) return 1;
  const sorted = [...services].sort((a, b) => a.order - b.order);
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const boundary = current.closesAt ?? next.serviceTime;
    if (markedAt.getTime() < boundary.getTime()) return current.order;
  }
  return sorted[sorted.length - 1].order;
}

/**
 * Determines whether a single attendance record counts as "late".
 *
 * Rule: workers must arrive by `preServiceTime` when set, otherwise by
 * `serviceTime`. Non-workers must arrive by `serviceTime`. No grace window.
 */
export function isLateAttendance(
  markedAt: Date,
  membershipType: MembershipType | null,
  service: ServiceTimes,
): boolean {
  const cutoff =
    membershipType === MembershipType.WORKER && service.preServiceTime
      ? service.preServiceTime
      : service.serviceTime;
  return markedAt.getTime() > cutoff.getTime();
}

/**
 * Build the Prisma `where` clause for DB-side filters on the Attendance list.
 * Returns only user-side criteria — callers add `sessionId` themselves when
 * needed (it's implicit when nested under `session.attendees.where`).
 *
 * `lateComers` is intentionally excluded — it depends on per-attendance
 * computation (markedAt vs the matching service's cutoff + membershipType)
 * and is applied post-fetch via {@link applyPostFetchFilters}.
 */
export function buildAttendanceWhere(
  filters: AttendanceFilterParams,
): Prisma.AttendanceWhereInput {
  const userWhere: Prisma.UserWhereInput = {};

  if (filters.gender) userWhere.gender = filters.gender;
  if (filters.membershipType) userWhere.membershipType = filters.membershipType;
  if (filters.churchStatus) userWhere.churchStatus = filters.churchStatus;
  if (filters.departmentIds && filters.departmentIds.length > 0) {
    userWhere.departments = { some: { id: { in: filters.departmentIds } } };
  }

  const where: Prisma.AttendanceWhereInput = {};
  if (Object.keys(userWhere).length > 0) where.user = userWhere;
  if (filters.serviceOrder) where.serviceOrder = filters.serviceOrder;

  return where;
}

/**
 * Apply filters that can't be expressed in a Prisma where clause (currently
 * just `lateComers`, which needs the matching service's cutoffs per row).
 */
export function applyPostFetchFilters<
  T extends AttendeeWithUser & { serviceOrder: number },
>(
  attendees: T[],
  filters: AttendanceFilterParams,
  services: SessionServiceLite[],
): T[] {
  if (!filters.lateComers) return attendees;
  const serviceByOrder = new Map(services.map((s) => [s.order, s]));
  return attendees.filter((a) => {
    const svc = serviceByOrder.get(a.serviceOrder) ?? services[0];
    if (!svc) return false;
    return isLateAttendance(a.markedAt, a.user.membershipType, svc);
  });
}

/**
 * Parse comma-separated and string query params into a typed filter object.
 * Enum-value validation is the caller's responsibility (Zod schema).
 */
export function parseAttendanceFilterQuery(query: Record<string, unknown>): AttendanceFilterParams {
  const filters: AttendanceFilterParams = {};

  const departmentIds = query.departmentIds;
  if (typeof departmentIds === "string" && departmentIds.length > 0) {
    filters.departmentIds = departmentIds.split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (typeof query.gender === "string") filters.gender = query.gender as Gender;
  if (typeof query.membershipType === "string")
    filters.membershipType = query.membershipType as MembershipType;
  if (typeof query.churchStatus === "string")
    filters.churchStatus = query.churchStatus as ChurchStatus;
  if (query.lateComers === "true" || query.lateComers === true) filters.lateComers = true;
  if (typeof query.serviceOrder === "string" && query.serviceOrder.length > 0) {
    const n = Number(query.serviceOrder);
    if (Number.isFinite(n) && n > 0) filters.serviceOrder = n;
  } else if (typeof query.serviceOrder === "number") {
    filters.serviceOrder = query.serviceOrder;
  }

  return filters;
}
