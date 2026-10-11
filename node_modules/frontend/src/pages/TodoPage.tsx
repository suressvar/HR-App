import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import type { TodoItem } from '../types/models';
import { CheckSquare, Square, Trash2, PlusCircle, AlertCircle, CheckCircle2, Bell, Clock, X, Check, FileSpreadsheet } from 'lucide-react';

export const TodoPage: React.FC = () => {
  const { token } = useAuth();
  const { searchQuery } = useSearch();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GET /api/todos
  const { data: todos, isLoading, isError, error } = useQuery<TodoItem[]>({
    queryKey: ['todos'],
    queryFn: () => fetchApi<TodoItem[]>('/todos', {}, token),
  });

  // POST /api/todos
  const createTodoMutation = useMutation({
    mutationFn: (title: string) =>
      fetchApi<TodoItem>('/todos', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setErrorMessage(null);
      setNewTitle('');
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to add item to checklist.');
    },
  });

  // PATCH /api/todos/:id
  const toggleTodoMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      fetchApi<TodoItem>(`/todos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update checklist item.');
    },
  });

  // DELETE /api/todos/:id
  const deleteTodoMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ message: string }>(`/todos/${id}`, {
        method: 'DELETE',
      }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to delete checklist item.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorMessage('Please type a task description.');
      return;
    }
    createTodoMutation.mutate(newTitle.trim());
  };

  const handleToggle = (todo: TodoItem) => {
    toggleTodoMutation.mutate({ id: todo.id, completed: !todo.completed });
  };

  const handleDelete = (id: string) => {
    deleteTodoMutation.mutate(id);
  };

  // Reminders local storage state
  const [reminders, setReminders] = useState<{ [id: string]: string }>(() => {
    const saved = localStorage.getItem('todo_reminders');
    return saved ? JSON.parse(saved) : {};
  });

  // Modal control states
  const [reminderModalTodo, setReminderModalTodo] = useState<TodoItem | null>(null);
  const [reminderTimeInput, setReminderTimeInput] = useState('');
  const [activeReminderTodo, setActiveReminderTodo] = useState<TodoItem | null>(null);

  useEffect(() => {
    localStorage.setItem('todo_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();

      const dueTodoId = Object.keys(reminders).find((id) => {
        const reminderTime = new Date(reminders[id]).getTime();
        const isCompleted = todos?.find((t) => t.id === id)?.completed;
        return now >= reminderTime && !isCompleted;
      });

      if (dueTodoId) {
        const todo = todos?.find((t) => t.id === dueTodoId);
        if (todo) {
          setActiveReminderTodo(todo);
          setReminders((prev) => {
            const next = { ...prev };
            delete next[dueTodoId];
            return next;
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reminders, todos]);

  const handleOpenReminderModal = (todo: TodoItem) => {
    setReminderModalTodo(todo);
    if (reminders[todo.id]) {
      const date = new Date(reminders[todo.id]);
      const localISO = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setReminderTimeInput(localISO);
    } else {
      const defaultDate = new Date(Date.now() + 60 * 60000);
      const localISO = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setReminderTimeInput(localISO);
    }
  };

  const formatReminderTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredAllTodos = (todos || []).filter((t) => {
    if (!searchQuery.trim()) return true;
    return t.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const pendingTodos = filteredAllTodos.filter((t) => !t.completed);
  const completedTodos = filteredAllTodos.filter((t) => t.completed);

  return (
    <div className="space-y-4 max-w-4xl mx-auto font-sans">
      {/* Excel Sheet Banner */}
      <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#107c41] flex items-center justify-center text-white font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Personal To-Do & Memos</h1>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-bold underline text-emerald-700">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white rounded-lg border border-slate-300 p-3 shadow-xs">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Type a new task to check off and press Enter..."
            className="flex-1 px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:outline-none focus:border-[#107c41] focus:bg-white text-xs"
          />
          <button
            type="submit"
            disabled={createTodoMutation.isPending}
            className="px-4 py-2 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </form>
      </div>

      {/* Checklist Display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-xs text-slate-500">
          Loading checklist items...
        </div>
      ) : isError ? (
        <div className="p-4 bg-red-50 text-red-700 text-xs">
          Failed to load checklist: {(error as Error).message}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Items */}
          <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
            <div className="bg-[#f8fafc] px-3.5 py-2 border-b border-slate-300 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Active Checklist Items ({pendingTodos.length})
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {pendingTodos.length > 0 ? (
                pendingTodos.map((todo) => (
                  <div key={todo.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors group text-xs">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-4">
                      <button
                        onClick={() => handleToggle(todo)}
                        className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer min-w-0"
                      >
                        <Square className="w-4 h-4 text-slate-400 group-hover:text-[#107c41] shrink-0" />
                        <span className="font-medium text-slate-900 leading-relaxed truncate">{todo.title}</span>
                      </button>

                      {reminders[todo.id] && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[15px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shrink-0">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>{formatReminderTime(reminders[todo.id])}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenReminderModal(todo)}
                        className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          reminders[todo.id]
                            ? 'text-amber-800 bg-amber-100'
                            : 'text-slate-400 hover:text-[#107c41] hover:bg-slate-100'
                        }`}
                        title="Set reminder alarm"
                      >
                        <Bell className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(todo.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No active items left. Type above and click "Add Item" to create one.
                </div>
              )}
            </div>
          </div>

          {/* Completed Items */}
          {completedTodos.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden opacity-80">
              <div className="bg-slate-50 px-3.5 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500 text-[16px]">
                  Completed Items ({completedTodos.length})
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {completedTodos.map((todo) => (
                  <div key={todo.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors group text-xs">
                    <button
                      onClick={() => handleToggle(todo)}
                      className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
                    >
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium text-slate-400 line-through leading-relaxed">{todo.title}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(todo.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Set Reminder Modal */}
      {reminderModalTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-300 shadow-2xl p-5 relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#107c41]" />
                <span>Set Task Reminder</span>
              </h2>
              <button
                onClick={() => setReminderModalTodo(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-700 mb-3 font-medium">
              Task: <strong className="text-slate-900">{reminderModalTodo.title}</strong>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reminder Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={reminderTimeInput}
                  onChange={(e) => setReminderTimeInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs"
                />
              </div>

              <div className="flex justify-between gap-2 pt-2 border-t border-slate-200">
                {reminders[reminderModalTodo.id] ? (
                  <button
                    type="button"
                    onClick={() => {
                      setReminders((prev) => {
                        const next = { ...prev };
                        delete next[reminderModalTodo.id];
                        return next;
                      });
                      setReminderModalTodo(null);
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg border border-red-200 text-xs"
                  >
                    Delete Alarm
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReminderModalTodo(null)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!reminderTimeInput) return;
                      const targetTime = new Date(reminderTimeInput).toISOString();
                      setReminders((prev) => ({
                        ...prev,
                        [reminderModalTodo.id]: targetTime,
                      }));
                      setReminderModalTodo(null);
                    }}
                    className="px-4 py-1.5 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    Save Reminder
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Triggered Alarm Modal */}
      {activeReminderTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-white rounded-xl border-2 border-amber-500 shadow-2xl p-5 relative animate-bounce-short">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Task Reminder Due!</h2>
                <p className="text-xs text-slate-500">This task is due for action now</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4 text-xs font-bold text-slate-900">
              {activeReminderTodo.title}
            </div>

            <div className="flex gap-2 justify-end text-xs">
              <button
                type="button"
                onClick={() => setActiveReminderTodo(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggle(activeReminderTodo);
                  setActiveReminderTodo(null);
                }}
                className="px-4 py-2 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Mark Completed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
