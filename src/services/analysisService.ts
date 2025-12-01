
import axios from "axios";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import User from "../models/User.js";
import {
  ANALYSIS_PROMPT,
  MIGRATION_REPORT_PROMPT,
} from "../utils/prompt.js";
import { ALLOWED_EXTENSIONS, checkRepoForJsp, extractFilesFromZip } from "../utils/commonContants.js";
import { CollectedFile, MigrationReport } from "../utils/interfaces.js";
import { CODE_BLOCK_JSON_REGEX, MULTIPLE_JSON_ARRAY_SPLIT_REGEX } from "../utils/commonContants.js";

dotenv.config();

const apiUrl = process.env.NODE_API_URL!;
const apiKey = process.env.NODE_API_KEY!;
const apiModel = process.env.NODE_AI_MODAL!;

if (!apiUrl || !apiKey || !apiModel) {
  throw new Error("Missing required environment variables");
}

/**
 * Analyzes an uploaded ZIP file and processes JSP-based project files.
 *
 * @param fileBuffer - The ZIP file content as a Buffer.
 * @param zipType - Indicates whether to extract and store files ("true" or "false").
 * @param userId - The ID of the user for updating project path.
 * @param zipOriginalName - Original name of the uploaded ZIP file.
 * @returns AI analysis report or extracted file details.
 */

export async function analyzeZipFile(
  fileBuffer: Buffer,
  zipType: string,
  userId: string,
  zipOriginalName: string
): Promise<any[]> {
  const zip = new AdmZip(fileBuffer);
  const zipEntries = zip.getEntries();

  const files: CollectedFile[] = zipEntries
    .filter(entry =>
      !entry.isDirectory &&
      ALLOWED_EXTENSIONS.some(ext => entry.entryName.toLowerCase().endsWith(ext))
    )
    .map(entry => ({
      name: entry.entryName,
      content: entry.getData().toString("utf-8"),
    }));

  if (files.length === 0) throw new Error("ZIP file contains no allowed file types.");
  if (!files.some(file => file.name.toLowerCase().endsWith(".jsp"))) {
    throw new Error("The uploaded ZIP file does not contain any JSP files.");
  }

  if (zipType === "true") {
    const parentDir = path.resolve(process.cwd(), "..");
    const zipFolderName = path.basename(zipOriginalName, path.extname(zipOriginalName));
    const uploadDir = path.join(parentDir, "UploadedProject", zipFolderName);

    fs.mkdirSync(uploadDir, { recursive: true });
    for (const file of files) {
      const filePath = path.join(uploadDir, file.name);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content);
    }

    await User.findByIdAndUpdate(userId, { projectPath: uploadDir }, { new: true });

    const combinedContent = files.map(f => `File: ${f.name}\n${f.content}`).join("\n\n");
    const prompt = `${ANALYSIS_PROMPT}:\n\n${combinedContent}`;
    return await sendToAI(prompt); // ✅ Direct array from AI
  } else {
    const combinedContent: { name: string; content: string }[] = [];

    for (const file of files) {
      const parts = file.name.split("/");
      const relativePath = parts.slice(1).join("/") || file.name;
      combinedContent.push({ name: relativePath, content: file.content });
    }

    return combinedContent;
  }
}


/**
 * Analyzes a remote repository to check if it contains JSP files.
 *
 * @param repoUrl - The URL of the repository to analyze.
 * @returns A list of collected files or false if none found.
 */
export async function analyzeRepo(repoUrl: string): Promise<CollectedFile[] | false> {
  if (!repoUrl || typeof repoUrl !== "string") throw new Error("Repository URL is missing or invalid.");
  const sanitizedUrl = repoUrl.trim().replace(/\.git$/, "").replace(/\/$/, "");
  // const prompt = REPO_ANALYSIS_PROMPT(sanitizedUrl);
  // return await sendToAI(prompt);
  return await checkRepoForJsp(sanitizedUrl);
}

/**
 * Generates a migration report based on the provided ZIP file.
 *
 * @param fileBuffer - The ZIP file content as a Buffer.
 * @returns AI-generated migration report.
 */
export async function generateMigrationReport(fileBuffer: Buffer): Promise<MigrationReport> {
  const extractedFiles = extractFilesFromZip(fileBuffer);
  if (extractedFiles.length === 0) return { report: [{ error: "ZIP file contains no files for migration analysis." }] };

  const CHUNK_SIZE = 5;
  const MAX_CONTENT_LENGTH = 10000;
  const chunks = [];
  for (let i = 0; i < extractedFiles.length; i += CHUNK_SIZE) {
    chunks.push(extractedFiles.slice(i, i + CHUNK_SIZE));
  }

  const allReports: any[] = [];
  for (const chunk of chunks) {
    let combinedContent = "";
    for (const file of chunk) {
      let content = file.content.length > MAX_CONTENT_LENGTH
        ? file.content.slice(0, MAX_CONTENT_LENGTH) + "\n// Content truncated\n"
        : file.content;
      combinedContent += `File: ${file.name}\n${content}\n\n`;
    }
    const prompt = `${MIGRATION_REPORT_PROMPT}\n\n${combinedContent}`;
    allReports.push(await sendToAI(prompt));
  }

  return { report: allReports };
}

