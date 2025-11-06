import simpleGit from "simple-git";
import tmp from "tmp";
import fs from "fs-extra";
import path from "path";

export const ANALYSIS_PROMPT = `Analyzing a legacy JSP project. Your goal is to perform a comprehensive review of the provided frontend project files and return a detailed, structured JSON object containing the analysis results and a roadmap for migrating the project to ReactJS
IMPORTANT INSTRUCTIONS:
Your response must be a valid JSON object only
Do not include any markdown, comments, or extra text
All strings must be properly escaped (e.g., no unescaped quotes)
Use double quotes for all keys and string values
Separate all properties with commas
If any value is missing, use null or an empty array
Do not include trailing commas
Do not analyze backend Java files (.java, .class, .jar)
Focus only on frontend JSP-related files (.jsp, .jspx, .jspf, .html, .css, .js, .xml, .properties)
Use the following schema and fill in each field with detailed analysis and migration strategy:{
        "project": {
          "name": "string",
          "language": "string",
          "files": number,
          "size_kb": number
        },
        "analysis": {
          "complexity_score": number,
          "component_hierarchy": {
            "summary": "string",
            "issues": ["string"],
            "examples": ["string"]
          },
          "modularity": {
            "summary": "string",
            "issues": ["string"],
            "examples": ["string"]
          },
          "outdated_code": {
            "summary": "string",
            "issues": ["string"],
            "examples": ["string"]
          },
          "mixed_patterns": {
            "summary": "string",
            "issues": ["string"],
            "examples": ["string"]
          },
          "legacy_state_management": {
            "present": boolean,
            "description": "string",
            "examples": ["string"]
          }
        },
        "dependencies": {
          "total": number,
          "outdated": number,
          "vulnerable": number,
          "list": [
            {
              "name": "string",
              "version": "string",
              "status": "up-to-date | outdated | vulnerable",
              "issues": ["string"]
            }
          ]
        },
        "vulnerabilities": {
          "count": number,
          "risk_level": "Low | Medium | High",
          "details": ["string"]
        },
        "migration": {
          "recommended_framework": "ReactJS",
          "suggested_tools": ["string"],
          "strategy": {
            "overview": "string",
            "benefits": ["string"],
            "risks": ["string"],
            "technical_considerations": ["string"]
          },
          "phases": [
            {
              "name": "string",
              "description": "string",
              "estimated_time_weeks": "string",
              "deliverables": ["string"],
              "tools_used": ["string"]
            }
          ]
        },
        "ai_tools": {
          "legacy_analysis": {
            "method": "string",
            "findings": ["string"]
          },
          "dependency_mapping": {
            "method": "string",
            "findings": ["string"]
          },
          "complexity_scoring": {
            "method": "string",
            "rationale": "string"
          },
          "anti_pattern_detection": {
            "method": "string",
            "patterns_found": ["string"]
          }
        },
        "progress": {
          "completed_phases": number,
          "total_phases": number,
          "milestones": ["string"]
        }
      }
Base your analysis only on the following project files. Do not invent content. Escape all quotes and special characters properly
 `;

export const REPO_ANALYSIS_PROMPT = (
  repo_url
) => `Analyzing legacy JSP code for conversion to modern React. Analyze ONLY the provided frontend code of repo (.jsp, .jspx, .jspf, .html, .css, .js, .xml, .properties) and generate a comprehensive analysis report in valid JSON format.
 
 
STRICT REQUIREMENTS:
- Output MUST be pure valid JSON only - no additional text, markdown, or explanations
- Analyze ONLY frontend aspects - ignore all backend logic, Java code, and server-side concerns
- Focus on identifying features, dependencies, and patterns that need React alternatives
- Provide specific testing library recommendations based on the code complexity
- Use null for any missing information
- Escape all special characters properly
 
 
ANALYSIS TASKS:
1. Identify all frontend features and UI components in the JSP Repo
2. List all JavaScript/CSS dependencies and their purposes
3. Analyze state management patterns (session, form data, UI state)
4. Detect form handling, validation, and user interaction patterns
5. Identify routing and navigation approaches
6. Assess CSS and styling methodology
7. Evaluate code complexity and modularity
8. Recommend appropriate React testing strategies
 
 
Generate the analysis report using this exact JSON structure:
 
 
{
        "project": {
          "name": "string",
          "language": "string",
          "files": number,
          "size_kb": number
        },
        "analysis": {
          "complexity_score": number,
          "component_hierarchy": {
            "summary": "string",
            "issues": ["string"],
            "examples": ["string"]
          },
          "modularity": {
            "summary": "string",
            "issues": ["string"],
            "examples": ["string"]
          },
          "outdated_code": {
            "summary": "string",
            "issues": ["string"],
            "examples": ["string"]
          },
          "mixed_patterns": {
            "summary": "string",
            "issues": ["string"],
            "examples": ["string"]
          },
          "legacy_state_management": {
            "present": boolean,
            "description": "string",
            "examples": ["string"]
          }
        },
        "dependencies": {
          "total": number,
          "outdated": number,
          "vulnerable": number,
          "list": [
            {
              "name": "string",
              "version": "string",
              "status": "up-to-date | outdated | vulnerable",
              "issues": ["string"]
            }
          ]
        },
        "vulnerabilities": {
          "count": number,
          "risk_level": "Low | Medium | High",
          "details": ["string"]
        },
        "migration": {
          "recommended_framework": "ReactJS",
          "suggested_tools": ["string"],
          "strategy": {
            "overview": "string",
            "benefits": ["string"],
            "risks": ["string"],
            "technical_considerations": ["string"]
          },
          "phases": [
            {
              "name": "string",
              "description": "string",
              "estimated_time_weeks": "string",
              "deliverables": ["string"],
              "tools_used": ["string"]
            }
          ]
        },
        "ai_tools": {
          "legacy_analysis": {
            "method": "string",
            "findings": ["string"]
          },
          "dependency_mapping": {
            "method": "string",
            "findings": ["string"]
          },
          "complexity_scoring": {
            "method": "string",
            "rationale": "string"
          },
          "anti_pattern_detection": {
            "method": "string",
            "patterns_found": ["string"]
          }
        },
        "progress": {
          "completed_phases": number,
          "total_phases": number,
          "milestones": ["string"]
        }
      }
 
 
Analyze the provided code of Repo and generate the report. Base all findings strictly on the actual code content. Do not invent or assume features that are not present in the Repo.
 
${repo_url}`;

