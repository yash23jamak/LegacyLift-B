
import tmp, { DirResult } from "tmp";
import fs from "fs-extra";
import path from "path";
import simpleGit, { SimpleGit } from "simple-git"
import AdmZip from "adm-zip";
import { CollectedFile } from "./interfaces"

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
    const git: SimpleGit = simpleGit();

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


// ******* Regex Expressions For Analysis AI Response ******* //

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



