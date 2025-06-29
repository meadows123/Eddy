import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react()],
	css: {
		postcss: './postcss.config.js'
	},
	server: {
		port: 3000,
		host: 'localhost',
		strictPort: true,
		hmr: {
			overlay: false
		}
	},
	resolve: {
		extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
		alias: {
			'@': path.resolve(__dirname, './src'),
			'src': path.resolve(__dirname, './src')
		},
	},
	build: {
		outDir: 'dist',
		sourcemap: true,
		rollupOptions: {
			onwarn(warning, warn) {
				if (warning.code === 'CIRCULAR_DEPENDENCY') return;
				warn(warning);
			}
		}
	},
	preview: {
		host: '0.0.0.0',
		port: process.env.PORT || 4173,
		allowedHosts: ['vipclubapp.onrender.com, oneeddy.com, www.oneeddy.com'],
	}
});
