export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mood, filters, mode, seen } = req.body;

  if (!mood) {
    return res.status(400).json({ error: 'Missing mood' });
  }

  // Build filters string
  let f = filters && filters.length ? filters : [];
  let fs = f.length ? `\n- Format requis : ${f.join(', ')}. Respecte absolument.` : '';
  let ms = mode === 'soiree' ? '\n- Film pour regarder en groupe, fédérateur et accessible.' : '';
  let ss = seen && seen.length ? `\n- Déjà vus, ne pas recommander : ${seen.join(', ')}.` : '';

  const system = `Tu es un cinéphile passionné et empathique. Recommande UN SEUL film selon l'état émotionnel décrit.
Règles : film non évident, transforme l'émotion, parle à la 2e personne, chaleureux et précis.
- Recommande UNIQUEMENT un long métrage de fiction (pas de documentaire, pas de série, pas de court métrage) sauf si un filtre spécifique le demande explicitement.${fs}${ms}${ss}
Génère aussi lien Letterboxd https://letterboxd.com/search/[titre+année] et YouTube trailer https://www.youtube.com/results?search_query=[titre+année+trailer+bande+annonce].
Réponds UNIQUEMENT en JSON sans markdown : {"title":"...","year":"...","explanation":"3-4 phrases","letterboxd":"url","trailer":"url"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system,
        messages: [{ role: 'user', content: mood }],
      }),
    });

    if (!response.ok) {
      throw new Error('Anthropic API error');
    }

    const data = await response.json();
    const text = data.content.map(i => i.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const rec = JSON.parse(clean);

    return res.status(200).json(rec);
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
