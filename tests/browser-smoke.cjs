const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    const progress = () => page.locator('#task-progress').evaluate(element => element.value);
    assert.equal(await progress(), 0);
    for (const title of ['책 읽기', '보고서 작성']) {
      await page.locator('#task-title').fill(title);
      await page.locator('#submit-button').click();
    }
    await page.getByRole('checkbox', { name: '책 읽기 완료', exact: true }).check();
    assert.equal(await progress(), 50);
    assert.equal(await page.locator('#progress-label').textContent(), '진행률: 전체 2개 중 1개 완료 (50%)');
    assert.equal(await page.locator('li.completed').count(), 1);
    assert.equal(await page.getByRole('checkbox', { name: '책 읽기 완료', exact: true }).evaluate(element => element === document.activeElement), true);
    await page.getByRole('button', { name: '책 읽기 수정', exact: true }).click();
    await page.locator('#task-title').fill('책 다 읽기');
    await page.locator('#submit-button').click();
    assert.equal(await page.getByRole('checkbox', { name: '책 다 읽기 완료', exact: true }).isChecked(), true);
    assert.equal(await progress(), 50);
    await page.getByRole('checkbox', { name: '보고서 작성 완료', exact: true }).check();
    assert.equal(await progress(), 100);
    await page.getByRole('checkbox', { name: '책 다 읽기 완료', exact: true }).uncheck();
    assert.equal(await progress(), 50);
    await page.getByRole('button', { name: '책 다 읽기 삭제', exact: true }).click();
    assert.equal(await progress(), 100);
    await page.getByRole('button', { name: '보고서 작성 삭제', exact: true }).click();
    assert.equal(await progress(), 0);
    assert.equal(await page.locator('#empty-message').isVisible(), true);
    assert.deepEqual(errors, []);
    console.log('PASS: 실제 Edge에서 추가, 완료/해제, 수정 후 완료 유지, 삭제, 진행률, 초점 유지, 빈 목록 및 실행 오류 검사');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
