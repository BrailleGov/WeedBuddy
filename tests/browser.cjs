const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const server=require('../server.cjs');
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const checks=[];const pass=name=>{checks.push(name);console.log('PASS '+name);};
 try{
 await page.goto(base);await page.locator('.guide-card').first().waitFor({state:'attached'});
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');assert(await page.locator('#welcome').isVisible());assert(await page.locator('#send-button').isDisabled());pass('dark default, welcome, empty composer');
 fs.mkdirSync(path.join(__dirname,'../test-results'),{recursive:true});
 await page.screenshot({path:path.join(__dirname,'../test-results/desktop-dark.png'),fullPage:true});
 await page.click('#profile-button');await page.click('#theme-toggle');await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');await page.screenshot({path:path.join(__dirname,'../test-results/desktop-light.png'),fullPage:true});pass('theme toggle persists after reload');
 await page.click('#profile-button');await page.click('#theme-toggle');await page.click('#profile-button');
 await page.locator('[data-prompt]').first().click();assert.equal(await page.locator('.message').count(),2);assert.match(await page.locator('.message.assistant').innerText(),/curated starter response/i);await page.reload();await page.locator('.history-row>button').first().click();assert.equal(await page.locator('.message').count(),2);pass('suggested chat, honest starter answer, persistent history');
 await page.fill('#message-input','<img src=x onerror=alert(1)>');await page.press('#message-input','Enter');assert.equal(await page.locator('.message.user img').count(),0);assert.equal(await page.locator('.message').count(),4);pass('typed chat and HTML injection safety');
 await page.click('#nav-gallery');await page.locator('#gallery-view').waitFor();assert(await page.locator('#gallery-empty').isVisible());await page.click('#add-strain');await page.fill('#strain-name','Blue Dream');await page.click('#lookup-strain');assert.equal(await page.inputValue('#strain-type'),'Hybrid');assert.match(await page.inputValue('#strain-lineage'),/Blueberry/);assert.equal(await page.inputValue('#strain-thc'),'');await page.fill('#strain-thc','22.5');await page.fill('#strain-cbd','0.3');await page.selectOption('#strain-rating','4');await page.fill('#strain-notes','Test journal entry');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII=','base64');
 await page.setInputFiles('#photo-upload',{name:'strain.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.querySelector('#photo-preview img')?.src.startsWith('data:image/jpeg'));
 await page.click('#strain-form button[type=submit]');await page.locator('#strain-dialog').waitFor({state:'hidden'});assert.equal(await page.locator('.strain-card').count(),1);assert.match(await page.locator('.strain-card').innerText(),/22.5/);await page.reload();assert.equal(await page.locator('.strain-card').count(),1);assert.match(await page.locator('.strain-card img').getAttribute('src'),/^data:image\/jpeg/);pass('add strain, starter lookup, potency, rating, photo compression and persistence');
 await page.locator('.strain-card').click();assert.equal(await page.inputValue('#strain-notes'),'Test journal entry');await page.fill('#strain-effects','My own experience');await page.click('#strain-form button[type=submit]');await page.fill('#strain-search','missing strain');assert.equal(await page.locator('.strain-card').count(),0);assert(await page.locator('.no-results').isVisible());await page.fill('#strain-search','blue');await page.selectOption('#strain-filter','Indica');assert.equal(await page.locator('.strain-card').count(),0);await page.selectOption('#strain-filter','all');assert.equal(await page.locator('.strain-card').count(),1);pass('edit strain, search and type filter empty states');
 await page.locator('.strain-card').click();await page.fill('#photo-url','javascript:alert(1)');await page.locator('#photo-url').blur();assert.match(await page.locator('#form-error').innerText(),/http/);await page.fill('#photo-url',base+'/missing.jpg');await page.locator('#photo-url').blur();await page.click('#strain-form button[type=submit]');await page.locator('.strain-image .placeholder-leaf').waitFor();pass('unsafe URL rejection and broken online image fallback');
 await page.click('#profile-button');const downloadPromise=page.waitForEvent('download');await page.click('#export-button');const download=await downloadPromise;const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(exported.strains[0].name,'Blue Dream');await page.click('#profile-button');pass('collection JSON export');
 await page.screenshot({path:path.join(__dirname,'../test-results/gallery.png'),fullPage:true});
 await page.locator('.strain-card').click();await page.click('#delete-strain');assert(await page.locator('#gallery-empty').isVisible());pass('confirmed strain deletion');
 await page.click('#nav-learn');assert.equal(await page.locator('.guide-card').count(),4);await page.locator('.guide-card button').last().click();await page.locator('#messages').waitFor();pass('guide navigation into chat');
 for(const width of [390,320,768,1440]){await page.setViewportSize({width,height:900});await page.goto(base);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);if(width<760){await page.click('#mobile-menu');await page.click('#nav-gallery');assert(await page.locator('#gallery-view').isVisible());await page.click('#add-strain');assert(await page.locator('#strain-dialog').isVisible());assert(await page.evaluate(()=>document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth));await page.click('#close-dialog');await page.goto(base);}}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(__dirname,'../test-results/mobile.png'),fullPage:true});pass('320/390/768/1440 layouts, mobile navigation and modal');
 const failure=await context.newPage();await failure.goto(base);await failure.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('full','QuotaExceededError');};});await failure.fill('#message-input','strain');await failure.click('#send-button');assert.match(await failure.locator('#toast').innerText(),/not saved/);assert.equal(await failure.inputValue('#message-input'),'strain');await failure.close();pass('storage failure keeps unsaved input and reports error');
 assert.equal((await fetch(base+'/.git/config')).status,404);assert.equal((await fetch(base+'/package.json')).status,404);assert.equal((await fetch(base,{method:'POST'})).status,405);pass('server blocks private files and write methods');
 assert.deepEqual(errors,[]);pass('no uncaught browser errors');
 fs.writeFileSync(path.join(__dirname,'../test-results/results.json'),JSON.stringify({passed:checks.length,checks},null,2));
 console.log(`\n${checks.length} workflow groups passed.`);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
