import mongoose, { Schema, Model } from 'mongoose';
import { IUser } from '../utils/interfaces.js';

const userSchema: Schema<IUser> = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    projectPath: { type: String }
});

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;