import simpleGit from "simple-git";
import tmp from "tmp";
import fs from "fs-extra";
import path from "path";
import AdmZip from "adm-zip";

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

// Migration Report Prompt
export const MIGRATION_REPORT_PROMPT = `
You are an expert software architect specializing in modernizing legacy Java/JSP applications into ReactJS.

I will provide you with details of a JSP legacy project.

Your task is to:
1. Analyze the legacy project features, libraries, and patterns.
2. Map each legacy feature to its modern ReactJS equivalent.
3. Output the result in the following JSON format:

[
  {
    "id": "1",
    "legacyFeature": "JSP Pages & Servlets",
    "reactEquivalent": "React Components",
    "description": "Server-side rendered pages replaced with reusable, composable React components with client-side rendering",
    "category": "rendering",
    "complexity": "high",
    "benefits": ["Reusability", "Better Performance", "Modularity"]
  },
  {
    "id": "2",
    "legacyFeature": "Session Attributes",
    "reactEquivalent": "useState / useContext",
    "description": "Server-side session management migrated to client-side state management using React hooks",
    "category": "state",
    "complexity": "medium",
    "benefits": ["Real-time Updates", "Type Safety", "Predictable State"]
  }
]

Notes:
- "id" should be incremental numbers.
- "category" can be one of: rendering, state, routing, data, security, performance, etc.
- "complexity" should be one of: low, medium, or high.

---

4. After the feature mapping, also generate a **Summary of Improvements** in this JSON format:

[
  {
    "icon": "Gauge",
    "title": "Faster Load Times",
    "stat": "70%",
    "description": "Reduction in initial page load with code splitting"
  },
  {
    "icon": "Box",
    "title": "Modular Components",
    "stat": "95%",
    "description": "Component reusability across the application"
  }
]

Notes:
- only 4 items should be included in the summary.
- "icon" should be a simple keyword (e.g., Gauge, Box, Shield, Layers, etc.).
- "stat" should be an approximate percentage improvement.
- "title" should highlight the benefit.
- "description" should explain the improvement in one sentence.

---

Final Output:
- First, provide the **Feature Mapping JSON**.
- Then, provide the **Summary of Improvements JSON**.
- Do not include explanations outside of JSON. Only return the JSON objects.
`;