/**
 * Sends a prompt to the AI model and returns the parsed JSON response.
 * Handles parsing errors and network issues gracefully.
 *
 * @param prompt - The prompt string to send to the AI model.
 * @returns Parsed JSON response or structured error details.
 */
// export async function sendToAI(prompt: string): Promise<any[]> {
//   const allReports: any[] = [];

//   try {
//     const response = await axios.post(
//       apiUrl,
//       {
//         model: apiModel,
//         messages: [{ role: "user", content: prompt }],
//         temperature: 0.2,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${apiKey}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const resultContent =
//       response.data.choices?.[0]?.message?.content || "Analysis failed.";

//     // Extract content inside code block
//     const match = resultContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
//     const jsonBlock = match ? match[1].trim() : resultContent.trim();

//     // Split multiple JSON arrays if present
//     const jsonBlocks = jsonBlock.split(/\n(?=\[)/);

//     for (const block of jsonBlocks) {
//       try {
//         // First attempt: direct parse
//         const parsed = JSON.parse(block.trim());
//         allReports.push(parsed);
//       } catch {
//         // Second attempt: clean escaped quotes and try again
//         try {
//           const cleaned = block.replace(/\\"/g, '"').replace(/\\n/g, '');
//           const parsedAgain = JSON.parse(cleaned);
//           allReports.push(parsedAgain);
//         } catch {
//           // Final fallback: structured error
//           allReports.push({
//             error: "Failed to parse AI response after multiple attempts",
//             raw: block,
//             suggestion: "Ensure AI returns valid JSON or adjust prompt formatting."
//           });
//         }
//       }
//     }

//     return allReports;
//   } catch (err: unknown) {
//     let errorMessage = "Failed to connect to AI service.";
//     let details = "";

//     if (axios.isAxiosError(err)) {
//       details = err.message;

//       if (err.response) {
//         const status = err.response.status;
//         if (status === 401) errorMessage = "Unauthorized: Invalid API key.";
//         else if (status === 429) errorMessage = "Rate limit reached. Please try again later.";
//         else if (status >= 500) errorMessage = "AI service is currently unavailable.";
//         details = `Status Code: ${status}, ${err.message}`;
//       } else if (err.code === "ENOTFOUND") {
//         errorMessage = "Network error: Unable to reach AI service.";
//       }
//     } else {
//       details = (err as Error).message || "Unknown error occurred.";
//     }

//     return [
//       {
//         success: false,
//         error: errorMessage,
//         details,
//       },
//     ];
//   }
// }

/**
 * Sends a prompt to the AI model and returns the parsed JSON response.
 * Handles parsing errors and network issues gracefully.
 *
 * @param prompt - The prompt string to send to the AI model.
 * @returns Parsed JSON response or structured error details.
 */
export async function sendToAI(prompt: string): Promise<any[]> {
  const allReports: any[] = [];

  try {
    const response = await axios.post(
      apiUrl,
      {
        model: apiModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const resultContent: string =
      response.data.choices?.[0]?.message?.content || "Analysis failed.";

    // Use regex from common constants
    const match = resultContent.match(CODE_BLOCK_JSON_REGEX);
    const jsonBlock = match ? match[1].trim() : resultContent.trim();

    // Split multiple JSON arrays if present
    const jsonBlocks = jsonBlock.split(MULTIPLE_JSON_ARRAY_SPLIT_REGEX);

    for (const block of jsonBlocks) {
      try {
        // First attempt: direct parse
        const parsed = JSON.parse(block.trim());
        allReports.push(parsed);
      } catch {
        // Second attempt: clean escaped quotes and try again
        try {
          const cleaned = block.replace(/\\"/g, '"').replace(/\\n/g, "");
          const parsedAgain = JSON.parse(cleaned);
          allReports.push(parsedAgain);
        } catch {
          // Final fallback: structured error
          allReports.push({
            error: "Failed to parse AI response after multiple attempts",
            raw: block,
            suggestion:
              "Ensure AI returns valid JSON or adjust prompt formatting.",
          });
        }
      }
    }

    return allReports;
  } catch (err: unknown) {
    let errorMessage = "Failed to connect to AI service.";
    let details = "";

    if (axios.isAxiosError(err)) {
      details = err.message;

      if (err.response) {
        const status = err.response.status;
        if (status === 401) errorMessage = "Unauthorized: Invalid API key.";
        else if (status === 429)
          errorMessage = "Rate limit reached. Please try again later.";
        else if (status >= 500)
          errorMessage = "AI service is currently unavailable.";
        details = `Status Code: ${status}, ${err.message}`;
      } else if (err.code === "ENOTFOUND") {
        errorMessage = "Network error: Unable to reach AI service.";
      }
    } else {
      details = (err as Error).message || "Unknown error occurred.";
    }

    return [
      {
        success: false,
        error: errorMessage,
        details,
      },
    ];
  }
}