// Migration prompt
export const MIGRATION_PROMPT = `
Migrating a legacy JSP (Java Server Pages) application into a fully modern, client-side React project.
 
Your task is to generate a clean, production-ready React (web) codebase using the latest stable ecosystem tools, properly configured for build, testing, linting, styling, and routing without dependency conflicts.
 
---
 
1. Tech Stack Configuration:
   - Framework: React (latest stable version, minimum React 19+ or higher)
   - Renderer: React DOM (web version only)
   - Language: TypeScript
   - Build Tool: Vite (latest)
   - CSS Framework: Tailwind CSS (latest stable version ≥4)
   - Routing: React Router DOM (latest)
   - State Management: Redux Toolkit or React Query (choose best fit and justify)
   - HTTP Client: Axios with interceptors (for auth, retries, errors)
   - Unit Testing: Vitest + React Testing Library
   - Linting: ESLint (React + TypeScript rules)
   - Formatting: Prettier (integrated with ESLint)
   - Icons: Heroicons
   - Accessibility: Include ARIA roles and ensure semantic structure
   - Environment Config: Use .env for API URLs and secrets
   - **Do not include any React Native, Expo, or mobile-specific dependencies**
 
---
 
2. Migration Goals:
   - Convert each JSP file and feature into equivalent modular React components.
   - Maintain business logic while improving clarity, modularity, and maintainability.
   - Replace server-side rendering with dynamic client-rendered UI using hooks, context, or state.
   - Include an example JSP page fully migrated into React with functional routing and API integration.
 
---
 
3. Required Project Structure:
   Must include the following complete files:
   - package.json (accurate and conflict-free list of all required dependencies)
   - vite.config.ts
   - tsconfig.json
   - postcss.config.js
   - tailwind.config.js
   - index.html (with favicon, meta tags, SEO basics, and root div)
   - src/main.tsx
   - src/App.tsx
   - src/index.css (Tailwind entry)
   - src/components/... (modular components such as Header, Footer)
   - src/pages/... (migrated JSP pages)
   - src/store/... or src/hooks/... (Redux / React Query setup)
   - src/services/... (Axios API logic)
   - src/assets/... (SVGs, icons)
   - .env.example (template for environment variables)
   - eslint.config.js and prettier.config.js
   - vitest.config.ts (unit test configuration)
   - README.md with setup and tech explanation
 
---
 
4. Tailwind Integration Rules:
   - Configure via PostCSS and Tailwind config file.
   - Import Tailwind utilities in src/index.css.
   - Ensure Vite builds integrate Tailwind correctly.
   - Verify Tailwind classes render expected styles with dev build.
 
---
 
5. Package Integrity and Dependency Verification:
   - Generate a complete and fully compatible package.json using only React web dependencies:
     * react
     * react-dom
     * @types/react
     * @types/react-dom
     * vite (latest stable version)
     * @vitejs/plugin-react (latest compatible with vite)
     * typescript (latest stable version)
     * @types/node (compatible with vite’s required range — must auto-detect and use >= the minimum peer constraint, e.g., ^24.x or higher)
     * tailwindcss
     * postcss
     * autoprefixer
     * eslint
     * prettier
     * vitest
     * axios
     * react-router-dom
     * @reduxjs/toolkit or @tanstack/react-query
     * heroicons/react
   - Always synchronize versions of vite, @vitejs/plugin-react, typescript, and @types/node automatically.
   - Do not add or include any libraries requiring outdated Node type definitions.
   - Before outputting JSON, perform a simulated dependency compatibility check to confirm:
     1. All peer dependencies are satisfied.
     2. @types/node version supports Vite’s required range (>=24 if needed).
     3. No warnings or errors occur on “npm install” with default flags.
   - If a potential mismatch appears, automatically bump package versions to their latest patch or compatible major version to ensure resolution success.
 
---
 
 
6. Output Format:
   - Return only valid, JSON-parseable output using this exact structure:
     [
       { "name": "index.html", "content": "..." },
       { "name": "vite.config.ts", "content": "..." },
       { "name": "src/main.tsx", "content": "..." }
     ]
   - Every property name must be enclosed in double quotes.
   - File "content" values must be valid JSON strings:
     * Escape all double quotes (use \\").
     * Escape all backslashes (use \\\\).
     * Escape newlines (use \\n).
     * No unescaped characters allowed in JSX, paths, or strings.
     * Avoid raw template literals
   - No trailing commas in arrays or objects.
   - No comments or backticks allowed.
   - JSON must pass strict JSON.parse() validation with a clean result.
   - If internal validation fails, automatically escape offending characters and retry before output.
 
 
---
---
 
 
7. legecy.txt Analysis and Documentation:
   - create a file name legecy.txt that clearly documents the full migration and analysis.
   - The legecy.txt must include:
     * Overview of the legacy JSP project (its purpose, architecture, and major modules).
     * Table comparing JSP features or components with their new React equivalents.
     * Explanation of how server-side logic was replaced with client-side rendering and React hooks.
     * List of all major dependencies used in the new React setup with brief descriptions.
     * Setup Instructions: how to install, run, and test the new project.
     * Build and Deployment Notes (for Vite-based production build).
     * File Structure Overview (summarized tree format).
     * Notes on TypeScript usage, state management choice (Redux Toolkit or React Query), and why it was chosen.
     * How Tailwind CSS, React Router, and Axios are configured and integrated.
     * Accessibility and performance considerations compared to legacy JSP.
   - The legecy.txt file must be part of the final JSON output array:
     [
       { "name": "legecy.txt", "content": "..." }
     ]
   - Ensure the README content is human-readable, uses Markdown formatting, and provides detailed project context.
   - It must not contain any raw JSX, unescaped code blocks, or invalid JSON characters.
   - Validate that it remains compatible with the JSON output rules (escaped newlines, quotes, and slashes).
 
---
 
8. Final Verification Rules:
   - Internally validate npm dependency tree to confirm no ERESOLVE or peer conflicts.
   - Verify that project builds successfully on Node.js 18+ using Vite’s dev server.
   - Confirm React DOM is correctly imported and used.
   - Confirm no native or mobile-related imports exist.
   - Confirm Tailwind and routing function in preview rendering.
   - Only produce the JSON output after passing all checks successfully.
 
If dependency validation fails during generation, re-resolve versions and retry until the setup is conflict-free.
 
---
`;

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

