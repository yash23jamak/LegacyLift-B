import axios from "axios";
import AdmZip from "adm-zip";
import {
  ANALYSIS_PROMPT,
  REPO_ANALYSIS_PROMPT,
  ALLOWED_EXTENSIONS,
  MIGRATION_REPORT_PROMPT,
  checkRepoForJsp,
  extractFilesFromZip,
} from "../utils/prompt.js";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

const apiUrl = process.env.NODE_API_URL;
const apiKey = process.env.NODE_API_KEY;
const apiModel = process.env.NODE_AI_MODAL;

if (!apiUrl || !apiKey || !apiModel) {
  throw new Error("Missing required environment variables");
}
/**
 * Analyzes the contents of a ZIP file to extract and evaluate JSP-based project files.
 * @param {Buffer} fileBuffer - The uploaded ZIP file buffer.
 * @returns {Object} - The AI-generated analysis report.
 */
export async function analyzeZipFile(fileBuffer, zipType) {
  const zip = new AdmZip(fileBuffer);
  const zipEntries = zip.getEntries();

  const files = zipEntries
    .filter(
      (entry) =>
        !entry.isDirectory &&
        ALLOWED_EXTENSIONS.some((ext) =>
          entry.entryName.toLowerCase().endsWith(ext)
        )
    )
    .map((entry) => ({
      name: entry.entryName,
      content: entry.getData().toString("utf-8"),
    }));

  if (files.length === 0) {
    throw new Error("ZIP file contains no allowed file types.");
  }

  const hasJsp = files.some((file) => file.name.toLowerCase().endsWith(".jsp"));
  if (!hasJsp) {
    throw new Error(
      "The uploaded ZIP file does not contain any JSP files. Please upload a valid JSP-based project."
    );
  }

  if (zipType === "true") {
    let combinedContent = "";
    for (const file of files) {
      combinedContent += `File: ${file.name}\n${file.content}\n\n`;
    }

    const prompt = `${ANALYSIS_PROMPT}:\n\n${combinedContent}`;
    return await sendToAI(prompt);
  } else {
    let combinedContent = [];
    for (const file of files) {
      // combinedContent += `File: ${file.name}\n${file.content}\n\n`;
      const parts = file.name.split("/");
      const relativePath = parts.slice(1).join("/");
      combinedContent.push({ name: relativePath, content: file.content });
    }

    return combinedContent;
  }
}

/**
 * Analyzes a remote repository to check if it contains JSP files and generates an AI-based report.
 * @param {string} repoUrl - The URL of the repository to analyze.
 * @returns {Object} - The AI-generated analysis report.
 */
export async function analyzeRepo(repoUrl) {
  if (!repoUrl || typeof repoUrl !== "string") {
    throw new Error("Repository URL is missing or invalid.");
  }

  // ✅ Sanitize the URL to avoid trailing slashes or .git suffix
  const sanitizedUrl = repoUrl
    .trim()
    .replace(/\.git$/, "")
    .replace(/\/$/, "");

  const containsJsp = await checkRepoForJsp(sanitizedUrl);
  if (!containsJsp) {
    throw new Error(
      "The repository does not contain any JSP files. Please ensure you are uploading a valid JSP-based project."
    );
  }

  const prompt = REPO_ANALYSIS_PROMPT(sanitizedUrl);
  return await sendToAI(prompt);
}

/**
 * Generates a migration report based on the provided ZIP file.
 * @param {string} zipPath - The path to the cached ZIP file.
 * @returns {Object} - The AI-generated migration report.
 */
export async function generateMigrationReport(fileBuffer) {
  try {
    const extractedFiles = extractFilesFromZip(fileBuffer);

    if (extractedFiles.length === 0) {
      return { error: "ZIP file contains no files for migration analysis." };
    }

    const CHUNK_SIZE = 5;
    const MAX_CONTENT_LENGTH = 10000;
    const chunks = [];
    for (let i = 0; i < extractedFiles.length; i += CHUNK_SIZE) {
      chunks.push(extractedFiles.slice(i, i + CHUNK_SIZE));
    }

    const allReports = [];

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

      const prompt = `${MIGRATION_REPORT_PROMPT}\n\n${combinedContent}`;

      // Send prompt to AI
      const report = await sendToAI(prompt);
      allReports.push(report);
    }

    // Return combined report
    return { report: allReports };
  } catch (error) {
    return {
      error: "Failed to generate migration report.",
      details: error.message,
    };
  }
}

/**
 * Sends a prompt to the AI model and returns the parsed JSON response.
 * @param {string} prompt - The prompt string to send to the AI model.
 * @returns {Object} - Parsed JSON response from the AI or raw content if parsing fails.
 */
export async function sendToAI(prompt) {
  const allReports = [];

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

    const resultContent =
      response.data.choices?.[0]?.message?.content || "Analysis failed.";

    // Extract content inside code block
    const match = resultContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

    const jsonBlock = match ? match[1].trim() : resultContent.trim();

    // Split multiple JSON arrays if present
    const jsonBlocks = jsonBlock.split(/\n(?=\[)/);

    for (const block of jsonBlocks) {
      try {
        const parsed = JSON.parse(block.trim());
        allReports.push(parsed);
      } catch (err) {
        allReports.push({
          error: "Failed to parse part of the report",
          raw: block,
        });
      }
    }

    return allReports;
  } catch (err) {
    return {
      error: "Failed to connect to AI service.",
      details: err.message,
    };
  }
}
