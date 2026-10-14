const test=require('node:test');
const assert=require('node:assert/strict');
const {createTaskStore}=require('../task-store.js');
test('완료 날짜를 보존하고 해제 후 다시 완료하면 새 날짜를 기록한다',()=>{
 let raw=null;const storage={getItem:()=>raw,setItem:(k,v)=>{raw=v;}};
 const store=createTaskStore(storage);const task=store.add('기록');
 store.setCompleted(task.id,true,'2026-10-14');
 store.setCompleted(task.id,true,'2026-10-15');
 assert.equal(store.getHistory()[0].completedAt,'2026-10-14');
 assert.equal(createTaskStore(storage).getHistory()[0].completedAt,'2026-10-14');
 store.remove(task.id);store.undoDelete();assert.equal(store.getHistory()[0].completedAt,'2026-10-14');
 store.setCompleted(task.id,false);assert.deepEqual(store.getHistory(),[]);
 store.setCompleted(task.id,true,'2026-10-15');assert.equal(store.getHistory()[0].completedAt,'2026-10-15');
 const backup=createTaskStore();backup.replaceAll(store.getAll());assert.equal(backup.getHistory()[0].completedAt,'2026-10-15');
});
test('기존 완료 항목은 완료 날짜를 지어내지 않는다',()=>{
 const store=createTaskStore();store.replaceAll([{id:1,title:'기존',priority:'normal',dueDate:'',completed:true}]);
 assert.equal(store.getHistory()[0].completedAt,undefined);
});
