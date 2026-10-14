const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({timezoneId:'Asia/Seoul'});const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-14T12:00:00+09:00')});
  await page.goto('http://127.0.0.1:3000');
  assert.match(await page.locator('#day-date').textContent(),/2026년 10월 14일 수요일/);
  assert.ok(await page.locator('#day-date').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=22);
  assert.equal(await page.locator('#day-date .date-weekday').evaluate(e=>getComputedStyle(e).fontSize),'14px');
  await page.locator('#tomorrow-tab').click();assert.match(await page.locator('#day-date').textContent(),/10월 15일 목요일/);
  await page.evaluate(()=>localStorage.setItem('today-todo.tasks.v1',JSON.stringify({version:1,tasks:[
   {id:1,title:'어제 완료',priority:'high',dueDate:'',completed:true,completedAt:'2026-10-13'},
   {id:2,title:'기존 완료',priority:'normal',dueDate:'',completed:true},
   {id:3,title:'완료할 일',priority:'low',dueDate:'',completed:false}
  ]})));
  await page.reload();await page.getByRole('checkbox',{name:'완료할 일 완료',exact:true}).check();
  await page.locator('#history-tab').click();
  assert.deepEqual(await page.locator('.history-date h3').allTextContents(),['2026년 10월 14일 수요일','2026년 10월 13일 화요일','날짜 미상 (기존 완료 항목)']);
  assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['완료할 일','어제 완료','기존 완료']);
  assert.equal(await page.locator('#task-form').isVisible(),false);
  await page.locator('#history-year').selectOption('2026');
  await page.locator('#history-month').selectOption('10');
  await page.locator('#history-day').selectOption('13');
  assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['어제 완료']);
  await page.locator('#history-weekday').selectOption('3');
  assert.equal(await page.locator('#empty-message').isVisible(),true);
  await page.locator('#history-reset').click();
  await page.locator('#history-weekday').selectOption('3');
  assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['완료할 일']);
  await page.locator('#history-reset').click();
  assert.equal(await page.locator('#task-list .task-title').count(),3);
  await page.getByRole('checkbox',{name:'완료할 일 완료',exact:true}).click();
  assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['어제 완료','기존 완료']);
  await page.getByRole('button',{name:'어제 완료 삭제',exact:true}).click();await page.locator('#undo-delete-button').click();
  assert.match(await page.locator('.history-date h3').first().textContent(),/10월 13일/);
  await page.reload();await page.locator('#history-tab').click();assert.equal(await page.locator('#task-list .task-title').count(),2);
  assert.deepEqual(errors,[]);console.log('PASS: 실제 Edge 큰 날짜·요일, 완료 날짜별 최근순 그룹, 기존 날짜 미상, 해제·삭제 취소·저장 복원');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
