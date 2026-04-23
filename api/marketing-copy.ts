import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    res.status(405).json({ error: "Método não permitido. Use POST." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res
      .status(500)
      .json({
        error:
          "GEMINI_API_KEY não está configurada no servidor. Configure a variável de ambiente no painel da Vercel.",
      });
    return;
  }

  const body = req.body as Partial<RequestBody>;
  const { imageBase64, mimeType, context, targetAudience } = body;

  if (!imageBase64 || !mimeType || !context || !targetAudience) {
    res
      .status(400)
      .json({
        error:
          "Body inválido. Campos obrigatórios: imageBase64, mimeType, context, targetAudience.",
      });
    return;
  }

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
    console.error("Erro ao chamar Gemini:", error);
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    res
      .status(500)
      .json({ error: `Erro ao gerar conteúdo com a IA: ${message}` });
  }
}
