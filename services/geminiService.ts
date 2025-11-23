import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("A variável de ambiente VITE_GEMINI_API_KEY não está definida.");
  }
  return apiKey;
};

const getGenAI = () => {
  const key = getApiKey();
  return new GoogleGenerativeAI(key);
};

const getGeminiModel = () => getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });

export interface MarketingCopyResult {
  short: string;
  engagement: string;
  sales: string;
  colorPalette?: string[];
  emojiSuggestions?: string[];
}

const fileToGenerativePart = (base64: string, mimeType: string): Part => {
  return {
    inlineData: {
      data: base64.split(",")[1],
      mimeType,
    },
  };
};

export const editImage = async (
  base64Image: string,
  mimeType: string,
  prompt: string,
  isMasking: boolean
): Promise<string> => {
  console.warn("AVISO: 'editImage' é um placeholder e retorna a imagem original.");
  return Promise.resolve(base64Image);
};

export const generateMarketingCopy = async (
  base64Image: string,
  mimeType: string,
  context: string,
  targetAudience: string
): Promise<MarketingCopyResult> => {
  const imagePart = fileToGenerativePart(base64Image, mimeType);

  const prompt = `
    Analise a imagem deste produto. O contexto adicional é: "${context}". O público alvo é: "${targetAudience}".
    
    Sua tarefa é gerar conteúdo de marketing para esta imagem. Responda em um formato JSON VÁLIDO, sem usar markdown ou acentos graves no início/fim.
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

  try {
    const model = getGeminiModel();
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();
    const jsonString = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    return JSON.parse(jsonString) as MarketingCopyResult;
  } catch (error) {
    console.error("Erro ao gerar marketing copy:", error);
    throw new Error("Não foi possível gerar o conteúdo. Verifique a chave da API do Gemini e os logs.");
  }
};
