// 화면과 무관한 데이터 처리입니다. 저장소를 전달하면 변경 때마다 저장합니다.
(function (root) {
  'use strict';
  const STORAGE_KEY = 'today-todo.tasks.v1';
  function dayKey(offset = 0, now = new Date()) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function createTaskStore(storage = null) {
    const tasks = [];
    let nextId = 1;
    let storageMessage = '';
    let corrupted = false;
    let lastDeleted = [];
    function planFields(planDate) {
      if (planDate === undefined) return {};
      if (!planDate) throw new Error('할 날짜를 선택해 주세요.');
      validate('날짜 검사', 'normal', planDate);
      return { planDate };
    }
    function completionFields(task) {
      if (!task.completed || task.completedAt === undefined) return {};
      return { completedAt: planFields(task.completedAt).planDate };
    }
    function validate(title, priority, dueDate) {
      if (typeof title !== 'string' || !title.trim()) throw new Error('할 일을 입력해 주세요.');
      if (title.trim().length > 200) throw new Error('할 일은 200자 이내로 입력해 주세요.');
      if (!['low', 'normal', 'high'].includes(priority)) throw new Error('중요도를 선택해 주세요.');
      if (dueDate !== '') {
        if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('마감일을 올바르게 입력해 주세요.');
        const date = new Date(`${dueDate}T00:00:00Z`);
        if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dueDate || dueDate.startsWith('0000')) throw new Error('존재하는 날짜를 입력해 주세요.');
      }
      return { title: title.trim(), priority, dueDate };
    }
    // 저장된 자료도 사용자 입력처럼 검사한 뒤 한꺼번에 복원합니다.
    if (storage) {
      let raw;
      try { raw = storage.getItem(STORAGE_KEY); }
      catch { storageMessage = '브라우저 저장소를 읽을 수 없어요. 현재 변경은 저장되지 않을 수 있어요.'; }
      if (raw !== undefined && raw !== null) {
        try {
          const data = JSON.parse(raw);
          if (data.version !== 1 || !Array.isArray(data.tasks)) throw new Error();
          const ids = new Set();
          const restored = data.tasks.map(task => {
            if (!task || !Number.isSafeInteger(task.id) || task.id < 1 || task.id >= Number.MAX_SAFE_INTEGER || ids.has(task.id) || typeof task.completed !== 'boolean') throw new Error();
            ids.add(task.id);
            return { id: task.id, ...validate(task.title, task.priority, task.dueDate), ...planFields(task.planDate), completed: task.completed, ...completionFields(task) };
          });
          tasks.push(...restored);
          nextId = restored.reduce((max, task) => Math.max(max, task.id + 1), 1);
        } catch {
          corrupted = true;
          storageMessage = '저장된 데이터를 복원할 수 없어요. 원본 보호를 위해 자동 저장을 중단했어요. 브라우저의 사이트 데이터를 초기화한 뒤 다시 열어 주세요.';
        }
      }
    }
    function persist() {
      if (!storage || corrupted) return;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, tasks }));
        storageMessage = '';
      } catch {
        storageMessage = '저장에 실패했어요. 현재 목록은 화면에만 남아 있어요. 저장 공간과 브라우저 설정을 확인하고, 이 페이지를 닫지 말아 주세요.';
      }
    }
    return {
      add(title, priority = 'normal', dueDate = '', planDate) {
        const fields = validate(title, priority, dueDate);
        const plan = planFields(planDate);
        const task = { id: nextId++, ...fields, ...plan, completed: false };
        tasks.push(task);
        persist();
        return { ...task };
      },
      update(id, title, priority, dueDate) {
        const task = tasks.find(task => task.id === id);
        if (!task) throw new Error('수정할 할 일을 찾을 수 없어요.');
        const fields = validate(title, priority, dueDate);
        Object.assign(task, fields);
        persist();
        return { ...task };
      },
      remove(id) {
        const index = tasks.findIndex(task => task.id === id);
        if (index === -1) throw new Error('삭제할 할 일을 찾을 수 없어요.');
        lastDeleted = [{ ...tasks[index] }];
        tasks.splice(index, 1);
        persist();
      },
      setCompleted(id, completed, completedDate = dayKey()) {
        const task = tasks.find(task => task.id === id);
        if (!task) throw new Error('할 일을 찾을 수 없어요.');
        if (typeof completed !== 'boolean') throw new Error('완료 상태는 체크 여부로 지정해 주세요.');
        const date = completed ? planFields(completedDate).planDate : undefined;
        if (completed && !task.completed) task.completedAt = date;
        if (!completed) delete task.completedAt;
        task.completed = completed;
        persist();
        return { ...task };
      },
      moveToDay(id, planDate) {
        const task = tasks.find(task => task.id === id);
        if (!task) throw new Error('할 일을 찾을 수 없어요.');
        if (task.completed) throw new Error('미완료 할 일만 옮길 수 있어요.');
        Object.assign(task, planFields(planDate));
        persist();
      },
      getForDay(day, today = dayKey()) {
        return tasks.filter(task => day === today ? !task.planDate || task.planDate <= today : task.planDate === day).map(task => ({ ...task }));
      },
      getHistory() {
        return tasks.filter(task => task.completed).map(task => ({ ...task }));
      },
      removeCompleted(visibleIds = tasks.map(task => task.id)) {
        const removedIds = tasks.filter(task => task.completed && visibleIds.includes(task.id)).map(task => task.id);
        if (!removedIds.length) return [];
        lastDeleted = tasks.filter(task => removedIds.includes(task.id)).map(task => ({ ...task }));
        for (let index = tasks.length - 1; index >= 0; index--) {
          if (removedIds.includes(tasks[index].id)) tasks.splice(index, 1);
        }
        persist();
        return removedIds;
      },
      getUndoCount() { return lastDeleted.length; },
      undoDelete() {
        if (!lastDeleted.length) return 0;
        const restoredCount = lastDeleted.length;
        tasks.push(...lastDeleted);
        tasks.sort((a, b) => a.id - b.id);
        lastDeleted = [];
        persist();
        return restoredCount;
      },
      getProgress(visibleIds = tasks.map(task => task.id)) {
        const visible = tasks.filter(task => visibleIds.includes(task.id));
        const total = visible.length;
        const completed = visible.filter(task => task.completed).length;
        // 할 일이 없을 때 0으로 나누지 않도록 먼저 확인합니다.
        return { total, completed, percent: total ? Math.round(completed / total * 100) : 0 };
      },
      getStorageMessage() { return storageMessage; },
      replaceAll(imported) {
        if (!Array.isArray(imported)) throw new Error('백업 파일이 올바르지 않아요.');
        const ids = new Set();
        const validated = imported.map(task => {
          if (!task || !Number.isSafeInteger(task.id) || task.id < 1 || task.id >= Number.MAX_SAFE_INTEGER || ids.has(task.id) || typeof task.completed !== 'boolean') throw new Error('백업 파일이 올바르지 않아요.');
          ids.add(task.id);
          return { id: task.id, ...validate(task.title, task.priority, task.dueDate), ...planFields(task.planDate), completed: task.completed, ...completionFields(task) };
        });
        if (corrupted) throw new Error('손상된 저장소를 초기화한 뒤 복원해 주세요.');
        lastDeleted = [];
        tasks.splice(0, tasks.length, ...validated);
        nextId = validated.reduce((max, task) => Math.max(max, task.id + 1), 1);
        persist();
      },
      // 복사본을 반환해 화면 코드가 원본을 실수로 바꾸지 않도록 합니다.
      getAll() { return tasks.map(task => ({ ...task })); }
    };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createTaskStore, STORAGE_KEY, dayKey };
  } else {
    root.TaskStore = { createTaskStore, STORAGE_KEY, dayKey };
  }
})(globalThis);
