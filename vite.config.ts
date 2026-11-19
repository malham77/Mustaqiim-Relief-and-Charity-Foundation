import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

const htmlPages = [
  'index.html',
  'about.html',
  'qurbani.html',
  'campaigns.html',
  'campaign.html',
  'stories.html',
  'story.html',
  'gallery.html',
  'media.html',
  'faq.html',
  'contact.html',
  'donate.html',
  'privacy-policy.html',
  'terms.html',
  'refund-policy.html',
  'cookie-policy.html',
  'donation-policy.html',
  'data-deletion.html',
  'admin.html',
];

const input = Object.fromEntries(
  htmlPages.map((file) => [file.replace(/\.html$/, ''), path.resolve(__dirname, file)])
);

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input,
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
