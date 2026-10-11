import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { createServer } from 'vite'
import { expect, it } from 'vitest'

const chrome = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((path): path is string => Boolean(path && existsSync(path)))

it.skipIf(!chrome)('measures real Hero flow geometry and authors valid isolated inspector state', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'hero-distribution-'))
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe cleanup path')
  const source = `
    import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
    import '/src/index.css';
    import {HeroSectionRenderer} from '/src/features/websiteRenderer/HeroSectionRenderer.tsx';
    import {WebsiteRenderer} from '/src/features/websiteRenderer/WebsiteRenderer.tsx';
    import {heroUsableMinimumHeight} from '/src/features/websiteRenderer/rootFlowDistribution.ts';
    import {AppearancePanel} from '/src/features/websiteEditor/components/AppearancePanel.tsx';
    import {mergeScopedSectionAppearance,resolveSectionAppearance} from '/src/features/websiteEditor/sectionAppearance.ts';
    import {normalizeWebsiteDraftFromApi} from '/src/features/websiteEditor/schemas.ts';
    import {createCustomSectionPresentation} from '/src/features/websiteEditor/compositionLifecycle.ts';
    import fixture from '/src/features/publicEventSite/fixtures/published-public-site.json';
    const base={headingAlignment:'inherit',bodyAlignment:'inherit',backgroundTreatment:'inherit',emphasis:'inherit'};
    const library={colors:[],fontFamilies:[],palettePresets:[],typographyPresets:[]};
    const text=(id,long=false)=>({id,type:'text',editorName:id,document:{type:'doc',children:Array.from({length:long?40:1},()=>({type:'paragraph',children:[{text:'Content'}]}))}});
    const group=(id,long=false)=>({id,type:'compositionGroup',editorName:id,children:[text(id+'-text',long)],layout:{padding:{top:'m',bottom:'s'},width:'narrow'},appearance:{outerSpacing:{top:'s',bottom:'m'}}});
    const cases=[];
    for(const template of ['classic-filipiniana-v1','modern-editorial-v1'])for(const width of [320,768,1280])for(const mode of ['editor','public'])for(const kind of ['two','single-top','single-center','single-bottom','empty','overfull','automatic','packed','implicit']){
      const top=group('top',kind==='overfull'),bottom=group('bottom');
      const elements=kind==='empty'?[]:kind.startsWith('single')?[top]:[top,bottom];
      elements.splice(1,0,{...group('hidden'),isHidden:true},{...group('empty-group'),children:[]},{...text('empty-text'),document:{type:'doc',children:[{type:'paragraph',children:[{text:''}]}]}});
      const composition={childFlow:{elements,order:elements.map(({id})=>({kind:'element',id}))}};
      const position=kind==='single-top'?'top-end':kind==='single-bottom'?'bottom-end':'center-end';
      const appearance={...base,contentPosition:position,innerSpacing:{top:'xl',bottom:'l',left:'s',right:'m'},...(kind==='automatic'?{}:{height:{unit:'svh',value:100}}),...(kind==='implicit'?{}:{rootVerticalDistribution:kind==='packed'?'packed':'space-between'})};
      cases.push(React.createElement('div',{key:template+width+mode+kind,'data-case':kind,'data-width':width,'data-mode':mode,'data-template':template,style:{width,marginBottom:20}},React.createElement(HeroSectionRenderer,{section:{id:'hero',type:'hero',appearance},composition,mode,viewport:width>=1280?'desktop':width>=768?'tablet':'mobile',templateKey:template,library,projectColors:[],media:{},eventDate:null})));
    }
    const spacingCases=[['omitted',undefined],['empty',{}],['none',{top:'none',bottom:'none'}],['none-top',{top:'none',bottom:'l'}],['none-bottom',{top:'xl',bottom:'none'}],['nonzero',{top:'xl',bottom:'l'}],['overfull',{top:'none',bottom:'none'}]];
    for(const template of ['classic-filipiniana-v1','modern-editorial-v1'])for(const width of [320,768,1280])for(const mode of ['editor','public'])for(const path of ['hero','website'])for(const [kind,spacing] of spacingCases){
      const top=group('top'),bottom=group('bottom');
      top.children=[{id:'countdown',type:'countdown',editorName:'Countdown',target:{source:'custom',instant:'2099-01-02T12:00:00Z'},appearance:{numbers:{fontSize:'xl'}}},{id:'date',type:'date',editorName:'Date'}];
      bottom.children=[{...text('names',kind==='overfull'),document:{type:'doc',children:Array.from({length:kind==='overfull'?100:1},()=>({type:'paragraph',children:[{text:'Alexandra & Christopher'}]}))}}, {...text('venue'),document:{type:'doc',children:[{type:'paragraph',children:[{text:'Garden Venue'}]}]}}];
      const composition={childFlow:{elements:[top,bottom],order:[{kind:'element',id:'top'},{kind:'element',id:'bottom'}]}};
      const appearance={...base,contentPosition:'center',height:{unit:'svh',value:100},rootVerticalDistribution:'space-between',...(spacing===undefined?{}:{innerSpacing:spacing})};
      const viewport=width>=1280?'desktop':width>=768?'tablet':'mobile';
      const section={...fixture.data.website.sections[0],content:{semantic:{},compositions:{shared:composition}},appearance:{shared:appearance}};
      const website={...fixture.data.website,templateKey:template,media:{},sections:[section]};
      const rendered=path==='website'?React.createElement(WebsiteRenderer,{website,event:fixture.data.event,mode,targetViewport:viewport}):React.createElement(HeroSectionRenderer,{section:{...section,appearance},composition,mode,viewport,templateKey:template,library,projectColors:[],media:{},eventDate:fixture.data.event.eventDate});
      cases.push(React.createElement('div',{key:template+width+mode+path+kind,'data-zero-case':kind,'data-width':width,'data-mode':mode,'data-template':template,'data-path':path,'data-minimum':heroUsableMinimumHeight(appearance.height,spacing??{}),style:{width,marginBottom:20}},rendered));
    }
    function Inspector(){
      const [owner,setOwner]=useState({shared:base,custom:{mobile:{...base,contentPosition:'bottom-center'}}});
      const capability={id:'hero',appearanceControls:[],defaultPresentation:null,presentations:[],contextDefaults:{typography:[],colors:[]},allowedElementTypes:[],decorativeAppearance:{textures:[],patterns:[],overlays:[],frames:[],backgroundColorIds:[],frameColorIds:[]}};
      return React.createElement('div',{'data-inspector':true},React.createElement(AppearancePanel,{appearance:resolveSectionAppearance(owner,'mobile').appearance,targetViewport:'desktop',templateKey:'classic-filipiniana-v1',sectionCapability:capability,error:null,library,projectColors:[],onAddColor:async()=>{},onChange:value=>{
        const updated=mergeScopedSectionAppearance(owner,{kind:'custom',viewport:'mobile'},value);setOwner(updated);
        const input=structuredClone(fixture.data.website);input.sections[0].appearance=updated;
        input.sections[0].content=createCustomSectionPresentation(input.sections[0].content,{shared:base},'mobile').content;
        normalizeWebsiteDraftFromApi({...input,media:{},draftRevision:'00000000000000000000000000',eventId:fixture.data.event.id,name:'Website'});
        window.authored=updated;
      }}));
    }
    createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,...cases,React.createElement(Inspector)));
    const check=(value,message)=>{if(!value)throw Error(message)};const near=(a,b)=>Math.abs(a-b)<1;
    setTimeout(()=>{try{
      for(const host of document.querySelectorAll('[data-zero-case]')){
        const label=[host.dataset.zeroCase,host.dataset.template,host.dataset.width,host.dataset.mode,host.dataset.path].join('/');
        const shell=host.querySelector('[data-hero-shell]'),foreground=host.querySelector('[data-hero-foreground]'),cluster=host.querySelector('[data-hero-content-cluster]'),flow=cluster.querySelector('[data-section-root-flow]');
        check(CSS.supports('min-height',host.dataset.minimum),'Rejected CSS '+label);
        check(cluster.style.minHeight!==''&&getComputedStyle(cluster).minHeight!=='auto','Discarded minimum '+label);
        const f=foreground.getBoundingClientRect(),c=cluster.getBoundingClientRect(),r=flow.getBoundingClientRect(),s=shell.getBoundingClientRect(),style=getComputedStyle(foreground);
        const paddingTop=parseFloat(style.paddingTop),paddingBottom=parseFloat(style.paddingBottom),usable=innerHeight-paddingTop-paddingBottom;
        check(flow.children.length===2,'Root count '+label);
        const first=flow.firstElementChild,last=flow.lastElementChild,a=first.getBoundingClientRect(),b=last.getBoundingClientRect();
        check(first.hasAttribute('data-block-outer-spacing')&&last.hasAttribute('data-block-outer-spacing'),'Root spacing wrappers '+label);
        check(near(c.height,r.height)&&r.height>=usable-1,'Usable flow height '+label);
        check(near(c.top,f.top+paddingTop)&&near(c.bottom,f.bottom-paddingBottom),'Cluster boundaries '+label);
        check(near(a.top,r.top)&&near(b.bottom,r.bottom),'Root anchors '+label);
        check(b.top>=a.bottom-1,'Root overlap '+label);
        check(host.querySelector('[data-website-element="countdown"]')&&host.querySelector('[data-section-child-element="date"]'),'Representative content '+label);
        for(const node of [cluster,flow,first,last])check(!['absolute','fixed'].includes(getComputedStyle(node).position),'Normal flow '+label);
        if(host.dataset.zeroCase==='overfull')check(s.height>innerHeight&&near(b.top,a.bottom),'Overfull growth '+label);
        else check(near(s.height,innerHeight)&&near(r.height,usable),'Viewport minimum '+label);
        check(host.scrollWidth<=host.clientWidth+1,'Horizontal overflow '+label);
      }
      for(const host of document.querySelectorAll('[data-case]')){
        const kind=host.dataset.case,foreground=host.querySelector('[data-hero-foreground]'),shell=host.querySelector('[data-hero-shell]'),flow=host.querySelector('[data-section-root-flow]');
        const f=foreground.getBoundingClientRect(),s=shell.getBoundingClientRect();
        if(kind==='packed'||kind==='implicit')continue;
        const roots=[...flow.children];
        check(roots.length===(kind==='empty'?0:kind.startsWith('single')?1:2),'Root filtering '+kind);
        check(getComputedStyle(foreground).boxSizing==='border-box','Foreground box sizing');
        check(near(parseFloat(getComputedStyle(foreground).paddingTop),32),'Top authored padding');
        if(kind==='empty'){check(near(s.height,innerHeight),'Empty minimum');continue;}
        const a=roots[0].getBoundingClientRect(),b=roots.at(-1).getBoundingClientRect();
        check(near(parseFloat(getComputedStyle(roots[0]).paddingTop),8),'Outer padding top');
        check(near(parseFloat(getComputedStyle(roots[0]).paddingBottom),16),'Outer padding bottom');
        check(near(roots[0].querySelector('[data-website-element="group"]').getBoundingClientRect().right,f.right-16),'Horizontal end placement');
        if(kind.startsWith('single')){
          const expected=kind==='single-top'?f.top+32:kind==='single-bottom'?f.bottom-24-a.height:f.top+32+(f.height-56-a.height)/2;
          check(near(a.top,expected),'Single vertical '+kind);
        }else{
          check(near(a.top,f.top+32),'Top anchor '+kind);check(near(b.bottom,f.bottom-24),'Bottom anchor '+kind);
          check(b.top>=a.bottom-1,'Overlapping roots '+kind);
          if(kind==='overfull')check(s.height>innerHeight&&near(b.top,a.bottom),'Natural growth');
          if(kind==='two')check(near(s.height,innerHeight),'Minimum height padding doubled');
          if(kind==='automatic')check(s.height<innerHeight,'Automatic authored height');
        }
        check(host.scrollWidth<=host.clientWidth+1,'Horizontal overflow');
      }
      for(const host of document.querySelectorAll('[data-case="packed"]')){
        const other=[...document.querySelectorAll('[data-case="implicit"]')].find(item=>item.dataset.width===host.dataset.width&&item.dataset.mode===host.dataset.mode&&item.dataset.template===host.dataset.template);
        const rects=target=>{const f=target.querySelector('[data-hero-foreground]').getBoundingClientRect();return [...target.querySelector('[data-section-root-flow]').children].map(node=>{const r=node.getBoundingClientRect();return [r.top-f.top,r.height]})};
        check(JSON.stringify(rects(host))===JSON.stringify(rects(other)),'Packed changed');
      }
      const control=document.querySelector('[aria-label="Hero vertical distribution"]');control.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
      setTimeout(()=>{try{check(window.authored?.custom.mobile.rootVerticalDistribution==='space-between','Inspector did not author');check(!window.authored.shared.rootVerticalDistribution,'Shared changed');check(window.authored.custom.mobile.contentPosition==='bottom-center','Position lost');check(document.querySelector('[data-inspector] [aria-label="Horizontal alignment"]'),'Conflicting position control');document.title='PASS';}catch(error){document.title='FAIL '+error.message}},200);
    }catch(error){document.title='FAIL '+error.message}},1200);
  `
  const server = await createServer({ cacheDir: join(directory, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'hero-distribution-test', resolveId(id) { if (id === 'virtual:hero-distribution-test') return '\0hero-distribution-test' }, load(id) { if (id === '\0hero-distribution-test') return source }, configureServer(vite) { vite.middlewares.use('/hero-distribution-test', async (_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end(await vite.transformIndexHtml('/hero-distribution-test', '<html><head><title>WAIT</title></head><body><div id="root"></div><script type="module" src="/@id/virtual:hero-distribution-test"></script></body></html>')) }) } }] })
  try {
    await server.listen()
    for (const height of [600, 1000]) {
      const { stdout } = await promisify(execFile)(chrome!, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(directory, `profile-${height}`)}`, `--window-size=1400,${height}`, '--virtual-time-budget=15000', '--dump-dom', `${server.resolvedUrls!.local[0]}hero-distribution-test`], { timeout: 60000, maxBuffer: 15000000 })
      expect(stdout.match(/<title>(.*?)<\/title>/)?.[1], stdout.slice(-1500)).toBe('PASS')
    }
  } finally { await server.close(); rmSync(directory, { recursive: true, force: true }) }
}, 120000)
