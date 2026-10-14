const test=require('node:test');
const assert=require('node:assert/strict');
const {createTaskStore,dayKey}=require('../task-store.js');
test('월말·연말에도 내일 날짜를 계산한다',()=>{
 assert.equal(dayKey(1,new Date(2026,11,31,12)),'2027-01-01');
 assert.equal(dayKey(1,new Date(2028,1,28,12)),'2028-02-29');
});
test('기존 데이터와 밀린 일은 오늘, 내일 항목은 다음 날 오늘로 표시한다',()=>{
 const store=createTaskStore();const old=store.add('기존');
 const task=store.add('오늘','high','2026-10-20','2026-10-14');
 store.moveToDay(task.id,'2026-10-15');
 assert.deepEqual(store.getForDay('2026-10-14','2026-10-14').map(t=>t.id),[old.id]);
 assert.deepEqual(store.getForDay('2026-10-15','2026-10-14').map(t=>t.id),[task.id]);
 assert.deepEqual(store.getForDay('2026-10-15','2026-10-15').map(t=>t.id),[old.id,task.id]);
 assert.equal(store.getAll()[1].dueDate,'2026-10-20');
 assert.throws(()=>store.moveToDay(task.id,'2026-02-30'));
 store.setCompleted(task.id,true);assert.throws(()=>store.moveToDay(task.id,'2026-10-16'));
});
test('계획 날짜의 저장·백업·삭제 취소와 탭별 삭제·진행률',()=>{
 let raw=null;const storage={getItem:()=>raw,setItem:(k,v)=>{raw=v;}};
 const store=createTaskStore(storage);
 const a=store.add('오늘','normal','','2026-10-14');const b=store.add('내일','high','','2026-10-15');
 store.setCompleted(a.id,true);store.setCompleted(b.id,true);
 assert.deepEqual(store.getProgress([a.id]),{total:1,completed:1,percent:100});
 store.removeCompleted([a.id]);assert.equal(store.getAll()[0].id,b.id);
 store.undoDelete();assert.equal(store.getAll()[0].planDate,'2026-10-14');
 assert.deepEqual(createTaskStore(storage).getAll(),store.getAll());
 const imported=createTaskStore();imported.replaceAll(store.getAll());assert.deepEqual(imported.getAll(),store.getAll());
});
