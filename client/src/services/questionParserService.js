import * as XLSX from 'xlsx';

/**
 * Standard Question Structure:
 * {
 *   question: string,
 *   option1: string,
 *   option2: string,
 *   option3: string,
 *   option4: string,
 *   correct_option: 1 | 2 | 3 | 4,
 *   marks: number,
 *   subject: string,
 *   topic: string,
 *   difficulty: 'EASY' | 'MEDIUM' | 'HARD'
 * }
 */

export const questionParserService = {
  // ─── VALIDATION ─────────────────────────────────────────────
  validateQuestion(q) {
    const errors = [];

    if (!q.question || typeof q.question !== 'string' || !q.question.trim()) {
      errors.push('Question statement is required.');
    }

    if (!q.option1 || !String(q.option1).trim()) errors.push('Option 1 is required.');
    if (!q.option2 || !String(q.option2).trim()) errors.push('Option 2 is required.');
    if (!q.option3 || !String(q.option3).trim()) errors.push('Option 3 is required.');
    if (!q.option4 || !String(q.option4).trim()) errors.push('Option 4 is required.');

    const correct = parseInt(q.correct_option, 10);
    if (isNaN(correct) || correct < 1 || correct > 4) {
      errors.push('Correct option must be 1, 2, 3, or 4.');
    }

    const marks = Number(q.marks);
    if (isNaN(marks) || marks <= 0) {
      errors.push('Marks must be a positive number.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validateBatch(questions = []) {
    let validCount = 0;
    let invalidCount = 0;
    const seenStatements = new Set();

    const reviewed = questions.map((q, idx) => {
      const { isValid, errors } = this.validateQuestion(q);
      const cleanStatement = (q.question || '').trim().toLowerCase();

      let duplicateWarning = false;
      if (cleanStatement && seenStatements.has(cleanStatement)) {
        duplicateWarning = true;
        errors.push('Duplicate question detected in this batch.');
      } else if (cleanStatement) {
        seenStatements.add(cleanStatement);
      }

      if (isValid && !duplicateWarning) {
        validCount++;
      } else {
        invalidCount++;
      }

      return {
        ...q,
        index: idx + 1,
        isValid: isValid && !duplicateWarning,
        errors,
      };
    });

    return {
      total: questions.length,
      validCount,
      invalidCount,
      items: reviewed,
    };
  },

  // ─── EXCEL TEMPLATE & EXPORT ────────────────────────────────
  downloadTemplate() {
    const sampleData = [
      {
        'Question': 'Which data structure follows the FIFO (First In First Out) principle?',
        'Option 1': 'Stack',
        'Option 2': 'Queue',
        'Option 3': 'Tree',
        'Option 4': 'Graph',
        'Correct Option': 2,
        'Marks': 1,
        'Subject': 'Data Structures',
        'Topic': 'Queues',
        'Difficulty': 'EASY',
      },
      {
        'Question': 'What is the worst-case time complexity of MergeSort?',
        'Option 1': 'O(n²)',
        'Option 2': 'O(n)',
        'Option 3': 'O(n log n)',
        'Option 4': 'O(log n)',
        'Correct Option': 3,
        'Marks': 2,
        'Subject': 'Algorithms',
        'Topic': 'Sorting',
        'Difficulty': 'MEDIUM',
      },
      {
        'Question': 'Which protocol is used for securely transmitting web pages over the internet?',
        'Option 1': 'HTTP',
        'Option 2': 'FTP',
        'Option 3': 'HTTPS',
        'Option 4': 'SMTP',
        'Correct Option': 3,
        'Marks': 1,
        'Subject': 'Web Technologies',
        'Topic': 'Network Protocols',
        'Difficulty': 'EASY',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Question Template');

    // Column widths
    worksheet['!cols'] = [
      { wch: 60 }, // Question
      { wch: 25 }, // Option 1
      { wch: 25 }, // Option 2
      { wch: 25 }, // Option 3
      { wch: 25 }, // Option 4
      { wch: 15 }, // Correct Option
      { wch: 10 }, // Marks
      { wch: 20 }, // Subject
      { wch: 20 }, // Topic
      { wch: 15 }, // Difficulty
    ];

    XLSX.writeFile(workbook, 'TEC_Question_Import_Template.xlsx');
  },

  async parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            throw new Error('The uploaded Excel file contains no data.');
          }

          const parsed = rawRows.map((row, idx) => {
            // Flexible column matching
            const qText = row['Question'] || row['question'] || row['QUESTION'] || row['Problem'] || '';
            const opt1 = row['Option 1'] || row['option 1'] || row['Option1'] || row['A'] || row['option1'] || '';
            const opt2 = row['Option 2'] || row['option 2'] || row['Option2'] || row['B'] || row['option2'] || '';
            const opt3 = row['Option 3'] || row['option 3'] || row['Option3'] || row['C'] || row['option3'] || '';
            const opt4 = row['Option 4'] || row['option 4'] || row['Option4'] || row['D'] || row['option4'] || '';

            // Handle letter correct options (A->1, B->2, C->3, D->4)
            let correct = row['Correct Option'] || row['Correct'] || row['correct_option'] || row['Answer'] || 1;
            if (typeof correct === 'string') {
              const upper = correct.trim().toUpperCase();
              if (upper === 'A' || upper === '1') correct = 1;
              else if (upper === 'B' || upper === '2') correct = 2;
              else if (upper === 'C' || upper === '3') correct = 3;
              else if (upper === 'D' || upper === '4') correct = 4;
            }

            return {
              id: `q_xl_${Date.now()}_${idx}`,
              question: String(qText).trim(),
              option1: String(opt1).trim(),
              option2: String(opt2).trim(),
              option3: String(opt3).trim(),
              option4: String(opt4).trim(),
              correct_option: parseInt(correct, 10) || 1,
              marks: Number(row['Marks'] || row['marks'] || 1) || 1,
              subject: (row['Subject'] || row['subject'] || 'Computer Science').toString().trim(),
              topic: (row['Topic'] || row['topic'] || 'General').toString().trim(),
              difficulty: ((row['Difficulty'] || row['difficulty'] || 'MEDIUM').toString().toUpperCase()),
              question_type: 'MCQ',
            };
          });

          resolve(parsed);
        } catch (err) {
          reject(new Error('Failed to parse Excel file: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed.'));
      reader.readAsArrayBuffer(file);
    });
  },

  exportToExcel(questions = [], filename = 'Exported_Questions.xlsx') {
    const formatted = questions.map((q, idx) => ({
      '#': idx + 1,
      'Question': q.question,
      'Option 1': q.option1,
      'Option 2': q.option2,
      'Option 3': q.option3,
      'Option 4': q.option4,
      'Correct Option': q.correct_option,
      'Marks': q.marks || 1,
      'Subject': q.subject || '',
      'Topic': q.topic || '',
      'Difficulty': q.difficulty || 'MEDIUM',
      'Status': q.archived ? 'ARCHIVED' : 'ACTIVE',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 55 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 15 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
    ];

    XLSX.writeFile(workbook, filename);
  },

  // ─── AI / CHATGPT FREEFORM TEXT PARSER ───────────────────────
  parseAIText(rawText) {
    if (!rawText || !rawText.trim()) return [];

    // Split text into potential question blocks by question indicators
    const blocks = rawText
      .split(/(?:^|\n+)(?=(?:Q\d*[\.:\)]|\d+[\.:\)]|\*\*Q\d*[\.:\)]|\*\*Question\s*\d*[\.:\)]))/i)
      .map(b => b.trim())
      .filter(Boolean);

    const parsedQuestions = [];

    blocks.forEach((block, idx) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 5) return; // Must have question + 4 options

      let questionStatement = '';
      const options = [];
      let correctOption = 1;
      let marks = 1;

      // Extract Question Statement
      const firstLine = lines[0].replace(/^(?:\*\*|\*)*(?:Q\d*|Question\s*\d*|\d+)[\.:\)]\s*/i, '').replace(/(\*\*|\*)*$/g, '').trim();
      questionStatement = firstLine;

      // Process subsequent lines
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Check for Correct Answer line
        const answerMatch = line.match(/(?:Correct\s*(?:Answer|Option)?|Ans(?:wer)?)\s*[:=-]\s*([1-4]|[A-D])/i);
        if (answerMatch) {
          const val = answerMatch[1].toUpperCase();
          if (val === 'A' || val === '1') correctOption = 1;
          else if (val === 'B' || val === '2') correctOption = 2;
          else if (val === 'C' || val === '3') correctOption = 3;
          else if (val === 'D' || val === '4') correctOption = 4;
          continue;
        }

        // Check for Option line (1., 2., 3., 4. OR A., B., C., D.)
        const optMatch = line.match(/^(?:(?:\*\*|\*)*([1-4]|[A-D])[\.:\)]\s*)(.*)/i);
        if (optMatch && options.length < 4) {
          const optText = optMatch[2].replace(/(\*\*|\*)*$/g, '').trim();
          options.push(optText);
          continue;
        }

        // If we haven't found 4 options and this is a general line before options, append to question
        if (options.length === 0 && !answerMatch) {
          questionStatement += ' ' + line;
        }
      }

      if (questionStatement && options.length >= 2) {
        parsedQuestions.push({
          id: `q_ai_${Date.now()}_${idx}`,
          question: questionStatement,
          option1: options[0] || 'Option A',
          option2: options[1] || 'Option B',
          option3: options[2] || 'Option C',
          option4: options[3] || 'Option D',
          correct_option: correctOption,
          marks: 1,
          subject: 'Computer Science',
          topic: 'General',
          difficulty: 'MEDIUM',
          question_type: 'MCQ',
        });
      }
    });

    return parsedQuestions;
  }
};
