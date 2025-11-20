import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import BlacklistedToken from '../models/BlacklistedToken.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * @function verifyToken
 * @description Middleware to:
 * - Check for JWT in cookies and validate it.
 * - Ensure token is not blacklisted.
 * - Attach the authenticated user to `req.user` and proceed.
 * - Return 401 if token is missing, invalid, or expired.
 */

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) return res.status(401).json({ message: "Access denied" });

        const blacklisted = await BlacklistedToken.findOne({ token });
        if (blacklisted) return res.status(401).json({ message: "Token invalid (logged out)" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};