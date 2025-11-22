import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client with the API key from the environment variable
// process.env.API_KEY is polyfilled by Vite
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to strip "data:image/xyz;base64," prefix if present
const cleanBase64 = (base64Str: string) => {
    // Regex to match data URI scheme
    const base64Pattern = /^data:image\/(png|jpeg|jpg|webp|heic|heif);base64,/;
    if (base64Pattern.test(base64Str)) {
        return base64Str.replace(base64Pattern, '');
    }
    return base64Str;
};

export const editImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  isMasking: boolean = false
): Promise<string> => {
  try {
    const cleanData = cleanBase64(base64ImageData);
    
    // Using gemini-2.5-flash-image as requested for image tasks
    const model = 'gemini-2.5-flash-image';

    let contents: any = {
        parts: [
            {
                inlineData: {
                    data: cleanData,
                    mimeType: mimeType,
                },
            },
            {
                text: isMasking 
                    ? `Edit this image. Identify the area marked with red color. Remove the object or defect in that red area and fill it in seamlessly with the surrounding background texture and lighting. ${prompt}`
                    : `Edit this image. ${prompt}`
            }
        ]
    };

    const response = await ai.models.generateContent({
        model,
        contents,
        config: {
            responseMimeType: 'image/png' // Request PNG output
        }
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData) {
                const responseMime = part.inlineData.mimeType || 'image/png';
                return `data:${responseMime};base64,${part.inlineData.data}`;
            }
        }
    }

    throw new Error("No image generated in response");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
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
    targetAudience: string
): Promise<MarketingCopyResult> => {
    const cleanData = cleanBase64(base64ImageData);
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { data: cleanData, mimeType } },
                    { text: `Act as an expert marketing copywriter. Analyze this image.
                      Context provided by user: ${context}.
                      Target Audience: ${targetAudience}.
                      
                      Generate marketing assets in JSON format.` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        short: { type: Type.STRING, description: "A short, punchy caption for Instagram (under 100 chars)." },
                        engagement: { type: Type.STRING, description: "An engaging question or conversation starter based on the image." },
                        sales: { type: Type.STRING, description: "A persuasive sales pitch focused on benefits." },
                        colorPalette: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING }, 
                            description: "Hex codes of 3-5 dominant or complementary colors from the image." 
                        },
                        emojiSuggestions: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING }, 
                            description: "5 relevant emojis." 
                        }
                    },
                    required: ["short", "engagement", "sales", "colorPalette", "emojiSuggestions"]
                }
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("No text generated");
        
        return JSON.parse(text) as MarketingCopyResult;
    } catch (error) {
        console.error("Marketing Copy Error:", error);
        throw error;
    }
}