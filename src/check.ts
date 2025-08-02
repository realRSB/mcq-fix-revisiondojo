#!/usr/bin/env node

import { z } from "zod";
import { MCQ, MCQOutput, type MCQT } from "./schema.js";
import fs from "fs/promises";
import path from "path";

// Types for reporting and validation results
interface Issue {
  type: "error" | "warning" | "fixed";
  message: string;
  field?: string;
  originalValue?: any;
  fixedValue?: any;
}

interface QuestionReport {
  questionId: string;
  issues: Issue[];
  wasFixed: boolean;
  wasRemoved: boolean;
}

interface ValidationReport {
  totalQuestions: number;
  fixedQuestions: number;
  removedQuestions: number;
  questions: Record<string, QuestionReport>;
}

// Parse command line arguments for input/output files
const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const outputIndex = args.indexOf("--output");
const reportIndex = args.indexOf("--report");

if (inputIndex === -1 || outputIndex === -1 || reportIndex === -1) {
  console.error(
    "Usage: node check.js --input <input.json> --output <output.json> --report <report.json>"
  );
  process.exit(1);
}

const inputFile = args[inputIndex + 1];
const outputFile = args[outputIndex + 1];
const reportFile = args[reportIndex + 1];

if (!inputFile || !outputFile || !reportFile) {
  console.error("Missing required file paths");
  process.exit(1);
}

// Main validation and fixing logic for MCQ dataset
async function validateAndFixMCQs(inputPath: string): Promise<{
  validQuestions: any[];
  report: ValidationReport;
}> {
  console.log("Loading questions from:", inputPath);

  const rawData = await fs.readFile(inputPath, "utf-8");
  const questions = JSON.parse(rawData);

  const report: ValidationReport = {
    totalQuestions: questions.length,
    fixedQuestions: 0,
    removedQuestions: 0,
    questions: {},
  };

  const validQuestions: any[] = [];

  for (const question of questions) {
    const questionReport: QuestionReport = {
      questionId: question.question_id || question.id || "unknown",
      issues: [],
      wasFixed: false,
      wasRemoved: false,
    };

    try {
      // Try to parse with our input schema
      const parsedQuestion = MCQ.parse(question);

      // Transform to output format
      const outputQuestion = {
        id: parsedQuestion.question_id,
        question: parsedQuestion.specification,
        options: parsedQuestion.options,
      };

      // Validate with output schema
      const validatedQuestion = MCQOutput.parse(outputQuestion);

      validQuestions.push(validatedQuestion);
      questionReport.issues.push({
        type: "fixed",
        message: "Question validated successfully",
      });
      questionReport.wasFixed = true;
      report.fixedQuestions++;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        for (const issue of error.issues) {
          questionReport.issues.push({
            type: "error",
            message: issue.message,
            field: issue.path.join("."),
            originalValue: issue.input,
          });
        }

        // Try to fix common issues
        const fixedQuestion = await attemptToFixQuestion(
          question,
          questionReport
        );

        if (fixedQuestion) {
          try {
            const validatedQuestion = MCQOutput.parse(fixedQuestion);
            validQuestions.push(validatedQuestion);
            questionReport.wasFixed = true;
            report.fixedQuestions++;
          } catch (fixError) {
            questionReport.issues.push({
              type: "error",
              message: "Question could not be fixed automatically",
            });
            questionReport.wasRemoved = true;
            report.removedQuestions++;
          }
        } else {
          questionReport.wasRemoved = true;
          report.removedQuestions++;
        }
      } else {
        questionReport.issues.push({
          type: "error",
          message: "Unexpected error during validation",
        });
        questionReport.wasRemoved = true;
        report.removedQuestions++;
      }
    }

    report.questions[questionReport.questionId] = questionReport;
  }

  return { validQuestions, report };
}

// Attempt to automatically fix common MCQ issues
async function attemptToFixQuestion(
  question: any,
  report: QuestionReport
): Promise<any | null> {
  const fixedQuestion: any = {
    id: question.question_id || question.id,
    question: question.specification || question.question || null,
    options: [],
  };

  // Parse options
  let options = [];
  try {
    if (typeof question.options === "string") {
      options = JSON.parse(question.options);
    } else if (Array.isArray(question.options)) {
      options = question.options;
    } else {
      return null;
    }
  } catch {
    return null;
  }

  // Fix option issues
  const fixedOptions = [];
  const seenIds = new Set<number>();
  const seenContent = new Set<string>();
  let correctCount = 0;

  for (let i = 0; i < options.length; i++) {
    const option = options[i];

    // Skip invalid options
    if (!option || typeof option !== "object") continue;

    // Fix ID duplicates
    let id = option.id;
    if (seenIds.has(id)) {
      id = Math.max(...Array.from(seenIds), 0) + 1;
      report.issues.push({
        type: "fixed",
        message: "Fixed duplicate option ID",
        field: `options[${i}].id`,
        originalValue: option.id,
        fixedValue: id,
      });
    }
    seenIds.add(id);

    // Fix content duplicates
    let content = option.content || "";
    if (seenContent.has(content) && content.trim()) {
      content = `${content} (Option ${i + 1})`;
      report.issues.push({
        type: "fixed",
        message: "Fixed duplicate option content",
        field: `options[${i}].content`,
        originalValue: option.content,
        fixedValue: content,
      });
    }
    seenContent.add(content);

    // Count correct answers
    if (option.correct) correctCount++;

    fixedOptions.push({
      id,
      content,
      correct: !!option.correct,
      order: i,
    });
  }

  // Fix correct answer issues
  if (correctCount === 0) {
    // No correct answer, mark first option as correct
    if (fixedOptions.length > 0) {
      fixedOptions[0]!.correct = true;
      report.issues.push({
        type: "fixed",
        message: "No correct answer found, marked first option as correct",
        field: "options[0].correct",
        originalValue: false,
        fixedValue: true,
      });
    }
  } else if (correctCount > 1) {
    // Multiple correct answers, keep only the first one
    let firstCorrect = true;
    for (const option of fixedOptions) {
      if (option.correct && !firstCorrect) {
        option.correct = false;
        report.issues.push({
          type: "fixed",
          message: "Multiple correct answers found, kept only the first one",
          field: `options[${option.id}].correct`,
          originalValue: true,
          fixedValue: false,
        });
      }
      if (option.correct) firstCorrect = false;
    }
  }

  // Ensure minimum 2 options
  if (fixedOptions.length < 2) {
    return null;
  }

  fixedQuestion.options = fixedOptions;
  return fixedQuestion;
}

// Main CLI execution function
async function main() {
  try {
    console.log("Starting MCQ validation and fixing...");

    const { validQuestions, report } = await validateAndFixMCQs(inputFile!);

    // Write output files
    await fs.writeFile(outputFile!, JSON.stringify(validQuestions, null, 2));
    await fs.writeFile(reportFile!, JSON.stringify(report, null, 2));

    console.log(`\nValidation complete!`);
    console.log(`Total questions: ${report.totalQuestions}`);
    console.log(`Fixed questions: ${report.fixedQuestions}`);
    console.log(`Removed questions: ${report.removedQuestions}`);
    console.log(`Valid questions: ${validQuestions.length}`);
    console.log(`\nOutput written to: ${outputFile}`);
    console.log(`Report written to: ${reportFile}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
