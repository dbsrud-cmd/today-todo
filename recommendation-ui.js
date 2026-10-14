'use strict';
const recommendButton = document.getElementById('recommend-button');
const recommendStatus = document.getElementById('recommend-status');
const recommendList = document.getElementById('recommend-list');
document.addEventListener('tasks-changed', () => {
  recommendList.replaceChildren();
  recommendStatus.textContent = '목록이 바뀌었어요. 추천 순서를 다시 확인해 주세요.';
});
recommendButton.addEventListener('click', () => {
  recommendList.replaceChildren();
  try {
    const snapshot = getViewTasks().filter(task => !task.completed);
    if (!snapshot.length) { recommendStatus.textContent = '추천할 미완료 할 일이 없어요.'; return; }
    for (const result of Recommendation.recommendBasic(snapshot)) {
      const task = snapshot.find(task => task.id === result.id);
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = task.title;
      const badge = document.createElement('span');
      badge.className = 'priority-badge';
      badge.textContent = priorityLabels[task.priority];
      const reason = document.createElement('p');
      reason.className = 'hint';
      reason.textContent = result.reason;
      item.append(title, badge, reason);
      recommendList.appendChild(item);
    }
    recommendStatus.textContent = '중요도 → 마감일 순으로 추천했어요.';
  } catch (error) { recommendStatus.textContent = error.message; }
});
const backupStatus = document.getElementById('backup-status');
document.getElementById('export-button').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ version: 1, tasks: store.getAll() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'today-todo-backup.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  backupStatus.textContent = '백업 파일에는 할 일 내용이 담겨 있어요. 안전한 곳에 보관해 주세요.';
});
document.getElementById('import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 1000000) throw new Error('백업 파일은 1MB 이하로 선택해 주세요.');
    const backup = JSON.parse(await file.text());
    if (!backup || backup.version !== 1 || !Array.isArray(backup.tasks)) throw new Error('백업 파일 형식이 올바르지 않아요.');
    if (!window.confirm('현재 목록을 백업 파일의 목록으로 바꿀까요?')) return;
    store.replaceAll(backup.tasks);
    resetForm();
    renderTasks();
    backupStatus.textContent = store.getStorageMessage() || '목록과 완료 상태를 복원했어요.';
  } catch (error) { backupStatus.textContent = error.message; }
  finally { event.target.value = ''; }
});
