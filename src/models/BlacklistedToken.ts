import mongoose, { Schema, Model } from 'mongoose';
import { IBlacklistedToken } from '../utils/interfaces.js';

const blacklistedTokenSchema: Schema<IBlacklistedToken> = new Schema<IBlacklistedToken>({
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true }
});

const BlacklistedToken: Model<IBlacklistedToken> = mongoose.model<IBlacklistedToken>(
    'BlacklistedToken',
    blacklistedTokenSchema
);

export default BlacklistedToken;