// Migration prompt
//  latest migration prompt 20-11-25
export const MIGRATION_PROMPT = `
You are converting a legacy JSP (Java Server Pages) web application into a fully client-side, modern React project. 
Your output must generate a clean, production-ready Vite + TypeScript React codebase using officially supported, stable frontend libraries. 
All configuration and source files must be syntactically valid, compilable, runnable, and properly formatted.

---

## 1. Tech Stack Requirements

- Framework: React (latest stable, >=19)
- Renderer: React DOM (web only)
- Language: TypeScript
- Build Tool: Vite (latest stable) with @vitejs/plugin-react
- CSS: Tailwind CSS (latest stable >=4) integrated with PostCSS + Autoprefixer
- Router: React Router DOM (latest)
- State Management: Redux Toolkit (preferred for complex data and actions) or React Query (if server-state heavy, justify)
- HTTP Client: Axios with request/response interceptors (auth, retry, error handler)
- Unit Testing: Vitest + React Testing Library + jsdom
- Linting: ESLint (flat config, React + TypeScript + hooks rules) + eslint-config-prettier
- Formatter: Prettier integrated with ESLint
- Icons: @heroicons/react
- Authentication-aware: Use .env variables for API URLs or tokens
- Accessibility: Use semantic HTML with ARIA roles and keyboard navigation support
- Explicitly exclude any mobile/native dependencies or Expo modules.

---

## 2. Migration Behavior and Goals

- Convert every JSP page and its logic into modular, functional React components or pages.
- Replace server-side templating logic with React hooks, Context, or Redux state.
- Ensure component naming consistency with legacy features.
- Provide one complete JSP-to-React migration example with routing and Axios data fetching.
- Automatically remove unused or duplicated files.

---

## 3. Output File and Project Structure

The following files are mandatory and must be syntactically correct (no escaped newlines or invalid JSON):

- package.json (valid dependencies, with "type": "module")
- vite.config.ts (ESM format)
- tsconfig.json (TypeScript compiler config)
- postcss.config.cjs (CommonJS)
- tailwind.config.cjs (CommonJS)
- prettier.config.cjs (CommonJS)
- eslint.config.js (Flat config ESM format, no deprecated flags)
- vitest.config.ts (with jsdom setup)
- .env.example
- index.html (real HTML, not escaped)
- src/vite-env.d.ts (declare modules and import.meta.env)
- src/main.tsx
- src/App.tsx
- src/index.css (Tailwind base imports)
- src/components/ (Header, Footer, Layout, etc.)
- src/pages/ (migrated JSP pages)
- src/store/ (Redux store setup with rootReducer)
- src/services/ (Axios API logic with interceptors)
- src/assets/ (images, SVGs)
- README.md (markdown formatted setup instructions)
- legecy.txt (migration documentation)

---

## 4. Dependency and Version Integrity

Automatically install and validate all dependencies with full version checks:

- react
- react-dom
- @types/react
- @types/react-dom
- vite
- @vitejs/plugin-react
- typescript
- @types/node (latest >=24.x to match Vite peer)
- tailwindcss
- postcss
- autoprefixer
- eslint
- @typescript-eslint/parser
- @typescript-eslint/eslint-plugin
- eslint-plugin-react
- eslint-plugin-react-hooks
- eslint-config-prettier
- prettier
- vitest
- jsdom
- @testing-library/react
- axios
- react-router-dom
- @reduxjs/toolkit (or @tanstack/react-query)
- @heroicons/react

Check:
1. All peer dependencies are satisfied.
2. No deprecated flags or unresolved plugins.
3. The project compiles and runs using Node 18+.

If any peer conflict or missing version occurs, automatically upgrade to compatible versions.

---

## 5. Configuration Standards

- Output **real ESM/CJS syntax** as required by each file:
  - .ts and .js files must use ESM (export, import).
  - .cjs files must use CommonJS (module.exports).
- No escaped newlines (\\n) or quotes (\\") in final output—produce real files, not JSON strings.
- HTML and TSX files must contain valid syntax (no escaped entities or HTML corruption).

---

## 6. ESLint and Formatting Rules

- Use ESLint flat configuration with imported ESM modules:
  \`\`\`
  import js from '@eslint/js';
  import ts from 'typescript-eslint';
  import react from 'eslint-plugin-react';
  import hooks from 'eslint-plugin-react-hooks';
  export default ts.config(
    js.configs.recommended,
    react.configs.recommended,
    hooks.configs.recommended,
    {
      ignores: ['dist'],
      rules: {
        'react/react-in-jsx-scope': 'off'
      },
    }
  );
  \`\`\`

- Include Prettier rules integration with no conflicting settings.

---

## 7. Testing and Verification

Before final output:
1. Simulate npm install and build; ensure no ERESOLVE or peer conflicts.
2. Run npm run dev and validate Vite successfully starts with Tailwind rendering.
3. Run npm run test using Vitest and jsdom; ensure basic tests pass.
4. Verify ESLint and Prettier check show no errors.
5. Inspect all import paths for correctness and case sensitivity.
6. No file should contain corrupt JSX, escaped sequences, or unused code.

If any validation fails, automatically correct and retry.

---

## 8. legecy.txt Content Specification

The file \`legecy.txt\` must include:
- Overview of original JSP project (structure, modules, data flow).
- Mapping of JSP features to React pages/components.
- Explanation of migration of server rendering to client-side UI using hooks/state.
- Dependency list with description.
- Setup, build & deployment guide (Vite + Tailwind).
- File structure tree.
- TypeScript, Redux/React Query design notes.
- Accessibility and performance improvements vs JSP.

Ensure this file is text-based, valid UTF-8, no escaped characters.

---

## 9. Output Format

Return a JSON array like:
\`\`\`
[
  { "name": "index.html", "content": "<!DOCTYPE html>...actual file content..." },
  { "name": "vite.config.ts", "content": "import { defineConfig } from 'vite'..." }
]
\`\`\`

Each "content" field must represent actual code, not escaped strings. 
All files must be valid as-is when written to disk.

---

## 10. Validation Recap

Before returning, confirm:
- App runs via \`vite dev\`
- No broken imports or components
- ESLint + Prettier clean
- Tailwind working
- Routing functional
- Tests executable (jsdom present)
- No escaped or malformed code remains
- Correct ES/CJS syntax per file
- Complete, accurate project ready for production

Only produce output once all checks pass successfully.

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
    const collectedFiles = [];

    const checkFiles = async (dir, depth = 0, relativeDir = "") => {
      if (depth > MAX_DEPTH) return;

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
          await checkFiles(fullPath, depth + 1, path.join(relativeDir, file));
        } else {
          const ext = path.extname(file).toLowerCase();
          if (ALLOWED_EXTENSIONS.includes(ext)) {
            if (ext === ".jsp") containsJsp = true;
            const content = await fs.readFile(fullPath, "utf-8");
            const fileName = path.join(relativeDir, file);
            const parts = fileName.split("\\");
            const relativePath = parts.slice(1).join("/");
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
  } catch (err) {
    console.error(`Error processing repository: ${err.message}`);
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
export function extractFilesFromZip(fileBuffer) {
  const zip = new AdmZip(fileBuffer);
  const zipEntries = zip.getEntries();

  return zipEntries.map((entry) => ({
    name: entry.entryName,
    content: entry.getData().toString("utf-8"),
  }));
}
