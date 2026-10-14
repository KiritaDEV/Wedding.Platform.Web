import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { createServer } from 'vite'
import { expect, it } from 'vitest'

const chrome = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((path): path is string => Boolean(path && existsSync(path)))

it.skipIf(!chrome)('validates Map shadow CSS, clipping, widths, alignment and legacy snapshots in Chrome', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'map-responsive-'))
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe cleanup path')
  const source = `
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import '/src/index.css';
import {WebsiteRenderer} from '/src/features/websiteRenderer/WebsiteRenderer.tsx';
import {decodePublishedWebsiteSnapshot} from '/src/features/websitePublishing/snapshot.ts';
import {normalizePublicRenderableWebsiteFromApi} from '/src/features/websiteEditor/schemas.ts';
import {createCustomSectionPresentation} from '/src/features/websiteEditor/compositionLifecycle.ts';
import {MapElementEditor} from '/src/features/websiteEditor/components/MapElementEditor.tsx';
import {parseGoogleMapsEmbed} from '/src/features/websiteElements/googleMaps.ts';
import fixture from '/src/features/publicEventSite/fixtures/published-public-site.json';
import {SURFACE_SHADOW_CSS} from '/src/features/websiteRenderer/surfaceEffects.ts';
import maps from '/src/features/websiteElements/fixtures/google-maps-contract.json';
const check=(ok,message)=>{if(!ok)throw Error(message)};
window.__mapScriptRan=false;
check(parseGoogleMapsEmbed(maps.iframe)===maps.url,'Share fixture parsing');
for(const url of maps.valid)check(parseGoogleMapsEmbed('<iframe src="'+url+'"></iframe>')===url,'Valid URL encoding');
for(const html of maps.badHtml)check(parseGoogleMapsEmbed(html)===null,'Unsafe HTML accepted '+html);
for(const url of maps.invalid)check(parseGoogleMapsEmbed('<iframe src="'+url+'"></iframe>')===null,'Unsafe URL accepted');
check(parseGoogleMapsEmbed('<iframe src="'+maps.url+'" onload="window.__mapScriptRan=true"></iframe>')===null&&!window.__mapScriptRan,'Script ran');
const group=(id,children,layout={})=>({id,type:'compositionGroup',editorName:id,children,layout:{width:'full',...layout}});
const cases=[];let selected=0;
for(const width of [320,768,1280])for(const preset of [undefined,'small','medium','large','full'])for(const alignment of ['start','center','end'])for(const placement of ['root','group','nested','narrow']){
 const audience=['editor','public-site','private-site','management-preview'][(cases.length+Math.floor(cases.length/4))%4];
 const mode=audience==='editor'?'editor':'public';
 const template=cases.length%2?'classic-filipiniana-v1':'modern-editorial-v1';
 const owner=Math.floor(cases.length/2)%2?'custom':'shared';
 const height=['small','medium','large'][Math.floor(cases.length/4)%3];
 const radius=['none','small','medium','large'][Math.floor(cases.length/12)%4];
 const shadow=[undefined,'none','soft','medium','strong'][Math.floor(cases.length/4)%5];
 const viewport=width===1280?'desktop':width===768?'tablet':'mobile';
 const map={id:'map',type:'map',editorName:'Google Maps',embedUrl:maps.url,appearance:{height,cornerRadius:radius,alignment,...(shadow?{shadow}:{}),...(preset?{width:preset}:{})}};
 const top=placement==='root'?map:placement==='group'?group('outer',[map]):group('outer',[group('inner',[map],placement==='narrow'?{width:'narrow',padding:{left:'s',right:'s'}}:{})],placement==='narrow'?{direction:'horizontal',division:'50-50',gap:'s'}:{});
 const composition={childFlow:{elements:[top],order:[{kind:'element',id:top.id}]}};
 const appearance={headingAlignment:'inherit',bodyAlignment:'inherit',backgroundTreatment:'inherit',emphasis:'inherit',contentPosition:'center',height:{unit:'svh',value:100}};
 const website=structuredClone(fixture.data.website);website.templateKey=template;website.template.key=template;website.media={};
 const section=website.sections[0];website.sections=[section];section.content={semantic:{},compositions:{shared:composition}};section.appearance={shared:appearance};
 if(owner==='custom')for(const device of ['desktop','tablet','mobile']){const next=createCustomSectionPresentation(section.content,section.appearance,device);section.content=next.content;section.appearance=next.appearance;}
 if(owner==='custom') section.content.compositions.shared.childFlow={elements:[],order:[]};
 const {media,...snapshotWebsite}=JSON.parse(JSON.stringify(website));
 const snapshot=decodePublishedWebsiteSnapshot(JSON.stringify({project:{id:website.id,eventId:fixture.data.event.id,name:'Website'},event:{...fixture.data.event,startsAtUtc:null},website:snapshotWebsite,mediaAssetIds:[],sharedContentDefinitions:[]}));
 section.content.compositions.shared.childFlow={elements:[],order:[]};
 const published=normalizePublicRenderableWebsiteFromApi({...snapshot.website,media:{}});
 cases.push(React.createElement('div',{key:cases.length,'data-map-case':true,'data-height':height,'data-mode':mode,'data-radius':radius,'data-width':width,'data-preset':preset??'missing','data-alignment':alignment,'data-shadow':shadow??'none',style:{width,marginBottom:12}},React.createElement(WebsiteRenderer,{website:published,event:snapshot.event,mode,audience,targetViewport:viewport,onElementSelect:()=>selected++})));
}
flushSync(()=>createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,...cases)));
// Inspector runs in a separate root so invalid input is tested through React's actual event handling.
const inspector=document.createElement('div');document.body.prepend(inspector);let persisted={id:'inspector-map',type:'map',editorName:'Map',embedUrl:maps.url};let saves=0;
const draw=()=>flushSync(()=>root.render(React.createElement(MapElementEditor,{element:persisted,onChange:(value)=>{persisted=value;saves++}})));const root=createRoot(inspector);draw();
function input(value){const area=inspector.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(area,value);flushSync(()=>area.dispatchEvent(new Event('input',{bubbles:true})));}
input(maps.iframe.replace(maps.url,maps.valid[1]));check(persisted.embedUrl===maps.valid[1]&&saves===1,'Valid inspector paste not saved');draw();
input('<script>window.__mapScriptRan=true</script>');check(saves===1&&persisted.embedUrl===maps.valid[1]&&!JSON.stringify(persisted).includes('<script>'),'Invalid draft persisted');check(inspector.querySelector('[role="alert"]'),'Missing invalid draft message');
const widthButton=inspector.querySelector('[aria-label="Map maximum width"]');check(widthButton&&widthButton.textContent.includes('Full'),'Missing width default inspector');
flushSync(()=>widthButton.click());const option=[...inspector.querySelectorAll('[role="option"]')].find(node=>node.textContent.includes('Small'));check(option,'Missing Small width option');flushSync(()=>option.click());
check(persisted.appearance.width==='small'&&persisted.embedUrl===maps.valid[1],'Width inspector failed or invalid draft leaked');
const shadowButton=inspector.querySelector('[aria-label="Map shadow"]');check(shadowButton&&shadowButton.textContent.includes('None'),'Legacy shadow default');
flushSync(()=>shadowButton.click());const subtle=[...inspector.querySelectorAll('[role="option"]')].find(node=>node.textContent==='Subtle');check(subtle,'Subtle option');flushSync(()=>subtle.click());check(persisted.appearance.shadow==='soft'&&persisted.embedUrl===maps.valid[1],'Shadow inspector persistence');
setTimeout(()=>{try{
 let count=0;
 for(const host of document.querySelectorAll('[data-map-case]')){
  const map=host.querySelector('[data-map-block]');check(map,'Missing map '+host.dataset.mode);const frame=map.querySelector('iframe');check(frame,'Missing iframe');
  const box=map.getBoundingClientRect(),f=frame.getBoundingClientRect();const expected={small:240,medium:360,large:480}[host.dataset.height];
  check(Math.abs(box.height-expected)<1&&Math.abs(f.height-expected)<1,'Height preset');check(Math.abs(box.width-f.width)<1&&f.width>0,'Frame width');
  check(map.scrollWidth<=map.clientWidth+1&&host.scrollWidth<=host.clientWidth+1,'Horizontal overflow');
  check(getComputedStyle(map).overflow==='hidden'&&getComputedStyle(map).borderRadius===({none:'0px',small:'8px',medium:'16px',large:'24px'}[host.dataset.radius]),'Radius/overflow');
  const reference=document.createElement('div');reference.style.boxShadow=SURFACE_SHADOW_CSS[host.dataset.shadow];reference.style.display='none';document.body.append(reference);
  check(getComputedStyle(map).boxShadow===getComputedStyle(reference).boxShadow,'Canonical shadow CSS');reference.remove();
  // Content overflow clipping does not clip the same element's own box decoration.
  // Check all intervening wrappers; Hero's intentional page-edge clip stays in place.
  for(let ancestor=map.parentElement;ancestor&&!ancestor.hasAttribute('data-hero-shell');ancestor=ancestor.parentElement){
    const style=getComputedStyle(ancestor);check(style.overflowX==='visible'&&style.overflowY==='visible'&&style.clipPath==='none'&&!['paint','strict','content'].includes(style.contain),'Unexpected shadow-clipping ancestor');
  }
  const parent=map.parentElement.getBoundingClientRect();
  const cap={small:320,medium:480,large:640}[host.dataset.preset]??parent.width;
  check(Math.abs(box.width-Math.min(parent.width,cap))<1,'Maximum width '+host.dataset.preset+' '+box.width+'/'+parent.width);
  check(box.left>=parent.left-1&&box.right<=parent.right+1,'Parent containment');
  const alignment=host.dataset.alignment;
  check(alignment==='start'?Math.abs(box.left-parent.left)<1:alignment==='end'?Math.abs(box.right-parent.right)<1:Math.abs((box.left+box.right)-(parent.left+parent.right))<1,'Horizontal alignment '+alignment);
  check(getComputedStyle(map).position==='relative','Normal document flow');
  const group=map.closest('[data-website-element="group"]');if(group)check(f.width<=group.getBoundingClientRect().width+1,'Group containment');
  check(frame.getAttribute('referrerpolicy')==='strict-origin-when-cross-origin'&&frame.title&&frame.loading==='lazy','Controlled attributes');
  if(host.dataset.mode==='editor'){
    check(getComputedStyle(frame).pointerEvents==='none'&&frame.tabIndex===-1,'Editor iframe intercepts gestures');
    const target=map.closest('[data-editor-website-element]');check(target,'Missing selection frame');target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  }else check(getComputedStyle(frame).pointerEvents==='auto'&&frame.tabIndex!==-1,'Guest/preview not interactive');
  const hero=host.querySelector('[data-hero-shell]').getBoundingClientRect();check(f.left>=hero.left-1&&f.right<=hero.right+1&&f.top>=hero.top-1&&f.bottom<=hero.bottom+1,'Full screen Hero containment');
  count++;
 }
 check(selected>0,'Selection callback not called');check(!window.__mapScriptRan,'Pasted script executed');document.title='PASS '+count;
}catch(error){document.title='FAIL '+error.message}},1500);
`
  const server = await createServer({ cacheDir: join(directory, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'map-geometry', resolveId(id) { if (id === 'virtual:map-geometry') return '\0map-geometry' }, load(id) { if (id === '\0map-geometry') return source }, configureServer(vite) { vite.middlewares.use('/map-geometry', async (_request, response) => { response.setHeader('Content-Type', 'text/html'); response.setHeader('Content-Security-Policy', "frame-src 'none'"); response.end(await vite.transformIndexHtml('/map-geometry', '<html><head><title>WAIT</title></head><body><div id="root"></div><script type="module" src="/@id/virtual:map-geometry"></script></body></html>')) }) } }] })
  try {
    await server.listen()
    const { stdout } = await promisify(execFile)(chrome!, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(directory, 'profile')}`, '--window-size=1400,800', '--virtual-time-budget=20000', '--dump-dom', `${server.resolvedUrls!.local[0]}map-geometry`], { timeout: 60000, maxBuffer: 20000000 })
    expect(stdout.match(/<title>(.*?)<\/title>/)?.[1], stdout.slice(-1500)).toBe('PASS 180')
  } finally { await server.close(); rmSync(directory, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }) }
}, 120000)
