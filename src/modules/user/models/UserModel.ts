import { UserRole, Gender } from "@prisma/client";
import { IAttendance } from "../../attendance/interfaces/AttendanceModel";

export interface IUser {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: Gender;
  address: string;
  dateOfBirth?: Date;
  password?: string;

  // Campus-specific details
  matricNumber?: string; // For students only
  department?: string;
  level?: string; // e.g., "100", "200", "300", "400", "Postgraduate"
  faculty?: string;

  // Other identifiers
  role: UserRole; // Student, Staff, Visitor
  nationality?: string;
  stateOfOrigin?: string;
  emergencyContact?: string;

  // Attendance relation
  attendances?: IAttendance[];

  createdAt?: Date;
  updatedAt?: Date;
}
