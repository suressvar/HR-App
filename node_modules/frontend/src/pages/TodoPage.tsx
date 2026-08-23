import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { TodoItem } from '../types/models';
import { CheckSquare, Square, Trash2, PlusCircle, AlertCircle, CheckCircle2, ClipboardList } from 'lucide-react';

export const TodoPage: React.FC = () => {
  const { token } = useAuth();
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
    onSuccess: (newTodo) => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setErrorMessage(null);
      setNewTitle('');
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to add to-do item.');
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
      setErrorMessage(err.message || 'Failed to update to-do item.');
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
      setErrorMessage(err.message || 'Failed to delete to-do item.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorMessage('Please type a task.');
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

  const pendingTodos = todos?.filter((t) => !t.completed) || [];
  const completedTodos = todos?.filter((t) => t.completed) || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-ink tracking-tight flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-brand" />
          <span>My Personal Checklist</span>
        </h1>
        <p className="text-ink-muted text-base mt-1.5">Keep track of your private short-term goals and custom notes.</p>
      </div>

      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-base flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-base flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Input Section */}
      <div className="bg-white rounded-xl border border-border p-4.5 shadow-sm">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Type a new item to check off (e.g. Call supervisor, review reports)..."
            className="flex-1 px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-base"
          />
          <button
            type="submit"
            disabled={createTodoMutation.isPending}
            className="px-6 py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg text-base shadow-md shadow-purple-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="hidden sm:inline">Add Item</span>
          </button>
        </form>
      </div>

      {/* Checklist Display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : isError ? (
        <div className="p-6 text-red-600 text-base bg-red-50/50 rounded-xl border border-red-100">
          Failed to load checklist: {(error as Error).message}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Items */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
              <span className="text-sm font-bold text-ink uppercase tracking-wider">Active Items ({pendingTodos.length})</span>
            </div>

            <div className="divide-y divide-border">
              {pendingTodos.length > 0 ? (
                pendingTodos.map((todo) => (
                  <div key={todo.id} className="p-4 flex items-center justify-between hover:bg-slate-50/30 transition-colors group">
                    <button
                      onClick={() => handleToggle(todo)}
                      className="flex items-center gap-3 text-left focus:outline-none cursor-pointer"
                    >
                      <Square className="w-5.5 h-5.5 text-slate-400 group-hover:text-brand transition-colors shrink-0" />
                      <span className="text-base font-medium text-ink leading-relaxed">{todo.title}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(todo.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-ink-muted text-base">
                  No active to-do items. Add one above!
                </div>
              )}
            </div>
          </div>

          {/* Completed Items */}
          {completedTodos.length > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden opacity-80">
              <div className="p-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
                <span className="text-sm font-bold text-ink-muted uppercase tracking-wider">Completed ({completedTodos.length})</span>
              </div>

              <div className="divide-y divide-border">
                {completedTodos.map((todo) => (
                  <div key={todo.id} className="p-4 flex items-center justify-between hover:bg-slate-50/30 transition-colors group">
                    <button
                      onClick={() => handleToggle(todo)}
                      className="flex items-center gap-3 text-left focus:outline-none cursor-pointer"
                    >
                      <CheckSquare className="w-5.5 h-5.5 text-brand shrink-0" />
                      <span className="text-base font-medium text-ink-muted line-through leading-relaxed">{todo.title}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(todo.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
