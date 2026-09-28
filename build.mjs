import {fileURLToPath} from 'node:url';
import { build } from 'rolldown';
import { readFile, writeFile } from 'node:fs/promises';
const result = await build({input: fileURLToPath(new URL(process.argv[2]||'./src/main.js', import.meta.url)), plugins:[{name:'embedded-model',resolveId(id){if(id==='embedded-cockroach')return '\0embedded-cockroach';},async load(id){if(id==='\0embedded-cockroach')return 'export const modelData='+JSON.stringify((await readFile(new URL('./assets/cockroach.glb',import.meta.url))).toString('base64'))+';';}}],output:{format:'iife', minify:true}});
const code=result.output.find(x=>x.type==='chunk').code;
const assetNotice=await readFile(new URL('./THIRD_PARTY_NOTICES.md',import.meta.url),'utf8');
const upstreamLicense=await readFile(new URL('./licenses/deskworlds-MIT.txt',import.meta.url),'utf8');
const license=await readFile(new URL('./licenses/three-MIT.txt',import.meta.url),'utf8');
await writeFile(new URL(process.argv[3]||'./cockroach.html',import.meta.url),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Nocturne</title><link rel="icon" href="data:,"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}canvas{display:block;width:100%;height:100%;touch-action:none;outline:none}</style></head><body><canvas id="scene" aria-label="Interactive 3D cockroach wallpaper"></canvas><!-- Asset provenance:\n${assetNotice.replaceAll('--','—')} --><!-- Deskworlds license:\n${upstreamLicense.replaceAll('--','—')} --><!-- Three.js license:\n${license.replaceAll('--','—')} --><script>${code.replaceAll('</script','<\\/script')}</script></body></html>`);
console.log('Built offline single-file '+(process.argv[3]||'cockroach.html'));
