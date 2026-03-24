import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'figma:asset/e11fbfd392f7cbc7109c8e8816b16994a192f985.png': path.resolve(__dirname, './src/assets/e11fbfd392f7cbc7109c8e8816b16994a192f985.png'),
      'figma:asset/5e52033d373c0ca83d94fb39e360fd67e333d04a.png': path.resolve(__dirname, './src/assets/5e52033d373c0ca83d94fb39e360fd67e333d04a.png'),
      'figma:asset/5d59416a49ff0951f1d511521ecb04c71d42cc39.png': path.resolve(__dirname, './src/assets/5d59416a49ff0951f1d511521ecb04c71d42cc39.png'),
      'figma:asset/4719bb1bca27dc5d36d99455785e274b8017ad42.png': path.resolve(__dirname, './src/assets/4719bb1bca27dc5d36d99455785e274b8017ad42.png'),
      'figma:asset/0e94221a81654bf7b01878dccb715d050a3cff3e.png': path.resolve(__dirname, './src/assets/0e94221a81654bf7b01878dccb715d050a3cff3e.png'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
  },
  server: {
    port: 3000,
    open: true,
  },
});
