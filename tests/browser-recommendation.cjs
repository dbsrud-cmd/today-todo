const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];const outbound=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/')||!r.url().startsWith('http://127.0.0.1:3000'))outbound.push(r.url());});
  await page.goto('http://127.0.0.1:3000');
  assert.equal(await page.locator('#recommend-mode,#ai-consent').count(),0);
  for(const [title,priority,date] of [['빠른 마감','low','2026-10-15'],['중요한 일','high',''],['완료할 일','high','']]){
   await page.locator('#task-title').fill(title);await page.locator('#task-priority').selectOption(priority);await page.locator('#task-due-date').fill(date);await page.locator('#submit-button').click();
  }
  await page.getByRole('checkbox',{name:'완료할 일 완료',exact:true}).check();
  assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['중요한 일','빠른 마감','완료할 일']);
  await page.getByRole('checkbox',{name:'완료할 일 완료',exact:true}).uncheck();
  assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['중요한 일','완료할 일','빠른 마감']);
  await page.getByRole('checkbox',{name:'완료할 일 완료',exact:true}).check();
  await page.locator('#recommend-button').click();
  assert.deepEqual(await page.locator('#recommend-list strong').allTextContents(),['중요한 일','빠른 마감']);
  assert.equal(await page.locator('#recommend-list .priority-badge').first().textContent(),'★★★ 높음');
  await page.getByRole('button',{name:'빠른 마감 수정',exact:true}).click();
  await page.locator('#task-priority').selectOption('high');await page.locator('#submit-button').click();
  assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['빠른 마감','중요한 일','완료할 일']);
  assert.equal(await page.locator('#recommend-list li').count(),0);
  await page.locator('#recommend-button').click();
  assert.equal(await page.locator('#recommend-list strong').first().textContent(),'빠른 마감');
  await page.reload();
  assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['빠른 마감','중요한 일','완료할 일']);
  assert.equal(await page.getByRole('checkbox',{name:'완료할 일 완료',exact:true}).isChecked(),true);
  assert.equal(await page.locator('#task-list .priority-badge').first().textContent(),'★★★ 높음');
  assert.deepEqual(outbound,[]);assert.deepEqual(errors,[]);
  console.log('PASS: 실제 Edge 중요도·별 표시·마감일 순 추천, 수정 후 재추천, 완료 제외, 저장 복원, 외부/API 요청 없음');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
