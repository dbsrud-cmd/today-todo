const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [320,390,1280]){
   const context=await browser.newContext({viewport:{width,height:850},isMobile:width<500,hasTouch:width<500});
   const page=await context.newPage();const errors=[];const failed=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});
   const response=await page.goto('https://dbsrud-cmd.github.io/today-todo/');assert.equal(response.status(),200);
   await page.locator('#task-title').fill('공개 사이트 테스트');await page.locator('#task-priority').selectOption('high');await page.locator('#submit-button').click();
   await page.getByRole('button',{name:'공개 사이트 테스트 내일로 보내기',exact:true}).click();
   await page.locator('#tomorrow-tab').click();await page.getByRole('checkbox',{name:'공개 사이트 테스트 완료',exact:true}).check();
   await page.reload();await page.locator('#tomorrow-tab').click();assert.equal(await page.getByRole('checkbox',{name:'공개 사이트 테스트 완료',exact:true}).isChecked(),true);
   await page.locator('#history-tab').click();assert.equal(await page.locator('#task-list .task-title').textContent(),'공개 사이트 테스트');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
   console.log('PASS: 공개 사이트 '+width+'px, 화면 파일 정상 로드, 추가·이동·완료·기록·저장 복원 확인');
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
