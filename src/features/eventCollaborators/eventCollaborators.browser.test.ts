import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { createServer } from 'vite'
import { expect, it } from 'vitest'

const chrome = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((path): path is string => Boolean(path && existsSync(path)))

it.skipIf(!chrome)('Owner Settings supports add, errors, confirmed removal, Event switching and responsive layouts; Managers retain ordinary settings', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'kirita-collaborators-'))
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe cleanup path')
  const source = `
    import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import '/src/index.css';
    import {EventSettingsPage} from '/src/pages/workspace/EventSettingsPage.tsx';
    import {EventWorkspaceContext} from '/src/features/events/workspace/EventWorkspaceContext.ts';
    const check=(ok,message)=>{if(!ok)throw new Error(message)}, calls=[], faults=[];
    window.addEventListener('error',event=>faults.push(event.message));window.addEventListener('unhandledrejection',event=>faults.push(String(event.reason)));
    const owner={id:'owner-membership',name:'Owner',email:'owner@example.com',role:'owner'};
    const partner={id:'partner-membership',name:'Partner With A Long Name',email:'averylongregisteredemailaddress@example.com',role:'admin'};
    const lists={a:[owner],b:[{...owner,name:'Other Owner'}]};
    let failGet=false, delayGet=false, releaseGet, posts=0, deletes=0;
    window.fetch=async(url,options={})=>{
      const path=new URL(url).pathname,method=options.method||'GET';calls.push({path,method,body:options.body});
      const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
      if(path.endsWith('/sanctum/csrf-cookie'))return new Response(null,{status:204});
      if(path.endsWith('/time-zones'))return json({data:[{id:'Asia/Manila',displayName:'Manila'}]});
      const match=path.match(/\\/events\\/(a|b)\\/collaborators(?:\\/(.*))?$/);check(match,'Unexpected request '+path);
      if(method==='GET'){if(failGet)return json({message:'Unable to load collaborators.'},500);if(delayGet&&match[1]==='a')await new Promise(resolve=>releaseGet=resolve);return json({data:lists[match[1]]});}
      if(method==='POST'){
        posts++;const input=JSON.parse(options.body);check(Object.keys(input).join()==='email','Extra fields sent');
        if(input.email==='unknown@example.com')return json({message:'Validation failed.',errors:{email:['This account is unavailable for collaboration.']}},422);
        check(input.email==='partner@example.com','Email normalization');lists[match[1]].push(partner);return json({data:partner},201);
      }
      if(method==='DELETE'){deletes++;check(match[2]===partner.id,'Wrong membership');lists[match[1]]=lists[match[1]].filter(item=>item.id!==partner.id);return new Response(null,{status:204});}
      throw new Error('Unexpected method');
    };
    const host=document.getElementById('root'),root=createRoot(host);
    const event=(id,role)=>({id,membershipRole:role,timeZone:'Asia/Manila',eventDate:null,startTime:null,rsvpDeadline:null,rsvpIsOpen:false});
    const render=(id,role='owner')=>flushSync(()=>root.render(React.createElement(EventWorkspaceContext.Provider,{value:{event:event(id,role),setEvent:()=>{}}},React.createElement(EventSettingsPage))));
    const wait=()=>new Promise(resolve=>setTimeout(resolve,100));
    const button=text=>[...document.querySelectorAll('button')].find(item=>item.textContent===text);
    const input=value=>{const element=document.querySelector('input[type=email]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));};
    (async()=>{try{
      render('a');check(host.textContent.includes('Loading collaborators'),'Loading state absent');await wait();
      check(host.querySelectorAll('[aria-label="Event members"] li').length===1,'Owner list');check(!button('Remove'),'Owner has removal action');
      input('unknown@example.com');await wait();button('Add Manager').click();await wait();check(host.textContent.includes('This account is unavailable for collaboration.'),'Validation message');
      input('PARTNER@EXAMPLE.COM');await wait();button('Add Manager').click();button('Add Manager').click();await wait();check(host.textContent.includes('Manager added.'),'Add success');check(posts===2,'Unexpected POST count');
      for(const width of [320,768,1280]){host.style.width=width+'px';await wait();const section=document.querySelector('[aria-label="Event members"]').closest('section');check(section.scrollWidth<=section.clientWidth,'Section overflow at '+width);check(host.scrollWidth<=host.clientWidth,'Settings overflow at '+width);}
      document.querySelector('[aria-label="Remove '+partner.name+'"]') .click();await wait();check(document.querySelector('dialog').open,'No confirmation dialog');check(deletes===0,'Removed without confirmation');button('Cancel').click();await wait();check(deletes===0,'Cancel removed member');
      document.querySelector('[aria-label="Remove '+partner.name+'"]') .click();await wait();button('Remove Manager').click();await wait();check(deletes===1&&host.textContent.includes('Manager removed.'),'Confirmed removal');check(document.querySelectorAll('[aria-label="Event members"] li').length===1,'Removed still listed');
      render('b');await wait();check(host.textContent.includes('Other Owner'),'Event switch not reflected');check(!host.textContent.includes('Manager removed.'),'Stale success after switch');
      const before=calls.filter(call=>call.path.includes('/collaborators')).length;render('b','admin');await wait();check(!host.textContent.includes('Collaborators'),'Manager administration shown');check(host.textContent.includes('Event timing')&&host.textContent.includes('RSVP responses'),'Manager ordinary settings missing');check(calls.filter(call=>call.path.includes('/collaborators')).length===before,'Manager requested collaborators');
      failGet=true;render('a');await wait();check(button('Retry'),'Failed load retry absent');check(!button('Add Manager'),'Failed load permits add');failGet=false;button('Retry').click();await wait();check(button('Add Manager'),'Retry failed');
      render('b');await wait();delayGet=true;render('a');await wait();render('b');await wait();releaseGet();await wait();check(host.textContent.includes('Other Owner'),'Late previous Event response replaced current list');
      check(faults.length===0,'Browser errors: '+faults.join(';'));document.title='PASS';
    }catch(error){document.title='FAIL '+error.message}})();
  `
  const server = await createServer({ cacheDir: join(directory, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'collaborator-test', resolveId(id) { if (id === 'virtual:collaborator-test') return '\0collaborator-test' }, load(id) { if (id === '\0collaborator-test') return source }, configureServer(vite) { vite.middlewares.use('/collaborator-test', async (_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end(await vite.transformIndexHtml('/collaborator-test', '<html><head><title>WAIT</title></head><body><div id="root"></div><script type="module" src="/@id/virtual:collaborator-test"></script></body></html>')) }) } }] })
  try {
    await server.listen()
    const { stdout } = await promisify(execFile)(chrome!, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(directory, 'profile')}`, '--window-size=1440,900', '--virtual-time-budget=20000', '--dump-dom', `${server.resolvedUrls!.local[0]}collaborator-test`], { timeout: 60000, maxBuffer: 15000000 })
    expect(stdout.match(/<title>(.*?)<\/title>/)?.[1], stdout.slice(-2500)).toBe('PASS')
  } finally { await server.close(); rmSync(directory, { recursive: true, force: true }) }
}, 120000)
