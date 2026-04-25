import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MAX_BASE64_LENGTH = 9_000_000;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_IMAGE_MODELS = [
  'gemini-2.5-flash-image-preview',
  'gemini-2.5-flash-image-preview-04-17',
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.0-flash-preview-image-generation',
];

let cachedAvailableModels: string[] | null = null;
let cachedAvailableModelsAt = 0;
const AVAILABLE_MODELS_TTL_MS = 10 * 60 * 1000;

type RequestBody = {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  isMasking?: boolean;
  guidanceScale?: number;
  variationStrength?: 'subtle' | 'strong';
};

function sendError(res: VercelResponse, statusCode: number, message: string): void {
  res.status(statusCode).json({ error: message });
}

function getNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseBody(body: VercelRequest['body']): Partial<RequestBody> {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Partial<RequestBody>;
    } catch {
      throw new Error('Body JSON invalido.');
    }
  }

  if (typeof body === 'object') {
    return body as Partial<RequestBody>;
  }

  return {};
}

function validateRequestBody(body: Partial<RequestBody>): RequestBody {
  const imageBase64 = getNonEmptyString(body.imageBase64);
  const mimeType = getNonEmptyString(body.mimeType);
  const prompt = getNonEmptyString(body.prompt);

  if (!imageBase64 || !mimeType || !prompt) {
    throw new Error('Body invalido. Envie strings nao vazias em imageBase64, mimeType e prompt.');
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('mimeType invalido. Use image/jpeg, image/png ou image/webp.');
  }

  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  if (!base64Data) {
    throw new Error('imageBase64 invalido.');
  }

  if (base64Data.length > MAX_BASE64_LENGTH) {
    throw new Error('Imagem muito grande. Envie um arquivo menor para edicao.');
  }

  const guidanceScaleRaw = body.guidanceScale;
  const guidanceScale =
    typeof guidanceScaleRaw === 'number' && Number.isFinite(guidanceScaleRaw)
      ? Math.min(15, Math.max(1, guidanceScaleRaw))
      : 7.5;

  const variationStrength = body.variationStrength === 'strong' ? 'strong' : 'subtle';

  return {
    imageBase64,
    mimeType,
    prompt,
    isMasking: Boolean(body.isMasking),
    guidanceScale,
    variationStrength,
  };
}

function extractGeneratedImage(response: any): { data: string; mimeType: string } | null {
  const candidates = response?.candidates;
  if (!Array.isArray(candidates)) {
    return null;
  }

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      if (part?.inlineData?.data) {
        return {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Erro desconhecido';
  }
}

function isModelAvailabilityError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('not found') ||
    normalized.includes('unsupported') ||
    normalized.includes('permission') ||
    normalized.includes('not available') ||
    normalized.includes('unavailable') ||
    normalized.includes('404')
  );
}

function isGenerationConfigError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('generationconfig') ||
    normalized.includes('temperature') ||
    normalized.includes('top_p') ||
    normalized.includes('top p') ||
    normalized.includes('invalid argument')
  );
}

function isQuotaError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('429') ||
    normalized.includes('quota exceeded') ||
    normalized.includes('rate-limit') ||
    normalized.includes('rate limit')
  );
}

function mapGenerationConfig(
  guidanceScale: number,
  variationStrength: 'subtle' | 'strong'
): { temperature: number; topP: number } {
  const normalizedGuidance = (guidanceScale - 1) / 14; // 0..1

  // Guidance maior => menor temperatura (mais aderente ao prompt)
  const baseTemperature = variationStrength === 'strong' ? 0.8 : 0.45;
  const temperature = Math.min(1, Math.max(0.1, baseTemperature - normalizedGuidance * 0.35));

  // Guidance maior => topP menor (menos aleatoriedade)
  const baseTopP = variationStrength === 'strong' ? 0.98 : 0.9;
  const topP = Math.min(1, Math.max(0.6, baseTopP - normalizedGuidance * 0.18));

  return {
    temperature: Number(temperature.toFixed(3)),
    topP: Number(topP.toFixed(3)),
  };
}

function getConfiguredModelsFromEnv(): string[] {
  const raw = process.env.GEMINI_IMAGE_MODELS;
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values));
}

