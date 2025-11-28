
import { MIGRATION_PROMPT } from "../utils/prompt.js";
import { extractFilesFromZip } from "../utils/commonContants.js";
import axios, { AxiosResponse } from "axios";
import dotenv from "dotenv";
import { ApiError, ExtractedFile, MigrationResult } from "../utils/interfaces.js";
dotenv.config();

const apiUrl: string | undefined = process.env.NODE_MIGRATION_API_URL;
const apiKey: string | undefined = process.env.NODE_MIGRATION_API_KEY;
const apiModel: string | undefined = process.env.NODE_MIGRATION_MODEL;

if (!apiUrl || !apiKey || !apiModel) {
  throw new Error("Missing required environment variables");
}

/**
 * Analyzes a migration ZIP file by:
 * 1. Extracting files from the ZIP.
 * 2. Splitting files into chunks for processing.
 * 3. Sending combined file content to an AI model for migration analysis.
 * 4. Parsing and validating AI response (expects JSON format).
 *
 * @param fileBuffer - The ZIP file buffer to analyze.
 * @returns Promise<Array<MigrationResult> | ApiError>
 */
export async function analyzeMigrationZip(
  fileBuffer: Buffer
): Promise<Array<MigrationResult> | ApiError> {
  const extractedFiles: ExtractedFile[] = extractFilesFromZip(fileBuffer);
  if (extractedFiles.length === 0) {
    throw new Error("ZIP file contains no files for migration analysis.");
  }

  const CHUNK_SIZE = 5;
  const MAX_CONTENT_LENGTH = 10000;
  const allResults: MigrationResult[] = [];

  // Split files into chunks
  const chunks: ExtractedFile[][] = [];
  for (let i = 0; i < extractedFiles.length; i += CHUNK_SIZE) {
    chunks.push(extractedFiles.slice(i, i + CHUNK_SIZE));
  }

  const apiUrlFinal =
    process.env.NODE_MIGRATION_API_URL ||
    "https://openrouter.ai/api/v1/chat/completions";
  const apiKeyFinal = process.env.NODE_MIGRATION_API_KEY!;
  const apiModelFinal =
    process.env.NODE_MIGRATION_MODEL || "anthropic/claude-3.5-sonnet";

  for (const chunk of chunks) {
    let combinedContent = "";
    for (const file of chunk) {
      let content = file.content;
      if (content.length > MAX_CONTENT_LENGTH) {
        content =
          content.slice(0, MAX_CONTENT_LENGTH) + "\n// Content truncated\n";
      }
      combinedContent += `File: ${file.name}\n${content}\n\n`;
    }

    const prompt = `${MIGRATION_PROMPT}\n\n${combinedContent}`;

    try {
      const response: AxiosResponse<any> = await axios.post(
        apiUrlFinal,
        {
          model: apiModelFinal,
          messages: [
            {
              role: "system",
              content:
                "You are a migration assistant. Convert files into React-compatible format.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKeyFinal}`,
            "Content-Type": "application/json",
          },
        }
      );

      let rawText: string =
        response.data.choices?.[0]?.message?.content || "";
      rawText = rawText.replace(/^```json/, "").replace(/```$/, "").trim();

      try {
        const parsedJson = JSON.parse(rawText);
        if (Array.isArray(parsedJson)) {
          allResults.push(...parsedJson);
          continue;
        }
      } catch {
        // Attempt safe parsing
        const safeText = rawText
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/\n/g, "\\n");

        try {
          const parsedJson = JSON.parse(safeText);
          if (Array.isArray(parsedJson)) {
            allResults.push(...parsedJson);
            continue;
          }
        } catch {
          allResults.push({
            error: "AI response could not be parsed as valid file list.",
            rawResponse: rawText,
            suggestion:
              "Please check the AI prompt or manually inspect the returned response.",
          });
        }
      }
    } catch (err: any) {
      let errorMessage = "Failed to connect to AI service.";
      let details = err.message;

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

      return {
        success: false,
        error: errorMessage,
        details,
      };
    }
  }

  return allResults;
}
