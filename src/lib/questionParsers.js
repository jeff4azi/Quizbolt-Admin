/**
 * QuizBolt Question Parsers
 * Pure utility functions for converting JSON, CSV, and Plain Text into standardized question objects.
 */

/**
 * Normalizes question text for comparison.
 */
export const normalizeStem = (text) => {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Standardize question object with safe defaults.
 */
export const sanitizeQuestion = (raw, defaults = {}) => {
  const university = (raw.university || defaults.university || "").trim().toUpperCase();
  const course_code = (raw.course_code || defaults.course_code || "").trim().toUpperCase();
  const type = (raw.type || defaults.type || "objective").trim().toLowerCase();

  let options = raw.options;
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      options = options.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(options) && type === "objective") {
    options = [];
  }

  let answers = raw.answers;
  if (typeof answers === "string") {
    try {
      answers = JSON.parse(answers);
    } catch {
      answers = answers.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(answers) && (type === "fib" || type === "matching")) {
    answers = [];
  }

  let keywords = raw.keywords;
  if (typeof keywords === "string") {
    try {
      keywords = JSON.parse(keywords);
    } catch {
      keywords = keywords.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(keywords)) {
    keywords = null;
  }

  return {
    question_id: raw.question_id ? String(raw.question_id).trim() : undefined,
    course_code,
    university,
    type: ["objective", "theory", "fib", "matching"].includes(type) ? type : "objective",
    question: String(raw.question || "").trim(),
    options: Array.isArray(options) ? options : null,
    correct: raw.correct ? String(raw.correct).trim() : null,
    reason: raw.reason ? String(raw.reason).trim() : null,
    difficulty: raw.difficulty ? String(raw.difficulty).trim().toLowerCase() : defaults.difficulty || "medium",
    section: raw.section ? String(raw.section).trim() : defaults.section || null,
    match_prompt: raw.match_prompt ? String(raw.match_prompt).trim() : null,
    keywords,
    model_answer: raw.model_answer ? String(raw.model_answer).trim() : null,
    answers: Array.isArray(answers) ? answers : null,
    order_index: Number(raw.order_index) || 0,
  };
};

/**
 * Parses JSON string (array of question objects or { questions: [...] }).
 */
export const parseJson = (text, defaults = {}) => {
  try {
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : parsed.questions || parsed.data || [];
    if (!Array.isArray(list)) {
      return { success: false, error: "JSON must contain an array of question objects." };
    }
    const questions = list.map((item) => sanitizeQuestion(item, defaults));
    return { success: true, questions };
  } catch (err) {
    return { success: false, error: `Invalid JSON format: ${err.message}` };
  }
};

/**
 * RFC 4180 compliant CSV line tokenizer.
 */
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parses CSV string into array of questions.
 */
export const parseCsv = (text, defaults = {}) => {
  try {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) {
      return { success: false, error: "CSV must have a header row and at least one data row." };
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const questions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx].trim() : "";
      });

      // Map common alternative column names
      const raw = {
        question_id: row.question_id || row.id || row.qid,
        course_code: row.course_code || row.course || defaults.course_code,
        university: row.university || row.uni || defaults.university,
        type: row.type || defaults.type || "objective",
        question: row.question || row.stem || row.prompt,
        options: row.options ? row.options.split("|").map((o) => o.trim()) : undefined,
        correct: row.correct || row.answer,
        reason: row.reason || row.explanation,
        difficulty: row.difficulty || defaults.difficulty,
        section: row.section || row.topic || defaults.section,
        model_answer: row.model_answer || row.solution,
        match_prompt: row.match_prompt,
      };

      questions.push(sanitizeQuestion(raw, defaults));
    }

    return { success: true, questions };
  } catch (err) {
    return { success: false, error: `Failed to parse CSV: ${err.message}` };
  }
};

/**
 * Parses plain-text questions (e.g. copy-pasted test banks).
 * Example:
 * 1. What is the capital of France?
 * A) Paris
 * B) London
 * C) Rome
 * D) Berlin
 * Answer: A
 * Explanation: Paris is the capital.
 */
export const parsePlainText = (text, defaults = {}) => {
  try {
    const blocks = text
      .split(/\n\s*\n+/)
      .map((b) => b.trim())
      .filter(Boolean);

    const questions = [];

    for (const block of blocks) {
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      let stem = "";
      const options = [];
      let correct = null;
      let reason = null;
      let type = "objective";
      let model_answer = null;

      let inStem = true;

      for (const line of lines) {
        // Check for Answer/Correct line
        const answerMatch = line.match(/^(?:Answer|Correct|Ans)\s*[:=-]\s*(.+)$/i);
        if (answerMatch) {
          inStem = false;
          const val = answerMatch[1].trim();
          // Check if answer is a letter like A, B, C, D
          if (/^[A-E]$/i.test(val)) {
            const letterIdx = val.toUpperCase().charCodeAt(0) - 65;
            if (options[letterIdx]) {
              correct = options[letterIdx];
            } else {
              correct = val.toUpperCase();
            }
          } else {
            correct = val;
          }
          continue;
        }

        // Check for Explanation / Reason
        const expMatch = line.match(/^(?:Explanation|Reason|Note)\s*[:=-]\s*(.+)$/i);
        if (expMatch) {
          inStem = false;
          reason = expMatch[1].trim();
          continue;
        }

        // Check for Model Answer (Theory)
        const modelMatch = line.match(/^(?:Model Answer|Solution)\s*[:=-]\s*(.+)$/i);
        if (modelMatch) {
          inStem = false;
          model_answer = modelMatch[1].trim();
          type = "theory";
          continue;
        }

        // Check for MCQ options A), B), 1), etc.
        const optMatch = line.match(/^(?:[A-Ea-e][\.\)]|\([A-Ea-e]\))\s*(.+)$/);
        if (optMatch) {
          inStem = false;
          options.push(optMatch[1].trim());
          continue;
        }

        // If still in stem
        if (inStem) {
          // Strip leading number like "1.", "1)", "Q1:"
          const cleaned = line.replace(/^(?:Q\d+[:.]|\d+[\.\)])\s*/i, "").trim();
          stem = stem ? `${stem} ${cleaned}` : cleaned;
        }
      }

      // If correct was a letter like A and we now have options
      if (correct && /^[A-E]$/i.test(correct)) {
        const idx = correct.toUpperCase().charCodeAt(0) - 65;
        if (options[idx]) correct = options[idx];
      }

      if (options.length === 0 && !correct && model_answer) {
        type = "theory";
      }

      if (stem) {
        questions.push(
          sanitizeQuestion(
            {
              type,
              question: stem,
              options: options.length > 0 ? options : null,
              correct,
              reason,
              model_answer,
            },
            defaults
          )
        );
      }
    }

    if (questions.length === 0) {
      return { success: false, error: "Could not detect any valid questions from the text." };
    }

    return { success: true, questions };
  } catch (err) {
    return { success: false, error: `Failed to parse plain text: ${err.message}` };
  }
};
