import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { UserService } from "../../user/services";
import { IUser } from "../../user/models/UserModel";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export class AuthService {
    private userService = new UserService();

    /**
     * Register a new user
     * - Default role is MEMBER (no password required)
     * - Workers/Admins should have password set via setPassword endpoint
     */
    async register(data: IUser) {
        const existingUser = await this.userService.getUserByEmail(data.email);
        if (existingUser) throw new Error("User already exists");

        const newUser = await this.userService.createUser({
            ...data,
            password: data.password || undefined,
        });

        return { user: newUser };
    }

    /**
     * Login - generates JWT with userId and role
     */
    async login(email: string, password: string) {
        const user = await this.userService.getUserByEmail(email);
        if (!user) throw new Error("Invalid email or password");

        if (!user.password) {
            throw new Error("Account does not have a password. Contact an administrator.");
        }

        if (!(await bcrypt.compare(password, user.password))) {
            throw new Error("Invalid email or password");
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        const { password: _, ...userWithoutPassword } = user;

        return { user: userWithoutPassword, token };
    }

    /**
     * Change password
     */
    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await this.userService.getUserByIdWithPassword(userId);
        if (!user) throw new Error("User not found");

        if (!(await bcrypt.compare(oldPassword, user.password ?? ""))) {
            throw new Error("Invalid old password");
        }

        const updatedUser = await this.userService.updateUser(userId, { password: newPassword });
        return updatedUser;
    }

    /**
     * Forgot password
     */
    async forgotPassword(email: string) {
        const user = await this.userService.getUserByEmail(email);
        if (!user) throw new Error("User not found");

        //TODO: Implement actual password reset logic (e.g., send email with reset link)
        const newPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.userService.updateUser(user.id, { password: hashedPassword });

        return newPassword;
    }

    /**
     * Verify JWT
     */
    async verifyToken(token: string) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: UserRole };
            return decoded;
        } catch (err) {
            throw new Error("Invalid token");
        }
    }
}
