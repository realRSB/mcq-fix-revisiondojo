# MCQ Validation and Fixing Tool

A TypeScript-based tool for validating and automatically fixing multiple choice questions (MCQs). The tool detects common issues like malformed LaTeX, duplicate options, missing correct answers, and invalid option orderings.

## Features

- **Automatic Issue Detection**: Identifies problems in MCQ data
- **Smart Auto-Fixing**: Attempts to fix common issues automatically
- **Comprehensive Reporting**: Detailed logs of all detected and fixed issues
- **Flexible Input Handling**: Supports both JSON string and direct array formats for options
- **Data Validation**: Ensures data integrity with Zod schemas

## Installation

```bash
npm install
```

## Usage

### CLI Tool

```bash
# Build the TypeScript files
npm run build

# Run the validation tool
node src/check.js --input data/questions-mixed.json --output output.json --report report.json
```

Or use the npm script:

```bash
npm run check -- --input data/questions-mixed.json --output output.json --report report.json
```

### Arguments

- `--input`: Path to the input JSON file containing MCQs
- `--output`: Path where the cleaned and validated MCQs will be saved
- `--report`: Path where the detailed validation report will be saved

## How It Works

### Issue Detection & Auto-Fixing

The tool automatically detects and attempts to fix:

1. **Empty/null question text** → Keeps as null (no auto-fix)
2. **LaTeX issues** → Validates basic syntax (future enhancement)
3. **Multiple or no correct answers** → Reassigns based on heuristics
4. **Duplicate option text** → Adds disambiguation suffixes
5. **Gaps or duplicates in option order** → Normalizes to sequential 0, 1, 2, 3...
6. **Duplicate option IDs** → Generates new unique IDs
7. **Invalid option content** → Removes empty options

### Removal Criteria

Questions are only removed if:

- Question meaning cannot be recovered
- Syntax is irreparably malformed
- Options make it impossible to determine an answer
- Less than 2 valid options remain after fixing

### Output Files

#### output.json

Contains the cleaned and validated dataset in the expected format:

```json
[
  {
    "id": "UUID",
    "question": "string | null",
    "options": [
      {
        "id": number,
        "content": "string",
        "correct": boolean,
        "order": number
      }
    ]
  }
]
```

#### report.json

Detailed validation report with statistics and per-question issue tracking:

```json
{
  "totalQuestions": number,
  "fixedQuestions": number,
  "removedQuestions": number,
  "questions": {
    "questionId": {
      "questionId": "string",
      "issues": [
        {
          "type": "error" | "warning" | "fixed",
          "message": "string",
          "field": "string",
          "originalValue": any,
          "fixedValue": any
        }
      ],
      "wasFixed": boolean,
      "wasRemoved": boolean
    }
  }
}
```

## Schema Validation

The tool uses Zod schemas to ensure data integrity:

- **Input Schema**: Handles your current data format with `question_id`, `specification`, and flexible options
- **Output Schema**: Validates the expected output format with strict business rules
- **Business Rules**: Enforces unique IDs, sequential ordering, exactly one correct answer, and minimum requirements

## Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build
```

## Future Enhancements

- LaTeX validation using mathjax or latex.js
- AI-powered question text regeneration
- Next.js GUI for interactive debugging
- More sophisticated auto-fixing heuristics
