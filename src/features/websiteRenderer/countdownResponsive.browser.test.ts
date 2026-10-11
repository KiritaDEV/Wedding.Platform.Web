import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { createServer } from 'vite'
import { expect, it } from 'vitest'

const chrome = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((path): path is string => Boolean(path && existsSync(path)))

it.skipIf(!chrome)('keeps Countdown digits atomic and reflows complete units within saved Hero owners', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'countdown-responsive-'))
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe cleanup path')
  const source = `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import '/src/index.css';
    import {WebsiteRenderer} from '/src/features/websiteRenderer/WebsiteRenderer.tsx';
    import {decodePublishedWebsiteSnapshot} from '/src/features/websitePublishing/snapshot.ts';
    import {normalizePublicRenderableWebsiteFromApi} from '/src/features/websiteEditor/schemas.ts';
    import {createCustomSectionPresentation} from '/src/features/websiteEditor/compositionLifecycle.ts';
    import fixture from '/src/features/publicEventSite/fixtures/published-public-site.json';
    const now=Date.now();Date.now=()=>now;
    const text=(id,value)=>({id,type:'text',editorName:id,document:{type:'doc',children:[{type:'paragraph',children:[{text:value}]}]}});
    const group=(id,children,layout={})=>({id,type:'compositionGroup',editorName:id,children,layout:{width:'full',padding:{left:'s',right:'s',top:'s',bottom:'s'},...layout}});
    const cases=[];
    const scenarios=[
      {id:'default'}, {id:'vertical',direction:'vertical'},
      {id:'one',count:1}, {id:'two',count:2}, {id:'three',count:3},
      {id:'zero',days:0}, {id:'nine',days:9}, {id:'99',days:99}, {id:'100',days:100},
      {id:'9999',days:9999,size:'xl'}, {id:'large',days:100000,size:'xl'},
      {id:'spaced',label:'WWWWWWWW WWWWWWWW WWWWWWWW WWWWWWWW WWWW'},
      {id:'unbroken',label:'W'.repeat(40)},
      {id:'alternate',font:'courier-new'}, {id:'narrow',narrow:true},
      {id:'start',alignment:'start',gap:'xs'}, {id:'end',alignment:'end',gap:'s'},
      {id:'spacing',spacing:true},
      {id:'grid',grid:true}, {id:'extreme',days:100000,size:'7xl',narrow:true}
    ];
    for(const template of ['classic-filipiniana-v1','modern-editorial-v1'])for(const width of [320,390,768,1280])for(const mode of ['editor','public'])for(const owner of ['shared','custom'])for(const scenario of scenarios){
      // Numeric boundary cases run publicly: editor deliberately uses its frozen sample.
      if(scenario.days!==undefined&&mode==='editor')continue;
      const viewport=width>=1280?'desktop':width>=768?'tablet':'mobile';
      const countdown={id:'countdown',type:'countdown',editorName:'Countdown',target:{source:'custom',instant:new Date(now+(scenario.days??12)*86400000+8*3600000+34*60000+56000).toISOString().replace(/\\.\\d{3}Z$/,'Z'),timeZone:'UTC'},
        units:Object.fromEntries(['days','hours','minutes','seconds'].slice(scenario.count??4).map(unit=>[unit,false])),
        ...(scenario.label?{labels:{days:scenario.label,hours:scenario.label,minutes:scenario.label,seconds:scenario.label}}:{}),
        appearance:{...(scenario.direction?{direction:scenario.direction}:{}),...(scenario.alignment?{alignment:scenario.alignment}:{}),...(scenario.gap?{gap:scenario.gap}:{}),...(scenario.spacing?{outerSpacing:{top:'m',bottom:'s',left:'s',right:'s'}}:{}),...(scenario.size||scenario.font?{numbers:{...(scenario.size?{fontSize:scenario.size}:{}),...(scenario.font?{fontFamilyId:scenario.font}:{})}}:{})},
      };
      const inner=group('inner',[countdown,{id:'date',type:'date',editorName:'Date'}],scenario.narrow?{width:'narrow'}:{});
      const top=group('top',scenario.grid?[inner,text('sibling','Sibling')]:[inner],scenario.grid?{direction:'horizontal',division:'50-50',gap:'s'}:{});
      if(scenario.narrow)top.layout.width='narrow';
      const bottom=group('bottom',[text('names','Alexandra & Christopher'),text('venue','Garden Venue')]);
      const composition={childFlow:{elements:[top,bottom],order:[{kind:'element',id:'top'},{kind:'element',id:'bottom'}]}};
      const appearance={headingAlignment:'inherit',bodyAlignment:'inherit',backgroundTreatment:'inherit',emphasis:'inherit',contentPosition:'center',height:{unit:'svh',value:100},rootVerticalDistribution:'space-between'};
      const website=structuredClone(fixture.data.website);website.templateKey=template;website.template.key=template;website.media={};
      const section=website.sections[0];website.sections=[section];
      section.content={semantic:{},compositions:{shared:composition}};section.appearance={shared:appearance};
      if(owner==='custom'){
        // Each device owns a complete independent copy; Shared has intentionally different content.
        for(const device of ['desktop','tablet','mobile']){const custom=createCustomSectionPresentation(section.content,section.appearance,device);section.content=custom.content;section.appearance=custom.appearance;}
        section.content.compositions.shared={childFlow:{elements:[text('shared','Shared sentinel')],order:[{kind:'element',id:'shared'}]}};
      }
      // Round-trip persisted JSON and the existing published snapshot decoder before rendering.
      const saved=JSON.parse(JSON.stringify(website));
      const {media,...snapshotWebsite}=saved;
      const snapshot=decodePublishedWebsiteSnapshot(JSON.stringify({project:{id:saved.id,eventId:fixture.data.event.id,name:'Website'},event:{...fixture.data.event,startsAtUtc:null},website:snapshotWebsite,mediaAssetIds:[],sharedContentDefinitions:[]}));
      section.content.compositions.shared.childFlow.elements=[];
      if(snapshot.website.sections[0].content.compositions.shared.childFlow.elements.length===0)throw Error('Draft leaked into snapshot');
      const published=normalizePublicRenderableWebsiteFromApi({...snapshot.website,media:{}});
      cases.push(React.createElement('div',{key:template+width+mode+owner+scenario.id,'data-case':scenario.id,'data-width':width,'data-mode':mode,'data-owner':owner,'data-template':template,style:{width,marginBottom:20}},React.createElement(WebsiteRenderer,{website:published,event:snapshot.event,mode,targetViewport:viewport})));
    }
    createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,...cases));
    const near=(a,b)=>Math.abs(a-b)<1;
    const check=(ok,message)=>{if(!ok)throw Error(message)};
    const measure=()=>{
      let wrapped=0,extreme=0;
      for(const host of document.querySelectorAll('[data-case]')){
        const label=[host.dataset.case,host.dataset.width,host.dataset.mode,host.dataset.owner,host.dataset.template].join('/');
        const timer=host.querySelector('[role="timer"]');check(timer,'Missing selected owner '+label);
        check(timer.getAttribute('aria-live')==='off'&&timer.getAttribute('aria-label'),'Timer accessibility '+label);
        const units=[...timer.children],rects=units.map(node=>node.getBoundingClientRect());
        const expectedCount=host.dataset.case==='one'?1:host.dataset.case==='two'?2:host.dataset.case==='three'?3:4;
        check(units.length===expectedCount,'Enabled units '+label);
        for(const unit of units){
          check(unit.getAttribute('aria-hidden')==='true','Visual unit accessibility '+label);
          const number=unit.firstElementChild,text=number.firstChild;
          const digitRects=[...text.textContent].map((_,i)=>{const range=document.createRange();range.setStart(text,i);range.setEnd(text,i+1);return range.getBoundingClientRect()});
          check(digitRects.every(rect=>near(rect.top,digitRects[0].top)),'Split digits '+label+' '+text.textContent);
          check(getComputedStyle(number).whiteSpace==='nowrap','Atomic style '+label);
          if(host.dataset.case!=='extreme'){
            const box=unit.getBoundingClientRect();check(digitRects.every(r=>r.left>=box.left-1&&r.right<=box.right+1),'Digits escaped unit '+label);
            const labelSpan=unit.lastElementChild;check(labelSpan.getBoundingClientRect().width<=box.width+1,'Label escaped unit '+label);
            const labelText=labelSpan.firstChild,labelRects=[...labelText.textContent].map((_,i)=>{const range=document.createRange();range.setStart(labelText,i);range.setEnd(labelText,i+1);return range.getBoundingClientRect()});
            check(labelRects.every(r=>r.left>=box.left-1&&r.right<=box.right+1),'Label glyph overflow '+label);
            if(['spaced','unbroken'].includes(host.dataset.case)&&Number(host.dataset.width)<=390)check(labelRects.some(r=>r.top>labelRects[0].top+1),'Long label did not wrap '+label);
          }
        }
        for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
          const a=rects[i],b=rects[j];check(a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1,'Overlapping units '+label);
          check(b.top>=a.top-1&&(!near(a.top,b.top)||b.left>=a.right-1),'Visual order '+label);
        }
        const t=timer.getBoundingClientRect(),flow=host.querySelector('[data-hero-content-cluster] [data-section-root-flow]'),roots=[...flow.children];
        check(roots.length===2,'Selected root composition '+label);
        const a=roots[0].getBoundingClientRect(),b=roots[1].getBoundingClientRect(),f=flow.getBoundingClientRect();
        check(near(a.top,f.top)&&near(b.bottom,f.bottom)&&b.top>=a.bottom-1,'Hero anchors/growth '+label);
        check(t.bottom<=a.bottom+1,'Countdown outside root normal flow '+label);
        if(host.dataset.case==='extreme'){
          const number=units[0].firstElementChild.getBoundingClientRect();check(number.width>t.width,'Extreme boundary not exercised '+label);extreme++;continue;
        }
        check(timer.scrollWidth<=timer.clientWidth+1&&host.scrollWidth<=host.clientWidth+1,'Horizontal overflow '+label);
        if(host.dataset.case==='default'&&Number(host.dataset.width)<=390){check(rects.some(r=>r.top>rects[0].top+1),'Units did not wrap '+label);check(t.height>rects[0].height,'No natural height growth '+label);wrapped++;}
        if(host.dataset.case==='default'&&Number(host.dataset.width)>=768)check(rects.every(r=>near(r.top,rects[0].top)),'Fitting row changed '+label);
        if(host.dataset.case==='vertical')check(rects.every((r,i)=>i===0||r.top>=rects[i-1].bottom),'Vertical layout '+label);
        if(host.dataset.case==='start')check(near(rects[0].left,t.left),'Start alignment '+label);
        if(host.dataset.case==='end')check(near(rects.at(-1).right,t.right),'End alignment '+label);
      }
      check(wrapped>0&&extreme>0,'Missing boundary cases');
      return document.querySelectorAll('[data-case]').length;
    };
    setTimeout(async()=>{try{
      measure();await document.fonts.ready;
      // Explicit platform system fonts are deterministic and must be resolved before the second pass.
      await document.fonts.load('700 80px "Courier New"');await document.fonts.load('700 80px "Times New Roman"');
      document.title='PASS '+measure();
    }catch(error){document.title='FAIL '+error.message}},1800);
  `
  const server = await createServer({ cacheDir: join(directory, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'countdown-geometry', resolveId(id) { if (id === 'virtual:countdown-geometry') return '\0countdown-geometry' }, load(id) { if (id === '\0countdown-geometry') return source }, configureServer(vite) { vite.middlewares.use('/countdown-geometry', async (_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end(await vite.transformIndexHtml('/countdown-geometry', '<html><head><title>WAIT</title></head><body><div id="root"></div><script type="module" src="/@id/virtual:countdown-geometry"></script></body></html>')) }) } }] })
  try {
    await server.listen()
    const { stdout } = await promisify(execFile)(chrome!, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(directory, 'profile')}`, '--window-size=1400,800', '--virtual-time-budget=20000', '--dump-dom', `${server.resolvedUrls!.local[0]}countdown-geometry`], { timeout: 60000, maxBuffer: 20000000 })
    expect(stdout.match(/<title>(.*?)<\/title>/)?.[1], stdout.slice(-1500)).toBe('PASS 528')
  } finally { await server.close(); rmSync(directory, { recursive: true, force: true }) }
}, 120000)
