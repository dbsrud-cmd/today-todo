const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3000');
    const button = page.locator('#delete-completed-button');
    assert.equal(await button.isDisabled(), true);
    for (const title of ['완료 하나','미완료 유지','완료 둘']) {
      await page.locator('#task-title').fill(title);
      await page.locator('#submit-button').click();
    }
    for (const title of ['완료 하나','완료 둘']) await page.getByRole('checkbox',{name:`${title} 완료`,exact:true}).check();
    assert.equal(await button.textContent(),'완료한 일 모두 삭제 (2개)');
    page.once('dialog', dialog => dialog.dismiss());
    await button.click();
    assert.equal(await page.locator('#task-list li').count(),3);
    await page.getByRole('button',{name:'미완료 유지 수정',exact:true}).click();
    await page.locator('#task-title').fill('아직 저장 안 한 수정');
    page.once('dialog', dialog => dialog.accept());
    await button.click();
    assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['미완료 유지']);
    assert.equal(await page.locator('#task-title').inputValue(),'아직 저장 안 한 수정');
    assert.equal(await page.locator('#submit-button').textContent(),'저장');
    assert.equal(await button.isDisabled(),true);
    await page.reload();
    assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(),['미완료 유지']);
    await page.getByRole('checkbox',{name:'미완료 유지 완료',exact:true}).check();
    await page.getByRole('button',{name:'미완료 유지 수정',exact:true}).click();
    page.once('dialog', dialog => dialog.accept());
    await button.click();
    assert.equal(await page.locator('#submit-button').textContent(),'추가');
    assert.equal(await page.locator('#task-list li').count(),0);
    assert.equal(await page.locator('#empty-message').isVisible(),true);
    assert.equal(await page.locator('#task-progress').evaluate(el=>el.value),0);
    assert.equal(await page.locator('#celebration').isVisible(),false);
    await page.reload();
    assert.equal(await page.locator('#task-list li').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: 완료 일괄 삭제·취소·미완료와 수정 내용 보존·삭제된 편집 초기화·저장 복원·빈 목록·폭죽 종료');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
