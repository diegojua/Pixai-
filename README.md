<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Pixai — Editor de Imagens com IA

Editor de imagens web com geração de **marketing copy** via IA (Gemini), ferramentas mágicas e galeria. Feito com React + TypeScript + Vite + Tailwind.

Demo: <https://pixai-seven.vercel.app>

---

## Pré-requisitos

- Node.js ≥ 18
- Conta Vercel (para deploy com funções serverless) — ou Vercel CLI para desenvolvimento local

---

## Como rodar localmente

```bash
# 1. Instale as dependências
npm install

# 2. Copie o arquivo de exemplo e preencha as variáveis
cp .env.example .env.local

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

> O frontend roda em <http://localhost:3000>.

---

## Variáveis de ambiente

### Frontend (Vite / browser)

| Variável | Descrição |
|---|---|
| `VITE_FIREBASE_API_KEY` | Chave da API do Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domínio de autenticação do Firebase |
| `VITE_FIREBASE_PROJECT_ID` | ID do projeto Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de storage do Firebase |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID do Firebase |
| `VITE_FIREBASE_APP_ID` | App ID do Firebase |

### Servidor (Vercel Functions / Node)

| Variável | Descrição |
|---|---|
| `GEMINI_API_KEY` | Chave da API do Gemini (**nunca** usar prefixo `VITE_`; não vai para o browser) |

> **Segurança:** A chave `GEMINI_API_KEY` é lida apenas no servidor pelo endpoint `api/marketing-copy.ts`. Configure-a nas **Environment Variables** do painel da Vercel (ou no seu `.env.local` para testes com Vercel CLI).

---

## Desenvolvimento local com a API do Gemini

Para testar o endpoint `/api/marketing-copy` localmente, use o **Vercel CLI**:

```bash
npm install -g vercel
vercel dev
```

O Vercel CLI sobe o frontend (Vite) e as Vercel Functions simultaneamente. Adicione `GEMINI_API_KEY` no arquivo `.env.local`.

---

## Deploy na Vercel

1. Conecte o repositório à Vercel.
2. No painel da Vercel → **Settings → Environment Variables**, adicione `GEMINI_API_KEY`.
3. Faça o deploy — as funções em `api/` são detectadas automaticamente.

---

## Build de produção

```bash
npm run build
npm run preview
```

