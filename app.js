'use strict';
let browserStorage = null;
let storageAccessMessage = '';
try { browserStorage = window.localStorage; }
catch { storageAccessMessage = '이 브라우저에서는 저장소를 사용할 수 없어요. 페이지를 닫으면 목록이 사라집니다.'; }
const store = TaskStore.createTaskStore(browserStorage);
const form = document.getElementById('task-form');
const input = document.getElementById('task-title');
const error = document.getElementById('error-message');
const list = document.getElementById('task-list');
const emptyMessage = document.getElementById('empty-message');
const count = document.getElementById('task-count');
const status = document.getElementById('status-message');
const priority = document.getElementById('task-priority');
const dueDate = document.getElementById('task-due-date');
const submitButton = document.getElementById('submit-button');
const cancelButton = document.getElementById('cancel-button');
const formLabel = document.getElementById('form-label');
const progressBar = document.getElementById('task-progress');
const progressLabel = document.getElementById('progress-label');
const storageNotice = document.getElementById('storage-notice');
const priorityLabels = { low: '★ 낮음', normal: '★★ 보통', high: '★★★ 높음' };
const priorityOrder = { high: 0, normal: 1, low: 2 };
const deleteCompletedButton = document.getElementById('delete-completed-button');
const undoPanel = document.getElementById('undo-panel');
const undoMessage = document.getElementById('undo-message');
let selectedDay = 'today';
function selectedDate() { return TaskStore.dayKey(selectedDay === 'today' ? 0 : 1); }
const historyFilters = ['year', 'month', 'day', 'weekday'].map(name => document.getElementById(`history-${name}`));
for (const [index, max] of [[1, 12], [2, 31]]) {
  for (let value = 1; value <= max; value++) historyFilters[index].add(new Option(`${value}${index === 1 ? '월' : '일'}`, String(value)));
}
historyFilters.forEach(filter => filter.addEventListener('change', () => { hideCelebration(); renderTasks(); }));
document.getElementById('history-reset').addEventListener('click', () => {
  historyFilters.forEach(filter => { filter.value = ''; });
  renderTasks();
});
function getViewTasks() {
  if (selectedDay !== 'history') return store.getForDay(selectedDate());
  const [year, month, day, weekday] = historyFilters.map(filter => filter.value);
  return store.getHistory().filter(task => {
    if (!year && !month && !day && !weekday) return true;
    if (!task.completedAt) return false;
    const [y, m, d] = task.completedAt.split('-').map(Number);
    return (!year || y === Number(year)) && (!month || m === Number(month)) && (!day || d === Number(day)) && (!weekday || new Date(y, m - 1, d, 12).getDay() === Number(weekday));
  });
}
function displayDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(year, month - 1, day, 12));
}
function paintDate(element, key) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  const weekday = document.createElement('span');
  weekday.className = 'date-weekday';
  weekday.textContent = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(date);
  element.replaceChildren(`${year}년 ${month}월 ${day}일 `, weekday);
}
function getViewProgress() { return store.getProgress(getViewTasks().map(task => task.id)); }
for (const [id, day] of [['today-tab', 'today'], ['tomorrow-tab', 'tomorrow'], ['history-tab', 'history']]) {
  document.getElementById(id).addEventListener('click', () => {
    selectedDay = day;
    resetForm();
    hideCelebration();
    renderTasks();
    status.textContent = day === 'history' ? '완료 날짜별 기록을 보고 있어요.' : day === 'today' ? '오늘 할 일을 보고 있어요.' : '내일 할 일을 보고 있어요.';
  });
}
document.getElementById('undo-delete-button').addEventListener('click', () => {
  const restoredCount = store.undoDelete();
  if (!restoredCount) return;
  renderTasks();
  status.textContent = `삭제한 할 일 ${restoredCount}개를 되돌렸어요.`;
  input.focus();
});
let editingId = null;
let celebrationTimer;
function celebrateCompletion() {
  const celebration = document.getElementById('celebration');
  const confetti = document.getElementById('confetti');
  clearTimeout(celebrationTimer);
  confetti.replaceChildren();
  celebration.hidden = false;
  // 움직임 줄이기를 설정한 사용자는 축하 메시지만 보게 합니다.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const colors = ['#ef6680', '#f3be32', '#56a879', '#6493eb', '#aa79d6'];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('span');
      piece.className = `confetti-piece color-${i % colors.length}`;
      // 서버의 보안 설정을 유지하도록 위치와 색은 CSS 클래스에서 지정합니다.
      piece.classList.add(`lane-${i % 12}`, `delay-${i % 5}`);
      confetti.appendChild(piece);
    }
  }
  celebrationTimer = setTimeout(() => { celebration.hidden = true; confetti.replaceChildren(); }, 3500);
}

function hideCelebration() {
  clearTimeout(celebrationTimer);
  document.getElementById('celebration').hidden = true;
  document.getElementById('confetti').replaceChildren();
}

