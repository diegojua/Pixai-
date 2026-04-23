import React, { useState } from "react";
import {
  generateMarketingCopy,
  editImage,
  MarketingCopyResult,
} from "../services/geminiService";

export default function GeminiControls() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketingCopyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // A integração com Gemini é feita via endpoint server-side /api/marketing-copy.
  // Não há chave de API no browser — o botão fica sempre habilitado e erros
  // de configuração são retornados pelo servidor com mensagem amigável.
  const handleGenerate = async () => {
    setError(null); setResult(null); setLoading(true);
    try {
      const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...";
      const res = await generateMarketingCopy(dummyBase64, "image/png", "contexto", "público");
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    setError(null);
    try {
      const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...";
      await editImage(dummyBase64, "image/png", "prompt", false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ padding: 12, border: "1px solid #e6e6e6", borderRadius: 8, maxWidth: 820 }}>
      <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><strong>Gemini API:</strong> <span style={{ color: "#555" }}>via servidor (/api/marketing-copy)</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowModal(true)} style={{ padding: "6px 10px" }}>Como Habilitar</button>
          <button onClick={handleGenerate} disabled={loading} style={{ padding: "6px 12px" }}>{loading ? "Gerando..." : "Gerar Marketing"}</button>
          <button onClick={handleEdit} style={{ padding: "6px 12px" }}>Editar Imagem</button>
        </div>
      </div>

      {error && <div style={{ color: "crimson", marginBottom: 8 }}><strong>Erro:</strong> {error}</div>}

      {result && <div style={{ marginTop: 8 }}><strong>Resultado:</strong><pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 10, borderRadius: 6 }}>{JSON.stringify(result, null, 2)}</pre></div>}

      {showModal && (
        <div style={{ marginTop: 10, padding: 12, background: "#f5f5f5", borderRadius: 6 }}>
          <strong>Como habilitar:</strong>
          <p style={{ margin: "8px 0 0" }}>
            Configure a variável de ambiente <code>GEMINI_API_KEY</code> no painel da Vercel (ou no seu ambiente Node local).
            Não adicione a chave ao frontend — ela deve ficar apenas no servidor.
          </p>
          <button onClick={() => setShowModal(false)} style={{ marginTop: 8, padding: "4px 10px" }}>Fechar</button>
        </div>
      )}
    </div>
  );
}