async function discoverGenerateContentModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedAvailableModels && now - cachedAvailableModelsAt < AVAILABLE_MODELS_TTL_MS) {
    return cachedAvailableModels;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }>;
    };

    const models = (data.models || [])
      .filter((model) => Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
      .map((model) => (model.name || '').replace(/^models\//, ''))
      .filter(Boolean)
      .sort((a, b) => {
        const score = (name: string) => {
          const lower = name.toLowerCase();
          let s = 0;
          if (lower.includes('image')) s += 30;
          if (lower.includes('flash')) s += 20;
          if (lower.includes('2.5')) s += 10;
          if (lower.includes('preview')) s += 5;
          return s;
        };

        return score(b) - score(a);
      });

    cachedAvailableModels = models;
    cachedAvailableModelsAt = now;
    return models;
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendError(res, 405, 'Metodo nao permitido. Use POST.');
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendError(
      res,
      500,
      'GEMINI_API_KEY nao esta configurada no servidor. Configure a variavel de ambiente no painel da Vercel.'
    );
    return;
  }

  let requestBody: RequestBody;

  try {
    requestBody = validateRequestBody(parseBody(req.body));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Body invalido.';
    sendError(res, 400, message);
    return;
  }

  const { imageBase64, mimeType, prompt, isMasking, guidanceScale, variationStrength } = requestBody;
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const variationInstruction =
    variationStrength === 'strong'
      ? 'Permita alteracoes criativas mais intensas mantendo qualidade visual.'
      : 'Priorize alteracoes sutis e preserve o maximo da composicao original.';

  const qualityInstruction = `Use guidance scale aproximado de ${guidanceScale} para equilibrar fidelidade ao prompt e preservacao da imagem.`;

  const instruction = isMasking
    ? `Edite somente as areas marcadas em vermelho puro (#FF0000), removendo o objeto e preenchendo de forma natural e coerente com o cenario. Preserve todo o restante. ${variationInstruction} ${qualityInstruction} Instrucoes adicionais: ${prompt}`
    : `Edite a imagem conforme o pedido, mantendo composicao e realismo. ${variationInstruction} ${qualityInstruction} Instrucoes: ${prompt}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    let lastErrorMessage = 'Falha ao processar a imagem com os modelos disponiveis.';
    const generationConfig = mapGenerationConfig(guidanceScale, variationStrength);
    const configuredModels = getConfiguredModelsFromEnv();
    const discoveredModels = await discoverGenerateContentModels(apiKey);
    const modelsToTry = uniqueList([
      ...configuredModels,
      ...DEFAULT_IMAGE_MODELS,
      ...discoveredModels,
    ]);

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        let result;

        try {
          result = await model.generateContent({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: instruction },
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType,
                    },
                  },
                ],
              },
            ],
            generationConfig,
          });
        } catch (error) {
          const configErrorMessage = getErrorMessage(error);

          if (!isGenerationConfigError(configErrorMessage)) {
            throw error;
          }

          // Fallback: alguns modelos de imagem podem rejeitar generationConfig.
          result = await model.generateContent([
            instruction,
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
          ]);
        }

        const generated = extractGeneratedImage(result.response);

        if (!generated) {
          const text = result.response?.text?.() || '';
          sendError(
            res,
            502,
            text
              ? `A IA nao retornou imagem. Resposta: ${text.slice(0, 220)}`
              : 'A IA nao retornou imagem. Ajuste o prompt e tente novamente.'
          );
          return;
        }

        res.status(200).json({ imageBase64: `data:${generated.mimeType};base64,${generated.data}` });
        return;
      } catch (error) {
        lastErrorMessage = getErrorMessage(error);

        if (isQuotaError(lastErrorMessage)) {
          sendError(
            res,
            429,
            'Limite de uso da Gemini API excedido para esta chave. Aguarde alguns instantes ou ajuste plano/cotas no Google AI Studio.'
          );
          return;
        }

        if (!isModelAvailabilityError(lastErrorMessage)) {
          break;
        }
      }
    }

    sendError(
      res,
      502,
      isModelAvailabilityError(lastErrorMessage)
        ? `Nenhum modelo Gemini de imagem compativel foi encontrado para esta chave/API. Defina GEMINI_IMAGE_MODELS com um modelo valido e confirme permissao de Image Generation no projeto. Ultimo detalhe: ${lastErrorMessage}`
        : `Nao foi possivel editar a imagem com os modelos configurados do Gemini. Detalhe: ${lastErrorMessage}`
    );
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Erro ao chamar Gemini edit-image', {
      message,
      mimeType,
      promptLength: prompt.length,
      imageLength: base64Data.length,
      isMasking,
      guidanceScale,
      variationStrength,
    });
    sendError(res, 500, `Erro ao editar imagem com a IA: ${message}`);
  }
}
