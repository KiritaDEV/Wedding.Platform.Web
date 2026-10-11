import { execFile } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { createServer } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { describe, expect, it } from 'vitest'

const chrome = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe']
  .find((path): path is string => Boolean(path && existsSync(path)))
const browserIt = chrome ? it : it.skip

describe('Website Projects publication actions', () => {
  browserIt.each([390, 1280])('uses the existing saved-draft publication API and preserves page behavior at %spx', async (width) => {
    const source = `
      import '/src/index.css';
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
      import {EventWorkspaceContext} from '/src/features/events/workspace/EventWorkspaceContext.ts';
      import {WebsiteProjectsPage} from '/src/pages/workspace/WebsiteProjectsPage.tsx';
      const check=(value,message)=>{if(!value)throw Error(message)};
      const wait=()=>new Promise(resolve=>setTimeout(resolve,40));
      const until=async(test)=>{for(let i=0;i<100;i++){if(test())return;await wait()}throw Error('Timed out')};
      const projects=['active','other'].map(id=>({id,eventId:'event',name:id==='active'?'Active Project':'Other Project',templateKey:'classic',isPublished:id==='active',designSettings:{colorTheme:'theme',fontSet:'fonts',artStyle:'art'}}));
      const requests=[];let lists=0,pending=null,fail=false;
      window.fetch=async(input,options={})=>{
        const path=new URL(String(input),location.origin).pathname,method=options.method||'GET';
        requests.push({path,method,body:options.body});
        const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
        if(path==='/sanctum/csrf-cookie')return new Response(null,{status:204});
        if(path==='/api/events/event/website-templates')return json({data:[{key:'classic',displayName:'Classic',description:'Template',styleTags:[]}]});
        if(path==='/api/events/event/websites'&&method==='GET'){lists++;return json({data:projects})}
        if(method==='POST'&&path.endsWith('/publish'))return new Promise(resolve=>{pending=()=>{
          if(fail)resolve(json({message:'A referenced image is unavailable. Previous publication preserved.'},422));
          else {const id=path.split('/').at(-2);projects.forEach(p=>p.isPublished=p.id===id);resolve(json({data:projects.find(p=>p.id===id)}))}
          pending=null;
        }});
        if(method==='DELETE'&&path==='/api/events/event/published-website')return new Promise(resolve=>{pending=()=>{projects.forEach(p=>p.isPublished=false);resolve(json({data:{publishedWebsiteId:null}}));pending=null}});
        throw Error('Unexpected request '+method+' '+path);
      };
      function Location(){return React.createElement('output',{'data-path':true},useLocation().pathname)}
      const root=createRoot(document.getElementById('root'));
      root.render(React.createElement(MemoryRouter,{initialEntries:['/events/event/websites']},React.createElement(EventWorkspaceContext.Provider,{value:{event:{id:'event'},setEvent:()=>{}}},React.createElement(Location),React.createElement(Routes,null,React.createElement(Route,{path:'/events/:event/websites',element:React.createElement(WebsiteProjectsPage)}),React.createElement(Route,{path:'/events/:event/websites/:project',element:React.createElement('p',null,'Editor destination')})))));
      const cards=()=>[...document.querySelectorAll('article')],card=name=>cards().find(n=>n.querySelector('h2')?.textContent===name),button=(host,label)=>[...host.querySelectorAll('button')].find(b=>b.textContent===label);
      (async()=>{try{
        await until(()=>cards().length===2);
        const active=card('Active Project'),other=card('Other Project');
        check(button(active,'Publish Changes')&&button(active,'Unpublish'),'active actions');
        check(button(other,'Publish')&&!button(other,'Publish Changes'),'unpublished actions');
        check(active.querySelector('a').getAttribute('href')==='/events/event/websites/active','existing editor link');
        check(document.documentElement.scrollWidth<=innerWidth+1,'responsive overflow');
        const publish=button(active,'Publish Changes');publish.click();publish.click();
        await until(()=>pending!==null);
        check(requests.filter(r=>r.method==='POST').length===1,'duplicate publish submitted');
        check(requests.find(r=>r.method==='POST').path==='/api/events/event/websites/active/publish','republish endpoint');
        check(requests.find(r=>r.method==='POST').body===undefined,'unsaved draft payload submitted');
        check(button(card('Active Project'),'Publishing changes…')?.disabled,'republish loading');
        check(cards().every(c=>[...c.querySelectorAll('button')].every(b=>b.disabled)),'conflicting actions enabled');
        button(card('Active Project'),'Unpublish').click();button(card('Other Project'),'Publish').click();
        check(requests.filter(r=>r.method!=='GET').length===1,'conflicting mutation submitted');
        const before=lists;pending();await until(()=>lists>before&&button(card('Active Project'),'Publish Changes'));
        check(document.querySelector('[role=status]')?.textContent==='Published changes from the latest saved draft.','republish success feedback');
        check(button(card('Other Project'),'Publish'),'other project changed');
        check(document.querySelector('[data-path]').textContent==='/events/event/websites','unexpected navigation');
        fail=true;button(card('Active Project'),'Publish Changes').click();await until(()=>pending!==null);
        check(!document.querySelector('[role=status]'),'stale success during retry');
        const beforeFailure=lists;pending();await until(()=>document.querySelector('[role=alert]'));
        check(document.querySelector('[role=alert]').textContent.includes('referenced image is unavailable'),'returned error missing');
        check(!document.querySelector('[role=status]'),'failure indicated success');
        check(lists===beforeFailure&&button(card('Active Project'),'Publish Changes')&&button(card('Active Project'),'Unpublish'),'failure changed publication');
        fail=false;button(card('Other Project'),'Publish').click();await until(()=>pending!==null);pending();
        await until(()=>button(card('Other Project'),'Publish Changes'));
        check(button(card('Active Project'),'Publish'),'existing Publish did not switch project');
        button(card('Other Project'),'Unpublish').click();await until(()=>pending!==null);
        check(button(card('Other Project'),'Unpublishing…')?.disabled,'unpublish loading');pending();
        await until(()=>cards().every(c=>button(c,'Publish')));
        check(document.querySelector('[role=status]')?.textContent==='Website unpublished.','unpublish success');
        [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Create Website')).click();await wait();
        check(document.querySelector('#project-name')?.value==='Website'&&document.querySelector('#project-template'),'create dialog regression');
        [...document.querySelectorAll('button')].find(b=>b.textContent==='Cancel').click();await wait();
        card('Active Project').querySelector('a').click();await until(()=>document.querySelector('[data-path]').textContent==='/events/event/websites/active');
        check(document.body.textContent.includes('Editor destination'),'Open Website navigation');
        check(requests.filter(r=>r.method!=='GET').every(r=>r.path.endsWith('/publish')||r.path.endsWith('/published-website')),'unexpected draft save');
        document.title='PASS';root.unmount();
      }catch(error){document.title='FAIL '+error.message}})();
    `
    const directory = mkdtempSync(join(tmpdir(), 'website-project-publication-'))
    if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe test cleanup path')
    const server = await createServer({ configFile: false, cacheDir: join(directory, 'vite-cache'),
      optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'lucide-react', 'zod'] },
      server: { host: '127.0.0.1', port: 0 }, plugins: [tailwindcss(), {
        name: 'publication-browser-test',
        resolveId(id) {
          if (id === 'virtual:publication-test') return '\0publication-test'
          if (id === 'virtual:decorative-sources') return '\0publication-decorative-sources'
        },
        load(id) {
          if (id === '\0publication-test') return source
          if (id === '\0publication-decorative-sources') return 'export default []'
        },
        configureServer(vite) { vite.middlewares.use('/publication-test', async (_request, response) => {
          response.setHeader('Content-Type', 'text/html')
          response.end(await vite.transformIndexHtml('/publication-test', '<html><head><title>WAIT</title></head><body><div id="root"></div><script type="module" src="/@id/virtual:publication-test"></script></body></html>'))
        }) },
      }] })
    try {
      await server.listen()
      const url = `${server.resolvedUrls!.local[0]}publication-test`
      const { stdout } = await promisify(execFile)(chrome!, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(directory, 'profile')}`,
        `--window-size=${width},1000`, '--virtual-time-budget=10000', '--dump-dom', url], { timeout: 45000, maxBuffer: 4 * 1024 * 1024 })
      expect(stdout.match(/<title>(.*?)<\/title>/)?.[1], stdout.slice(-2500)).toBe('PASS')
    } finally {
      await server.close()
      rmSync(directory, { recursive: true, force: true })
    }
  }, 60000)
})
