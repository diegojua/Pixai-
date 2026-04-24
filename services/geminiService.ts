export interface MarketingCopyResult {
  short: string;
  engagement: string;
  sales: string;
  colorPalette?: string[];
  emojiSuggestions?: string[];
}

// editImage permanece como placeholder — edição real via IA ainda não implementada
export const editImage = async (
  base64Image: string,
  _mimeType: string,
  _prompt: string,
  _isMasking: boolean
): Promise<string> => {
  console.warn("AVISO: 'editImage' é um placeholder e retorna a imagem original.");
  return Promise.resolve(base64Image);
};

/**
 * Gera marketing copy via endpoint server-side `/api/marketing-copy`.
 * A chave do Gemini fica no servidor — nunca exposta no bundle do browser.
 */
export const generateMarketingCopy = async (
  base64Image: string,
  mimeType: string,
  context: string,
  targetAudience: string
): Promise<MarketingCopyResult> => {
  let response: Response;

  try {
    response = await fetch("/api/marketing-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64Image, mimeType, context, targetAudience }),
    });
  } catch {
    throw new Error(
      "Nao foi possivel acessar /api/marketing-copy. Rode o app com npm run dev:vercel e confirme a configuracao da GEMINI_API_KEY no servidor."
    );
  }

  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // ignora erro de parse
    }

    if (response.status >= 500 && !message.includes("GEMINI_API_KEY")) {
      message = `${message} Verifique se a funcao /api/marketing-copy esta rodando via Vercel e se GEMINI_API_KEY foi configurada.`;
    }

    throw new Error(message);
  }

  return response.json() as Promise<MarketingCopyResult>;
};
