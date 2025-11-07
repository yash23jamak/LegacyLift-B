import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { registerSchema, loginSchema } from '../validation/validation.js';

/**
 * @function register
 * @description Handles user registration.
 * - Validates input using Joi.
 * - Checks if the email is already registered.
 * - Hashes the password using bcrypt.
 * - Creates and saves a new user in the database.
 * - Returns a success message or error response.
 */
export const register = async (req, res) => {
    try {
        const { error } = registerSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(409).json({ message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });

        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * @function login
 * @description Authenticates a user.
 * - Validates input using Joi.
 * - Finds user by email.
 * - Compares password using bcrypt.
 * - Generates JWT token if credentials are valid.
 * - Returns token or error response.
 */
export const login = async (req, res) => {
    try {
        const { error } = loginSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * @function logout
 * @description Logs out the user and deletes their account.
 * - Verifies JWT token from Authorization header.
 * - Extracts user ID from token.
 * - Deletes the user from the database.
 * - Returns success or error response.
 */
export const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        await User.findByIdAndDelete(userId);
        res.json({ message: 'User logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
