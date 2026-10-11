import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createServer } from "vite";
import { describe, expect, it } from "vitest";

const chrome = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((path): path is string => Boolean(path && existsSync(path)));
const browserIt = chrome ? it : it.skip;

describe("Website motion runtime", () => {
  browserIt("reveals once, survives rerenders, reveals on focus, and fails open", async () => {
    const directory = mkdtempSync(join(tmpdir(), "website-motion-"));
    const source = `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {WebsiteMotion,WebsiteMotionRuntime} from '/src/features/websiteAnimation/runtime.tsx';
      let observer;
      class ControlledObserver {
        constructor(callback,options){this.callback=callback;this.options=options;this.targets=new Set();observer=this}
        observe(node){this.targets.add(node)} unobserve(node){this.targets.delete(node)}
        trigger(node){if(this.targets.has(node))this.callback([{target:node,isIntersecting:true}])}
        triggerMany(nodes){this.callback(nodes.filter(node=>this.targets.has(node)).map(target=>({target,isIntersecting:true})))}
      }
      delete window.IntersectionObserver;
      window.requestAnimationFrame=callback=>{callback(performance.now());return 1};
      window.matchMedia=()=>({matches:false});
      const root=createRoot(document.getElementById('root'));
      const animation={entrance:{type:'fade-up',speed:'fast',delay:'short'}};
      const wait=()=>new Promise(resolve=>setTimeout(resolve,50));
      const check=(value,message)=>{if(!value)throw Error(message)};
      const render=(key,id='owner',editReplay,enabled=!editReplay,authored=animation)=>root.render(React.createElement(WebsiteMotionRuntime,{enabled,sessionKey:key,editReplay},React.createElement(WebsiteMotion,{ownerId:id,animation:authored},React.createElement('button',null,'Focus'))));
      const renderPair=(editReplay)=>root.render(React.createElement(WebsiteMotionRuntime,{enabled:false,sessionKey:'edit-pair',editReplay},React.createElement(React.Fragment,null,React.createElement(WebsiteMotion,{ownerId:'section:hero',animation,key:'hero'},React.createElement('section',null,'Hero')),React.createElement(WebsiteMotion,{ownerId:'element:text',animation,key:'text'},React.createElement('p',null,'Text')))));
      const renderBatch=()=>root.render(React.createElement(WebsiteMotionRuntime,{enabled:true,sessionKey:'batch'},React.createElement(React.Fragment,null,...[0,1,2,3,4,5].map(order=>React.createElement(WebsiteMotion,{key:order,ownerId:'gallery-item:'+order,animation:{entrance:{type:'fade',speed:'fast'}},batch:{ownerId:'gallery-items',order,staggerMs:100}},React.createElement('span',null,order))))));
      (async()=>{try{
        render('zero','fallback');await wait();let motion=document.querySelector('[data-website-motion]');
        check(motion.style.opacity==='1'&&motion.style.transform==='none','observer fallback');
        window.IntersectionObserver=ControlledObserver;
        render('one');await wait();motion=document.querySelector('[data-website-motion]');
        check(motion.style.opacity==='0'&&motion.style.transform==='translateY(24px)','initial state');
        check(observer.options.threshold===0.12&&observer.options.rootMargin==='0px 0px -8% 0px','observer constants');
        observer.trigger(motion);await wait();
        check(motion.style.opacity==='1'&&motion.style.transform==='none','final state');
        check(motion.style.transition.includes('250ms cubic-bezier(0.2, 0.8, 0.2, 1) 100ms'),'token execution');
        render('one');await wait();motion=document.querySelector('[data-website-motion]');
        check(motion.style.opacity==='1'&&!observer.targets.has(motion),'rerender replayed');
        render('two','focus-owner');await wait();motion=document.querySelector('[data-website-motion]');
        motion.querySelector('button').focus();await wait();check(motion.style.opacity==='1','focus did not reveal');
        renderBatch();await wait();const batch=[...document.querySelectorAll('[data-website-motion^="gallery-item:"]')];observer.triggerMany([...batch].reverse());await wait();
        check(batch.every((node,index)=>index===0?!node.style.transition.includes(' 0ms'):node.style.transition.includes(' '+Math.min(index,4)*100+'ms')),'batch stagger order or cap');
        window.matchMedia=()=>({matches:true});render('three','reduced');await wait();motion=document.querySelector('[data-website-motion]');
        check(motion.style.opacity==='1'&&motion.style.transform==='none'&&!motion.style.transition,'reduced motion');
      window.matchMedia=()=>({matches:false});const frames=[];window.requestAnimationFrame=callback=>{frames.push(callback);return frames.length};window.cancelAnimationFrame=()=>{};
      const nativeRect=HTMLElement.prototype.getBoundingClientRect;let replayCommits=0;HTMLElement.prototype.getBoundingClientRect=function(){if(this.hasAttribute('data-website-motion'))replayCommits+=1;return nativeRect.call(this)};
        render('edit','section:hero',undefined,false);await wait();motion=document.querySelector('[data-website-motion]');
        check(motion.style.opacity==='1'&&motion.style.transform==='none'&&!motion.style.transition&&frames.length===0,'Edit animated without Replay');
        render('edit','section:hero',undefined,false,{entrance:{type:'scale-in',speed:'slow',delay:'long'}});await wait();motion=document.querySelector('[data-website-motion]');
        check(motion.style.opacity==='1'&&motion.style.transform==='none'&&frames.length===0,'appearance change auto-ran');
        render('edit','section:hero',{ownerId:'section:hero',generation:1});await wait();motion=document.querySelector('[data-website-motion]');
        check(motion.style.opacity==='0'&&motion.style.transform==='translateY(24px)'&&motion.dataset.motionState==='pending'&&!motion.style.transition,'controlled replay initial state');
        check(replayCommits===1&&frames.length===1,'initial replay state was not committed exactly once');frames.shift()(performance.now());
        check(motion.style.opacity==='1'&&motion.style.transform==='none'&&motion.style.transition.includes('250ms')&&motion.getAnimations().length>0,'controlled edit replay did not create a browser transition');
        motion.dispatchEvent(new TransitionEvent('transitionend'));check(motion.dataset.motionState==='revealed','controlled replay completion');
        render('edit','section:hero',{ownerId:'section:hero',generation:2});await wait();motion=document.querySelector('[data-website-motion]');
        check(motion.style.opacity==='0'&&motion.style.transform==='translateY(24px)'&&!motion.style.transition&&replayCommits===2&&frames.length===1,'second replay did not restart');
        frames.shift()(performance.now());check(motion.getAnimations().length>0,'second replay did not create a browser transition');motion.dispatchEvent(new TransitionEvent('transitionend'));
        render('edit','section:hero',{ownerId:'section:hero',generation:3},false,{entrance:{type:'scale-in',speed:'slow',delay:'long'}});await wait();motion=document.querySelector('[data-website-motion]');
        check(motion.style.opacity==='0'&&motion.style.transform==='scale(0.96)'&&!motion.style.transition,'Replay did not prepare unsaved values');
        frames.shift()(performance.now());check(motion.style.transition.includes('700ms')&&motion.style.transition.includes('500ms')&&motion.getAnimations().length>0,'Replay did not animate with unsaved values');motion.dispatchEvent(new TransitionEvent('transitionend'));
        renderPair({ownerId:'section:hero',generation:4});await wait();const hero=document.querySelector('[data-website-motion="section:hero"]'),other=document.querySelector('[data-website-motion="element:text"]');
        check(hero.style.opacity==='0'&&other.style.opacity==='1'&&other.style.transform==='none','unrelated owner animated');
        frames.shift()(performance.now());hero.dispatchEvent(new TransitionEvent('transitionend'));
        renderPair({ownerId:'element:text',generation:5});await wait();const replayedText=document.querySelector('[data-website-motion="element:text"]');
        check(hero.style.opacity==='1'&&replayedText.style.opacity==='0'&&replayedText.style.transform==='translateY(24px)'&&frames.length===1,'Text replay targeted the wrong owner');
        frames.shift()(performance.now());check(replayedText.getAnimations().length>0,'Text replay did not create a browser transition');replayedText.dispatchEvent(new TransitionEvent('transitionend'));
        renderPair(undefined);await wait();check(hero.style.opacity==='1'&&hero.style.transform==='none','selection or device clear did not restore final state');
        document.title='PASS';
      }catch(error){document.title='FAIL '+error.message}})();
    `;
    const server = await createServer({
      configFile: false,
      cacheDir: join(directory, "vite-cache"),
      optimizeDeps: { noDiscovery: true, include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"] },
      server: { host: "127.0.0.1", port: 0 },
      plugins: [{
        name: "website-motion-fixture",
        resolveId(id) { if (id === "virtual:website-motion") return "\0website-motion"; },
        load(id) {
          if (id === "\0website-motion")
            return source
              .replaceAll("'/node_modules/.vite/deps/react.js'", "'react'")
              .replaceAll("'/node_modules/.vite/deps/react-dom_client.js'", "'react-dom/client'");
        },
        configureServer(vite) {
          vite.middlewares.use("/website-motion", async (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(await vite.transformIndexHtml("/website-motion", '<html><head><title>RUNNING</title></head><body><div id="root"></div><script type="module" src="/@id/virtual:website-motion"></script></body></html>'));
          });
        },
      }],
    });
    try {
      await server.listen();
      const address = server.httpServer!.address() as { port: number };
      const { stdout } = await promisify(execFile)(chrome!, [
        "--headless=new", "--disable-gpu", "--no-sandbox", `--user-data-dir=${directory}`,
        "--virtual-time-budget=5000", "--dump-dom", `http://127.0.0.1:${address.port}/website-motion`,
      ], { timeout: 30000, maxBuffer: 4_000_000 });
      expect(stdout.match(/<title>(.*?)<\/title>/)?.[1], stdout.slice(-2000)).toBe("PASS");
    } finally {
      await server.close();
      rmSync(directory, { recursive: true, force: true });
    }
  }, 45000);
});
