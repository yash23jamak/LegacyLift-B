import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();
/**
 * @function verifyToken
 * @description Verifies if the user is authenticated by checking the JWT in the cookie.
 * - Reads `accessToken` from HTTP-only cookie.
 * - Verifies token using JWT secret.
 * - Returns user info if valid, else 401.
 */
export const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) return res.status(401).json({ message: "Access denied. Authentication required. Please log in to continue." });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};