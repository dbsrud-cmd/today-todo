// 공개 가능한 화면 파일만 복사합니다. .env와 개인 데이터는 포함하지 않습니다.
const fs=require('node:fs');
const path=require('node:path');
const output=path.join(__dirname,'publish');
fs.mkdirSync(output,{recursive:true});
for(const file of ['index.html','styles.css','app.js','task-store.js','recommendation.js','recommendation-ui.js']) fs.copyFileSync(path.join(__dirname,file),path.join(output,file));
fs.writeFileSync(path.join(output,'.nojekyll'),'');
console.log('배포 화면 파일 6개를 publish 폴더에 준비했습니다.');
