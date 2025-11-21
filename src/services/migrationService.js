import { MIGRATION_PROMPT, extractFilesFromZip } from "../utils/prompt.js";
import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();

const apiUrl = process.env.NODE_MIGRATION_API_URL;
const apiKey = process.env.NODE_MIGRATION_API_KEY;
const apiModel = process.env.NODE_MIGRATION_MODEL;

if (!apiUrl || !apiKey || !apiModel) {
    throw new Error('Missing required environment variables');
}


/**
 * Analyzes a migration ZIP file by:
 * 1. Extracting files from the ZIP.
 * 2. Splitting files into chunks for processing.
 * 3. Sending combined file content to an AI model for migration analysis.
 * 4. Parsing and validating AI response (expects JSON format).
 *
 * @param {Buffer} fileBuffer - The ZIP file buffer to analyze.
 * @returns {Promise<Array>} - Returns an array of migration analysis results.
 * @throws {Error} - If ZIP contains no files or API call fails.
 */

export async function analyzeMigrationZip(fileBuffer) {
  const extractedFiles = extractFilesFromZip(fileBuffer);
  if (extractedFiles.length === 0) {
    throw new Error("ZIP file contains no files for migration analysis.");
  }

  const CHUNK_SIZE = 5;
  const MAX_CONTENT_LENGTH = 10000;
  const allResults = [];

    // Split files into chunks
    const chunks = [];
    for (let i = 0; i < extractedFiles.length; i += CHUNK_SIZE) {
        chunks.push(extractedFiles.slice(i, i + CHUNK_SIZE));
    }

  const apiUrl =
    process.env.NODE_MIGRATION_API_URL ||
    "https://openrouter.ai/api/v1/chat/completions";
  const apiKey = process.env.NODE_MIGRATION_API_KEY;
  const apiModel =
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
      const response = await axios.post(
        apiUrl,
        {
          model: apiModel,
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
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );


      let rawText = response.data.choices?.[0]?.message?.content || "";
      rawText = rawText
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();

      try {
        const parsedJson = JSON.parse(rawText);
        if (Array.isArray(parsedJson)) {
          allResults.push(...parsedJson);
          continue;
        }
      } catch (e) {
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
        } catch (finalError) {
          allResults.push({
            error: "AI response could not be parsed as valid file list.",
            rawResponse: rawText,
            suggestion:
              "Please check the AI prompt or manually inspect the returned response.",
          });
        }
      }
    } catch (err) {
        let errorMessage = "Failed to connect to AI service.";
        let details = err.message;

        if (err.response) {
            const status = err.response.status;
            if (status === 401) errorMessage = "Unauthorized: Invalid API key.";
            else if (status === 429) errorMessage = "Rate limit reached. Please try again later.";
            else if (status >= 500) errorMessage = "AI service is currently unavailable.";
            details = `Status Code: ${status}, ${err.message}`;
        } else if (err.code === 'ENOTFOUND') {
            errorMessage = "Network error: Unable to reach AI service.";
        }

        return {
            success: false,
            error: errorMessage,
            details
        };
    }
  }

  return allResults;
}
