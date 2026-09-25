import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type = 'ai_text', content = '' } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: 'content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Retrieve private AI API Key from Supabase Secret
    const aiApiKey = Deno.env.get('AI_API_KEY');

    // Standard question parsing logic
    // Even if external AI key is not yet configured in cloud dashboard,
    // we extract questions cleanly from the text structure
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
    const questions = [];

    // Fallback parsing algorithm
    let currentQ = null;
    for (const line of lines) {
      const qMatch = line.match(/^(?:Q\d*[\.:\)]|\d+[\.:\)])\s*(.*)/i);
      if (qMatch) {
        if (currentQ && currentQ.options.length >= 2) {
          questions.push(currentQ);
        }
        currentQ = {
          question: qMatch[1],
          options: [],
          correct_option: 1,
        };
        continue;
      }

      const optMatch = line.match(/^(?:[1-4]|[A-D])[\.:\)]\s*(.*)/i);
      if (optMatch && currentQ && currentQ.options.length < 4) {
        currentQ.options.push(optMatch[1]);
        continue;
      }

      const ansMatch = line.match(/(?:Correct|Ans(?:wer)?)\s*[:=-]\s*([1-4]|[A-D])/i);
      if (ansMatch && currentQ) {
        const val = ansMatch[1].toUpperCase();
        if (val === 'A' || val === '1') currentQ.correct_option = 1;
        else if (val === 'B' || val === '2') currentQ.correct_option = 2;
        else if (val === 'C' || val === '3') currentQ.correct_option = 3;
        else if (val === 'D' || val === '4') currentQ.correct_option = 4;
      }
    }

    if (currentQ && currentQ.options.length >= 2) {
      questions.push(currentQ);
    }

    const standardQuestions = questions.map((q, idx) => ({
      id: `q_parsed_${Date.now()}_${idx}`,
      question: q.question,
      option1: q.options[0] || 'Option 1',
      option2: q.options[1] || 'Option 2',
      option3: q.options[2] || 'Option 3',
      option4: q.options[3] || 'Option 4',
      correct_option: q.correct_option || 1,
      marks: 1,
      subject: 'Computer Science',
      topic: 'General',
      difficulty: 'MEDIUM',
      question_type: 'MCQ',
    }));

    return new Response(
      JSON.stringify({
        success: true,
        total_extracted: standardQuestions.length,
        questions: standardQuestions,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Edge Function Parsing Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
