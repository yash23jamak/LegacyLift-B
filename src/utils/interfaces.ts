export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

/**
 * Represents a collected file with name and content.
 */
export interface CollectedFile {
    name: string;
    content: string;
}

/**
 * Represents the AI response structure.
 */
export interface AIResponse {
    success?: boolean;
    error?: string;
    details?: string;
    report?: any[];
}

/**
 * Represents the result of analyzing a ZIP file.
 */
export interface AnalyzeZipResult {
    report?: any[];
    files?: CollectedFile[];
}
export interface MigrationReport {
    report: any[];
    error?: string;
    message?: string;
}

export interface ExtractedFile {
    name: string;
    content: string;
}

export interface MigrationResult {
    fileName?: string;
    convertedContent?: string;
    error?: string;
    rawResponse?: string;
    suggestion?: string;
}

export interface ApiError {
    success: false;
    error: string;
    details: string;
}

/**
 * Represents the user interface for Models.
 */
export interface IUser extends Document {
    _id?: string;
    username: string;
    email: string;
    password: string;
    projectPath?: string;
}

/**
 * Represents the blacklisted token interface for Models.
 */
export interface IBlacklistedToken extends Document {
    token: string;
    expiresAt: Date;
}


