/**
 * QuizBolt Question Validators & ID Generation
 */

import { normalizeStem } from "./questionParsers";

/**
 * Validates a single question against all business and schema rules.
 * Flags correspond with the 8 Needs Review rules where applicable.
 */
export const validateQuestion = (q) => {
  const errors = [];
  const warnings = [];
  const flags = [];

  if (!q.question || !q.question.trim()) {
    errors.push("Question stem cannot be empty.");
  }

  if (!q.course_code) {
    errors.push("Course code is required.");
  }

  if (!q.university) {
    errors.push("University is required.");
  }

  if (!["objective", "theory", "fib", "matching"].includes(q.type)) {
    errors.push(`Invalid question type: "${q.type}".`);
  }

  // Rule 1: Missing explanation
  if (!q.reason || !q.reason.trim()) {
    warnings.push("Missing explanation/reason.");
    flags.push("no_explanation");
  }

  // Rule 2: Missing difficulty
  if (!q.difficulty) {
    warnings.push("No difficulty rating set.");
    flags.push("no_difficulty");
  }

  // Rule 3: Missing section/topic
  if (!q.section) {
    warnings.push("No section or topic assigned.");
    flags.push("no_section");
  }

  // Type-specific validations
  if (q.type === "objective") {
    // Rule 4: Insufficient options
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push("MCQ must have at least 2 options.");
      flags.push("insufficient_options");
    }

    // Rule 5: Correct answer not in options
    if (!q.correct) {
      errors.push("Correct answer is required for MCQ.");
    } else if (Array.isArray(q.options) && !q.options.includes(q.correct)) {
      errors.push("Correct answer does not match any of the provided options.");
      flags.push("correct_not_in_options");
    }
  } else if (q.type === "fib") {
    // Rule 7: FIB with missing or empty answers
    if (!Array.isArray(q.answers) || q.answers.length === 0) {
      errors.push("Fill-in-the-blank requires at least one accepted answer.");
      flags.push("no_fib_answers");
    }
  } else if (q.type === "theory") {
    // Rule 8: Theory with missing model answer
    if (!q.model_answer || !q.model_answer.trim()) {
      warnings.push("Theory question has no model answer/marking guide.");
      flags.push("no_model_answer");
    }
  } else if (q.type === "matching") {
    // Rule 6: Matching with missing pairs
    if (!Array.isArray(q.answers) || q.answers.length === 0) {
      errors.push("Matching question must contain key-value pairs in answers.");
      flags.push("no_match_pairs");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    flags,
  };
};

/**
 * Checks for duplicate questions within the batch and optionally against existing questions.
 */
export const detectDuplicates = (batch = [], existingQuestions = []) => {
  const seenStems = new Map();
  const seenIds = new Set();

  const existingStems = new Set();
  const existingIds = new Set();

  existingQuestions.forEach((q) => {
    if (!q) return;
    if (typeof q === "string") {
      existingIds.add(q.toLowerCase().trim());
    } else {
      if (q.question_id) existingIds.add(String(q.question_id).toLowerCase().trim());
      if (q.id) existingIds.add(String(q.id).toLowerCase().trim());
      const stem = normalizeStem(q.question);
      if (stem) existingStems.add(stem);
    }
  });

  return batch.map((q, index) => {
    const stem = normalizeStem(q.question);
    const qId = (q.question_id || "").toLowerCase().trim();
    const duplicates = [];

    if (qId) {
      if (existingIds.has(qId)) {
        duplicates.push(`Question ID "${q.question_id}" already exists in database`);
      } else if (seenIds.has(qId)) {
        duplicates.push(`Duplicate Question ID "${q.question_id}" in this import batch`);
      } else {
        seenIds.add(qId);
      }
    }

    if (stem) {
      if (existingStems.has(stem)) {
        duplicates.push("Question stem already exists in database");
      } else if (seenStems.has(stem)) {
        duplicates.push(`Duplicate question stem of row #${seenStems.get(stem) + 1} in this import`);
      } else {
        seenStems.set(stem, index);
      }
    }

    return {
      ...q,
      _isDuplicate: duplicates.length > 0,
      _duplicateReason: duplicates.length > 0 ? duplicates.join("; ") : null,
    };
  });
};

/**
 * Generates the next question ID based on highest existing ID for (university, course_code).
 * Verified database conventions:
 * - Theory:   COURSECODE-TNNN (e.g. ACC111-T001, COS102-T004)
 * - FIB:      COURSECODE-FNNN (e.g. CSC113-F012, CSC113-F017)
 * - Matching: COURSECODE-MNNN (e.g. CSC113-M001)
 * - Objective: COURSECODE-NNN  (e.g. BIO101-508, CSC115-001)
 */
export const deriveNextQuestionId = (existingQuestionIds = [], courseCode = "", type = "objective") => {
  const cleanCode = (courseCode || "Q").trim().toUpperCase();
  const cleanType = (type || "objective").trim().toLowerCase();

  let maxNum = 0;

  if (cleanType === "theory") {
    // Matches COURSECODE-TNNN or any -TNNN
    const theoryRegex = /[-_]T(\d+)$/i;
    existingQuestionIds.forEach((id) => {
      if (!id) return;
      const match = String(id).trim().match(theoryRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    return `${cleanCode}-T${String(nextNum).padStart(3, "0")}`;
  } else if (cleanType === "fib") {
    // Matches COURSECODE-FNNN or any -FNNN
    const fibRegex = /[-_]F(\d+)$/i;
    existingQuestionIds.forEach((id) => {
      if (!id) return;
      const match = String(id).trim().match(fibRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    return `${cleanCode}-F${String(nextNum).padStart(3, "0")}`;
  } else if (cleanType === "matching") {
    // Matches COURSECODE-MNNN or any -MNNN
    const matchRegex = /[-_]M(\d+)$/i;
    existingQuestionIds.forEach((id) => {
      if (!id) return;
      const match = String(id).trim().match(matchRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    return `${cleanCode}-M${String(nextNum).padStart(3, "0")}`;
  } else {
    // Objective: matches COURSECODE-NNN (pure digits after hyphen, ignoring T/F/M prefixes)
    const codeEscaped = cleanCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const objRegex = new RegExp(`^${codeEscaped}[-_](\\d+)$`, "i");
    const fallbackRegex = /[-_](\d+)$/;

    existingQuestionIds.forEach((id) => {
      if (!id) return;
      const str = String(id).trim();
      // Ensure it does not have a letter prefix before the number like -T001 or -F001
      if (/[-_][A-Za-z]\d+$/.test(str)) return;

      const match = str.match(objRegex) || str.match(fallbackRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    return `${cleanCode}-${String(nextNum).padStart(3, "0")}`;
  }
};

