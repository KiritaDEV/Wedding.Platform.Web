import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createServer } from 'vite';
import { expect, it } from 'vitest';

const chrome = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((path): path is string => Boolean(path && existsSync(path)));

it.skipIf(!chrome || process.platform !== 'win32')('compares actual Flat/Raised/Inset pixels on light, dark, saturated and neutral fills', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'swatches-surfaces-'));
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw Error('Unsafe cleanup path');
  const screenshot = join(directory, 'surfaces.png');
  const measurements = join(directory, 'measurements.json');
  const source = `
import '/src/index.css';import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {SwatchesElementRenderer} from '/src/features/websiteRenderer/SwatchesElementRenderer.tsx';
const colors=['#FFFFFF','#000000','#D92D20','#9CA3AF'];const cells=[];
for(const shape of ['square','circle','rectangle','roundedSquare','pill'])for(const surfaceStyle of ['flat','raised','inset'])cells.push(React.createElement('section',{key:shape+surfaceStyle,'data-style':surfaceStyle,'data-shape':shape,style:{width:440,padding:12,background:'#E2E8F0'}},React.createElement('h2',{style:{font:'14px system-ui',margin:'0 0 12px'}},shape+' / '+surfaceStyle),React.createElement(SwatchesElementRenderer,{element:{id:shape+surfaceStyle,type:'swatches',editorName:'Surface',items:colors.map((color,i)=>({id:'color-'+i,color})),appearance:{shape:shape==='pill'?'rectangle':shape,cornerRadius:shape==='pill'?'full':undefined,size:'medium',surfaceStyle,gap:'s'}}})));
document.body.style.margin='20px';document.body.style.background='#CBD5E1';document.getElementById('root').style.cssText='display:grid;grid-template-columns:repeat(3,440px);gap:16px';
flushSync(()=>createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,...cells)));
const values=[];for(const cell of document.querySelectorAll('[data-style]'))for(const [i,shape] of [...cell.querySelectorAll('[data-swatch-shape]')].entries()){const r=shape.getBoundingClientRect();values.push({shape:cell.dataset.shape,style:cell.dataset.style,color:colors[i],x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)});}
const pre=document.createElement('pre');pre.id='surface-measurements';pre.style.display='none';pre.textContent=JSON.stringify(values);document.body.append(pre);document.title='PASS';
`;
  const server = await createServer({ cacheDir: join(directory, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'swatches-surface-pixels', resolveId(id) { if (id === 'virtual:surface-pixels') return '\0surface-pixels'; }, load(id) { if (id === '\0surface-pixels') return source; }, configureServer(vite) { vite.middlewares.use('/surface-pixels', async (_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end(await vite.transformIndexHtml('/surface-pixels', '<html><head><title>WAIT</title></head><body><div id="root"></div><script type="module" src="/@id/virtual:surface-pixels"></script></body></html>')); }); } }] });
  try {
    await server.listen();
    const { stdout } = await promisify(execFile)(chrome!, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(directory, 'profile')}`, '--window-size=1400,700', '--force-device-scale-factor=1', '--hide-scrollbars', '--virtual-time-budget=5000', `--screenshot=${screenshot}`, '--dump-dom', `${server.resolvedUrls!.local[0]}surface-pixels`], { timeout: 60000, maxBuffer: 1000000 });
    expect(stdout).toContain('<title>PASS</title>');
    const json = stdout.match(/<pre id="surface-measurements"[^>]*>([^<]+)<\/pre>/)?.[1];
    expect(json).toBeTruthy();
    writeFileSync(measurements, json!);
    if (process.env.SWATCHES_SURFACE_PREVIEW_PATH) copyFileSync(screenshot, process.env.SWATCHES_SURFACE_PREVIEW_PATH);
    // Windows System.Drawing reads Chrome's PNG; no image package or reference screenshot dependency.
    const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
    const script = `
Add-Type -AssemblyName System.Drawing
$bitmap = [System.Drawing.Bitmap]::new(${quote(screenshot)})
try {
  $entries = Get-Content -Raw -LiteralPath ${quote(measurements)} | ConvertFrom-Json
  foreach ($entry in $entries) {
    $center = $bitmap.GetPixel([int]($entry.x + $entry.width / 2), [int]($entry.y + $entry.height / 2))
    $expected = [System.Drawing.ColorTranslator]::FromHtml($entry.color)
    if ($entry.shape -in @('circle','roundedSquare','pill')) {
      $corner = $bitmap.GetPixel([int]$entry.x,[int]$entry.y)
      if ($corner.R -ne 226 -or $corner.G -ne 232 -or $corner.B -ne 240) { throw 'Square artifact outside rounded contour' }
    }
    if ($center.R -ne $expected.R -or $center.G -ne $expected.G -or $center.B -ne $expected.B) { throw 'Surface altered the center fill' }
  }
  $comparisons = 0
  foreach ($shape in @('square','circle','rectangle','roundedSquare','pill')) { foreach ($color in @('#FFFFFF','#000000','#D92D20','#9CA3AF')) {
    $flat = $entries | Where-Object { $_.shape -eq $shape -and $_.color -eq $color -and $_.style -eq 'flat' }
    $raised = $entries | Where-Object { $_.shape -eq $shape -and $_.color -eq $color -and $_.style -eq 'raised' }
    $inset = $entries | Where-Object { $_.shape -eq $shape -and $_.color -eq $color -and $_.style -eq 'inset' }
    $differences = 0; $raisedChanges = 0; $insetChanges = 0
    for ($y = 0; $y -lt $flat.height; $y += 2) { for ($x = 0; $x -lt $flat.width; $x += 2) {
      $f = $bitmap.GetPixel([int]($flat.x+$x), [int]($flat.y+$y)).ToArgb()
      $r = $bitmap.GetPixel([int]($raised.x+$x), [int]($raised.y+$y)).ToArgb()
      $i = $bitmap.GetPixel([int]($inset.x+$x), [int]($inset.y+$y)).ToArgb()
      if ($r -ne $i) { $differences++ }; if ($r -ne $f) { $raisedChanges++ }; if ($i -ne $f) { $insetChanges++ }
    } }
    if ($differences -lt 5 -or $raisedChanges -lt 5 -or $insetChanges -lt 5) { throw ('Surface indistinguishable for '+$shape+'/'+$color) }
    if ($shape -eq 'square') {
      foreach ($entry in @($raised,$inset)) {
        $upper = $bitmap.GetPixel([int]($entry.x+2),[int]($entry.y+2))
        $lower = $bitmap.GetPixel([int]($entry.x+$entry.width-3),[int]($entry.y+$entry.height-3))
        $delta = [int]$upper.R+[int]$upper.G+[int]$upper.B-[int]$lower.R-[int]$lower.G-[int]$lower.B
        if (($entry.style -eq 'raised' -and $delta -le 0) -or ($entry.style -eq 'inset' -and $delta -ge 0)) { throw 'Incorrect lighting direction' }
      }
    }
    $comparisons++
  } }
  Write-Output ('PASS '+$entries.Count+' centers / '+$comparisons+' surface comparisons')
} finally { $bitmap.Dispose() }
`;
    const pixels = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 30000 });
    expect(pixels.stdout).toContain('PASS 60 centers / 20 surface comparisons');
  } finally { await server.close(); rmSync(directory, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }); }
}, 120000);
