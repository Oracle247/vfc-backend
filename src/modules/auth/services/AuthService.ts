import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { UserService } from "../../user/services";
import { IUser } from "../../user/models/UserModel";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export enum UserRole {
    MEMBER = "MEMBER",
    WORKER = "WORKER",
    ADMIN = "ADMIN"
}

export class AuthService {
    private userService = new UserService();

    /**
     * Register a new user
     * - Members don't require a password
     * - Workers must provide a password
     */
    async register(data: IUser) {
        const existingUser = await this.userService.getUserByEmail(data.email);
        if (existingUser) throw new Error("User already exists");

        let password: string | null = null;

        if (data.role === UserRole.WORKER || data.role === UserRole.ADMIN) {
            if (!data.password) throw new Error("Password is required for workers and admins");
            password = data.password;
        }

        const newUser = await this.userService.createUser({
            ...data,
            password: password,
            role: data.role || UserRole.MEMBER,
        });

        // Generate token only for workers/admins
        let token: string | null = null;
        if (newUser.role !== UserRole.MEMBER) {
            token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: "1d" });
        }

        return {
            ...newUser,
            token,
        };
    }

    /**
     * Login - only for workers/admins
     */
    async login(email: string, password: string) {
        const user = await this.userService.getUserByEmail(email);
        if (!user) throw new Error("Invalid email or password");

        if (user.role === UserRole.MEMBER) {
            throw new Error("Members cannot log in. Only workers/admins can.");
        }

        if (!(await bcrypt.compare(password, user.password))) {
            throw new Error("Invalid email or password");
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1d" });

        return {
            user,
            token,
        };
    }

    /**
     * Change password (workers/admins only)
     */
    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await this.userService.getUserById(userId);
        if (!user || user.role === UserRole.MEMBER) {
            throw new Error("Members do not have passwords");
        }

        if (!(await bcrypt.compare(oldPassword, user.password))) {
            throw new Error("Invalid old password");
        }

        const updatedUser = await this.userService.updateUser(userId, { password: newPassword });
        return updatedUser;
    }

    /**
     * Forgot password (workers/admins only)
     */
    async forgotPassword(email: string) {
        const user = await this.userService.getUserByEmail(email);
        if (!user) throw new Error("User not found");

        if (user.role === UserRole.MEMBER) {
            throw new Error("Members do not have passwords");
        }

        //TODO: Implement actual password reset logic (e.g., send email with reset link)
        const newPassword = Math.random().toString(36).slice(-8); // Generate a random password
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
