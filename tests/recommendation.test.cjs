const test = require('node:test');
const assert = require('node:assert/strict');
const { recommendBasic } = require('../recommendation.js');
const { createServer } = require('../server.cjs');
const tasks = [
 {id:1,title:'중요한 일',priority:'high',dueDate:'',completed:false},
 {id:2,title:'빠른 마감',priority:'low',dueDate:'2026-10-15',completed:false},
 {id:3,title:'완료',priority:'high',dueDate:'2026-10-14',completed:true}
];
test('중요도 우선이며 완료를 제외하고 원본을 유지한다',()=>{
 const before=JSON.stringify(tasks);
 assert.deepEqual(recommendBasic(tasks).map(t=>t.id),[1,2]);
 assert.equal(JSON.stringify(tasks),before);
 assert.deepEqual(recommendBasic([]),[]);
});
test('같은 중요도에서는 마감일과 추가 순서를 고려한다',()=>{
 const list=[{...tasks[0],id:1,dueDate:''},{...tasks[0],id:2,dueDate:'2026-10-20'},{...tasks[0],id:3,dueDate:'2026-10-15'},{...tasks[0],id:4,dueDate:'2026-10-15'}];
 assert.deepEqual(recommendBasic(list).map(t=>t.id),[3,4,2,1]);
});
test('백업 복원은 완료 상태를 유지하며 잘못된 복원은 원본을 바꾸지 않는다',()=>{
 const {createTaskStore}=require('../task-store.js');
 const store=createTaskStore();store.replaceAll(tasks);
 assert.deepEqual(store.getAll(),tasks);
 assert.throws(()=>store.replaceAll([...tasks,tasks[0]]));
 assert.deepEqual(store.getAll(),tasks);
});
test('AI API와 비밀 파일을 제공하지 않는다',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 try {
  assert.equal((await fetch(base)).status,200);
  for(const route of ['/.env','/server.cjs','/api/config','/api/recommend']) assert.equal((await fetch(base+route)).status,404);
  assert.equal((await fetch(base+'/api/recommend',{method:'POST'})).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
