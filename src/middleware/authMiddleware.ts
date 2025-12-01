
import jwt, { JwtPayload } from 'jsonwebtoken';
import User from '../models/User.js';
import BlacklistedToken from '../models/BlacklistedToken.js';
import { StatusCodes } from 'http-status-codes';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';

dotenv.config();

/**
 * @function verifyToken
 * @description Middleware to:
 * - Check for JWT in cookies and validate it.
 * - Ensure token is not blacklisted.
 * - Attach the authenticated user to `req.user` and proceed.
 * - Return 401 if token is missing, invalid, or expired.
 */
export const verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> => {
    try {
        const token = req.cookies?.accessToken;
        if (!token) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                status: StatusCodes.UNAUTHORIZED,
                error: 'Unauthorized',
            });
        }

        const blacklisted = await BlacklistedToken.findOne({ token });
        if (blacklisted) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                status: StatusCodes.UNAUTHORIZED,
                error: 'Token Invalid or Logged Out',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { id: string };

        // ✅ Quick fix: cast req to any for user property
        (req as any).user = await User.findById(decoded.id);

        return next();
    } catch (error) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            status: StatusCodes.UNAUTHORIZED,
            error: 'Invalid or expired token',
        });
    }
};
