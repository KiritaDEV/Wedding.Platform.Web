import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createServer } from 'vite';
import { expect, it } from 'vitest';

const chrome = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((path): path is string => Boolean(path && existsSync(path)));

it.skipIf(!chrome)('wraps intact Swatches in Chrome across owners, templates, Groups and Hero distribution; preserves invalid inspector input', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'swatches-browser-'));
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw Error('Unsafe cleanup path');
  const source = `
import '/src/index.css';
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {WebsiteRenderer} from '/src/features/websiteRenderer/WebsiteRenderer.tsx';
import {SwatchesElementRenderer} from '/src/features/websiteRenderer/SwatchesElementRenderer.tsx';
import {SwatchesElementEditor} from '/src/features/websiteEditor/components/SwatchesElementEditor.tsx';
import {createSwatchesElement} from '/src/features/websiteElements/swatches.ts';
import {createCustomSectionPresentation} from '/src/features/websiteEditor/compositionLifecycle.ts';
import {normalizePublicRenderableWebsiteFromApi} from '/src/features/websiteEditor/schemas.ts';
import {decodePublishedWebsiteSnapshot} from '/src/features/websitePublishing/snapshot.ts';
import fixture from '/src/features/publicEventSite/fixtures/published-public-site.json';
window.addEventListener('error',event=>document.title='FAIL '+event.message);
const check=(ok,message)=>{if(!ok)throw Error(message)};
const group=(id,children,layout={})=>({id,type:'compositionGroup',editorName:'Group',children,layout:{width:'full',...layout}});
const cases=[];
for(const template of ['classic-filipiniana-v1','modern-editorial-v1'])for(const width of [320,768,1280])for(const count of [1,3,12])for(const shape of ['circle','roundedSquare','square','rectangle'])for(const size of ['small','medium','large','xl','2xl','3xl'])for(const placement of ['root','group','nested','narrow']){
 const index=cases.length;const mode=Math.floor((index+Math.floor(index/4))/2)%2?'editor':'public';const owner=(index+Math.floor(index/4))%2?'custom':'shared';const rotation=Math.floor(index/4)+Math.floor(index/48);const viewport=width===1280?'desktop':width===768?'tablet':'mobile';
 const palette={id:'palette',type:'swatches',editorName:'Swatches',items:Array.from({length:count},(_,i)=>({id:'item-'+i,color:['#FFFFFF','#000000','#D1D5DB'][i%3],label:i%2?'LongUnbrokenLabel'.repeat(5).slice(0,80):'A long readable color label that wraps into several lines'})),appearance:{shape,size,surfaceStyle:[undefined,'flat','raised','inset'][rotation%4],cornerRadius:[undefined,'none','small','medium','large','full'][rotation%6],gap:['none','xs','s','m','l','xl'][rotation%6],alignment:['start','center','end'][Math.floor(index/12)%3],captionStyle:[undefined,'plain','soft'][rotation%3],captionTextColor:'#123456',captionBackgroundColor:'#FEDCBA',showLabels:rotation%4<2,showHex:rotation%4%2===0,captionTypography:{fontFamilyId:'times-new-roman',fontSize:'m'},outerSpacing:{top:'s',left:placement==='narrow'?'xs':'s',right:placement==='narrow'?'xs':'s'}}};
 const top=placement==='root'?palette:placement==='group'?group('g',[palette],{padding:{left:'m',right:'m'}}):group('g',[group('g2',[palette],{padding:{left:placement==='narrow'?'xs':'s',right:placement==='narrow'?'xs':'s'}})],placement==='narrow'?{direction:'horizontal',division:'50-50',gap:'s'}:{});
 const second={id:'tail',type:'text',editorName:'Tail',document:{type:'doc',children:[{type:'paragraph',children:[{text:'After the palette'}]}]}};
 const composition={childFlow:{elements:[top,second],order:[{kind:'element',id:top.id},{kind:'element',id:'tail'}]}};
 const appearance={headingAlignment:'inherit',bodyAlignment:'inherit',backgroundTreatment:'inherit',emphasis:'inherit',contentPosition:'center',height:{unit:'svh',value:100},rootVerticalDistribution:'space-between'};
 const website=structuredClone(fixture.data.website);website.templateKey=template;website.template.key=template;website.media={};const section=website.sections[0];website.sections=[section];section.content={semantic:{},compositions:{shared:composition}};section.appearance={shared:appearance};
 if(owner==='custom'){const next=createCustomSectionPresentation(section.content,section.appearance,viewport);section.content=next.content;section.appearance=next.appearance;section.content.compositions.shared.childFlow={elements:[],order:[]};}
 const {media,...snapshotWebsite}=JSON.parse(JSON.stringify(website));const snapshot=decodePublishedWebsiteSnapshot(JSON.stringify({project:{id:website.id,eventId:fixture.data.event.id,name:'Palette'},event:{...fixture.data.event,startsAtUtc:null},website:snapshotWebsite,mediaAssetIds:[],sharedContentDefinitions:[]}));
 const published=normalizePublicRenderableWebsiteFromApi({...snapshot.website,media:{}});
 cases.push(React.createElement('div',{key:index,'data-case':true,'data-count':count,'data-shape':shape,'data-size':size,'data-surface':palette.appearance.surfaceStyle??'flat','data-radius':palette.appearance.cornerRadius??'none','data-caption-style':palette.appearance.captionStyle??'soft','data-placement':placement,'data-width':width,'data-owner':owner,'data-mode':mode,style:{width,marginBottom:16}},React.createElement(WebsiteRenderer,{website:published,event:snapshot.event,mode,targetViewport:viewport,audience:index%3===0?'private-site':index%3===1?'management-preview':'public-site'})));
}
flushSync(()=>createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,...cases)));
const exact=document.createElement('div');document.body.prepend(exact);const exactCases=[];
for(const shape of ['circle','square','rectangle','roundedSquare'])for(const [size,side] of Object.entries({small:32,medium:48,large:64,xl:96,'2xl':128,'3xl':160}))for(const radius of ['none','small','medium','large','full'])for(const surfaceStyle of ['flat','raised','inset'])exactCases.push(React.createElement('div',{key:exactCases.length,'data-exact':true,'data-surface':surfaceStyle,'data-shape':shape,'data-side':side,'data-radius':radius,style:{width:400}},React.createElement(SwatchesElementRenderer,{element:{...createSwatchesElement('Exact'),items:[{id:'exact',color:'#ABCDEF'}],appearance:{shape,size,cornerRadius:radius,surfaceStyle}}})));
flushSync(()=>createRoot(exact).render(React.createElement(React.Fragment,null,...exactCases)));
const boundary=document.createElement('div');boundary.style.width='24px';document.body.prepend(boundary);flushSync(()=>createRoot(boundary).render(React.createElement(SwatchesElementRenderer,{element:{...createSwatchesElement('Boundary'),items:[{id:'tiny',color:'#FFFFFF'}],appearance:{size:'large',shape:'rectangle'}}})));
const inspector=document.createElement('div');document.body.prepend(inspector);let persisted=createSwatchesElement('Inspector');let saves=0;const root=createRoot(inspector);
function draw(){flushSync(()=>root.render(React.createElement(React.Fragment,null,React.createElement(SwatchesElementEditor,{element:persisted,library:fixture.data.website.template.capabilities.designLibrary,onChange:value=>{persisted=value;saves++;draw();}}),React.createElement('div',{'data-surface-live-preview':true},React.createElement(SwatchesElementRenderer,{element:persisted})))));}
draw();
check(persisted.appearance.captionStyle==='plain'&&!inspector.querySelector('[aria-label="Caption background color hex value"]'),'New inspector default');
function input(label,value){const field=inspector.querySelector('[aria-label="'+label+'"]');check(field,'Missing field '+label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,value);flushSync(()=>field.dispatchEvent(new Event('input',{bubbles:true})));}
input('Color 1 hex value','#abcdef');check(persisted.items[0].color==='#ABCDEF','Valid color not normalized');const last=saves;
input('Color 1 hex value','#abc');check(saves===last&&persisted.items[0].color==='#ABCDEF','Invalid color leaked');input('Color 1 label','Slate');check(persisted.items[0].color==='#ABCDEF'&&persisted.items[0].label==='Slate','Other edit persisted invalid color');
const id=persisted.items[0].id;flushSync(()=>inspector.querySelector('[aria-label="Move color 1 down"]').click());check(persisted.items[1].id===id,'Accessible reorder failed');
flushSync(()=>[...inspector.querySelectorAll('button')].find(b=>b.textContent==='Add Color').click());check(persisted.items.length===4,'Add failed');
const remove=inspector.querySelector('[aria-label="Remove color 2"]');flushSync(()=>remove.click());check(persisted.items.length===3&&!persisted.items.some(item=>item.id===id),'Remove failed');
// Exercise limits through the real inspector.
while(persisted.items.length<12)flushSync(()=>[...inspector.querySelectorAll('button')].find(b=>b.textContent==='Add Color').click());check([...inspector.querySelectorAll('button')].find(b=>b.textContent==='Add Color').disabled,'Maximum not enforced');
persisted={...persisted,items:[persisted.items[0]]};draw();const disclosure=inspector.querySelector('[aria-expanded]');if(disclosure.getAttribute('aria-expanded')==='false')flushSync(()=>disclosure.click());check(inspector.querySelector('[aria-label="Remove color 1"]').disabled,'Last item removal enabled');
function choose(label,value){flushSync(()=>inspector.querySelector('[aria-label="'+label+'"]').click());const option=[...inspector.querySelectorAll('[role="option"]')].find(node=>node.textContent===value);check(option,'Missing option '+value);flushSync(()=>option.click());}
input('Caption text color hex value','#aabbcc');check(persisted.appearance.captionTextColor==='#AABBCC','Caption color normalization');const colorSaves=saves;input('Caption text color hex value','#abc');check(saves===colorSaves,'Invalid caption text persisted');
choose('Caption style','Soft');input('Caption background color hex value','#ddeeff');check(persisted.appearance.captionBackgroundColor==='#DDEEFF','Background normalization');const bgSaves=saves;input('Caption background color hex value','red');check(saves===bgSaves,'Invalid background persisted');choose('Caption style','Plain');check(persisted.appearance.captionBackgroundColor==='#DDEEFF'&&!inspector.querySelector('[aria-label="Caption background color hex value"]'),'Plain did not preserve/ignore background');
persisted={...persisted,appearance:{...persisted.appearance,shape:'roundedSquare'}};draw();check(inspector.querySelector('[aria-label="Swatches shape"]').textContent.includes('Square')&&inspector.querySelector('[aria-label="Swatches corner radius"]').textContent.includes('Small'),'Legacy inspector resolution');
choose('Swatches size','XL');check(persisted.appearance.shape==='roundedSquare'&&!Object.hasOwn(persisted.appearance,'cornerRadius'),'Unrelated size edit converted legacy');
choose('Swatches corner radius','Large');check(persisted.appearance.shape==='square'&&persisted.appearance.cornerRadius==='large','Explicit radius did not canonicalize');choose('Swatches shape','Circle');check(inspector.querySelector('[aria-label="Swatches corner radius"]').disabled&&persisted.appearance.cornerRadius==='large','Circle radius retention');choose('Swatches shape','Square');check(persisted.appearance.cornerRadius==='large','Square radius lost');
persisted={...persisted,appearance:{...persisted.appearance,shape:'roundedSquare'}};draw();choose('Swatches shape','Rectangle');check(persisted.appearance.shape==='rectangle'&&persisted.appearance.cornerRadius==='small','Explicit legacy shape conversion');
check(inspector.querySelector('[aria-label="Swatches surface style"]').textContent.includes('Flat'),'Missing surface default');
for(const value of ['Flat','Raised','Inset']){choose('Swatches surface style',value);check(persisted.appearance.surfaceStyle===value.toLowerCase(),'Surface selection not saved');const shadow=getComputedStyle(inspector.querySelector('[data-surface-live-preview] [data-swatch-shape]')).boxShadow;check((shadow.match(/inset/g)||[]).length===(value==='Flat'?1:3),'Canvas surface did not update');}const surfaceBefore=persisted.appearance.surfaceStyle;choose('Swatches size','XL');check(persisted.appearance.surfaceStyle===surfaceBefore,'Size reset surface');
for(const value of ['None','Small','Medium','Large','Full'])choose('Swatches corner radius',value);
for(const value of ['Small','Medium','Large','XL','2XL','3XL'])choose('Swatches size',value);
for(const value of ['Rectangle','Circle','Square'])choose('Swatches shape',value);check(persisted.appearance.shape==='square','Shape switching');
setTimeout(()=>{try{
 let count=0,wrapped=0;
 for(const host of document.querySelectorAll('[data-case]')){
  const name=[host.dataset.width,host.dataset.count,host.dataset.shape,host.dataset.size,host.dataset.placement,host.dataset.owner,host.dataset.mode].join('/');
  const list=host.querySelector('[data-website-element="swatches"]');check(list,'Missing palette '+name);const box=list.getBoundingClientRect();const items=[...list.querySelectorAll('[data-swatch-item]')];check(items.length===Number(host.dataset.count),'Count '+name);
  check(list.scrollWidth<=list.clientWidth+1,'Horizontal scroll '+name+' '+JSON.stringify({width:box.width,scroll:list.scrollWidth,client:list.clientWidth,item:items[0].getBoundingClientRect().width,caption:items[0].querySelector('[data-swatch-caption]')?.getBoundingClientRect().width,styles:[...list.querySelectorAll('[data-swatch-caption]')].map(c=>({white:getComputedStyle(c).whiteSpace,wrap:getComputedStyle(c).overflowWrap,spanwhite:getComputedStyle(c.firstElementChild).whiteSpace,spanwrap:getComputedStyle(c.firstElementChild).overflowWrap,text:c.textContent}))}));
  const rects=items.map(item=>item.getBoundingClientRect());if(rects.some(r=>r.top>rects[0].top+1)){wrapped++;check(box.height>rects[0].height,'No natural height growth '+name);}
  for(const item of items){const r=item.getBoundingClientRect(),shape=item.querySelector('[data-swatch-shape]'),s=shape.getBoundingClientRect(),caption=item.querySelector('[data-swatch-caption]'),c=caption?.getBoundingClientRect();
   check(Math.abs(s.width-s.height*(host.dataset.shape==='rectangle'?2:1))<1&&s.width>0,'Shape geometry '+name);check(s.width<=({small:32,medium:48,large:64,xl:96,'2xl':128,'3xl':160}[host.dataset.size])*(host.dataset.shape==='rectangle'?2:1)+1,'Size '+name);if(host.dataset.placement==='root')check(Math.abs(s.width-Math.min(box.width,({small:32,medium:48,large:64,xl:96,'2xl':128,'3xl':160}[host.dataset.size])*(host.dataset.shape==='rectangle'?2:1)))<1,'Preset dimensions '+name);
   check(r.left>=box.left-1&&r.right<=box.right+1&&r.bottom<=box.bottom+1,'Item escaped '+name);if(c)check(c.left>=r.left-1&&c.right<=r.right+1,'Caption escaped '+name);
   if(caption){const css=getComputedStyle(caption);check(css.color==='rgb(18, 52, 86)','Caption text color '+name);check(css.backgroundColor===(host.dataset.captionStyle==='plain'?'rgba(0, 0, 0, 0)':'rgb(254, 220, 186)'),'Caption surface '+name);}
   check(getComputedStyle(shape).borderRadius===(host.dataset.shape==='circle'?'50%':host.dataset.shape==='roundedSquare'?'8px':({none:'0px',small:'8px',medium:'16px',large:'24px',full:'9999px'}[host.dataset.radius])),'Shape radius '+name);
   const shadow=getComputedStyle(shape).boxShadow;check(shadow.includes('inset'),'Missing surface boundary');check((shadow.match(/inset/g)||[]).length===(host.dataset.surface==='flat'?1:3),'Wrong surface layers '+name);check(getComputedStyle(shape).backgroundImage==='none','Fill replaced by gradient');
   check(getComputedStyle(shape).backgroundColor==='rgb(255, 255, 255)'||getComputedStyle(shape).backgroundColor==='rgb(0, 0, 0)'||getComputedStyle(shape).backgroundColor==='rgb(209, 213, 219)','Fill altered '+name);
   for(const span of caption?.children??[]){const text=span.firstChild;if(!text)continue;for(let i=0;i<text.length;i++){const range=document.createRange();range.setStart(text,i);range.setEnd(text,i+1);const t=range.getBoundingClientRect();check(t.left>=c.left-1&&t.right<=c.right+1,'Text clipped '+name);}}
  }
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];check(a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1,'Overlapping items '+name);}
  const container=list.closest('[data-website-element="group"]');if(container){const g=container.getBoundingClientRect();check(box.left>=g.left-1&&box.right<=g.right+1,'Group escape '+name);}
  const hero=host.querySelector('[data-hero-shell]').getBoundingClientRect();check(box.left>=hero.left-1&&box.right<=hero.right+1&&box.bottom<=hero.bottom+1,'Hero clipping '+name);const tail=host.querySelector('[data-section-child-element="tail"]');
  if(tail)check(tail.getBoundingClientRect().top>=box.bottom-1,'Space Between overlap '+name);
  check(!list.querySelector('button,input,a,[tabindex]'),'Interactive guest content '+name);count++;
 }
 for(const host of exact.querySelectorAll('[data-exact]')){const shape=host.querySelector('[data-swatch-shape]'),r=shape.getBoundingClientRect(),side=Number(host.dataset.side);check(Math.abs(r.width-side*(host.dataset.shape==='rectangle'?2:1))<1&&Math.abs(r.height-side)<1,'Exact size '+host.dataset.shape+'/'+side);check(getComputedStyle(shape).borderRadius===(host.dataset.shape==='circle'?'50%':host.dataset.shape==='roundedSquare'?'8px':({none:'0px',small:'8px',medium:'16px',large:'24px',full:'9999px'}[host.dataset.radius])),'Exact radius');check((getComputedStyle(shape).boxShadow.match(/inset/g)||[]).length===(host.dataset.surface==='flat'?1:3),'Exact surface');}
 const tiny=boundary.querySelector('[data-swatch-shape]').getBoundingClientRect();check(Math.abs(tiny.width-24)<1&&Math.abs(tiny.height-12)<1,'Narrow fallback distorted shape');check(wrapped>0,'Wrapping not exercised');document.title='PASS '+count;
}catch(error){document.title='FAIL '+error.message}},1000);
`;
  const server = await createServer({ cacheDir: join(directory, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'swatches-geometry', resolveId(id) { if (id === 'virtual:swatches-geometry') return '\0swatches-geometry'; }, load(id) { if (id === '\0swatches-geometry') return source; }, configureServer(vite) { vite.middlewares.use('/swatches-geometry', async (_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end(await vite.transformIndexHtml('/swatches-geometry', '<html><head><title>WAIT</title></head><body><div id="root"></div><script type="module" src="/@id/virtual:swatches-geometry"></script></body></html>')); }); } }] });
  try {
    await server.listen();
    const { stdout } = await promisify(execFile)(chrome!, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(directory, 'profile')}`, '--window-size=1400,800', '--virtual-time-budget=10000', '--dump-dom', `${server.resolvedUrls!.local[0]}swatches-geometry`], { timeout: 90000, maxBuffer: 90000000 });
    expect(stdout.match(/<title>(.*?)<\/title>/)?.[1], stdout.slice(0, 1000)).toBe('PASS 1728');
  } finally { await server.close(); rmSync(directory, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }); }
}, 120000);