function resetForm() {
  editingId = null;
  form.reset();
  error.textContent = '';
  input.removeAttribute('aria-invalid');
  submitButton.textContent = '추가';
  formLabel.textContent = '새 할 일';
  cancelButton.hidden = true;
}

cancelButton.addEventListener('click', () => {
  resetForm();
  status.textContent = '수정을 취소했어요.';
  input.focus();
});

deleteCompletedButton.addEventListener('click', () => {
  const completedCount = getViewProgress().completed;
  if (!completedCount || !window.confirm(`완료한 할 일 ${completedCount}개를 모두 삭제할까요? 삭제 후 ‘삭제 취소’로 되돌릴 수 있어요.`)) return;
  const removedIds = store.removeCompleted(getViewTasks().map(task => task.id));
  // 삭제된 항목을 수정 중이었다면 추가 화면으로 돌아갑니다.
  if (removedIds.includes(editingId)) resetForm();
  hideCelebration();
  renderTasks();
  status.textContent = `완료한 할 일 ${removedIds.length}개를 삭제했어요. 남은 할 일은 ${store.getAll().length}개입니다.`;
  input.focus();
});

function renderTasks() {
  const history = selectedDay === 'history';
  const yearFilter = historyFilters[0];
  const savedYear = yearFilter.value;
  const years = new Set(store.getHistory().filter(task => task.completedAt).map(task => task.completedAt.slice(0, 4)));
  if (savedYear) years.add(savedYear);
  yearFilter.replaceChildren(new Option('전체 연도', ''));
  [...years].sort().reverse().forEach(year => yearFilter.add(new Option(`${year}년`, year)));
  yearFilter.value = savedYear;
  document.getElementById('history-filters').hidden = !history;
  document.getElementById('history-tab').setAttribute('aria-pressed', String(history));
  form.hidden = history;
  document.querySelector('[aria-labelledby="recommend-heading"]').hidden = history;
  document.getElementById('list-heading').textContent = history ? '완료 기록' : '내 할 일';
  if (history) document.getElementById('day-date').textContent = '날짜별 완료 기록';
  else paintDate(document.getElementById('day-date'), selectedDate());
  document.getElementById('today-tab').setAttribute('aria-pressed', String(selectedDay === 'today'));
  document.getElementById('tomorrow-tab').setAttribute('aria-pressed', String(selectedDay === 'tomorrow'));
  document.getElementById('day-help').textContent = history ? '최근 완료 날짜부터 보여줘요. 체크를 해제하면 기록에서 빠집니다. 삭제한 항목은 기록에서도 사라져요.' : `${selectedDay === 'today' ? '오늘' : '내일'} 할 일입니다. 새 할 일은 이 탭에 추가됩니다.`;
  const undoCount = store.getUndoCount();
  undoPanel.hidden = undoCount === 0;
  undoMessage.textContent = `할 일 ${undoCount}개를 삭제했어요.`;
  document.dispatchEvent(new Event('tasks-changed'));
  const storageMessage = storageAccessMessage || store.getStorageMessage();
  storageNotice.textContent = storageMessage || '변경사항을 이 브라우저에 자동 저장합니다. 같은 브라우저에서 이 파일을 다시 열면 복원됩니다.';
  storageNotice.classList.toggle('error', Boolean(storageMessage));
  // 복사본만 정렬합니다. 완료 항목을 아래로, 별이 많은 항목을 위로 표시합니다.
  const tasks = getViewTasks().sort((a, b) =>
    (history ? (b.completedAt || '').localeCompare(a.completedAt || '') : 0) ||
    Number(a.completed) - Number(b.completed) ||
    priorityOrder[a.priority] - priorityOrder[b.priority] || a.id - b.id
  );
  list.replaceChildren();
  let previousGroup;
  for (const task of tasks) {
    if (history) {
      const group = task.completedAt || '';
      if (group !== previousGroup) {
        const header = document.createElement('li');
        header.className = 'history-date';
        const heading = document.createElement('h3');
        if (group) paintDate(heading, group);
        else heading.textContent = '날짜 미상 (기존 완료 항목)';
        header.appendChild(heading);
        list.appendChild(header);
        previousGroup = group;
      }
    }
    const item = document.createElement('li');
    item.classList.toggle('completed', task.completed);
    const heading = document.createElement('div');
    heading.className = 'task-heading';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `complete-${task.id}`;
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `${task.title} 완료`);
    checkbox.addEventListener('change', () => {
      const before = getViewProgress();
      const updated = store.setCompleted(task.id, checkbox.checked);
      renderTasks();
      // 목록을 다시 그린 뒤에도 같은 체크박스에 키보드 초점을 유지합니다.
      const focusTarget = document.getElementById(`complete-${task.id}`);
      if (focusTarget) focusTarget.focus();
      else document.getElementById('history-tab').focus();
      const progress = getViewProgress();
      status.textContent = `${updated.title}: ${updated.completed ? '완료' : '미완료'}로 변경했어요. 진행률 ${progress.percent}%입니다.`;
      if (!history && updated.completed && before.completed < before.total && progress.total > 0 && progress.completed === progress.total) celebrateCompletion();
    });
    // 입력 내용을 HTML이 아닌 글자로 표시합니다.
    const title = document.createElement('label');
    title.htmlFor = checkbox.id;
    title.className = 'task-title';
    title.textContent = task.title;
    const details = document.createElement('p');
    details.className = 'task-details';
    details.textContent = `중요도: ${priorityLabels[task.priority]} · 마감일: ${task.dueDate || '없음'}`;
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'secondary';
    edit.textContent = '수정';
    edit.setAttribute('aria-label', `${task.title} 수정`);
    edit.addEventListener('click', () => {
      resetForm();
      editingId = task.id;
      input.value = task.title;
      priority.value = task.priority;
      dueDate.value = task.dueDate;
      formLabel.textContent = '할 일 수정';
      submitButton.textContent = '저장';
      cancelButton.hidden = false;
      status.textContent = '내용을 바꾸고 저장을 눌러 주세요.';
      input.focus();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = '삭제';
    remove.setAttribute('aria-label', `${task.title} 삭제`);
    remove.addEventListener('click', () => {
      store.remove(task.id);
      if (editingId === task.id) resetForm();
      renderTasks();
      status.textContent = `할 일을 삭제했어요. 총 ${store.getAll().length}개입니다.`;
      input.focus();
    });
    if (!history) actions.appendChild(edit);
    actions.appendChild(remove);
    if (!task.completed) {
      const move = document.createElement('button');
      move.type = 'button';
      move.className = 'secondary';
      const moveLabel = selectedDay === 'today' ? '내일로 보내기' : '오늘로 보내기';
      move.textContent = moveLabel;
      move.setAttribute('aria-label', `${task.title} ${moveLabel}`);
      move.addEventListener('click', () => {
        store.moveToDay(task.id, TaskStore.dayKey(selectedDay === 'today' ? 1 : 0));
        if (editingId === task.id) resetForm();
        hideCelebration();
        renderTasks();
        status.textContent = `${task.title}: ${moveLabel} 완료했어요.`;
        document.getElementById(selectedDay === 'today' ? 'tomorrow-tab' : 'today-tab').focus();
      });
      actions.appendChild(move);
    }
    heading.append(checkbox, title);
    const badge = document.createElement('span');
    badge.className = 'priority-badge';
    badge.textContent = priorityLabels[task.priority];
    item.append(heading, badge, details, actions);
    list.appendChild(item);
  }
  count.textContent = `${tasks.length}개`;
  emptyMessage.hidden = tasks.length > 0;
  emptyMessage.textContent = history ? '선택한 조건에 맞는 완료 기록이 없어요.' : `${selectedDay === 'today' ? '오늘' : '내일'} 할 일이 없어요. 첫 할 일을 추가해 보세요.`;
  const progress = getViewProgress();
  deleteCompletedButton.disabled = progress.completed === 0;
  deleteCompletedButton.textContent = `완료한 일 모두 삭제 (${progress.completed}개)`;
  if (progress.total === 0 || progress.completed !== progress.total) hideCelebration();
  progressLabel.textContent = `진행률: 전체 ${progress.total}개 중 ${progress.completed}개 완료 (${progress.percent}%)`;
  progressBar.value = progress.percent;
  progressBar.textContent = `${progress.percent}%`;
}

form.addEventListener('submit', event => {
  event.preventDefault(); // 제출 시 페이지가 새로고침되지 않게 합니다.
  error.textContent = '';
  input.removeAttribute('aria-invalid');
  try {
    if (dueDate.validity.badInput || dueDate.validity.rangeUnderflow || dueDate.validity.rangeOverflow) {
      throw new Error('마감일을 올바르게 입력해 주세요.');
    }
    const isEditing = editingId !== null;
    if (isEditing) store.update(editingId, input.value, priority.value, dueDate.value);
    else store.add(input.value, priority.value, dueDate.value, selectedDate());
    renderTasks();
    resetForm();
    status.textContent = `할 일을 ${isEditing ? '수정' : '추가'}했어요. 총 ${store.getAll().length}개입니다.`;
  } catch (cause) {
    error.textContent = cause.message;
    if (!input.value.trim() || input.value.trim().length > 200) input.setAttribute('aria-invalid', 'true');
    status.textContent = '';
  }
  input.focus();
});
renderTasks();
// 자정이 지나거나 다른 창에서 돌아오면 오늘·내일 날짜를 다시 계산합니다.
let renderedDate = TaskStore.dayKey();
function refreshDay() {
  if (renderedDate !== TaskStore.dayKey()) {
    renderedDate = TaskStore.dayKey();
    resetForm();
    hideCelebration();
    renderTasks();
  }
}
setInterval(refreshDay, 30000);
document.addEventListener('visibilitychange', refreshDay);
