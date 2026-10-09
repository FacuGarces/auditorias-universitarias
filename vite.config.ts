import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import sitio from './sitio.json' with { type: 'json' }

// La ruta base sale de la URL pública (sitio.json): "/" con dominio propio,
// "/auditorias-universitarias/" mientras se sirve desde github.io.
const url = new URL(sitio.url)

// https://vite.dev/config/
export default defineConfig({
  base: url.pathname,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'sitio-url',
      transformIndexHtml: (html) => html.replaceAll('__SITIO_URL__', sitio.url),
    },
  ],
})
