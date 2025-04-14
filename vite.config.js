import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist/build/pdf.worker.min.js']
  }
});

// import react from '@vitejs/plugin-react';
// import fs from 'fs';
// import path from 'path';
// import { defineConfig } from 'vite';

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     https: {
//       key: fs.readFileSync(path.resolve(__dirname, 'certs/localhost-key.pem')),
//       cert: fs.readFileSync(path.resolve(__dirname, 'certs/localhost.pem')),
//     },
//   },
// });
