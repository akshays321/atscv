const { Anthropic } = require('@anthropic-ai/sdk');

function parseJsonBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }
  return body;
}

function normalizeSkills(skills) {
  if (Array.isArray(skills)) return skills.join(', ');
  if (typeof skills === 'string') return skills;
  return '';
}

function buildFallbackResponse(cv, prompt) {
  const safeSummary = (cv && cv.summary) || 'Experienced professional with a strong track record of building practical, user-focused solutions.';
  const safeExperience = (cv && cv.experience) || 'Relevant experience and measurable impact across product, engineering, and collaboration workflows.';
  const safeSkills = normalizeSkills((cv && cv.skills) || 'Product thinking, execution, collaboration, communication');

  return {
    summary: safeSummary,
    experience: safeExperience,
    skills: safeSkills,
    note: `AI fallback used because no Anthropic key is configured. Prompt: ${String(prompt || '').slice(0, 160)}`
  };
}

function extractJson(payload) {
  if (!payload) return {};
  if (typeof payload === 'object' && !Array.isArray(payload)) return payload;

  const trimmed = String(payload).trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return {};

  try {
    return JSON.parse(match[0]);
  } catch (error) {
    return {};
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseJsonBody(req.body);
    const { prompt, cv } = body;

    if (!prompt || !cv) {
      return res.status(400).json({ error: 'Prompt and CV data are required.' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      const fallback = buildFallbackResponse(cv, prompt);
      return res.status(200).json(fallback);
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 900,
      system: 'You are a senior resume editor. Rewrite the provided CV only using the facts supplied. Do not invent new accomplishments. Keep it ATS-friendly, concise, and objective. Return valid JSON only with keys: summary, experience, skills.',
      messages: [
        {
          role: 'user',
          content: `Rewrite the CV for this brief. Keep facts accurate, professional, and ATS-friendly.\n\nPrompt:\n${prompt}\n\nCV:\n${JSON.stringify(cv, null, 2)}`
        }
      ]
    });

    const messageText = (response.content || [])
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join('\n')
      .trim();

    const parsed = extractJson(messageText) || {};
    const summary = parsed.summary || (cv.summary || '');
    const experience = parsed.experience || (cv.experience || '');
    const skills = normalizeSkills(parsed.skills || (cv.skills || ''));

    return res.status(200).json({
      summary: String(summary),
      experience: String(experience),
      skills: String(skills)
    });
  } catch (error) {
    console.error('AI handler error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate CV content.'
    });
  }
};
