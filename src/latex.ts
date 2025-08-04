import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

// LaTeX validation and processing utilities
export interface LaTeXIssue {
  type: "error" | "warning" | "info";
  message: string;
  position?: number;
  snippet?: string;
}

export interface LaTeXValidationResult {
  isValid: boolean;
  issues: LaTeXIssue[];
  renderedHTML?: string;
  hasLaTeX: boolean;
}

// Initialize MathJax
let mathjaxInitialized = false;

async function initializeMathJax(): Promise<void> {
  if (mathjaxInitialized) return;

  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);

  const html = mathjax.document("", {
    InputJax: new TeX({ packages: AllPackages }),
    OutputJax: new SVG({ fontCache: "none" }),
  });

  mathjaxInitialized = true;
}

// Basic LaTeX syntax validation using regex patterns
function validateBasicLaTeXSyntax(text: string): LaTeXIssue[] {
  const issues: LaTeXIssue[] = [];

  // Check for unmatched delimiters
  const dollarMatches = text.match(/\$/g);
  if (dollarMatches && dollarMatches.length % 2 !== 0) {
    issues.push({
      type: "error",
      message: "Unmatched dollar signs ($) found",
      snippet: text,
    });
  }

  // Check for unmatched braces
  const openBraces = (text.match(/\{/g) || []).length;
  const closeBraces = (text.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push({
      type: "error",
      message: `Unmatched braces: ${openBraces} opening vs ${closeBraces} closing`,
      snippet: text,
    });
  }

  // Check for common LaTeX command patterns
  const latexCommands = text.match(/\\[a-zA-Z]+/g) || [];
  const validCommands = [
    "\\alpha",
    "\\beta",
    "\\gamma",
    "\\delta",
    "\\epsilon",
    "\\zeta",
    "\\eta",
    "\\theta",
    "\\iota",
    "\\kappa",
    "\\lambda",
    "\\mu",
    "\\nu",
    "\\xi",
    "\\pi",
    "\\rho",
    "\\sigma",
    "\\tau",
    "\\upsilon",
    "\\phi",
    "\\chi",
    "\\psi",
    "\\omega",
    "\\Alpha",
    "\\Beta",
    "\\Gamma",
    "\\Delta",
    "\\Epsilon",
    "\\Zeta",
    "\\Eta",
    "\\Theta",
    "\\Iota",
    "\\Kappa",
    "\\Lambda",
    "\\Mu",
    "\\Nu",
    "\\Xi",
    "\\Pi",
    "\\Rho",
    "\\Sigma",
    "\\Tau",
    "\\Upsilon",
    "\\Phi",
    "\\Chi",
    "\\Psi",
    "\\Omega",
    "\\frac",
    "\\sqrt",
    "\\sum",
    "\\int",
    "\\prod",
    "\\lim",
    "\\inf",
    "\\sup",
    "\\sin",
    "\\cos",
    "\\tan",
    "\\log",
    "\\ln",
    "\\exp",
    "\\abs",
    "\\norm",
    "\\left",
    "\\right",
    "\\big",
    "\\Big",
    "\\bigg",
    "\\Bigg",
    "\\text",
    "\\mathrm",
    "\\mathbf",
    "\\mathit",
    "\\mathcal",
    "\\mathbb",
    "\\vec",
    "\\hat",
    "\\bar",
    "\\tilde",
    "\\dot",
    "\\ddot",
    "\\leq",
    "\\geq",
    "\\neq",
    "\\approx",
    "\\equiv",
    "\\propto",
    "\\infty",
    "\\partial",
    "\\nabla",
    "\\forall",
    "\\exists",
    "\\in",
    "\\notin",
  ];

  for (const command of latexCommands) {
    if (!validCommands.includes(command)) {
      issues.push({
        type: "warning",
        message: `Unknown LaTeX command: ${command}`,
        snippet: command,
      });
    }
  }

  // Check for malformed fractions
  const fractionPattern = /\\frac\{[^}]*\}\{[^}]*\}/g;
  const fractions = text.match(fractionPattern) || [];
  for (const fraction of fractions) {
    if (fraction.includes("\\frac{}{}")) {
      issues.push({
        type: "error",
        message: "Empty fraction found",
        snippet: fraction,
      });
    }
  }

  // Check for malformed square roots
  const sqrtPattern = /\\sqrt\{[^}]*\}/g;
  const sqrts = text.match(sqrtPattern) || [];
  for (const sqrt of sqrts) {
    if (sqrt.includes("\\sqrt{}")) {
      issues.push({
        type: "error",
        message: "Empty square root found",
        snippet: sqrt,
      });
    }
  }

  return issues;
}

