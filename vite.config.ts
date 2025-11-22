import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // Substitui apenas a chave específica para evitar sobrescrever o objeto process inteiro
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    server: {
      port: 3000
    }
  }
})