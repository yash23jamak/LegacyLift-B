
import tmp, { DirResult } from "tmp";
import fs from "fs-extra";
import path from "path";
import * as simpleGit from "simple-git";
import AdmZip from "adm-zip";
import { CollectedFile } from "./interfaces.js"
import jwt from 'jsonwebtoken';
import crypto from "crypto";
import dotenv from 'dotenv';
dotenv.config();

// Environment variable type check
const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in environment variables');
}

export const ALLOWED_EXTENSIONS = [
    ".jsp",
    ".jspx",
    ".jspf",
    ".html",
    ".htm",
    ".css",
    ".js",
    ".xml",
    ".properties",
];

/**
 * Clones a Git repository and checks if it contains any `.jsp` files.
 * Limits directory traversal depth and handles permission errors safely.
*
* @param {string} repoUrl - The URL of the Git repository to clone.
* @returns {Promise<boolean>} - Returns true if any `.jsp` file is found, otherwise false.
*/

const MAX_DEPTH = 10;
export async function checkRepoForJsp(repoUrl: string): Promise<CollectedFile[] | false> {
    const tmpDir: DirResult = tmp.dirSync({ unsafeCleanup: true });
    const repoPath: string = tmpDir.name;
    const git: simpleGit.SimpleGit = simpleGit.simpleGit();

    try {
        await git.clone(repoUrl, repoPath);

        let containsJsp = false;
        const collectedFiles: CollectedFile[] = [];

        const checkFiles = async (dir: string, depth = 0, relativeDir = ""): Promise<void> => {
            if (depth > MAX_DEPTH) return;

            let files: string[];
            try {
                files = await fs.readdir(dir);
            } catch (err: any) {
                if (err.code === "EACCES") {
                    console.warn(`Permission denied: ${dir}`);
                    return;
                }
                throw err;
            }

            for (const file of files) {
                const fullPath = path.join(dir, file);
                let stat;
                try {
                    stat = await fs.stat(fullPath);
                } catch (err: any) {
                    if (err.code === "EACCES") {
                        console.warn(`Permission denied: ${fullPath}`);
                        continue;
                    }
                    throw err;
                }

                if (stat.isDirectory()) {
                    await checkFiles(fullPath, depth + 1, path.join(relativeDir, file));
                } else {
                    const ext = path.extname(file).toLowerCase();
                    if (ALLOWED_EXTENSIONS.includes(ext)) {
                        if (ext === ".jsp") containsJsp = true;
                        const content = await fs.readFile(fullPath, "utf-8");
                        const fileName = path.join(relativeDir, file);
                        const relativePath = fileName.split(path.sep).slice(1).join("/");
                        collectedFiles.push({ name: relativePath, content });
                    }
                }
            }
        };

        await checkFiles(repoPath);

        if (collectedFiles.length > 0) {
            console.log(`Total files collected: ${collectedFiles.length}`);
        }

        return collectedFiles;
    } catch (err: any) {
        return false;
    } finally {
        tmpDir.removeCallback(); // Always clean up
    }
}

/**
 * Extracts all files from a ZIP buffer and returns their names and contents.
 * @param {Buffer} fileBuffer
 * @returns {Array<{name: string, content: string}>}
 */
export function extractFilesFromZip(fileBuffer: Buffer): CollectedFile[] {
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();

    return zipEntries.map((entry) => ({
        name: entry.entryName,
        content: entry.getData().toString("utf-8"),
    }));
}

/**
 * Generate Tokens
 */
export const generateTokens = (userId: string) => {
    const accessToken = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

/**
 * Decrypt AES-GCM encrypted password
 * @param encryptedBase64 - Base64 encoded string (IV + ciphertext + auth tag)
 * @param secretKey - Shared secret key
 */
export function decryptPassword(encryptedBase64: string, secretKey: string): string {
    try {
        const combined = Buffer.from(encryptedBase64, "base64");

        if (combined.length < 28) {
            throw new Error("Invalid encrypted data format");
        }

        const iv = combined.subarray(0, 12);
        const authTag = combined.subarray(combined.length - 16);
        const ciphertext = combined.subarray(12, combined.length - 16);

        const key = crypto.pbkdf2Sync(secretKey, "fixed-salt", 100000, 32, "sha256");

        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return decrypted.toString("utf8");
    } catch (err: any) {
        if (err.code === "ERR_CRYPTO_INVALID_AUTH_TAG") {
            throw new Error("Invalid password");
        } else {
            throw err;
        }
    }
}

/**
 * Regex to extract JSON content inside triple backticks (```json ... ```).
 */
export const CODE_BLOCK_JSON_REGEX: RegExp = /```(?:json)?\s*([\s\S]*?)\s*```/;

/**
 * Regex to split multiple JSON arrays in AI response.
 * Matches newline followed by '[' (start of array).
 */
export const MULTIPLE_JSON_ARRAY_SPLIT_REGEX: RegExp = /\n(?=\[)/;

/**
 * Regex to validate password strength.
 * Requirements:
 * - At least one lowercase letter.
 * - At least one uppercase letter.
 * - At least one digit.
 * - At least one special character.
 * - Minimum length of 8 characters.
 * - Maximum length of 64 characters.
 */
export const PASSWORD_REGEX: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\S]{8,64}$/;



