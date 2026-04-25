export interface MarketingCopyResult {
  short: string;
  engagement: string;
  sales: string;
  colorPalette?: string[];
  emojiSuggestions?: string[];
}

export const editImage = async (
  base64Image: string,
  mimeType: string,
  prompt: string,
  isMasking: boolean,
  options?: {
    guidanceScale?: number;
    variationStrength?: 'subtle' | 'strong';
  }
): Promise<string> => {
  let response: Response;

  try {
    response = await fetch('/api/edit-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64Image,
        mimeType,
        prompt,
        isMasking,
        guidanceScale: options?.guidanceScale,
        variationStrength: options?.variationStrength,
      }),
    });
  } catch {
    throw new Error(
      'Nao foi possivel acessar /api/edit-image. Rode o app com npm run dev:vercel e confirme GEMINI_API_KEY no servidor.'
    );
  }

  if (!response.ok) {
    let message = `Erro ${response.status}`;

    if (response.status === 404) {
      throw new Error(
        'Endpoint /api/edit-image nao encontrado. Em ambiente local, rode com npm run dev:vercel para habilitar as funcoes serverless.'
      );
    }

    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch {
      // ignora erro de parse
    }
    throw new Error(message);
  }

  const data = (await response.json()) as { imageBase64?: string };
  if (!data?.imageBase64) {
    throw new Error('A IA nao retornou uma imagem valida.');
  }

  return data.imageBase64;
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

    if (response.status === 404) {
      throw new Error(
        'Endpoint /api/marketing-copy nao encontrado. Em ambiente local, rode com npm run dev:vercel para habilitar as funcoes serverless.'
      );
    }

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
