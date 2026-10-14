(function (root) {
  'use strict';
  const weights = { high: 0, normal: 1, low: 2 };
  function validateTasks(tasks) {
    if (!Array.isArray(tasks)) throw new Error('할 일 목록이 올바르지 않습니다.');
    const ids = new Set();
    return tasks.map(task => {
      if (!task || !Number.isSafeInteger(task.id) || task.id < 1 || ids.has(task.id) || typeof task.title !== 'string' || !task.title.trim() || task.title.length > 200 || !Object.hasOwn(weights, task.priority) || typeof task.completed !== 'boolean') throw new Error('할 일 데이터가 올바르지 않습니다.');
      ids.add(task.id);
      if (typeof task.dueDate !== 'string' || (task.dueDate !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) || task.dueDate.startsWith('0000') || !Number.isFinite(Date.parse(`${task.dueDate}T00:00:00Z`)) || new Date(`${task.dueDate}T00:00:00Z`).toISOString().slice(0, 10) !== task.dueDate))) throw new Error('마감일이 올바르지 않습니다.');
      return { id: task.id, title: task.title.trim(), priority: task.priority, dueDate: task.dueDate, completed: task.completed };
    });
  }
  function recommendBasic(tasks) {
    return validateTasks(tasks).filter(task => !task.completed)
      .sort((a, b) => weights[a.priority] - weights[b.priority] || (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99') || a.id - b.id)
      .map(task => ({ id: task.id, reason: task.dueDate ? `중요도를 먼저 고려했어요. 같은 중요도에서는 마감일 ${task.dueDate}을 고려해요.` : '중요도를 먼저 고려했어요. 같은 중요도에서 마감일이 없으면 날짜가 있는 일 다음에 추천해요.' }));
  }
  const api = { validateTasks, recommendBasic };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Recommendation = api;
})(globalThis);