// Extract LaTeX expressions from text
function extractLaTeXExpressions(text: string): string[] {
  const expressions: string[] = [];

  // Find inline math: $...$
  const inlineMatches = text.match(/\$([^$]+)\$/g) || [];
  expressions.push(...inlineMatches);

  // Find display math: $$...$$
  const displayMatches = text.match(/\$\$([^$]+)\$\$/g) || [];
  expressions.push(...displayMatches);

  // Find LaTeX commands outside of math mode
  const commandMatches = text.match(/\\[a-zA-Z]+\{[^}]*\}/g) || [];
  expressions.push(...commandMatches);

  return expressions;
}

// Validate and render LaTeX using MathJax
async function validateWithMathJax(
  latexExpression: string
): Promise<LaTeXIssue[]> {
  const issues: LaTeXIssue[] = [];

  try {
    await initializeMathJax();

    const adaptor = liteAdaptor();
    const html = mathjax.document("", {
      InputJax: new TeX({ packages: AllPackages }),
      OutputJax: new SVG({ fontCache: "none" }),
    });

    // Try to convert LaTeX to HTML
    const node = html.convert(latexExpression, {
      display:
        latexExpression.startsWith("$$") && latexExpression.endsWith("$$"),
    });

    // If successful, no issues
    return [];
  } catch (error) {
    issues.push({
      type: "error",
      message: `MathJax rendering error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      snippet: latexExpression,
    });
  }

  return issues;
}

// Main LaTeX validation function
export async function validateLaTeX(
  text: string
): Promise<LaTeXValidationResult> {
  const issues: LaTeXIssue[] = [];

  // Check if text contains LaTeX
  const hasLaTeX = /\$|\\([a-zA-Z]+|{|})/.test(text);

  if (!hasLaTeX) {
    return {
      isValid: true,
      issues: [],
      hasLaTeX: false,
    };
  }

  // Basic syntax validation
  const basicIssues = validateBasicLaTeXSyntax(text);
  issues.push(...basicIssues);

  // Extract and validate LaTeX expressions
  const expressions = extractLaTeXExpressions(text);

  for (const expression of expressions) {
    try {
      const mathjaxIssues = await validateWithMathJax(expression);
      issues.push(...mathjaxIssues);
    } catch (error) {
      issues.push({
        type: "error",
        message: `Failed to validate LaTeX expression: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        snippet: expression,
      });
    }
  }

  const isValid = !issues.some((issue) => issue.type === "error");

  return {
    isValid,
    issues,
    hasLaTeX: true,
  };
}

// Render LaTeX to HTML
export async function renderLaTeX(text: string): Promise<string> {
  if (!text || !/\$|\\([a-zA-Z]+|{|})/.test(text)) {
    return text;
  }

  try {
    await initializeMathJax();

    const adaptor = liteAdaptor();
    const html = mathjax.document("", {
      InputJax: new TeX({ packages: AllPackages }),
      OutputJax: new SVG({ fontCache: "none" }),
    });

    // Replace LaTeX expressions with rendered HTML
    let renderedText = text;

    // Handle display math: $$...$$
    renderedText = renderedText.replace(
      /\$\$([^$]+)\$\$/g,
      (match, content) => {
        try {
          const node = html.convert(content, { display: true });
          return adaptor.outerHTML(node);
        } catch {
          return match; // Keep original if rendering fails
        }
      }
    );

    // Handle inline math: $...$
    renderedText = renderedText.replace(/\$([^$]+)\$/g, (match, content) => {
      try {
        const node = html.convert(content, { display: false });
        return adaptor.outerHTML(node);
      } catch {
        return match; // Keep original if rendering fails
      }
    });

    return renderedText;
  } catch (error) {
    console.warn("LaTeX rendering failed:", error);
    return text; // Return original text if rendering fails
  }
}

// Clean and normalize LaTeX expressions
export function cleanLaTeX(text: string): string {
  if (!text) return text;

  let cleaned = text;

  // Remove extra whitespace around LaTeX delimiters
  cleaned = cleaned.replace(/\s*\$\s*/g, "$");
  cleaned = cleaned.replace(/\s*\\\s*/g, "\\");

  // Fix common LaTeX spacing issues
  cleaned = cleaned.replace(/([a-zA-Z0-9])\\([a-zA-Z]+)/g, "$1\\$2");
  cleaned = cleaned.replace(/\\([a-zA-Z]+)([a-zA-Z0-9])/g, "\\$1{$2}");

  // Normalize fraction spacing
  cleaned = cleaned.replace(/\\frac\s*\{/g, "\\frac{");
  cleaned = cleaned.replace(/\}\s*\{/g, "}{");

  return cleaned;
}

// Check if text contains potentially problematic LaTeX
export function hasLaTeXIssues(text: string): boolean {
  if (!text) return false;

  // Quick checks for common issues
  const hasUnmatchedDollars = (text.match(/\$/g) || []).length % 2 !== 0;
  const hasUnmatchedBraces =
    (text.match(/\{/g) || []).length !== (text.match(/\}/g) || []).length;
  const hasEmptyCommands = /\\[a-zA-Z]+\{\s*\}/.test(text);

  return hasUnmatchedDollars || hasUnmatchedBraces || hasEmptyCommands;
}
