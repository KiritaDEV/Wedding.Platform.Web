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

it.skipIf(!chrome || !existsSync(join(apiRoot, 'artisan')))('real editor resolves shared Schedule, saves its definition atomically, and preserves sibling device references', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'website-shared-content-'))
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe test cleanup path')
  const fixturePath = join(directory, 'draft.json')
  execFileSync('php', ['artisan', 'test', '--compact', '--filter=test_editor_fixture_has_canonical_saved_state_and_revision'], { cwd: apiRoot, env: { ...process.env, DRAFT_SAVE_FIXTURE_PATH: fixturePath }, timeout: 120000, maxBuffer: 2000000 })
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
  const hero = fixture.data.sections.find((section: { type: string }) => section.type === 'hero')
  const placement = { id: 'schedule-placement', type: 'schedule', editorName: 'Schedule 1', contentId: 'shared-schedule' }
  hero.content = { semantic: {}, sharedContentDefinitions: [{ id: 'shared-schedule', type: 'schedule', content: { days: [{ id: 'day-1', date: null, title: null, visible: true, activities: [{ id: 'entry', startTime: '10:00', title: 'Ceremony', description: 'Welcome' , endTime: null, location: null, mapUrl: null, imageMediaId: null, visible: true }] }] } }], compositions: { shared: { childFlow: { elements: [placement], order: [{ kind: 'element', id: placement.id }] } }, custom: { mobile: { childFlow: { elements: [{ ...placement, id: 'mobile-schedule', appearance: { layout: 'cards', cards: { columns: 'grid' } } }], order: [{ kind: 'element', id: 'mobile-schedule' }] } } } } }
  hero.appearance.custom = { mobile: structuredClone(hero.appearance.shared) }
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
        else {check(request.revision===saved.draftRevision,'wrong expected revision');for(const change of request.body.sections??[]){const section=saved.sections.find(section=>section.id===change.id);if(change.content)section.content=change.content;if(change.appearance)section.appearance=change.appearance;}if(request.body.designSettings)saved.designSettings={...request.body.designSettings,customColors:saved.designSettings.customColors};saved.draftRevision='01M0000000000000000000000'+(++generation);resolve(json({data:saved}))}
        pending=null;
      }});
      throw Error('Unexpected request '+method+' '+path);
    };
    function Location(){return React.createElement('output',{'data-path':true},useLocation().pathname)}
    const editorPath='/events/'+saved.eventId+'/websites/'+saved.id;
    const root=createRoot(document.getElementById('root'));
    root.render(React.createElement(MemoryRouter,{initialEntries:[editorPath]},React.createElement(EventWorkspaceContext.Provider,{value:{event:{id:saved.eventId,name:'Frozen Event',type:'wedding',eventDate:null,startTime:null,timeZone:'Asia/Manila',publishedWebsiteId:null},setEvent:()=>{}}},React.createElement(Location),React.createElement(Routes,null,React.createElement(Route,{path:'/events/:eventId/websites/:projectId',element:React.createElement(WebsitePage)})))));
    const canvas=()=>document.querySelector('iframe')?.contentDocument;
    const buttons=()=>[...document.querySelectorAll('button')],button=label=>buttons().find(b=>b.textContent.trim()===label),option=label=>buttons().find(b=>b.textContent.trim()===label&&b.hasAttribute('data-selected'));
    (async()=>{try{
      await until(()=>canvas()?.querySelector('[data-section-child-element="schedule-placement"]'));
      check(canvas()?.querySelector('[data-schedule-block]').textContent.includes('Ceremony'),'shared canvas unresolved');
      canvas().querySelector('[data-editor-website-element="schedule-placement"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      await until(()=>document.querySelector('input[aria-label="Day 1 Activity 1 title"]'));
      const input=document.querySelector('input[aria-label="Day 1 Activity 1 title"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Shared ceremony edited');input.dispatchEvent(new Event('input',{bubbles:true}));
      await until(()=>canvas()?.querySelector('[data-schedule-block]').textContent.includes('Shared ceremony edited'));
      const choose=async(label,option)=>{document.querySelector('button[aria-label="Schedule '+label+'"]').click();await until(()=>document.querySelector('[role=listbox]'));const node=[...document.querySelectorAll('[role=option]')].find(node=>node.textContent.trim()===option||node.textContent.trim().startsWith(option+' ·'));check(node,'missing option '+label+' / '+option);node.click();await wait()};
      await choose('Layout','Timeline');await choose('Arrangement','Alternating');await choose('Marker','Number');
      await choose('Time format','15:00');await choose('Day date format','Saturday, October 24, 2026');
      await choose('Maximum content width','Narrow (32rem)');await choose('Content alignment','Center');await choose('Day gap','Large');
      buttons().find(node=>node.hasAttribute('aria-expanded')&&node.textContent.trim().startsWith('Typography')).click();await until(()=>document.querySelector('button[aria-label="Schedule Typography role"]'));
      await choose('Typography role','Activity title');await choose('Font size','Large');await choose('Font weight','Normal');
      document.querySelector('button[aria-label="Activity descriptions"]').click();
      await until(()=>!canvas().querySelector('.schedule-description'));
      check(canvas().querySelector('.schedule-title').style.fontSize==='1.5rem','Role typography did not preview immediately');
      check(canvas().querySelector('.schedule-title').style.fontWeight==='400','Normal did not override Schedule emphasis');
      check(canvas().querySelector('time').textContent==='10:00','24-hour display did not preview');
      check(canvas().querySelector('[data-schedule-layout="timeline"]'),'Layout did not update editor canvas');
      check(saved.sections.find(section=>section.type==='hero').content.sharedContentDefinitions[0].content.days[0].activities[0].title==='Ceremony','Layout editing mutated saved draft');
      button('Save changes').click();await until(()=>pending);
      const request=requests.at(-1);check(request.body.sections.length===1,'unrelated section save');
      const content=request.body.sections[0].content;
      check(content.sharedContentDefinitions.length===1&&content.sharedContentDefinitions[0].content.days[0].activities[0].title==='Shared ceremony edited','definition edit lost by scoped merge');
      check(content.compositions.shared.childFlow.elements[0].contentId==='shared-schedule','shared reference changed');
      check(content.compositions.custom.mobile.childFlow.elements[0].id==='mobile-schedule'&&content.compositions.custom.mobile.childFlow.elements[0].contentId==='shared-schedule','sibling device branch changed');
      check(content.compositions.shared.childFlow.elements[0].appearance.layout==='timeline','Layout missing from aggregate save');
      const phase4=content.compositions.shared.childFlow.elements[0].appearance;
      check(phase4.typography.activityTitle.fontSize==='l'&&phase4.typography.activityTitle.fontWeight===400,'Role typography missing from aggregate save');
      check(phase4.timeFormat==='24-hour'&&phase4.dateFormat==='weekday'&&phase4.showDescriptions===false,'Formatting/visibility missing from aggregate save');
      check(phase4.contentWidth==='narrow'&&phase4.contentAlignment==='center'&&phase4.dayGap==='l','Width/spacing missing from aggregate save');
      check(content.sharedContentDefinitions[0].content.days[0].activities[0].description==='Welcome','Visibility deleted shared content');
      check(!content.compositions.custom.mobile.childFlow.elements[0].appearance.typography,'Typography overwritten in explicit mobile composition');
      check(content.compositions.custom.mobile.childFlow.elements[0].appearance.layout==='cards','Explicit mobile appearance overwritten');
      check(!('days' in content.compositions.shared.childFlow.elements[0]),'resolved content leaked into placement');
      check(buttons().some(button=>button.textContent.trim().startsWith('Saving')&&button.disabled),'repeat save enabled');pending();await until(()=>button('Save changes')?.disabled&&document.querySelector('[role=status]')?.textContent==='Draft saved.');
      check(document.querySelector('input[aria-label="Day 1 Activity 1 title"]').value==='Shared ceremony edited','saved definition failed to load');
      check(requests.filter(request=>request.method==='PATCH').length===1,'definition used separate writes');
      check(document.querySelector('button[aria-label="Schedule Layout"]').textContent.includes('Timeline'),'Saved layout failed to reload');
      check(document.querySelector('button[aria-label="Schedule Time format"]').textContent.includes('15:00'),'Formatting failed to reload');
      check(!canvas().querySelector('.schedule-description'),'Visibility failed to reload');
      status=409;
      await choose('Layout','Cards');await choose('Columns','Responsive grid');
      const currentInput=document.querySelector('input[aria-label="Day 1 Activity 1 title"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(currentInput,'Conflict edit kept');currentInput.dispatchEvent(new Event('input',{bubbles:true}));
      await until(()=>!button('Save changes')?.disabled);button('Save changes').click();await until(()=>pending);pending();
      await until(()=>document.querySelector('[role=alert]'));
      check(document.querySelector('input[aria-label="Day 1 Activity 1 title"]').value==='Conflict edit kept','conflict discarded definition edit');
      check(saved.sections.find(section=>section.type==='hero').content.sharedContentDefinitions[0].content.days[0].activities[0].title==='Shared ceremony edited','conflict mutated saved definition');
      check(document.querySelector('button[aria-label="Schedule Layout"]').textContent.includes('Cards'),'Conflict discarded local appearance');
      check(document.querySelector('button[aria-label="Schedule Time format"]').textContent.includes('15:00'),'Conflict discarded local formatting');
      check(saved.sections.find(section=>section.type==='hero').content.compositions.shared.childFlow.elements[0].appearance.layout==='timeline','Conflict changed saved appearance');
      check(requests.filter(request=>request.method==='GET').length===1,'conflict auto-reloaded');
      check(document.querySelector('[data-path]').textContent===editorPath,'unexpected navigation');

      const setInput=(label,value)=>{const node=document.querySelector('input[aria-label="'+label+'"]');check(node,'missing '+label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}))};
      setInput('Day 1 Activity 1 startTime','23:00');setInput('Day 1 Activity 1 endTime','01:00');
      await until(()=>document.querySelector('[data-schedule-element-editor] [role=alert]')?.textContent.includes('End time'));
      check(document.querySelector('input[aria-label="Day 1 Activity 1 endTime"]').value==='01:00','invalid range silently normalized');
      setInput('Day 1 Activity 1 startTime','10:00');setInput('Day 1 Activity 1 endTime','11:00');
      button('Add Day').click();await until(()=>document.querySelector('input[aria-label="Day 2 title"]'));
      button('Duplicate Activity').click();await until(()=>document.querySelector('input[aria-label="Day 1 Activity 2 title"]'));
      setInput('Day 1 Activity 2 title','Duplicated activity');
      await wait();const day1=()=>document.querySelector('input[aria-label="Day 1 title"]').closest('fieldset');
      const scoped=(node,label)=>[...node.querySelectorAll('button')].find(b=>b.textContent.trim()===label);
      scoped(day1(),'Activity down').click();await until(()=>document.querySelector('input[aria-label="Day 1 Activity 1 title"]').value==='Duplicated activity');
      scoped(day1(),'Activity up').click(); // first is disabled; use second Activity's up
      [...day1().querySelectorAll('button')].filter(b=>b.textContent.trim()==='Activity up')[1].click();
      await until(()=>document.querySelector('input[aria-label="Day 1 Activity 1 title"]').value==='Conflict edit kept');
      const destination=document.querySelector('select[aria-label="Move Day 1 Activity 1 to Day"]');
      destination.value=destination.options[1].value;destination.dispatchEvent(new Event('change',{bubbles:true}));
      await until(()=>document.querySelector('input[aria-label="Day 2 Activity 1 title"]')?.value==='Conflict edit kept');
      const day2=()=>document.querySelector('input[aria-label="Day 2 title"]').closest('fieldset');
      scoped(day2(),'Duplicate Day').click();await until(()=>document.querySelector('input[aria-label="Day 3 title"]'));
      status=200;button('Save changes').click();await until(()=>pending);
      const duplicatedDays=requests.at(-1).body.sections[0].content.sharedContentDefinitions[0].content.days;
      check(new Set(duplicatedDays.flatMap(day=>[day.id,...day.activities.map(activity=>activity.id)])).size===6,'Day duplication failed to regenerate all identities');
      check(duplicatedDays[1].activities[0].title===duplicatedDays[2].activities[0].title,'Day duplication lost authored content');
      pending();await until(()=>button('Save changes')?.disabled);
      const day3=()=>document.querySelector('input[aria-label="Day 3 title"]').closest('fieldset');
      scoped(day3(),'Delete Day').click();await until(()=>button('Confirm delete Day'));
      check(document.querySelector('input[aria-label="Day 3 title"]'),'populated day deleted without confirmation');scoped(day3(),'Cancel').click();await until(()=>!button('Confirm delete Day'));
      scoped(day3(),'Delete Day').click();await until(()=>button('Confirm delete Day'));button('Confirm delete Day').click();await until(()=>!document.querySelector('input[aria-label="Day 3 title"]'));
      button('Add Day').click();await until(()=>document.querySelector('input[aria-label="Day 3 title"]'));scoped(day3(),'Delete Day').click();await until(()=>!document.querySelector('input[aria-label="Day 3 title"]'));check(!button('Confirm delete Day'),'empty day required confirmation');
      scoped(day2(),'Day up').click();await until(()=>document.querySelector('input[aria-label="Day 1 Activity 1 title"]').value==='Conflict edit kept');
      status=200;button('Save changes').click();await until(()=>pending);
      const changed=requests.at(-1).body.sections[0].content.sharedContentDefinitions[0].content.days;
      check(changed.length===2&&changed[0].activities[0].title==='Conflict edit kept'&&changed[1].activities[0].title==='Duplicated activity','move order/content lost');
      check(new Set(changed.flatMap(day=>[day.id,...day.activities.map(activity=>activity.id)])).size===4,'duplicate IDs retained');
      check(changed[0].activities[0].id==='entry','moving changed stable Activity ID');pending();await until(()=>button('Save changes')?.disabled);
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
    expect(stdout.match(/<title>([\s\S]*?)<\/title>/)?.[1], stdout.slice(0,1500)+'\n'+stdout.slice(-2500)).toBe('PASS')
  } finally {
    await server.close()
    rmSync(directory, { recursive: true, force: true })
  }
}, 120000)
