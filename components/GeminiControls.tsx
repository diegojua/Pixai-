import React, { useState } from "react";
import {
  isGeminiConfigured,
  generateMarketingCopy,
  editImage,
  MarketingCopyResult,
} from "../services/geminiService";

export default function GeminiControls() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketingCopyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const configured = typeof isGeminiConfigured === 'function' ? isGeminiConfigured() : Boolean(import.meta.env.VITE_GEMINI_API_KEY);

  const handleGenerate = async () => {
    setError(null); setResult(null); setLoading(true);
    try {
      const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."; 
      const res = await generateMarketingCopy(dummyBase64, "image/png", "contexto", "público");
      setResult(res);
    } catch (err: any) { setError(err?.message ?? String(err)); } finally { setLoading(false); }
  };

  const handleEdit = async () => {
    setError(null);
    try {
      const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."; 
      await editImage(dummyBase64, "image/png", "prompt", false);
    } catch (err: any) { setError(err?.message ?? String(err)); }
  };

  return (
    <div style={{ padding: 12, border: "1px solid #e6e6e6", borderRadius: 8, maxWidth: 820 }}>
      <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><strong>Gemini API:</strong> <span style={{ color: configured ? "green" : "crimson" }}>{configured ? "configurada" : "não configurada"}</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowModal(true)} style={{ padding: "6px 10px" }}>Como Habilitar</button>
          <button onClick={handleGenerate} disabled={!configured || loading} style={{ padding: "6px 12px" }}>{loading ? "Gerando..." : "Gerar Marketing"}</button>
          <button onClick={handleEdit} disabled={!configured} style={{ padding: "6px 12px" }}>Editar Imagem</button>
        </div>
      </div>

      {error && <div style={{ color: "crimson", marginBottom: 8 }}><strong>Erro:</strong> {error}</div>}

      {result && <div style={{ marginTop: 8 }}><strong>Resultado:</strong><pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 10, borderRadius: 6 }}>{JSON.stringify(result, null, 2)}</pre></div>}

      {!configured && <div style={{ marginTop: 10, color: "#444" }}>Para habilitar a Gemini, crie `.env.local` baseado em `.env.example` com `VITE_GEMINI_API_KEY`.</div>}
    </div>
  );
}
