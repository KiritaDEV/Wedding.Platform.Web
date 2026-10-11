import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { createServer } from 'vite'
import { expect, it } from 'vitest'
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(existsSync)
it.skipIf(!chrome)('measures container fallbacks and absence of horizontal overflow at desktop and mobile browser widths', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'schedule-layout-browser-'))
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe cleanup path')
  const source = `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {ScheduleElementRenderer} from '/src/features/websiteRenderer/ScheduleElementRenderer.tsx';
    const activity={id:'a',title:'A'.repeat(250),startTime:'10:00',endTime:'11:00',description:'Line one\\n'+'B'.repeat(400),location:'C'.repeat(250),mapUrl:'https://maps.apple.com/',imageMediaId:null,visible:true};
    const element={id:'schedule',type:'schedule',editorName:'Schedule',days:[{id:'day',date:null,title:null,visible:true,activities:[activity,{...activity,id:'b',title:'Second'}]}]};
    const configurations=[{layout:'timeline',timeline:{arrangement:'left',marker:'dot'}},{layout:'timeline',timeline:{arrangement:'alternating',marker:'number'}},{layout:'timeline',timeline:{arrangement:'alternating',marker:'minimal'}},{layout:'list',list:{timePosition:'left'}},{layout:'list',list:{timePosition:'above'}},{layout:'cards',cards:{columns:'single',padding:'xl'}},{layout:'cards',cards:{columns:'grid',padding:'xl',gap:'xl'}},{layout:'cards',cards:{columns:'grid',padding:'none',gap:'none'}}];
    const widths=[180,320,480,800];
    const root=createRoot(document.getElementById('root'));
    root.render(React.createElement('div',null,configurations.flatMap((appearance,ci)=>widths.map(width=>React.createElement('div',{key:ci+'-'+width,'data-case':ci,'data-width':width,style:{width:width+'px',maxWidth:'100%',marginBottom:'16px'}},React.createElement(ScheduleElementRenderer,{element:{...element,days:[element.days[0],{...element.days[0],id:'day2'}],appearance:{...appearance,contentWidth:'medium',contentAlignment:'center',dayGap:'l',timeFormat:'24-hour',typography:{activityTitle:{fontSize:'l',fontWeight:400,lineHeight:'relaxed',letterSpacing:'wide',alignment:'center'},activityTime:{fontSize:'l'}}}},mode:'public',templateKey:'classic-filipiniana-v1'}))))));
    const check=(condition,message)=>{if(!condition)throw Error(message)};
    setTimeout(()=>{try{
      const cases=[...document.querySelectorAll('[data-case]')];check(cases.length===32,'Cases missing');
      for(const container of cases){const layout=container.querySelector('[data-schedule-block]');const width=layout.getBoundingClientRect().width;const ci=Number(container.dataset.case);
        check(container.scrollWidth<=container.clientWidth+1,'Container overflow '+ci+' at '+width);
        check(width<=768,'Maximum width ignored '+width);
        check(getComputedStyle(layout.querySelector('.schedule-title')).fontSize==='24px','Typography missing');
        check(getComputedStyle(layout.querySelectorAll('.schedule-day')[1]).marginTop==='24px','Day gap missing');
        check(layout.querySelector('time').textContent==='10:00','Time format missing');
        for(const node of layout.querySelectorAll('li,.schedule-activity-body,.schedule-copy')){check(node.scrollWidth<=node.clientWidth+1,'Content overflow '+ci+' at '+width);}
        const rows=layout.querySelectorAll('.schedule-activity');const body=rows[0].querySelector('.schedule-activity-body');
        if(ci===3){const columns=getComputedStyle(body).gridTemplateColumns.split(' ').length;check(columns===(width>=448?2:1),'List column fallback '+width);}
        if(ci===4)check(getComputedStyle(body).gridTemplateColumns.split(' ').length===1,'Above time not stacked');
        if(ci===1||ci===2){const left=body.getBoundingClientRect().left;const right=rows[1].querySelector('.schedule-activity-body').getBoundingClientRect().left;check(width>=640?right>left+10:Math.abs(right-left)<1,'Alternating fallback '+width);}
        if(ci===7)check(getComputedStyle(rows[0]).paddingTop==='0px','None padding not zero');
        if(ci===5)check(getComputedStyle(layout.querySelector('ol')).gridTemplateColumns.split(' ').length===1,'Single Cards became grid');
        if(ci===6){const columns=getComputedStyle(layout.querySelector('ol')).gridTemplateColumns.split(' ').length;check(width<512?columns===1:columns>1,'Cards grid fallback '+width);}
      }document.title='PASS';root.unmount();
    }catch(error){document.title='FAIL '+error.message}},600);
  `
  const server = await createServer({ configFile: false, cacheDir: join(directory, 'cache'), optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'zod'] }, server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'schedule-layout-test', resolveId(id) { if (id === 'virtual:schedule-layout-test') return '\0schedule-layout-test' }, load(id) { if (id === '\0schedule-layout-test') return source }, configureServer(vite) { vite.middlewares.use('/schedule-test', async (_request, response) => { response.setHeader('Content-Type', 'text/html');response.end(await vite.transformIndexHtml('/schedule-test', '<html><head><title>WAIT</title><style>body{margin:0}#root{max-width:100%}</style></head><body><div id="root"></div><script type="module" src="/@id/virtual:schedule-layout-test"></script></body></html>')) }) } }] })
  try {
    await server.listen()
    for (const width of [1440, 390]) {
      const { stdout } = await promisify(execFile)(chrome!, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(directory, `profile-${width}`)}`, `--window-size=${width},1000`, '--virtual-time-budget=10000', '--dump-dom', `${server.resolvedUrls!.local[0]}schedule-test`], { timeout: 60000, maxBuffer: 3000000 })
      expect(stdout.match(/<title>(.*?)<\/title>/)?.[1], stdout.slice(-2000)).toBe('PASS')
    }
  } finally { await server.close(); rmSync(directory, { recursive: true, force: true }) }
}, 120000)
