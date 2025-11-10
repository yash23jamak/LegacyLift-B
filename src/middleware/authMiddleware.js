import jwt from 'jsonwebtoken';

/**
 * @function verifyToken
 * @description Middleware to verify JWT token from the Authorization header.
 * - Extracts token from the header.
 * - Verifies the token using JWT_SECRET.
 * - Attaches decoded user info to the request object.
 * - Calls next() if token is valid.
 * - Returns 401 if token is missing.
 * - Returns 403 if token is invalid or expired.
 */
export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Forbidden. Invalid or expired token.' });
    }
};