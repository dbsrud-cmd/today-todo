const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3000');
    assert.equal(await page.locator('#celebration').isVisible(), false);
    for (const title of ['첫 할 일', '둘째 할 일']) {
      await page.locator('#task-title').fill(title);
      await page.locator('#submit-button').click();
    }
    await page.getByRole('checkbox', {name: '첫 할 일 완료', exact: true}).check();
    assert.deepEqual(await page.locator('#task-list .task-title').allTextContents(), ['둘째 할 일', '첫 할 일']);
    assert.equal(await page.locator('#celebration').isVisible(), false);
    await page.getByRole('checkbox', {name: '둘째 할 일 완료', exact: true}).check();
    assert.equal(await page.locator('#celebration').isVisible(), true);
    assert.equal(await page.locator('.confetti-piece').count(), 60);
    assert.notEqual(await page.locator('.confetti-piece').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.waitForFunction(() => document.getElementById('celebration').hidden, {timeout: 5000});
    assert.equal(await page.locator('.confetti-piece').count(), 0);
    await page.reload();
    assert.equal(await page.locator('#celebration').isVisible(), false);
    await page.getByRole('checkbox', {name: '첫 할 일 완료', exact: true}).uncheck();
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.getByRole('checkbox', {name: '첫 할 일 완료', exact: true}).check();
    assert.equal(await page.locator('#celebration').isVisible(), true);
    assert.equal(await page.locator('.confetti-piece').count(), 0);
    await page.getByRole('checkbox', {name: '첫 할 일 완료', exact: true}).uncheck();
    assert.equal(await page.locator('#celebration').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('PASS: 완료 항목 맨 아래, 마지막 완료에만 축하·폭죽, 자동 종료, 새로고침 미실행, 체크 해제 시 종료, 움직임 줄이기 확인');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
