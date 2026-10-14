const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [320,375,390,768,1280]){
   const context=await browser.newContext({viewport:{width,height:850},isMobile:width<500,hasTouch:width<500});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:3000');
   async function fits(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,`${width}px 가로 넘침`);}
   await fits();
   await page.locator('#task-title').fill('모바일에서 할 일 추가와 정렬 확인하기');await page.locator('#submit-button').click();
   await fits();await page.getByRole('button',{name:'모바일에서 할 일 추가와 정렬 확인하기 내일로 보내기',exact:true}).click();
   await page.locator('#tomorrow-tab').click();await page.getByRole('checkbox',{name:'모바일에서 할 일 추가와 정렬 확인하기 완료',exact:true}).check();
   await page.locator('#history-tab').click();await fits();
   assert.equal(await page.locator('#task-list .task-title').count(),1);
   const buttons=await page.locator('button:visible').evaluateAll(elements=>elements.map(e=>e.getBoundingClientRect().height));
   assert.equal(buttons.every(height=>height>=44),true);
   await page.locator('#settings-panel > summary').click();await page.locator('#data-settings > summary').click();await fits();
   assert.deepEqual(errors,[]);await context.close();
   console.log(`PASS: ${width}px 화면 폭, 가로 넘침 없음, 추가·이동·완료·기록·설정 및 44px 버튼 확인`);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
