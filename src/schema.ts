import { z } from "zod";

// Schema for a single MCQ option
export const Option = z.object({
  id: z.number(),
  content: z.string().min(1, "Option content cannot be empty"),
  correct: z.boolean(),
  order: z.number().int().nonnegative(),
  markscheme: z.string().optional(),
});

// LaTeX validation helper
const latexString = z.string().refine(
  (text) => {
    if (!text) return true;
    // Basic LaTeX validation - check for unmatched delimiters
    const dollarCount = (text.match(/\$/g) || []).length;
    const braceCount =
      (text.match(/\{/g) || []).length - (text.match(/\}/g) || []).length;
    return dollarCount % 2 === 0 && braceCount === 0;
  },
  {
    message: "LaTeX syntax error: unmatched delimiters",
  }
);

// Schema for a complete MCQ with flexible options handling
export const MCQ = z.object({
  question_id: z.string().uuid(),
  specification: latexString,
  options: z
    .string()
    .or(z.array(Option))
    .transform((raw) =>
      Array.isArray(raw) ? raw : (JSON.parse(raw) as unknown)
    )
    .pipe(z.array(Option))
    .refine(
      (options) => options.length >= 2,
      "Question must have at least 2 options"
    )
    .refine(
      (options) => options.filter((opt) => opt.correct).length === 1,
      "Question must have exactly one correct answer"
    )
    .refine((options) => {
      const ids = options.map((opt) => opt.id);
      return new Set(ids).size === ids.length;
    }, "All option IDs must be unique")
    .refine((options) => {
      const orders = options.map((opt) => opt.order).sort((a, b) => a - b);
      return orders.every((order, index) => order === index);
    }, "Option orders must be sequential starting from 0"),
});

// Schema for the expected output format (matching problem requirements)
export const MCQOutput = z.object({
  id: z.string().uuid(),
  question: latexString.nullable(),
  options: z
    .array(
      z.object({
        id: z.number(),
        content: latexString.min(1),
        correct: z.boolean(),
        order: z.number().int().nonnegative(),
      })
    )
    .min(2)
    .refine(
      (options) => options.filter((opt) => opt.correct).length === 1,
      "Question must have exactly one correct answer"
    )
    .refine((options) => {
      const ids = options.map((opt) => opt.id);
      return new Set(ids).size === ids.length;
    }, "All option IDs must be unique")
    .refine((options) => {
      const orders = options.map((opt) => opt.order).sort((a, b) => a - b);
      return orders.every((order, index) => order === index);
    }, "Option orders must be sequential starting from 0"),
});

export type OptionT = z.infer<typeof Option>;
export type MCQT = z.infer<typeof MCQ>;
