import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';
import BlacklistedToken from '../models/BlacklistedToken.js';
import { IUser } from '../utils/interfaces.js'
import { registerSchema, loginSchema } from '../utils/validation.js';
import { decryptPassword, generateTokens } from '../utils/commonContants.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in environment variables');
}
const secretKey = process.env.NODE_ENCRYPTION_KEY as string;
if (!secretKey) {
    throw new Error('NODE_ENCRYPTION_KEY is missing in environment variables');
}
/**
 * @function register
 * @description Handles user registration.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password }: { username: string; email: string; password: string } = req.body;

        let decryptedPassword: string;
        try {
            decryptedPassword = decryptPassword(password, secretKey);
        } catch {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid encrypted password format" });
            return;
        }

        // Validate decrypted password against schema
        const { error } = registerSchema.validate({ username, email, password: decryptedPassword });
        if (error) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: error.details[0].message });
            return;
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            res.status(StatusCodes.CONFLICT).json({
                message: existingUser.email === email ? "Email already registered" : "Username already taken"
            });
            return;
        }

        // Hash decrypted password
        const hashedPassword = await bcrypt.hash(decryptedPassword, 10);
        const user = new User({ username, email, password: hashedPassword });

        await user.save();
        res.status(StatusCodes.CREATED).json({ status: StatusCodes.CREATED, message: "User registered successfully" });
    } catch (error: any) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: StatusCodes.INTERNAL_SERVER_ERROR, error: error.message });
    }
};

/**
 * @function login
 * @description Authenticates a user and sets a JWT token in a cookie.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error } = loginSchema.validate(req.body);
        if (error) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: error.details[0].message });
            return;
        }

        const { email, password }: { email: string; password: string } = req.body;

        // Decrypt password if encrypted, else fallback to plain text
        let finalPassword: string;
        try {
            finalPassword = decryptPassword(password, secretKey);
            if (!finalPassword) {
                // If decryption fails, assume plain password (Postman fallback)
                finalPassword = password;
            }
        } catch {
            finalPassword = password;
        }


        const user: IUser | null = await User.findOne({ email });
        if (!user) {
            res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
            return;
        }

        const isMatch = await bcrypt.compare(finalPassword, user.password);
        if (!isMatch) {
            res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid credentials" });
            return;
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user._id.toString());

        // Set cookies securely
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 15 * 60 * 1000,
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(StatusCodes.OK).json({
            username: user.username,
            status: StatusCodes.OK,
            message: "User logged in successfully",
        });
    } catch (error: any) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            error: "Something went wrong. Please try again later.",
        });
    }
};


/**
 * @function refreshToken
 * @description Refreshes the access token using the refresh token.
 */
export const refreshTokenHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Refresh token missing' });
            return;
        }

        const decoded = jwt.verify(refreshToken, JWT_SECRET) as jwt.JwtPayload & { id: string };
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: true,
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(StatusCodes.OK).json({ message: 'Access token refreshed' });
    } catch (error) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid or expired refresh token' });
    }
};

/**
 * @function logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            const decoded = jwt.decode(refreshToken) as jwt.JwtPayload | null;
            if (decoded?.exp) {
                await BlacklistedToken.create({
                    token: refreshToken,
                    expiresAt: new Date(decoded.exp * 1000)
                });
            }
        }

        res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
        res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });

        res.status(StatusCodes.OK).json({ message: 'User logged out successfully' });
    } catch (error: any) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};