const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3000');
  await page.locator('#task-title').fill('되돌릴 할 일');
  await page.locator('#task-priority').selectOption('high');
  await page.locator('#task-due-date').fill('2026-10-20');
  await page.locator('#submit-button').click();
  await page.getByRole('checkbox',{name:'되돌릴 할 일 완료',exact:true}).check();
  await page.getByRole('button',{name:'되돌릴 할 일 삭제',exact:true}).click();
  assert.equal(await page.locator('#undo-panel').isVisible(),true);
  await page.locator('#undo-delete-button').click();
  assert.equal(await page.getByRole('checkbox',{name:'되돌릴 할 일 완료',exact:true}).isChecked(),true);
  assert.match(await page.locator('#task-list').textContent(),/★★★ 높음/);
  assert.match(await page.locator('#task-list').textContent(),/2026-10-20/);
  assert.equal(await page.locator('#undo-panel').isVisible(),false);
  page.once('dialog',d=>d.accept());await page.locator('#delete-completed-button').click();
  await page.locator('#undo-delete-button').click();
  assert.equal(await page.locator('#task-list li').count(),1);
  assert.equal(await page.locator('#celebration').isVisible(),false);
  await page.reload();
  assert.equal(await page.locator('#task-list li').count(),1);
  assert.equal(await page.locator('#undo-panel').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: 실제 Edge 개별·일괄 삭제 취소, 중요도·마감일·완료 상태와 저장 복원, 복구 시 폭죽 미실행');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
