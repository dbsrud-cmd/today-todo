const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  // 사용자 브라우저 자료와 섞이지 않는 테스트 전용 프로필입니다.
  const profile = mkdtempSync(path.join(tmpdir(), 'today-todo-storage-'));
  const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
  const errors = [];
  let context;
  async function open() {
    context = await chromium.launchPersistentContext(profile, { channel: 'msedge', headless: true });
    const page = context.pages()[0];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    return page;
  }
  try {
    let page = await open();
    await page.locator('#task-title').fill('보고서 작성');
    await page.locator('#task-priority').selectOption('high');
    await page.locator('#task-due-date').fill('2026-10-20');
    await page.locator('#submit-button').click();
    await page.getByRole('checkbox', { name: '보고서 작성 완료', exact: true }).check();
    await page.locator('#task-title').fill('책 읽기');
    await page.locator('#submit-button').click();
    await page.reload();
    assert.equal(await page.locator('li').count(), 2);
    assert.equal(await page.getByRole('checkbox', { name: '보고서 작성 완료', exact: true }).isChecked(), true);
    await context.close();
    page = await open(); // 브라우저 프로세스를 종료한 후 동일 프로필로 다시 시작
    assert.equal(await page.locator('li').count(), 2);
    assert.equal(await page.getByRole('checkbox', { name: '보고서 작성 완료', exact: true }).isChecked(), true);
    assert.match(await page.locator('#task-list li').filter({ has: page.getByText('보고서 작성', { exact: true }) }).textContent(), /중요도: ★★★ 높음 · 마감일: 2026-10-20/);
    assert.equal(await page.locator('#task-progress').evaluate(el => el.value), 50);
    await page.getByRole('button', { name: '보고서 작성 수정', exact: true }).click();
    await page.locator('#task-title').fill('보고서 제출');
    await page.locator('#task-priority').selectOption('low');
    await page.locator('#task-due-date').fill('');
    await page.locator('#submit-button').click();
    await page.getByRole('checkbox', { name: '보고서 제출 완료', exact: true }).uncheck();
    await page.getByRole('button', { name: '책 읽기 삭제', exact: true }).click();
    await context.close();
    page = await open();
    assert.equal(await page.locator('li').count(), 1);
    assert.equal(await page.getByRole('checkbox', { name: '보고서 제출 완료', exact: true }).isChecked(), false);
    assert.match(await page.locator('li').textContent(), /중요도: ★ 낮음 · 마감일: 없음/);
    await page.getByRole('button', { name: '보고서 제출 삭제', exact: true }).click();
    await context.close();
    page = await open();
    assert.equal(await page.locator('li').count(), 0);
    assert.equal(await page.locator('#task-progress').evaluate(el => el.value), 0);
    // 손상 자료 안내와 원본 보호를 화면에서도 확인합니다.
    await page.evaluate(() => localStorage.setItem('today-todo.tasks.v1', 'broken'));
    await page.reload();
    assert.match(await page.locator('#storage-notice').textContent(), /복원할 수 없어요/);
    await page.locator('#task-title').fill('임시');
    await page.locator('#submit-button').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('today-todo.tasks.v1')), 'broken');
    assert.deepEqual(errors, []);
    console.log('PASS: 실제 Edge 새로고침 및 브라우저 종료·재시작 후 전체 필드, 완료 상태, 진행률, 수정·삭제·빈 목록 복원, 손상 안내와 원본 보호 확인');
  } finally {
    if (context) await context.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
