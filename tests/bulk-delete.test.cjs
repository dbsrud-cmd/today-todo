const test = require('node:test');
const assert = require('node:assert/strict');
const { createTaskStore, STORAGE_KEY } = require('../task-store.js');
test('완료 항목만 삭제하고 남은 항목·번호·저장 상태를 유지한다', () => {
  let raw = null;
  const storage = { getItem: () => raw, setItem: (key, value) => { assert.equal(key, STORAGE_KEY); raw = value; } };
  const store = createTaskStore(storage);
  const first = store.add('완료 하나');
  const remaining = store.add('유지', 'high', '2026-10-20');
  const last = store.add('완료 둘');
  store.setCompleted(first.id, true);
  store.setCompleted(last.id, true);
  assert.deepEqual(store.removeCompleted(), [first.id, last.id]);
  assert.deepEqual(store.getAll(), [remaining]);
  assert.deepEqual(createTaskStore(storage).getAll(), [remaining]);
  assert.deepEqual(store.getProgress(), {total: 1, completed: 0, percent: 0});
  assert.equal(store.add('다음').id, 4);
});
test('완료 항목이 없으면 변경하지 않고 전체 완료는 빈 목록으로 만든다', () => {
  const store = createTaskStore();
  assert.deepEqual(store.removeCompleted(), []);
  const task = store.add('할 일');
  assert.deepEqual(store.removeCompleted(), []);
  assert.deepEqual(store.getAll(), [task]);
  store.setCompleted(task.id, true);
  assert.deepEqual(store.removeCompleted(), [task.id]);
  assert.deepEqual(store.getAll(), []);
  assert.equal(store.getProgress().percent, 0);
});
