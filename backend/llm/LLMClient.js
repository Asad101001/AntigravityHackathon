class LLMClient {
  constructor(options = {}) {
    this.groqKey = options.groqKey || process.env.GROQ_API_KEY;
    this.geminiKey = options.geminiKey || process.env.GEMINI_API_KEY;
    this.maxTokens = Number(process.env.CHAT_MAX_TOKENS || 550);
  }

  async generate({ messages, system = '' }) {
    const promptMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;
    if (this.groqKey) {
      try {
        return await this._groq(promptMessages);
      } catch (error) {
        console.warn('[LLMClient] Groq failed, trying Gemini/demo:', error.message);
      }
    }
    if (this.geminiKey) {
      try {
        return await this._gemini(promptMessages);
      } catch (error) {
        console.warn('[LLMClient] Gemini failed, using demo response:', error.message);
      }
    }
    return this._demo(promptMessages);
  }

  async _groq(messages) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.groqKey}` },
      body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant', messages, max_tokens: this.maxTokens, temperature: 0.35 })
    });
    if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
    const data = await response.json();
    return { provider: 'groq', text: data.choices?.[0]?.message?.content || '', usage: data.usage || {} };
  }

  async _gemini(messages) {
    const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${this.geminiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { maxOutputTokens: this.maxTokens, temperature: 0.35 } })
    });
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
    const data = await response.json();
    return { provider: 'gemini', text: data.candidates?.[0]?.content?.parts?.[0]?.text || '', usage: data.usageMetadata || {} };
  }

  _demo(messages) {
    const last = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    return {
      provider: 'demo',
      text: `I can help with that. I reviewed the booking context and provider guidance. For your message, "${last.slice(0, 120)}", the next best step is to confirm access, share a photo if useful, and keep the appointment window open.`,
      usage: { estimated_tokens: messages.reduce((sum, m) => sum + Math.ceil((m.content || '').length / 4), 0) }
    };
  }
}

module.exports = LLMClient;
