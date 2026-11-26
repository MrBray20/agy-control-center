import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const uiDir = path.join(rootDir, 'ui');
const binDir = path.join(rootDir, 'bin');
const distDir = path.join(rootDir, 'dist');

async function build() {
  const htmlTemplate = fs.readFileSync(path.join(uiDir, 'index.html'), 'utf-8');
  const cssRaw = fs.readFileSync(path.join(uiDir, 'app.css'), 'utf-8');

  const cssResult = await esbuild.transform(cssRaw, {
    loader: 'css',
    minify: true,
  });

  const jsResult = await esbuild.build({
    entryPoints: [path.join(uiDir, 'app.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    write: false,
  });

  const bundledJs = jsResult.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const outputHtml = htmlTemplate
    .replace('/*__INLINE_CSS__*/', () => cssResult.code)
    .replace('/*__INLINE_JS__*/', () => bundledJs);

  fs.mkdirSync(distDir, { recursive: true });
  const outPath = path.join(distDir, 'app.html');
  fs.writeFileSync(outPath, outputHtml, 'utf-8');
  const sizeKb = (Buffer.byteLength(outputHtml, 'utf-8') / 1024).toFixed(1);
  console.log(`Built ${outPath} (${sizeKb} KB)`);

  const outMcpPath = path.join(distDir, 'mcp-server.mjs');
  await esbuild.build({
    entryPoints: [path.join(binDir, 'mcp-server.mjs')],
    outfile: outMcpPath,
    bundle: true,
    minify: false,
    format: 'esm',
    platform: 'node',
    target: ['node20'],
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
  });
  fs.chmodSync(outMcpPath, 0o755);
  const mcpKb = (fs.statSync(outMcpPath).size / 1024).toFixed(1);
  console.log(`Built ${outMcpPath} (${mcpKb} KB)`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
