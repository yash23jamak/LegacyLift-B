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
              "progress_percent": number,
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

export const REPO_ANALYSIS_PROMPT = (repo_url) => `Analyzing legacy JSP code for conversion to modern React. Analyze ONLY the provided frontend code of repo (.jsp, .jspx, .jspf, .html, .css, .js, .xml, .properties) and generate a comprehensive analysis report in valid JSON format.
 
 
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
  "project_overview": {
    "project_name": "string",
    "frontend_technology": "JSP",
    "total_files_analyzed": number,
    "analysis_timestamp": "string"
  },
  "feature_analysis": {
    "ui_components": [
      {
        "component_name": "string",
        "type": "form | table | navigation | modal | other",
        "complexity": "low | medium | high",
        "description": "string",
        "react_alternative": "string"
      }
    ],
    "user_interactions": [
      {
        "interaction_type": "string",
        "implementation_method": "string",
        "react_recommendation": "string"
      }
    ],
    "form_handling": {
      "forms_count": number,
      "validation_approach": "string",
      "react_form_library": "string"
    },
    "routing_requirements": {
      "pages_count": number,
      "navigation_pattern": "string",
      "react_router_recommendation": "string"
    }
  },
  "dependency_analysis": {
    "javascript_libraries": [
      {
        "library_name": "string",
        "purpose": "string",
        "current_version": "string",
        "react_alternative": "string",
        "migration_priority": "low | medium | high"
      }
    ],
    "css_frameworks": [
      {
        "framework_name": "string",
        "purpose": "string",
        "react_alternative": "string"
      }
    ],
    "external_assets": [
      {
        "asset_type": "string",
        "usage": "string",
        "handling_recommendation": "string"
      }
    ]
  },
  "state_management_analysis": {
    "state_patterns_identified": ["string"],
    "complexity_level": "low | medium | high",
    "react_state_management_recommendation": "string",
    "reasoning": "string"
  },
  "testing_strategy": {
    "recommended_testing_libraries": [
      {
        "library_name": "string",
        "purpose": "unit | integration | e2e",
        "reason_for_selection": "string"
      }
    ],
    "testing_approach": "string",
    "critical_test_areas": ["string"]
  },
  "migration_recommendations": {
    "react_version": "string",
    "recommended_tools": ["string"],
    "build_tool": "string",
    "styling_solution": "string",
    "key_considerations": ["string"]
  },
  "complexity_assessment": {
    "overall_complexity": "low | medium | high",
    "migration_effort_estimate": "string",
    "risk_factors": ["string"],
    "success_metrics": ["string"]
  }
}
 
 
Analyze the provided code of Repo and generate the report. Base all findings strictly on the actual code content. Do not invent or assume features that are not present in the Repo.
 
${repo_url}`

export const ALLOWED_EXTENSIONS = [
  '.jsp', '.jspx', '.jspf', '.html', '.htm', '.css', '.js', '.xml', '.properties'
];