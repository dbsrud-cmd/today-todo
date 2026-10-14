const test = require('node:test');
const assert = require('node:assert/strict');
const { createTaskStore, STORAGE_KEY } = require('../task-store.js');
function memoryStorage(initial = null) {
  const values = new Map(initial === null ? [] : [[STORAGE_KEY, initial]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
test('새 저장소에서 시작하고 전체 필드와 완료 상태를 복원한다', () => {
  const storage = memoryStorage();
  const first = createTaskStore(storage);
  const task = first.add('보고서', 'high', '2026-10-20');
  first.setCompleted(task.id, true);
  const restored = createTaskStore(storage);
  assert.deepEqual(restored.getAll(), first.getAll());
  assert.equal(restored.getProgress().percent, 100);
  assert.equal(restored.add('다음 할 일').id, 2);
});
test('수정·완료 해제·삭제와 빈 목록을 저장한다', () => {
  const storage = memoryStorage();
  const store = createTaskStore(storage);
  const task = store.add('원본');
  store.setCompleted(task.id, true);
  store.update(task.id, '수정', 'low', '');
  assert.equal(createTaskStore(storage).getAll()[0].title, '수정');
  store.setCompleted(task.id, false);
  assert.equal(createTaskStore(storage).getAll()[0].completed, false);
  store.remove(task.id);
  assert.deepEqual(createTaskStore(storage).getAll(), []);
});
test('손상된 자료를 부분 복원하거나 덮어쓰지 않는다', () => {
  const valid = { id: 1, title: '정상', priority: 'normal', dueDate: '', completed: false };
  for (const raw of ['broken', 'null', JSON.stringify({version: 2, tasks: []}), JSON.stringify({version: 1, tasks: [valid, valid]}), JSON.stringify({version: 1, tasks: [{...valid, dueDate: '2026-02-30'}]}), JSON.stringify({version: 1, tasks: [{...valid, completed: 'true'}]})]) {
    const storage = memoryStorage(raw);
    const store = createTaskStore(storage);
    assert.deepEqual(store.getAll(), []);
    assert.match(store.getStorageMessage(), /복원할 수 없어요/);
    store.add('임시 항목');
    assert.equal(storage.getItem(STORAGE_KEY), raw);
  }
});
test('읽기·쓰기 실패를 알리고 메모리 목록은 사용할 수 있다', () => {
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  const store = createTaskStore(storage);
  assert.match(store.getStorageMessage(), /읽을 수 없어요/);
  store.add('임시');
  assert.equal(store.getAll().length, 1);
  assert.match(store.getStorageMessage(), /저장에 실패/);
});
test('일시적인 저장 실패 후 다음 변경에서 다시 저장한다', () => {
  const storage = memoryStorage();
  const write = storage.setItem;
  storage.setItem = () => { throw new Error('quota'); };
  const store = createTaskStore(storage);
  const task = store.add('유지');
  storage.setItem = write;
  store.setCompleted(task.id, true);
  assert.equal(store.getStorageMessage(), '');
  assert.deepEqual(createTaskStore(storage).getAll(), store.getAll());
});
