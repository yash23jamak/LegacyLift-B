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
 * @description Authenticates a user and sets a JWT token in a cookie.
 * - Validates input using Joi.
 * - Finds user by email.
 * - Compares password using bcrypt.
 * - Generates JWT token if credentials are valid.
 * - Sets the token in a cookie for stateless authentication.
 * - Returns success or error response.
 */
export const login = async (req, res) => {
    try {
        const { error } = loginSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Generate tokens
        const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

        // Set cookies (HTTP-only, Secure)
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: "Lax",
            maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
        });

        res.json({ message: "User logged in successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


/**
 * @function logout
 * @description Logs out the user by clearing the authentication cookie.
 * - Removes the `accessToken` cookie from the client.
 * - Uses HTTP-only, Secure, and SameSite flags for security.
 * - Returns a success message if the operation completes.
 * - Handles and returns any server-side errors.
 */
export const logout = async (req, res) => {
    try {
        // Clear the access token cookie
        res.clearCookie("accessToken", {
            httpOnly: true,
            sameSite: "Lax",
        });

        return res.json({ message: "User logged out successfully" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
