import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	base: '/',
	plugins: [react()],
	css: {
		postcss: './postcss.config.js'
	},
	server: {
		port: 3000,
		host: '0.0.0.0',
		strictPort: true,
		hmr: {
			overlay: false
		},
		cors: true,
		origin: 'http://localhost:3000'
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
		},
		commonjsOptions: {
			include: [/qrcode/, /node_modules/]
		}
	},
	optimizeDeps: {
		include: ['qrcode']
	},
	preview: {
		host: '0.0.0.0',
		port: process.env.PORT || 4173,
		cors: true,
		allowedHosts: [
			'vipclubapp.onrender.com', 
			'oneeddy.com', 
			'www.oneeddy.com',
			'localhost',
			'127.0.0.1'
		],
	}
});
