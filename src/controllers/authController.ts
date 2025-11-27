import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User';
import BlacklistedToken from '../models/BlacklistedToken';
import { IUser } from '../utils/interfaces'
import { registerSchema, loginSchema } from '../utils/validation';
import dotenv from 'dotenv';
dotenv.config();

// ✅ Environment variable type check
const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in environment variables');
}

/**
 * @function register
 * @description Handles user registration.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error } = registerSchema.validate(req.body);
        if (error) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: error.details[0].message });
            return;
        }

        const { username, email, password }: { username: string; email: string; password: string } = req.body;

        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            if (existingUser.email === email) {
                res.status(StatusCodes.CONFLICT).json({ message: 'Email already registered' });
            } else if (existingUser.username === username) {
                res.status(StatusCodes.CONFLICT).json({ message: 'Username already taken' });
            }
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });

        await user.save();
        res.status(StatusCodes.CREATED).json({
            status: StatusCodes.CREATED,
            message: 'User registered successfully'
        });
    } catch (error: any) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            error: error.message
        });
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

        const user: IUser | null = await User.findOne({ email });
        if (!user) {
            res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid credentials' });
            return;
        }

        const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(StatusCodes.OK).json({
            username: user?.username,
            status: StatusCodes.OK,
            message: 'User logged in successfully'
        });
    } catch (error: any) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

/**
 * @function logout
 * @description Logs out the user by blacklisting the token and clearing the cookie.
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.cookies.accessToken;
        if (token) {
            const decoded = jwt.decode(token) as jwt.JwtPayload | null;
            if (decoded && decoded.exp) {
                await BlacklistedToken.create({
                    token,
                    expiresAt: new Date(decoded.exp * 1000)
                });
            }
        }

        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/'
        });

        res.status(StatusCodes.OK).json({
            status: StatusCodes.OK,
            message: 'User logged out successfully'
        });
    } catch (error: any) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};