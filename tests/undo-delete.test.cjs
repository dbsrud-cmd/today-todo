const test = require('node:test');
const assert = require('node:assert/strict');
const {createTaskStore} = require('../task-store.js');
test('개별 삭제 취소는 전체 필드를 복원하고 사이에 추가·수정한 내용도 유지한다', () => {
  let raw=null;
  const storage={getItem:()=>raw,setItem:(key,value)=>{raw=value;}};
  const store=createTaskStore(storage);
  const original=store.add('원본','high','2026-10-20');
  store.setCompleted(original.id,true);
  const completed=store.getAll()[0];
  store.remove(original.id);
  const added=store.add('새 항목');
  store.update(added.id,'수정한 새 항목','low','');
  assert.equal(store.undoDelete(),1);
  assert.deepEqual(store.getAll()[0],completed);
  assert.equal(store.getAll()[1].title,'수정한 새 항목');
  assert.deepEqual(createTaskStore(storage).getAll(),store.getAll());
  assert.equal(store.undoDelete(),0);
});
test('일괄 삭제는 함께 복원하며 가장 최근 삭제만 취소한다',()=>{
  const store=createTaskStore();
  const a=store.add('하나');const b=store.add('둘');
  store.setCompleted(a.id,true);store.setCompleted(b.id,true);
  store.removeCompleted();assert.equal(store.getUndoCount(),2);
  assert.equal(store.undoDelete(),2);assert.equal(store.getProgress().percent,100);
  store.remove(a.id);store.remove(b.id);
  assert.equal(store.undoDelete(),1);assert.equal(store.getAll()[0].id,b.id);
});
test('백업 복원은 이전 삭제 취소 기록을 비운다',()=>{
  const store=createTaskStore();const a=store.add('하나');store.remove(a.id);
  store.replaceAll([]);assert.equal(store.getUndoCount(),0);
});
