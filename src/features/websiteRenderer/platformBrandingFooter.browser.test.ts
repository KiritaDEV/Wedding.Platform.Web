import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { createServer } from 'vite'
import { expect, it } from 'vitest'

const chrome = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((path): path is string => Boolean(path && existsSync(path)))

it.skipIf(!chrome)('keeps branding after the rendered sections at desktop, tablet and mobile widths', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'kirita-footer-'))
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe cleanup path')
  const source = `
    import React from 'react';import {createRoot} from 'react-dom/client';import '/src/index.css';
    import {WebsiteRenderer} from '/src/features/websiteRenderer/WebsiteRenderer.tsx';
    import fixture from '/src/features/publicEventSite/fixtures/published-public-site.json';
    const cases=[];const original=JSON.stringify(fixture);
    for(const templateKey of ['classic-filipiniana-v1','modern-editorial-v1'])for(const width of [320,768,1280])for(const scenario of ['visible','hidden','empty'])for(const mode of ['public','editor']){
      const website=structuredClone(fixture.data.website);website.templateKey=templateKey;
      if(scenario==='hidden')website.sections.forEach(s=>s.isEnabled=false);
      if(scenario==='empty')website.sections=[];
      cases.push(React.createElement('div',{key:templateKey+width+scenario+mode,'data-case':scenario,style:{width}},React.createElement(WebsiteRenderer,{website,event:fixture.data.event,mode,audience:'management-preview',targetViewport:width===320?'mobile':width===768?'tablet':'desktop'})));
    }
    createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,...cases));
    setTimeout(()=>{try{
      const check=(ok,message)=>{if(!ok)throw new Error(message)};
      for(const host of document.querySelectorAll('[data-case]')){
        const footers=host.querySelectorAll('[data-platform-branding]');check(footers.length===1,'Footer count');
        const footer=footers[0],article=host.querySelector('article'),rect=footer.getBoundingClientRect(),css=getComputedStyle(footer);
        check(Math.abs(rect.top-article.getBoundingClientRect().bottom)<1,'Footer not immediately after template');
        check(!article.contains(footer)&&!footer.closest('[data-preview-section]'),'Footer inside authored section');
        check(rect.height>40&&rect.height<100,'Footer inherited section height');
        check(css.fontSize==='12px'&&css.textAlign==='center','Footer typography');
        check(css.backgroundImage==='none'&&css.backgroundColor==='rgb(0, 0, 0)'&&css.borderTopWidth==='0px','Footer separation');
        check(footer.scrollWidth<=footer.clientWidth&&Math.abs(rect.width-host.clientWidth)<1,'Footer overflow');
        check(footer.textContent==='Powered by'&&!footer.querySelector('a'),'Branding contents');
        const logo=footer.querySelector('img');check(logo?.alt==='Kirita'&&logo.complete&&logo.naturalWidth===2172,'Logo failed to load');check(logo.getBoundingClientRect().width===108,'Logo width');
        if(host.dataset.case==='visible')check(article.querySelector('section'),'No visible section exercised');
      }
      check(JSON.stringify(fixture)===original,'Input mutation');document.title='PASS';
    }catch(error){document.title='FAIL '+error.message}},1500);
  `
  const server = await createServer({ cacheDir: join(directory, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'footer-test', resolveId(id) { if (id === 'virtual:footer-test') return '\0footer-test' }, load(id) { if (id === '\0footer-test') return source }, configureServer(vite) { vite.middlewares.use('/footer-test', async (_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end(await vite.transformIndexHtml('/footer-test', '<html><head><title>WAIT</title></head><body><div id="root"></div><script type="module" src="/@id/virtual:footer-test"></script></body></html>')) }) } }] })
  try {
    await server.listen()
    const { stdout } = await promisify(execFile)(chrome!, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(directory, 'profile')}`, '--window-size=1440,900', '--virtual-time-budget=15000', '--dump-dom', `${server.resolvedUrls!.local[0]}footer-test`], { timeout: 60000, maxBuffer: 15000000 })
    expect(stdout.match(/<title>(.*?)<\/title>/)?.[1], stdout.slice(-1500)).toBe('PASS')
  } finally { await server.close(); rmSync(directory, { recursive: true, force: true }) }
}, 120000)

