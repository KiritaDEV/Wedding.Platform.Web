import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { GalleryCollectionEditor } from "./GalleryCollectionEditor";

const chrome = [process.env.CHROME_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"].find((path): path is string => Boolean(path && existsSync(path)));
const browserIt = chrome ? it : it.skip;
const item = { id: "first", type: "image" as const, mediaId: "missing", focalPoint: { x: .2, y: .8 }, zoom: 1.5 };

describe("Gallery collection management", () => {
  it("renders compact management controls for an unresolved image", () => {
    const html = renderToStaticMarkup(<MemoryRouter><GalleryCollectionEditor sectionId="gallery" eventId="event" items={[item]} resolvedMedia={{}} onMediaResolved={() => {}} onChange={() => {}} /></MemoryRouter>);
    for (const label of ["Add images", "Edit images", "Media unavailable", "Edit image 1", "Drag image 1 to reorder", "Image 1 actions"]) expect(html).toContain(label);
    for (const label of ["Alt text", "Decorative image", "Earlier", "Later", "Focal point", "Zoom", "Apply accessibility"]) expect(html).not.toContain(label);
    expect(html).toContain("grid-cols-[repeat(2,minmax(0,1fr))]");
    expect(html).toContain('role="status"');
  });

  it("renders no Gallery accessibility authoring in the inspector", () => {
    const html = renderToStaticMarkup(<MemoryRouter><GalleryCollectionEditor sectionId="gallery" eventId="event" items={[item]} resolvedMedia={{}} onMediaResolved={() => {}} onChange={() => {}} /></MemoryRouter>);
    for (const label of ["Needs description", "Accessibility", "Alt text", "Decorative image", "Apply accessibility"]) expect(html).not.toContain(label);
  });

  it("shows only Add images for an empty Gallery", () => {
    const html = renderToStaticMarkup(<MemoryRouter><GalleryCollectionEditor sectionId="gallery" eventId="event" items={[]} resolvedMedia={{}} onMediaResolved={() => {}} onChange={() => {}} /></MemoryRouter>);
    expect(html).toContain("Add images");
    expect(html).not.toContain("Edit images");
    expect(html).not.toContain("data-gallery-thumbnail-grid");
  });

  browserIt("shows framing-only image details and uses compact menu actions", async () => {
    const asset = { id: "asset", originalFilename: "event.jpg", width: 10, height: 10, variants: { thumbnail: { url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", width: 10, height: 10 }, web: { url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", width: 10, height: 10 } } };
    await runGalleryBrowser(`
      import '/src/index.css';import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {GalleryCollectionEditor} from '/src/features/websiteEditor/components/GalleryCollectionEditor.tsx';
      const asset=${JSON.stringify({ id: "asset", originalFilename: "event.jpg", width: 10, height: 10, web: { url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", width: 10, height: 10 } })};let latest=[];
      function App(){const [items,setItems]=useState([{id:'one',type:'image',mediaId:'asset'},{id:'two',type:'image',mediaId:'asset'}]);latest=items;return React.createElement(MemoryRouter,null,React.createElement('main',null,React.createElement(GalleryCollectionEditor,{sectionId:'gallery',eventId:'event',items,resolvedMedia:{asset},onChange:setItems,onMediaResolved:()=>{}})))}
      createRoot(document.getElementById('root')).render(React.createElement(App));const wait=(ms=100)=>new Promise(r=>setTimeout(r,ms)),check=(v,m)=>{if(!v)throw Error(m)},button=label=>document.querySelector('button[aria-label="'+label+'"]')||[...document.querySelectorAll('button')].find(b=>b.textContent===label);
      (async()=>{try{await wait();check(document.querySelector('[data-gallery-thumbnail-grid]'),'grid');check(document.querySelectorAll('[data-gallery-thumbnail-item]').length===2,'tiles');check(!document.body.textContent.includes('Earlier')&&!document.body.textContent.includes('Later'),'legacy reorder');
        button('Edit image 1').click();await wait();const preview=document.querySelector('button[aria-label="Choose image focal point with pointer or arrow keys"]');check(document.querySelector('dialog[open]'),'dialog');check(document.body.textContent.includes('Image 1 of 2'),'position');check(document.querySelector('nav[aria-label="Gallery images"]')?.textContent.includes('Image 1 of 2'),'position near navigator');check(!document.body.textContent.includes('Image details'),'redundant details heading');check(document.body.textContent.includes('Framing'),'framing heading');check(document.body.textContent.includes('Click or drag on the image to set its focal point.'),'framing instruction');check(!preview.classList.contains('shadow-lg')&&!preview.className.includes('ring-'),'unmodified preview surface');check(!document.querySelector('[class*="bg-black/"]'),'no preview overlay');check(!document.body.textContent.includes('Accessibility')&&!document.body.textContent.includes('Alt text')&&!document.body.textContent.includes('Decorative image')&&!document.body.textContent.includes('Needs description'),'no accessibility UI');check(button('Reset framing')?.tagName==='BUTTON','reset button');check(button('Zoom in')?.classList.contains('border'),'zoom affordance');
        button('Done').click();for(let n=0;n<20&&document.activeElement.dataset.galleryTile!=='one';n++)await wait(100);check(!document.querySelector('dialog[open]'),'done closes');check(document.activeElement.dataset.galleryTile==='one','tile focus restored');
        button('Image 1 actions').click();await wait();button('Duplicate').click();await wait();check(latest.length===3&&latest[1].id!=='one'&&!('alt' in latest[1])&&!('decorative' in latest[1]),'duplicate');check(document.activeElement.dataset.galleryTile===latest[1].id,'duplicate focus');
        button('Image 2 actions').click();await wait();button('Delete').click();await wait();check(latest.length===2&&latest[0].id==='one'&&latest[1].id==='two','delete duplicate');document.title='PASS';
      }catch(e){document.title='FAIL '+e.message}})();
    `, asset);
  }, 90000);

  browserIt("reorders only from the pointer drag handle while preserving metadata", async () => {
    await runGalleryBrowser(`
      import '/src/index.css';import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {GalleryCollectionEditor} from '/src/features/websiteEditor/components/GalleryCollectionEditor.tsx';let latest=[];
      const original=[{id:'one',type:'image',mediaId:'a',focalPoint:{x:.2,y:.8},zoom:1.5},{id:'two',type:'image',mediaId:'b'}];function App(){const [items,setItems]=useState(original);latest=items;return React.createElement(MemoryRouter,null,React.createElement('main',{style:{width:390}},React.createElement(GalleryCollectionEditor,{sectionId:'gallery',eventId:'event',items,resolvedMedia:{},onChange:setItems,onMediaResolved:()=>{}})))}createRoot(document.getElementById('root')).render(React.createElement(App));
      const wait=(ms=120)=>new Promise(r=>setTimeout(r,ms)),check=(v,m)=>{if(!v)throw Error(m)},pointer=(target,type,x,y)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:7,pointerType:'mouse',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y}));
      (async()=>{try{await wait();const tile=document.querySelector('[data-gallery-tile="one"]'),before=JSON.stringify(latest);const r=tile.getBoundingClientRect();pointer(tile,'pointerdown',r.left+20,r.top+20);pointer(document,'pointermove',r.left+20,r.top+80);pointer(document,'pointerup',r.left+20,r.top+80);await wait();check(JSON.stringify(latest)===before,'tile initiated drag');
        const handle=document.querySelector('[data-gallery-drag="one"]'),target=document.querySelector('[data-gallery-tile="two"]'),a=handle.getBoundingClientRect(),b=target.getBoundingClientRect(),sx=a.left+a.width/2,sy=a.top+a.height/2,tx=b.left+b.width/2,ty=b.top+b.height/2;pointer(handle,'pointerdown',sx,sy);await wait(30);pointer(document,'pointermove',sx+10,sy);await wait(30);pointer(document,'pointermove',tx,ty);await wait();pointer(document,'pointermove',tx+2,ty+2);await wait(30);pointer(document,'pointerup',tx+2,ty+2);await wait();check(latest[0].id==='two'&&latest[1].id==='one','handle reorder');check(latest[1].zoom===1.5&&latest[1].focalPoint.x===.2&&!('alt' in latest[1])&&!('decorative' in latest[1]),'metadata');document.title='PASS';}catch(e){document.title='FAIL '+e.message}})();
    `);
  }, 90000);

  browserIt("contains the two-column inspector grid at desktop, tablet and mobile widths", async () => {
    await runGalleryBrowser(`
      import '/src/index.css';import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {GalleryCollectionEditor} from '/src/features/websiteEditor/components/GalleryCollectionEditor.tsx';
      const counts=[1,2,7,24],widths=[366,648,390,320,296],nodes=[];for(const width of widths)for(const count of counts){const items=Array.from({length:count},(_,i)=>({id:width+'-'+count+'-'+i,type:'image',mediaId:'missing-'+i}));nodes.push(React.createElement('section',{key:width+'-'+count,'data-inspector-case':true,'data-width':width,'data-count':count,style:{width,overflowY:'auto'}},React.createElement(GalleryCollectionEditor,{sectionId:'gallery',eventId:'event',items,resolvedMedia:{},onChange:()=>{},onMediaResolved:()=>{}})))}createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,null,nodes));
      setTimeout(()=>{for(const host of document.querySelectorAll('[data-inspector-case]'))host.querySelector('button[aria-label="Image 1 actions"]').click();setTimeout(()=>{try{const tolerance=.75;for(const host of document.querySelectorAll('[data-inspector-case]')){const editor=host.querySelector('[data-gallery-collection-editor]'),grid=host.querySelector('[data-gallery-thumbnail-grid]');if(host.scrollWidth>host.clientWidth+tolerance)throw Error('inspector overflow '+host.dataset.width+'/'+host.dataset.count+' '+host.clientWidth+'/'+host.scrollWidth);if(editor.scrollWidth>editor.clientWidth+tolerance)throw Error('editor overflow '+host.dataset.width+'/'+host.dataset.count+' '+editor.clientWidth+'/'+editor.scrollWidth);if(grid.scrollWidth>grid.clientWidth+tolerance)throw Error('grid overflow '+host.dataset.width+'/'+host.dataset.count+' '+grid.clientWidth+'/'+grid.scrollWidth);const right=grid.getBoundingClientRect().right;for(const tile of grid.querySelectorAll('[data-gallery-thumbnail-item]'))if(tile.getBoundingClientRect().right>right+tolerance)throw Error('tile overflow '+host.dataset.width+'/'+host.dataset.count)}document.title='PASS'}catch(e){document.title='FAIL '+e.message}},100)},500);
    `);
  }, 90000);

  browserIt("keeps the Edit images shell contained and adapts its columns to real viewports", async () => {
    const cases = [
      [1440, 900, "landscape", "wide-fit"],
      [1440, 900, "square", "wide-fit"],
      [1440, 900, "portrait", "wide-fit"],
      [1440, 500, "portrait", "wide-short"],
      [1280, 800, "square", "stacked"],
      [1024, 768, "portrait", "stacked"],
      [768, 1024, "landscape", "stacked"],
      [390, 844, "square", "mobile"],
      [320, 720, "portrait", "mobile"],
    ] as const;
    for (const [width, height, ratio, layout] of cases) {
      await runGalleryBrowser(`
        import '/src/index.css';import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {GalleryCollectionEditor} from '/src/features/websiteEditor/components/GalleryCollectionEditor.tsx';
        const url='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="coral"/></svg>'),asset={id:'asset',originalFilename:'photo.svg',width:1200,height:800,web:{url,width:1200,height:800}},items=Array.from({length:3},(_,i)=>({id:'item-'+i,type:'image',mediaId:'asset',focalPoint:{x:.2,y:.8},zoom:1.5}));function App(){const [value,setValue]=useState(items);return React.createElement(MemoryRouter,null,React.createElement(GalleryCollectionEditor,{sectionId:'gallery',eventId:'event',items:value,resolvedMedia:{asset},appearance:{aspectRatio:'${ratio}'},onChange:setValue,onMediaResolved:()=>{}}))}createRoot(document.getElementById('root')).render(React.createElement(App));
        const expected={landscape:4/3,portrait:4/5,square:1}.${ratio},near=(a,b,t=.08)=>Math.abs(a-b)<=t;setTimeout(()=>{try{document.querySelector('[data-gallery-tile="item-0"]').click();setTimeout(()=>{try{const dialog=document.querySelector('dialog[open]'),body=document.querySelector('[data-gallery-editor-body]'),scroll=document.querySelector('[data-gallery-editor-scroll-body]'),preview=document.querySelector('button[aria-label="Choose image focal point with pointer or arrow keys"]'),framing=[...dialog.querySelectorAll('h3')].find(node=>node.textContent==='Framing'),reset=[...dialog.querySelectorAll('button')].find(node=>node.textContent==='Reset framing'),footer=dialog.querySelector('footer'),style=getComputedStyle(dialog),dr=dialog.getBoundingClientRect(),sr=scroll.getBoundingClientRect(),pr=preview.getBoundingClientRect(),detailRect=framing.getBoundingClientRect(),fr=footer.getBoundingClientRect();if(style.overflowY!=='hidden')throw Error('dialog scroll owner '+style.overflowY);if(dialog.scrollHeight>dialog.clientHeight+1)throw Error('outer overflow '+dialog.clientHeight+'/'+dialog.scrollHeight);if(fr.bottom>dr.bottom+1||fr.top<dr.top)throw Error('footer outside');if(dialog.scrollWidth>dialog.clientWidth+1||scroll.scrollWidth>scroll.clientWidth+1)throw Error('horizontal overflow');if(!near(pr.width/pr.height,expected))throw Error('preview ratio '+pr.width+'/'+pr.height);const columns=getComputedStyle(body).gridTemplateColumns.split(' ').length,isWide='${layout}'.startsWith('wide');if(isWide&&(columns!==3||pr.right>detailRect.left+1))throw Error('wide columns ${width} '+columns+' '+pr.right+'/'+detailRect.left);if(!isWide&&columns===3)throw Error('unexpected wide columns');if('${layout}'==='wide-fit'&&(scroll.scrollHeight>scroll.clientHeight+1))throw Error('unnecessary body scroll '+scroll.clientHeight+'/'+scroll.scrollHeight);if('${layout}'==='wide-fit'&&Math.abs(detailRect.top-pr.top)>2)throw Error('framing not top aligned '+detailRect.top+'/'+pr.top);if('${layout}'==='wide-short'){if(scroll.scrollHeight<=scroll.clientHeight+1)throw Error('short body did not scroll '+scroll.clientHeight+'/'+scroll.scrollHeight);scroll.scrollTop=scroll.scrollHeight;if(reset.getBoundingClientRect().bottom>sr.bottom+1)throw Error('reset unreachable');}if('${layout}'==='mobile'&&(!near(dr.width,innerWidth,1)||!near(dr.height,innerHeight,1)))throw Error('mobile surface '+dr.width+'/'+dr.height+'/'+innerWidth+'/'+innerHeight);document.title='PASS'}catch(e){document.title='FAIL '+e.message}},300)}catch(e){document.title='FAIL '+e.message}},300);
      `, {}, [width, height]);
    }
  }, 120000);

  browserIt("ignores a cancelled late upload without disturbing a newer picker session", async () => {
    const asset = { id: "uploaded", originalFilename: "uploaded.jpg", width: 10, height: 10, variants: { thumbnail: { url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", width: 10, height: 10 }, web: { url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", width: 10, height: 10 } } };
    await runGalleryBrowser(`
      import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {GalleryCollectionEditor} from '/src/features/websiteEditor/components/GalleryCollectionEditor.tsx';
      let latest=[];globalThis.__deferUpload=true;function App(){const [items,setItems]=useState([]);latest=items;return React.createElement(MemoryRouter,null,React.createElement(GalleryCollectionEditor,{sectionId:'gallery',eventId:'event',items,resolvedMedia:{},onChange:setItems,onMediaResolved:()=>{}}))}createRoot(document.getElementById('root')).render(React.createElement(App));
      const wait=()=>new Promise(r=>setTimeout(r,100)),button=label=>[...document.querySelectorAll('button')].find(b=>b.textContent===label)||document.querySelector('button[aria-label="'+label+'"]'),check=(v,m)=>{if(!v)throw Error(m)};
      (async()=>{try{await wait();button('Add images').click();await wait();const file=document.querySelector('input[type=file]'),transfer=new DataTransfer();transfer.items.add(new File(['image'],'late.png',{type:'image/png'}));file.files=transfer.files;file.dispatchEvent(new Event('change',{bubbles:true}));await wait();button('Close dialog').click();await wait();check(latest.length===0,'cancel changed Gallery');
        button('Add images').click();let other;for(let n=0;n<10&&!other;n++){await wait();other=[...document.querySelectorAll('span')].find(node=>node.textContent==='other.jpg')?.closest('button')}check(other,'other asset missing');other.click();await wait();check(latest.length===0,'multi-select closed early');button('Add 1 image').click();await wait();check(latest.length===1&&latest[0].mediaId==='other','new session selection not added');globalThis.__resolveUpload();await wait();check(latest.length===1&&latest[0].mediaId==='other','late callback mutated Gallery');document.title='PASS';
      }catch(e){document.title='FAIL '+e.message}})();
    `, asset);
  }, 90000);

  browserIt("adds ordered existing-media selections and every successful upload in a batch", async () => {
    const asset = { id: "first-asset", originalFilename: "first.jpg", width: 10, height: 10, variants: { thumbnail: { url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", width: 10, height: 10 }, web: { url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", width: 10, height: 10 } } };
    await runGalleryBrowser(`
      import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {GalleryCollectionEditor} from '/src/features/websiteEditor/components/GalleryCollectionEditor.tsx';
      let latest=[];globalThis.__fileNamedUploads=true;function App(){const [items,setItems]=useState([]);latest=items;return React.createElement(MemoryRouter,null,React.createElement(GalleryCollectionEditor,{sectionId:'gallery',eventId:'event',items,resolvedMedia:{},onChange:setItems,onMediaResolved:()=>{}}))}createRoot(document.getElementById('root')).render(React.createElement(App));
      const wait=(ms=120)=>new Promise(r=>setTimeout(r,ms)),button=label=>[...document.querySelectorAll('button')].find(b=>b.textContent===label)||document.querySelector('button[aria-label="'+label+'"]'),assetButton=name=>[...document.querySelectorAll('span')].find(node=>node.textContent===name)?.closest('button'),check=(v,m)=>{if(!v)throw Error(m)};
      (async()=>{try{await wait();button('Add images').click();for(let n=0;n<10&&!assetButton('other.jpg');n++)await wait();const first=assetButton('first.jpg'),other=assetButton('other.jpg');first.click();await wait();check(document.querySelector('dialog[open]')&&latest.length===0,'first selection closed picker');other.click();await wait();first.click();await wait();first.click();await wait();check(button('Add 2 images')&&!button('Add 2 images').disabled,'confirmation');button('Add 2 images').click();await wait();check(latest.length===2&&latest[0].mediaId==='other'&&latest[1].mediaId==='first-asset','selection order');check(latest[0].id!==latest[1].id,'canonical ids');
        button('Add images').click();await wait();const input=document.querySelector('input[type=file]'),transfer=new DataTransfer();transfer.items.add(new File(['a'],'upload-a.png',{type:'image/png'}));transfer.items.add(new File(['b'],'upload-b.png',{type:'image/png'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));for(let n=0;n<20&&latest.length<4;n++)await wait();check(latest.length===4,'batch not appended');check(latest[2].mediaId==='upload-a.png'&&latest[3].mediaId==='upload-b.png','upload order');check(document.querySelector('dialog[open]'),'upload unexpectedly closed picker');button('Close dialog').click();await wait();const identity=latest[0].id;button('Image 1 actions').click();await wait();button('Replace').click();for(let n=0;n<10&&!assetButton('first.jpg');n++)await wait();assetButton('first.jpg').click();await wait();check(!document.querySelector('dialog[open]'),'replace did not close');check(latest[0].id===identity&&latest[0].mediaId==='first-asset','replace semantics');document.title='PASS';
      }catch(e){document.title='FAIL '+e.message}})();
    `, asset);
  }, 90000);

  browserIt("authors exact-device Gallery appearance through the existing controls with sparse resets", async () => {
    await runGalleryBrowser(`
      import '/src/index.css';import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
      import {AppearancePanel} from '/src/features/websiteEditor/components/AppearancePanel.tsx';
      import {GalleryCollectionRenderer} from '/src/features/websiteRenderer/GalleryCollectionRenderer.tsx';
      import {resolveSectionAppearance,mergeScopedSectionAppearance} from '/src/features/websiteEditor/sectionAppearance.ts';
      const base={headingAlignment:'inherit',bodyAlignment:'inherit',backgroundTreatment:'inherit',emphasis:'inherit'};
      let latest,setDevice;const semantic={items:[{id:'photo',type:'image',mediaId:'asset',focalPoint:{x:.2,y:.8},zoom:2.3}]};const original=JSON.stringify(semantic);
      const media={asset:{id:'asset',originalFilename:'image.svg',width:1200,height:800,web:{width:1200,height:800,url:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="coral"/></svg>')}}};
      function App(){const [envelope,setEnvelope]=useState({shared:base,custom:{mobile:base,tablet:base,desktop:base}});const [viewport,setViewport]=useState('desktop');latest=envelope;setDevice=setViewport;const owner=resolveSectionAppearance(envelope,viewport);
        return React.createElement('main',null,React.createElement(AppearancePanel,{appearance:owner.appearance,targetViewport:viewport,templateKey:'classic-filipiniana-v1',sectionCapability:{id:'gallery',appearanceControls:[],presentations:[],contextDefaults:{typography:[],colors:[]}},library:{colors:[],fontFamilies:[],palettePresets:[],typographyPresets:[]},projectColors:[],error:null,onAddColor:()=>{},onChange:a=>setEnvelope(p=>mergeScopedSectionAppearance(p,owner.scope,a))}),React.createElement(GalleryCollectionRenderer,{items:semantic.items,media,appearance:owner.appearance,viewport,mode:'editor'}),React.createElement('div',{'data-empty-public':true},React.createElement(GalleryCollectionRenderer,{items:[],media:{},appearance:owner.appearance,viewport,mode:'public'})));
      }
      createRoot(document.getElementById('root')).render(React.createElement(App));const wait=()=>new Promise(r=>setTimeout(r,100));const check=(v,m)=>{if(!v)throw Error(m)};
      const edit=async(label)=>{document.querySelector('button[aria-label="'+label+'"]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await wait()};
      (async()=>{try{await wait();await edit('Columns');await edit('Gap');await edit('Aspect ratio');check(latest.custom.desktop.columns===4&&latest.custom.desktop.gap==='large'&&latest.custom.desktop.aspectRatio==='landscape','authored desktop');
        const grid=document.querySelector('[data-gallery-collection]');check(grid.dataset.galleryColumns==='4'&&grid.dataset.galleryGap==='large'&&grid.dataset.galleryAspectRatio==='landscape','live canvas');
        for(const device of ['tablet','mobile']){setDevice(device);await wait();check(!('columns' in latest.custom[device]),'no cascade');await edit('Columns');check(latest.custom[device].columns===(device==='mobile'?2:3),'device default and authoring');document.querySelectorAll('button').forEach(b=>{if(b.textContent==='Reset columns')b.click()});await wait();check(!('columns' in latest.custom[device]),'sparse reset');}
        check(JSON.stringify(semantic)===original,'semantic framing untouched');check(JSON.parse(JSON.stringify(latest)).custom.desktop.columns===4,'reload tokens');check(!document.querySelector('[data-empty-public] [data-gallery-collection]'),'empty public omitted');document.title='PASS';
      }catch(e){document.title='FAIL '+e.message}})();
    `);
  }, 90000);

  browserIt("matches Classic and Modern Editor/public geometry with decorations and surrounding content", async () => {
    await runGalleryBrowser(`
      import '/src/index.css';import React from 'react';import {createRoot} from 'react-dom/client';
      import {ClassicFilipinianaRenderer} from '/src/features/websiteRenderer/templates/ClassicFilipinianaRenderer.tsx';
      import {ModernEditorialRenderer} from '/src/features/websiteRenderer/templates/ModernEditorialRenderer.tsx';
      const root=createRoot(document.getElementById('root')),wait=()=>new Promise(r=>setTimeout(r,600));
      const url='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="coral"/></svg>');
      const items=Array.from({length:7},(_,i)=>({id:'item-'+i,type:'image',mediaId:'asset',focalPoint:{x:.2,y:.8},zoom:2.3}));
      const text=(id,value)=>({id,type:'text',editorName:'Text',document:{type:'doc',children:[{type:'paragraph',children:[{text:value}]}]}});
      const flow={elements:[text('before','Before the collection'),{id:'after',type:'compositionGroup',editorName:'Group',layout:{direction:'column'},children:[text('after-text','After the collection')]}],order:[{kind:'element',id:'before'},{kind:'specialized',key:'content'},{kind:'element',id:'after'}]};
      const event={id:'event',name:'Alex & Sam',type:'wedding',eventDate:'2027-01-02'};
      const shapes=[{columns:1,gap:'small',aspectRatio:'square'},{columns:3,gap:'medium',aspectRatio:'portrait'},{columns:6,gap:'large',aspectRatio:'landscape'}];
      const near=(a,b,label)=>{if(Math.abs(a-b)>.15)throw Error(label+' '+a+'/'+b)};
      (async()=>{try{for(const [viewport,width] of [['mobile',320],['tablet',768],['desktop',1280]])for(const [index,shape] of shapes.entries())for(const template of ['classic','modern']){
        const key=template==='classic'?'classic-filipiniana-v1':'modern-editorial-v1',Renderer=template==='classic'?ClassicFilipinianaRenderer:ModernEditorialRenderer;
        const appearance={headingAlignment:'inherit',bodyAlignment:'inherit',backgroundTreatment:'inherit',emphasis:'inherit',...shape,decorativeAppearance:{background:{texture:'grain',pattern:'botanical',overlay:'soft'},frame:{style:'fine',size:120,strength:60}}};
        const section={id:'gallery',type:'gallery',displayName:'Gallery',sortOrder:10,isEnabled:true,content:{semantic:{items},compositions:{shared:{childFlow:flow}}},appearance,designDefaults:{},resolvedDesignContext:null,appearanceOptions:null,mediaCapability:null,itemMediaCapability:null,presentationCapability:null};
        const website={schemaVersion:5,id:'website',eventId:'event',name:'Website',templateKey:key,designSettings:{colorTheme:template==='classic'?'terracotta':'ink',fontSet:'editorial',artStyle:'clean',projectDefaults:{},customColors:[]},projectDesignDefaults:null,template:{key,displayName:key,designOptions:{colorThemes:[],fontSets:[],artStyles:[]},capabilities:{sections:[],elementCapabilities:[],designLibrary:{colors:[],fontFamilies:[],palettePresets:[],typographyPresets:[]}}},sections:[section],media:{asset:{id:'asset',originalFilename:'asset.svg',width:1200,height:800,web:{width:1200,height:800,url}}}};
        root.render(React.createElement(React.Fragment,null,...['editor','public'].map(mode=>React.createElement('div',{key:mode,'data-pair':mode,style:{width,position:'absolute',top:0,left:0}},React.createElement(Renderer,{event,website,targetViewport:viewport,mode})))));await wait();
        const hosts=['editor','public'].map(mode=>document.querySelector('[data-pair="'+mode+'"]'));
        const geometry=host=>{const surface=host.querySelector('[data-preview-section="gallery"]'),grid=host.querySelector('[data-gallery-collection]');if(!surface||!grid)throw Error('missing surface');if(host.scrollWidth>width+1)throw Error('overflow '+template+'/'+viewport+'/'+index);if(!surface.textContent.includes('Before the collection')||!surface.textContent.includes('After the collection'))throw Error('generic content');
          const texts=[...surface.querySelectorAll('[data-element-id]')];const before=texts.find(n=>n.dataset.elementId==='before'),after=texts.find(n=>n.dataset.elementId==='after');if(before&&before.getBoundingClientRect().bottom>grid.getBoundingClientRect().top+.15)throw Error('before order');if(after&&after.getBoundingClientRect().top<grid.getBoundingClientRect().bottom-.15)throw Error('after order');
          const origin=surface.getBoundingClientRect();const rect=n=>{const r=n.getBoundingClientRect();return [r.left-origin.left,r.top-origin.top,r.width,r.height]};
          const decorations=[...surface.querySelectorAll('[data-section-decoration]')];if(!decorations.length)throw Error('missing decoration');for(const n of decorations){const r=n.getBoundingClientRect();if(r.top<origin.top-.15||r.bottom>origin.bottom+.15)throw Error('decoration bounds');}
          if(Number(grid.dataset.galleryColumns)!==shape.columns)throw Error('column state');return [origin.height,...rect(grid),parseFloat(getComputedStyle(grid).gap),...Array.from(grid.children).flatMap(cell=>[...rect(cell),...rect(cell.querySelector('img:not([aria-hidden])'))]),...decorations.flatMap(rect)];};
        const a=geometry(hosts[0]),b=geometry(hosts[1]);if(a.length!==b.length)throw Error('geometry length');a.forEach((value,i)=>near(value,b[i],template+'/'+viewport+'/'+index+'/'+i));
      }document.title='PASS';document.getElementById('root').replaceChildren();}catch(e){document.title='FAIL '+e.message}})();
    `);
  }, 90000);

  browserIt("contains all column, gap, ratio and item-count combinations at every requested width", async () => {
    await runGalleryBrowser(`
      import '/src/index.css';import React from 'react';import {flushSync} from 'react-dom';import {createRoot} from 'react-dom/client';import {GalleryCollectionRenderer} from '/src/features/websiteRenderer/GalleryCollectionRenderer.tsx';
      const root=createRoot(document.getElementById('root'));const svg=(w,h)=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="100%" height="100%" fill="coral"/></svg>');
      const media={},items=Array.from({length:24},(_,i)=>{const [w,h]=[[1200,800],[800,1200],[900,900]][i%3];const id='image-'+i;media[id]={id,originalFilename:id,width:w,height:h,web:{width:w,height:h,url:svg(w,h)}};return {id,type:'image',mediaId:id,focalPoint:{x:.2,y:.8},zoom:2.3}});const original=JSON.stringify(items);const wait=()=>new Promise(r=>setTimeout(r,600));
      (async()=>{try{for(const width of [320,390,768,1280,1440]){const nodes=[];for(const columns of [1,2,3,4,5,6])for(const count of [1,2,3,7,24])for(const gap of ['small','medium','large'])for(const aspectRatio of ['square','portrait','landscape']){
        const key=[width,columns,count,gap,aspectRatio].join('-');nodes.push(React.createElement('section',{key,'data-grid-case':true,'data-count':count,style:{width,position:'absolute',top:0,left:0}},React.createElement(GalleryCollectionRenderer,{items:items.slice(0,count),media,appearance:{columns,gap,aspectRatio},viewport:'mobile',mode:'public'})));
      }flushSync(()=>root.render(React.createElement(React.Fragment,null,nodes)));await wait();for(const host of document.querySelectorAll('[data-grid-case]')){const grid=host.querySelector('[data-gallery-collection]');const rect=grid.getBoundingClientRect();const cols=Number(grid.dataset.galleryColumns),gap={small:12,medium:20,large:32}[grid.dataset.galleryGap],ratio={square:1,portrait:4/5,landscape:4/3}[grid.dataset.galleryAspectRatio];const cells=[...grid.children];
        const near=(a,b,m)=>{if(Math.abs(a-b)>.12)throw Error(width+' '+m+' '+a+'/'+b)};
        if(getComputedStyle(grid).gridTemplateColumns.split(' ').length!==cols)throw Error('tracks');near(parseFloat(getComputedStyle(grid).gap),gap,'gap');if(host.scrollWidth>host.clientWidth+1)throw Error('overflow');
        const track=(rect.width-gap*(cols-1))/cols;cells.forEach((cell,index)=>{if(cell.dataset.galleryItem!==items[index].id)throw Error('order');const tile=cell.getBoundingClientRect();near(tile.width,track,'equal track');if(tile.width<=0)throw Error('collapsed');near(tile.width/tile.height,ratio,'ratio');near(tile.left-rect.left,(index%cols)*(track+gap),'row placement');
          const image=cell.querySelector('img:not([aria-hidden])'),imageRect=image.getBoundingClientRect(),span=cell.querySelector('[data-media-zoom]');if(!image.complete||!image.naturalWidth)throw Error('source load');if(imageRect.left>tile.left+.12||imageRect.top>tile.top+.12||imageRect.right<tile.right-.12||imageRect.bottom<tile.bottom-.12)throw Error('blank '+[width,cols,grid.dataset.galleryGap,grid.dataset.galleryAspectRatio,index,tile.width,tile.height,imageRect.left-tile.left,imageRect.top-tile.top,imageRect.right-tile.right,imageRect.bottom-tile.bottom].join('/'));near(imageRect.width/imageRect.height,media[items[index].mediaId].web.width/media[items[index].mediaId].web.height,'source ratio');if(span.dataset.mediaZoom!=='2.3'||span.dataset.mediaFocalX!=='0.2'||span.dataset.mediaFocalY!=='0.8')throw Error('framing');
        });const rows=Math.ceil(cells.length/cols);near(rect.height,rows*(track/ratio)+(rows-1)*gap,'grid height');}
        if(JSON.stringify(items)!==original)throw Error('semantic mutation');}
        document.title='PASS';document.getElementById('root').replaceChildren();
      }catch(e){document.title='FAIL '+e.message}})();
    `);
  }, 90000);
});

async function runGalleryBrowser(source: string, asset: object = {}, windowSize?: readonly [number, number]) {
    const directory = mkdtempSync(join(tmpdir(), "gallery-editor-"));
    const server = await createServer({ configFile: false, cacheDir: join(directory, "vite-cache"), optimizeDeps: { noDiscovery: true, include: ["react", "react-dom", "react-dom/client", "react-router-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@radix-ui/react-switch", "lucide-react", "zod"] }, server: { host: "127.0.0.1", port: 0 }, plugins: [tailwindcss(), {
      name: "gallery-browser-fixture",
      enforce: "pre",
      resolveId(id, importer) { if (id === "virtual:decorative-sources") return "\0gallery-decorative-sources"; if (id === "virtual:gallery-harness") return "\0gallery-harness"; if (id.endsWith("/media/api") && importer?.includes("MediaPickerDialog.tsx")) return "\0gallery-media"; },
      load(id) { if (id === "\0gallery-decorative-sources") { const publicRoot = join(process.cwd(), "public"); return `export default ${JSON.stringify(readdirSync(join(publicRoot, "template-assets"), { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).map(entry => "/" + relative(publicRoot, join(entry.parentPath, entry.name)).replaceAll("\\", "/")))}`; } if (id === "\0gallery-harness") return source.replaceAll("'/node_modules/.vite/deps/react.js'", "'react'").replaceAll("'/node_modules/.vite/deps/react-dom_client.js'", "'react-dom/client'").replaceAll("'/node_modules/.vite/deps/react-router-dom.js'", "'react-router-dom'"); if (id === "\0gallery-media") return `const asset=${JSON.stringify(asset)};export async function getMediaAssets(){return {assets:[asset,{...asset,id:'other',originalFilename:'other.jpg'}]}};export async function uploadMediaAsset(_eventId,file){if(globalThis.__deferUpload)return new Promise(resolve=>{globalThis.__resolveUpload=()=>resolve(asset)});return globalThis.__fileNamedUploads?{...asset,id:file.name,originalFilename:file.name}:asset}`; },
      configureServer(vite) { vite.middlewares.use("/gallery-fixture", async (_request, response) => { response.setHeader("Content-Type", "text/html"); response.end(await vite.transformIndexHtml("/gallery-fixture", '<html><head><style>*{box-sizing:border-box;margin:0}body{margin:0}button{padding:0;border:0}main{width:320px}img{max-width:100%}.flex{display:flex}.flex-wrap{flex-wrap:wrap}.min-w-0{min-width:0}.w-full{width:100%}.h-full{height:100%}.block{display:block}.relative{position:relative}.absolute{position:absolute}.inset-0{inset:0}.invisible{visibility:hidden}.overflow-hidden{overflow:hidden}.max-w-none{max-width:none}.object-cover{object-fit:cover}.grid{display:grid}[class~="grid-cols-[auto_1fr_auto]"]{grid-template-columns:auto minmax(0,1fr) auto}[data-gallery-editor-item]{padding:0;border:0}input{max-width:100%}</style></head><body><div id="root"></div><script type="module" src="/@id/virtual:gallery-harness"></script></body></html>')); }); },
    }] });
    try {
      await server.listen();
      const address = server.httpServer!.address() as { port: number };
      const { stdout } = await promisify(execFile)(chrome!, ["--headless=new", "--disable-gpu", "--no-sandbox", `--user-data-dir=${directory}`, ...(windowSize ? [`--window-size=${windowSize[0]},${windowSize[1]}`] : []), "--virtual-time-budget=20000", "--dump-dom", `http://127.0.0.1:${address.port}/gallery-fixture`], { timeout: 60000, maxBuffer: 16_000_000 });
      expect(stdout.match(/<title>(.*?)<\/title>/)?.[1], stdout.slice(-2000)).toBe("PASS");
    } finally { await server.close(); rmSync(directory, { recursive: true, force: true }); }
}
