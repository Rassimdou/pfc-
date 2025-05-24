import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Get directory name for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const api = axios.create({
  baseURL: 'http://localhost:5001', // or whatever your backend URL is
  withCredentials: true // important for cookies
});

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000', // or your backend port
    }
  },
});