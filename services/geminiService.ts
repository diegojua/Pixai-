import { GoogleGenAI, Schema, Type } from "@google/genai";

if (!process.env.API_KEY) {
    console.error("A variável de ambiente API_KEY não está definida. O aplicativo não funcionará.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export const editImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  isMasking: boolean = false
): Promise<{ data: string; mimeType: string }> => {
  try {
    const imagePart: ImagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: mimeType,
      },
    };

    let enhancedPrompt = '';

    if (isMasking) {
        // Specialized prompt for Object Removal / Inpainting
        // Changed strategy: Using RED mask and simplified "Replace" instruction
        enhancedPrompt = `
          OPERATION: INPAINTING / OBJECT REMOVAL
          
          INPUT IMAGE CONTAINS:
          A specific area marked with a PURE RED MASK (#FF0000).
          
          YOUR GOAL:
          Remove the object covered by the red mask and reconstruct the background.
          
          STEPS:
          1. Identify the red pixels (#FF0000).
          2. Completely remove the content under the red pixels.
          3. Fill the gap using the surrounding texture, lighting, and patterns (Inpainting).
          4. The final image must NOT have any red marks. It must look seamless.
          
          CONTEXT: ${prompt || "Remove the marked object and fill with background."}
        `;
    } else {
        // Standard Editing Prompt
        enhancedPrompt = `
          Task: Edit the provided image based on the following instruction.
          Instruction: ${prompt}
          
          Constraints:
          1. Maintain the original aspect ratio.
          2. Keep the composition and unedited areas as faithful to the original as possible.
          3. High quality, photorealistic output.
        `;
    }

    const textPart = {
      text: enhancedPrompt,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        // Lower temperature for inpainting creates more stable background extensions
        temperature: isMasking ? 0.3 : 0.4, 
      }
    });
    
    // Check for safety blocks or empty responses
    if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        
        if (candidate.finishReason !== 'STOP') {
             if (candidate.finishReason === 'SAFETY') {
                 throw new Error("A edição foi bloqueada pelos filtros de segurança da IA. Tente uma área menor ou diferente.");
             }
             console.warn("Generation finished with reason:", candidate.finishReason);
        }

        for (const part of candidate.content?.parts || []) {
            if (part.inlineData) {
                return {
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'image/png'
                };
            }
        }
    }

    throw new Error("A IA não retornou uma imagem. Tente reformular seu pedido.");

  } catch (error) {
    console.error("Erro ao editar imagem com a API Gemini:", error);
    if (error instanceof Error) {
        if (error.message.includes("400")) return Promise.reject(new Error("Erro na requisição (400). Verifique se a imagem é válida."));
        if (error.message.includes("500")) return Promise.reject(new Error("Erro no servidor da IA (500). Tente novamente em instantes."));
        
        throw error;
    }
    throw new Error("Ocorreu um erro desconhecido ao gerar a imagem.");
  }
};

export interface MarketingCopyResult {
    short: string;
    engagement: string;
    sales: string;
    colorPalette: string[];
    emojiSuggestions: string[];
}

export const generateMarketingCopy = async (
    base64ImageData: string,
    mimeType: string,
    context: string,
    targetAudience?: string
): Promise<MarketingCopyResult> => {
    try {
        const imagePart: ImagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: mimeType,
            },
        };

        const prompt = `
            Atue como um especialista em Marketing Digital, Design e Copywriting.
            Analise esta imagem de produto visualmente.
            
            O contexto da imagem/estilo solicitado pelo usuário foi: "${context}".
            ${targetAudience ? `Público-alvo específico: "${targetAudience}". Adapte o tom e a linguagem para este grupo.` : ''}
            
            Tarefas:
            1. Identifique as cores dominantes na imagem e retorne 5 códigos HEX precisos.
            2. Sugira 5-8 emojis que combinem especificamente com as cores detectadas e a vibe da imagem.
            3. Crie 3 opções de legendas para Instagram/Redes Sociais em Português do Brasil (PT-BR) usando os emojis sugeridos.

            Retorne APENAS um objeto JSON válido com a seguinte estrutura:
            {
                "short": "Legenda curta, impactante e minimalista (máx 2 frases).",
                "engagement": "Legenda focada em comentários e perguntas.",
                "sales": "Legenda focada em conversão com CTA clara.",
                "colorPalette": ["#HEX1", "#HEX2", ...],
                "emojiSuggestions": ["Emoji1", "Emoji2", ...]
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [imagePart, { text: prompt }],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        short: { type: Type.STRING },
                        engagement: { type: Type.STRING },
                        sales: { type: Type.STRING },
                        colorPalette: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "List of 5 dominant hex color codes found in the image"
                        },
                        emojiSuggestions: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "List of 5-8 emojis that match the image aesthetics and colors"
                        }
                    },
                    required: ["short", "engagement", "sales", "colorPalette", "emojiSuggestions"]
                }
            }
        });

        const text = response.text;
        
        if (!text) throw new Error("Resposta vazia do modelo.");
        
        const result = JSON.parse(text);
        return result as MarketingCopyResult;

    } catch (error) {
        console.error("Erro ao gerar copy de marketing:", error);
        throw new Error("Falha ao gerar textos de marketing. Verifique sua conexão.");
    }
}