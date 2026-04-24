import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_BASE64_LENGTH = 7_000_000;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface RequestBody {
  imageBase64: string;
  mimeType: string;
  context: string;
  targetAudience: string;
}

interface MarketingCopyResult {
  short: string;
  engagement: string;
  sales: string;
  colorPalette?: string[];
  emojiSuggestions?: string[];
}

function sendError(
  res: VercelResponse,
  statusCode: number,
  message: string
): void {
  res.status(statusCode).json({ error: message });
}

function getNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseBody(body: VercelRequest["body"]): Partial<RequestBody> {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Partial<RequestBody>;
    } catch {
      throw new Error("Body JSON inválido.");
    }
  }

  if (typeof body === "object") {
    return body as Partial<RequestBody>;
  }

  return {};
}

function validateRequestBody(body: Partial<RequestBody>): RequestBody {
  const imageBase64 = getNonEmptyString(body.imageBase64);
  const mimeType = getNonEmptyString(body.mimeType);
  const context = getNonEmptyString(body.context);
  const targetAudience = getNonEmptyString(body.targetAudience);

  if (!imageBase64 || !mimeType || !context || !targetAudience) {
    throw new Error(
      "Body inválido. Envie strings não vazias em imageBase64, mimeType, context e targetAudience."
    );
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("mimeType inválido. Use image/jpeg, image/png ou image/webp.");
  }

  const base64Data = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  if (!base64Data) {
    throw new Error("imageBase64 inválido.");
  }

  if (base64Data.length > MAX_BASE64_LENGTH) {
    throw new Error("Imagem muito grande. Envie um arquivo menor para gerar o marketing copy.");
  }

  return {
    imageBase64,
    mimeType,
    context,
    targetAudience,
  };
}

/**
 * Extrai o primeiro objeto JSON válido de uma string que pode conter
 * cercas ```json ... ``` ou texto extra antes/depois.
 */
function extractJson(text: string): MarketingCopyResult {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Resposta da IA não contém um objeto JSON válido.");
  }
  const jsonString = text.slice(start, end + 1);
  const parsed = JSON.parse(jsonString);

  if (
    typeof parsed.short !== "string" ||
    typeof parsed.engagement !== "string" ||
    typeof parsed.sales !== "string"
  ) {
    throw new Error(
      "Resposta JSON inválida: campos obrigatórios ausentes (short, engagement, sales)."
    );
  }

  return parsed as MarketingCopyResult;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendError(res, 405, "Método não permitido. Use POST.");
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendError(
      res,
      500,
      "GEMINI_API_KEY não está configurada no servidor. Configure a variável de ambiente no painel da Vercel."
    );
    return;
  }

  let requestBody: RequestBody;

  try {
    requestBody = validateRequestBody(parseBody(req.body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Body inválido.";
    sendError(res, 400, message);
    return;
  }

  const { imageBase64, mimeType, context, targetAudience } = requestBody;

  const prompt = `
    Analise a imagem deste produto. O contexto adicional é: "${context}". O público alvo é: "${targetAudience}".
    
    Sua tarefa é gerar conteúdo de marketing para esta imagem. Responda SOMENTE com um objeto JSON válido, sem markdown, sem texto extra.
    O JSON deve ter a seguinte estrutura:
    {
      "short": "Um post curto e impactante para Twitter ou Instagram.",
      "engagement": "Um post para Instagram ou Facebook focado em engajamento, com uma pergunta para o público.",
      "sales": "Um texto focado em vendas para um anúncio ou página de produto, destacando benefícios.",
      "colorPalette": ["#XXXXXX", "#XXXXXX", "#XXXXXX", "#XXXXXX", "#XXXXXX"],
      "emojiSuggestions": ["✨", "🚀", "🔥", "💡", "💖"]
    }

    - 'colorPalette': Extraia 5 cores hexadecimais dominantes da imagem.
    - 'emojiSuggestions': Sugira 5 emojis que combinam com o produto e a vibe.
    - Os textos devem ser criativos, em português do Brasil, e adequados ao público alvo.
  `;

  // Remove o prefixo data URL se presente (ex.: "data:image/png;base64,")
  const base64Data = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ]);

    const text = result.response.text();
    const marketingCopy = extractJson(text);

    res.status(200).json(marketingCopy);
  } catch (error) {
    console.error("Erro ao chamar Gemini marketing-copy", {
      message: error instanceof Error ? error.message : "Erro desconhecido",
      mimeType,
      contextLength: context.length,
      targetAudienceLength: targetAudience.length,
      imageLength: base64Data.length,
    });
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    sendError(res, 500, `Erro ao gerar conteúdo com a IA: ${message}`);
  }
}