const MAX_DEPTH = 10;
/**
 * Clones a Git repository and checks if it contains any `.jsp` files.
 * Limits directory traversal depth and handles permission errors safely.
 *
 * @param {string} repoUrl - The URL of the Git repository to clone.
 * @returns {Promise<boolean>} - Returns true if any `.jsp` file is found, otherwise false.
 */

export async function checkRepoForJsp(repoUrl) {
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  const repoPath = tmpDir.name;
  const git = simpleGit();

  try {
    await git.clone(repoUrl, repoPath);

    let containsJsp = false;

    const checkFiles = async (dir, depth = 0) => {
      if (depth > MAX_DEPTH || containsJsp) return;

      let files;
      try {
        files = await fs.readdir(dir);
      } catch (err) {
        if (err.code === "EACCES") {
          console.warn(`Permission denied: ${dir}`);
          return;
        }
        throw err;
      }

      for (const file of files) {
        if (containsJsp) break;

        const fullPath = path.join(dir, file);
        let stat;
        try {
          stat = await fs.stat(fullPath);
        } catch (err) {
          if (err.code === "EACCES") {
            console.warn(`Permission denied: ${fullPath}`);
            continue;
          }
          throw err;
        }

        if (stat.isDirectory()) {
          await checkFiles(fullPath, depth + 1);
        } else if (file.toLowerCase().endsWith(".jsp")) {
          containsJsp = true;
          break;
        }
      }
    };

    await checkFiles(repoPath);
    return containsJsp;
  } catch (err) {
    return false;
  } finally {
    tmpDir.removeCallback(); // Always clean up
  }
}
