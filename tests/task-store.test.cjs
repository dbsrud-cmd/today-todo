const test = require('node:test');
const assert = require('node:assert/strict');
const { createTaskStore } = require('../task-store.js');

test('한글 할 일을 추가하고 앞뒤 공백을 제거한다', () => {
  const store = createTaskStore();
  assert.deepEqual(store.add('  책 읽기  '), { id: 1, title: '책 읽기', priority: 'normal', dueDate: '', completed: false });
  assert.equal(store.getAll().length, 1);
});
test('빈 입력과 너무 긴 입력을 거부하고 목록을 유지한다', () => {
  const store = createTaskStore();
  for (const title of ['', '   ', '\n\t', '가'.repeat(201)]) {
    assert.throws(() => store.add(title));
  }
  assert.deepEqual(store.getAll(), []);
  assert.equal(store.add('가'.repeat(200)).title.length, 200);
});
test('여러 할 일의 순서와 고유 번호를 유지한다', () => {
  const store = createTaskStore();
  store.add('첫 번째');
  store.add('두 번째');
  assert.deepEqual(store.getAll().map(task => task.id), [1, 2]);
  assert.deepEqual(store.getAll().map(task => task.title), ['첫 번째', '두 번째']);
});
test('반환된 데이터를 바꾸어도 저장된 원본은 유지된다', () => {
  const store = createTaskStore();
  const added = store.add('원본');
  added.title = '변경';
  const copy = store.getAll();
  copy[0].title = '또 변경';
  copy.push({ id: 2, title: '외부 추가' });
  assert.deepEqual(store.getAll(), [{ id: 1, title: '원본', priority: 'normal', dueDate: '', completed: false }]);
});

test('중요도와 마감일을 추가하고 수정하며 날짜를 지울 수 있다', () => {
  const store = createTaskStore();
  const task = store.add('보고서', 'high', '2028-02-29');
  assert.equal(task.priority, 'high');
  assert.equal(task.dueDate, '2028-02-29');
  assert.deepEqual(store.update(task.id, '  보고서 제출  ', 'low', ''), {
    id: task.id, title: '보고서 제출', priority: 'low', dueDate: '', completed: false
  });
});

test('빈 목록의 진행률은 0%이다', () => {
  assert.deepEqual(createTaskStore().getProgress(), { total: 0, completed: 0, percent: 0 });
});
test('완료 체크와 해제, 반올림, 전체 완료를 계산한다', () => {
  const store = createTaskStore();
  const tasks = ['하나', '둘', '셋'].map(title => store.add(title));
  assert.equal(store.getProgress().percent, 0);
  store.setCompleted(tasks[0].id, true);
  assert.deepEqual(store.getProgress(), { total: 3, completed: 1, percent: 33 });
  store.setCompleted(tasks[1].id, true);
  assert.equal(store.getProgress().percent, 67);
  store.setCompleted(tasks[2].id, true);
  assert.equal(store.getProgress().percent, 100);
  store.setCompleted(tasks[0].id, false);
  assert.equal(store.getAll()[0].completed, false);
  assert.equal(store.getProgress().percent, 67);
});
test('완료한 할 일을 수정해도 완료 상태가 유지된다', () => {
  const store = createTaskStore();
  const task = store.add('원본');
  store.setCompleted(task.id, true);
  assert.equal(store.update(task.id, '새 제목', 'high', '2026-10-20').completed, true);
  assert.equal(store.getProgress().percent, 100);
});
test('추가와 삭제 후 진행률을 다시 계산하고 빈 목록은 0%로 돌아간다', () => {
  const store = createTaskStore();
  const first = store.add('완료할 항목');
  store.setCompleted(first.id, true);
  const second = store.add('미완료 항목');
  assert.equal(store.getProgress().percent, 50);
  store.remove(first.id);
  assert.deepEqual(store.getProgress(), { total: 1, completed: 0, percent: 0 });
  store.setCompleted(second.id, true);
  const third = store.add('삭제할 미완료 항목');
  store.remove(third.id);
  assert.equal(store.getProgress().percent, 100);
  store.remove(second.id);
  assert.deepEqual(store.getProgress(), { total: 0, completed: 0, percent: 0 });
});
test('잘못된 완료 변경은 원본과 진행률을 바꾸지 않는다', () => {
  const store = createTaskStore();
  const original = store.add('유지');
  assert.throws(() => store.setCompleted(original.id, 'true'));
  assert.throws(() => store.setCompleted(999, true));
  assert.deepEqual(store.getAll(), [original]);
  const copy = store.setCompleted(original.id, true);
  copy.completed = false;
  assert.equal(store.getProgress().percent, 100);
});
test('잘못된 중요도와 날짜는 추가하거나 수정할 수 없다', () => {
  const store = createTaskStore();
  const original = store.add('원본');
  for (const [priority, date] of [['urgent', ''], ['normal', '2026-02-29'], ['low', '2026-04-31'], ['high', '2026-13-01'], ['normal', '잘못된 날짜'], ['normal', '0000-01-01']]) {
    assert.throws(() => store.add('새 할 일', priority, date));
    assert.throws(() => store.update(original.id, '변경', priority, date));
    assert.deepEqual(store.getAll(), [original]);
  }
  assert.throws(() => store.update(original.id, ' ', 'normal', ''));
  assert.deepEqual(store.getAll(), [original]);
});
test('선택한 항목만 삭제하고 번호를 재사용하지 않는다', () => {
  const store = createTaskStore();
  const first = store.add('첫 번째');
  const second = store.add('두 번째');
  store.remove(first.id);
  assert.deepEqual(store.getAll(), [second]);
  assert.equal(store.add('세 번째').id, 3);
  store.remove(second.id);
  store.remove(3);
  assert.deepEqual(store.getAll(), []);
});
test('없는 항목 수정과 삭제는 다른 데이터를 바꾸지 않는다', () => {
  const store = createTaskStore();
  const task = store.add('유지');
  assert.throws(() => store.update(999, '수정', 'normal', ''));
  assert.throws(() => store.remove(999));
  assert.deepEqual(store.getAll(), [task]);
});
