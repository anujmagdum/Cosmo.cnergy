import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import webmailSendHandler from './api/webmail-send';
import webmailFetchHandler from './api/webmail-fetch';
import sendEmailHandler from './api/send-email';

function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsedBody = body ? JSON.parse(body) : {};
            const mockReq = { 
              method: req.method, 
              body: parsedBody, 
              url: req.url, 
              headers: req.headers 
            };
            const mockRes = {
              statusCode: 200,
              headers: {} as Record<string, string>,
              status(code: number) {
                this.statusCode = code;
                return this;
              },
              setHeader(name: string, value: string) {
                this.headers[name] = value;
                return this;
              },
              json(data: any) {
                res.writeHead(this.statusCode, { 'Content-Type': 'application/json', ...this.headers });
                res.end(JSON.stringify(data));
              }
            };

            const cleanUrl = req.url?.split('?')[0];
            if (cleanUrl === '/api/webmail-send') {
              await webmailSendHandler(mockReq, mockRes);
            } else if (cleanUrl === '/api/webmail-fetch') {
              await webmailFetchHandler(mockReq, mockRes);
            } else if (cleanUrl === '/api/send-email') {
              await sendEmailHandler(mockReq, mockRes);
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
            }
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err?.message || 'Server Error' }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apiDevMiddleware()],
  optimizeDeps: {
    entries: ['index.html']
  },
  server: {
    port: 3000,
    open: true,
    watch: {
      ignored: ['**/git/**', '**/node/**', '**/.git/**']
    }
  }
});
