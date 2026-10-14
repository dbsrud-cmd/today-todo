const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({timezoneId:'Asia/Seoul'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-14T12:00:00+09:00')});
  await page.goto('http://127.0.0.1:3000');
  await page.evaluate(()=>localStorage.setItem('today-todo.tasks.v1',JSON.stringify({version:1,tasks:[{id:1,title:'기존 할 일',priority:'normal',dueDate:'',completed:false}]})));
  await page.reload();
  assert.equal(await page.locator('#task-list .task-title').textContent(),'기존 할 일');
  await page.locator('#task-title').fill('옮길 일');await page.locator('#task-priority').selectOption('high');await page.locator('#task-due-date').fill('2026-10-20');await page.locator('#submit-button').click();
  await page.getByRole('button',{name:'옮길 일 내일로 보내기',exact:true}).click();
  assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['기존 할 일']);
  assert.equal(await page.locator('#celebration').isVisible(),false);
  await page.locator('#tomorrow-tab').click();
  assert.equal(await page.locator('#task-list .task-title').textContent(),'옮길 일');
  assert.match(await page.locator('#task-list').textContent(),/★★★ 높음.*2026-10-20/s);
  await page.getByRole('button',{name:'옮길 일 오늘로 보내기',exact:true}).click();
  assert.equal(await page.locator('#task-list li').count(),0);
  await page.locator('#today-tab').click();await page.getByRole('button',{name:'옮길 일 내일로 보내기',exact:true}).click();
  await page.locator('#tomorrow-tab').click();
  await page.locator('#task-title').fill('내일 새 항목');await page.locator('#submit-button').click();
  await page.getByRole('checkbox',{name:'옮길 일 완료',exact:true}).check();
  assert.equal(await page.locator('#task-progress').evaluate(e=>e.value),50);
  await page.locator('#recommend-button').click();assert.deepEqual(await page.locator('#recommend-list strong').allTextContents(),['내일 새 항목']);
  page.once('dialog',d=>d.accept());await page.locator('#delete-completed-button').click();await page.locator('#undo-delete-button').click();
  assert.equal(await page.locator('#task-list li').count(),2);
  await page.reload();await page.locator('#tomorrow-tab').click();
  assert.equal(await page.getByRole('checkbox',{name:'옮길 일 완료',exact:true}).isChecked(),true);
  await page.clock.setSystemTime(new Date('2026-10-15T12:00:00+09:00'));
  await page.reload();
  assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['기존 할 일','내일 새 항목','옮길 일']);
  await page.locator('#tomorrow-tab').click();assert.equal(await page.locator('#task-list li').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: 실제 Edge 기존 목록 유지, 오늘↔내일 이동, 선택 탭 추가·진행률·추천·삭제 취소, 새로고침 복원, 다음 날 전환');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
