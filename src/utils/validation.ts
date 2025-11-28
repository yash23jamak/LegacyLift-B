import Joi, { ObjectSchema } from 'joi';
import { LoginRequest, RegisterRequest } from './interfaces.js';
import { PASSWORD_REGEX } from './commonContants.js';

// Register schema
export const registerSchema: ObjectSchema<RegisterRequest> = Joi.object<RegisterRequest>({
    username: Joi.string().required(),
    email: Joi.string()
        .email()
        .max(254)
        .required()
        .messages({
            'string.email': 'Please enter a valid email address.',
            'any.required': 'Email is required.'
        }),
    password: Joi.string()
        .min(8)
        .max(64)
        .pattern(PASSWORD_REGEX)
        .required()
        .messages({
            'string.pattern.base': 'Password must include at least one uppercase letter, one lowercase letter, one digit, and one special character.',
            'string.min': 'Password must be at least 8 characters long.',
            'string.max': 'Password cannot exceed 64 characters.',
            'any.required': 'Password is required.'
        })
});

// Login schema
export const loginSchema: ObjectSchema<LoginRequest> = Joi.object<LoginRequest>({
    email: Joi.string()
        .email()
        .max(254)
        .required()
        .messages({
            'string.email': 'Please enter a valid email address.',
            'any.required': 'Email is required.'
        }),
    password: Joi.string()
        .min(8)
        .max(64)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long.',
            'string.max': 'Password cannot exceed 64 characters.',
            'any.required': 'Password is required.'
        })
});