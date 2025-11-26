import Joi from 'joi';

export const registerSchema = Joi.object({
    username: Joi.string().required(),
    email: Joi.string()
        .max(254)
        .required()
        .messages({
            'string.email': 'Please enter a valid email address.',
            'any.required': 'Email is required.'
        }),
    password: Joi.string()
        .min(8)
        .max(64)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d])[A-Za-z\\d\\S]{8,64}$'))
        .required()
        .messages({
            'string.pattern.base': 'Password must include at least one uppercase letter, one lowercase letter, one digit, and one special character.',
            'string.min': 'Password must be at least 8 characters long.',
            'string.max': 'Password cannot exceed 64 characters.',
            'any.required': 'Password is required.'
        })
});

export const loginSchema = Joi.object({
    email: Joi.string()
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