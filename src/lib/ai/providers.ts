export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiProvider = "groq" | "gemini" | "openai";

export type AiChatResult = {
  reply: string;
  model: string;
};

const genericError = "No se pudo generar la respuesta. Inténtalo de nuevo.";
const missingConfigError = "El asistente todavía no está configurado.";

export function getSelectedAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER ?? "groq").toLowerCase();

  if (provider === "gemini" || provider === "openai") {
    return provider;
  }

  return "groq";
}

export async function callGroqChat(messages: AiChatMessage[]): Promise<AiChatResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new AiProviderError(missingConfigError, 503);
  }

  const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4
    })
  }).catch(() => null);

  if (!response) {
    throw new AiProviderError(genericError, 502);
  }

  const data = await response.json().catch(() => null) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  if (!response.ok) {
    throw new AiProviderError(response.status === 401 || response.status === 403 ? missingConfigError : genericError, response.status);
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new AiProviderError(genericError, 502);
  }

  return { reply, model };
}

export async function callGeminiChat(messages: AiChatMessage[]): Promise<AiChatResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new AiProviderError(missingConfigError, 503);
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const systemInstruction = messages.find((message) => message.role === "system")?.content;
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    }));
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      contents,
      generationConfig: {
        temperature: 0.4
      }
    })
  }).catch(() => null);

  if (!response) {
    throw new AiProviderError(genericError, 502);
  }

  const data = await response.json().catch(() => null) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null;

  if (!response.ok) {
    throw new AiProviderError(response.status === 400 || response.status === 401 || response.status === 403 ? missingConfigError : genericError, response.status);
  }

  const reply = data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();

  if (!reply) {
    throw new AiProviderError(genericError, 502);
  }

  return { reply, model };
}

export async function callOpenAIChat(messages: AiChatMessage[]): Promise<AiChatResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new AiProviderError(missingConfigError, 503);
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4
    })
  }).catch(() => null);

  if (!response) {
    throw new AiProviderError(genericError, 502);
  }

  const data = await response.json().catch(() => null) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  if (!response.ok) {
    throw new AiProviderError(response.status === 401 || response.status === 403 ? missingConfigError : genericError, response.status);
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new AiProviderError(genericError, 502);
  }

  return { reply, model };
}

export async function callSelectedAiProvider(messages: AiChatMessage[]) {
  const provider = getSelectedAiProvider();

  if (provider === "gemini") {
    const result = await callGeminiChat(messages);
    return { ...result, provider };
  }

  if (provider === "openai") {
    const result = await callOpenAIChat(messages);
    return { ...result, provider };
  }

  const result = await callGroqChat(messages);
  return { ...result, provider };
}

export class AiProviderError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}
