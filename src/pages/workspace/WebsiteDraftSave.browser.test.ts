import { execFile, execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { createServer } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { expect, it } from 'vitest'

const apiRoot = resolve(process.cwd(), '../Wedding.Platform.API')
const chrome = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((path): path is string => Boolean(path && existsSync(path)))

it.skipIf(!chrome || !existsSync(join(apiRoot, 'artisan')))('real editor saves atomically, retains in-flight edits and preserves local input after conflicts and validation errors', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'website-draft-save-'))
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe test cleanup path')
  const fixturePath = join(directory, 'draft.json')
  execFileSync('php', ['artisan', 'test', '--compact', '--filter=test_editor_fixture_has_canonical_saved_state_and_revision'], { cwd: apiRoot, env: { ...process.env, DRAFT_SAVE_FIXTURE_PATH: fixturePath }, timeout: 120000, maxBuffer: 2000000 })
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
  const source = `
    import '/src/index.css';
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
    import {EventWorkspaceContext} from '/src/features/events/workspace/EventWorkspaceContext.ts';
    import {WebsitePage} from '/src/pages/workspace/WebsitePage.tsx';
    const fixture=${JSON.stringify(fixture)};
    const check=(value,message)=>{if(!value)throw Error(message)};
    const wait=()=>new Promise(resolve=>setTimeout(resolve,40));
    const until=async(test)=>{for(let i=0;i<150;i++){if(test())return;await wait()}throw Error('Timed out: '+document.body.innerText.slice(0,500))};
    let saved=structuredClone(fixture.data),pending=null,status=200,generation=0;
    const requests=[],projectPath='/api/events/'+saved.eventId+'/websites/'+saved.id;
    const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
    window.fetch=async(input,options={})=>{
      const path=new URL(String(input),location.origin).pathname,method=options.method||'GET';
      if(path==='/sanctum/csrf-cookie')return new Response(null,{status:204});
      requests.push({path,method,body:options.body?JSON.parse(options.body):null,revision:new Headers(options.headers).get('X-Website-Draft-Revision')});
      if(path===projectPath&&method==='GET')return json({data:saved});
      if(path===projectPath+'/draft'&&method==='PATCH')return new Promise(resolve=>{const request=requests.at(-1);pending=()=>{
        if(status===409)resolve(json({message:'Other editor saved newer state',code:'stale_website_draft',currentDraftRevision:'01M00000000000000000000099'},409));
        else if(status===422)resolve(json({message:'Invalid design',errors:{'designSettings.colorTheme':['Choose a supported theme.']}},422));
        else {check(request.revision===saved.draftRevision,'wrong expected revision');if(request.body.designSettings)saved.designSettings={...request.body.designSettings,customColors:saved.designSettings.customColors};saved.draftRevision='01M0000000000000000000000'+(++generation);resolve(json({data:saved}))}
        pending=null;
      }});
      throw Error('Unexpected request '+method+' '+path);
    };
    function Location(){return React.createElement('output',{'data-path':true},useLocation().pathname)}
    const editorPath='/events/'+saved.eventId+'/websites/'+saved.id;
    const root=createRoot(document.getElementById('root'));
    root.render(React.createElement(MemoryRouter,{initialEntries:[editorPath]},React.createElement(EventWorkspaceContext.Provider,{value:{event:{id:saved.eventId,name:'Frozen Event',type:'wedding',eventDate:null,startTime:null,timeZone:'Asia/Manila',publishedWebsiteId:null},setEvent:()=>{}}},React.createElement(Location),React.createElement(Routes,null,React.createElement(Route,{path:'/events/:eventId/websites/:projectId',element:React.createElement(WebsitePage)})))));
    const buttons=()=>[...document.querySelectorAll('button')],button=label=>buttons().find(b=>b.textContent.trim()===label),option=label=>buttons().find(b=>b.textContent.trim()===label&&b.hasAttribute('data-selected'));
    (async()=>{try{
      await until(()=>button('Design'));button('Design').click();
      const themes=saved.template.designOptions.colorThemes,first=themes.find(t=>t.key!==saved.designSettings.colorTheme),second=themes.find(t=>t.key!==first.key);
      await until(()=>option(first.displayName));option(first.displayName).click();await wait();
      check(button('Save changes')&&!button('Save changes').disabled,'design did not become dirty');
      const save=button('Save changes');save.click();save.click();await until(()=>pending);
      check(requests.filter(r=>r.method==='PATCH').length===1,'double click saved twice');
      check(button('Saving...')?.disabled,'loading state missing');
      check(requests.at(-1).body.designSettings.colorTheme===first.key,'wrong submitted design');
      check(!('customColors' in requests.at(-1).body.designSettings),'colors included in aggregate');
      check(!requests.at(-1).body.sections&&!requests.at(-1).body.sectionIds,'untouched sections submitted');
      option(second.displayName).click();await wait();pending();await until(()=>button('Save changes')&&!button('Save changes').disabled);
      check(option(second.displayName).getAttribute('data-selected')==='true','in-flight edit lost');
      check(document.querySelector('[role=status]').textContent.includes('Newer edits'),'newer edits marked saved');
      button('Save changes').click();await until(()=>pending);check(requests.at(-1).revision===saved.draftRevision,'successful token not adopted');pending();await until(()=>button('Save changes')?.disabled);
      check(saved.designSettings.colorTheme===second.key,'second edit not persisted');
      check(document.querySelector('[role=status]').textContent==='Draft saved.','saved feedback missing');
      status=409;option(first.displayName).click();await wait();button('Save changes').click();await until(()=>pending);pending();await until(()=>document.querySelector('[role=alert]'));
      check(option(first.displayName).getAttribute('data-selected')==='true','conflict discarded local input');
      check(!button('Save changes').disabled,'conflict cleared dirty state');
      check(document.querySelector('[role=alert]').textContent.includes('Reloading discards unsaved edits'),'conflict recovery warning missing');
      check(requests.filter(r=>r.method==='GET').length===1,'automatic reload or merge');
      status=422;button('Save changes').click();await until(()=>pending);check(requests.at(-1).revision===saved.draftRevision,'conflicting revision adopted');pending();await until(()=>document.querySelector('[role=alert]')?.textContent.includes('Choose a supported theme'));
      check(option(first.displayName).getAttribute('data-selected')==='true'&&!button('Save changes').disabled,'validation lost edits');
      check(document.querySelector('[data-path]').textContent===editorPath,'save error navigated away');
      check(requests.every(r=>r.method==='GET'||r.method==='PATCH'),'sequential mutation still used');
      document.title='PASS';root.unmount();
    }catch(error){document.title='FAIL '+error.message}})();
  `
  const server = await createServer({ configFile: false, cacheDir: join(directory, 'vite-cache'), optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'lucide-react', 'zod', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', '@radix-ui/react-switch', 'react-hook-form', '@hookform/resolvers/zod'] }, server: { host: '127.0.0.1', port: 0 }, plugins: [tailwindcss(), {
    name: 'draft-save-browser-test',
    resolveId(id) { if (id === 'virtual:draft-save-test') return '\0draft-save-test'; if (id === 'virtual:decorative-sources') return '\0draft-save-decorative' },
    load(id) { if (id === '\0draft-save-test') return source; if (id === '\0draft-save-decorative') return 'export default []' },
    configureServer(vite) { vite.middlewares.use('/draft-save-test', async (_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end(await vite.transformIndexHtml('/draft-save-test', '<html><head><title>WAIT</title></head><body><div id="root"></div><script type="module" src="/@id/virtual:draft-save-test"></script></body></html>')) }) },
  }] })
  try {
    await server.listen()
    const { stdout } = await promisify(execFile)(chrome!, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(directory, 'profile')}`, '--window-size=1440,1000', '--virtual-time-budget=15000', '--dump-dom', `${server.resolvedUrls!.local[0]}draft-save-test`], { timeout: 60000, maxBuffer: 5000000 })
    expect(stdout.match(/<title>(.*?)<\/title>/)?.[1], stdout.slice(-2500)).toBe('PASS')
  } finally {
    await server.close()
    rmSync(directory, { recursive: true, force: true })
  }
}, 120000)
