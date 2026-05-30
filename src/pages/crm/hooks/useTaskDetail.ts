import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import type { CrmTask, CompanyMember, PaginatedResponse } from '@/shared/types';

export function useTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const taskId = Number(id);

  const {
    data: task,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['crm', 'task', taskId],
    enabled: !isNaN(taskId),
    queryFn: async () => {
      const { data } = await apiClient.get<CrmTask>(API.crm.taskDetail(taskId));
      return data;
    },
  });

  const boardId = task?.board?.id != null ? String(task.board.id) : '';

  // Derive company from the task's board so the assignee list is always scoped
  // to the board's company, including when the viewer is a superadmin.
  const companyId = task?.board.company != null ? String(task.board.company) : null;

  const { data: membersData } = useQuery({
    queryKey: ['company-members', companyId, 'assignee-picker'],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.members(companyId!), {
          params: { page_size: 100, is_active: 'true' },
        })
        .then((r) => r.data),
  });

  const members = membersData?.results ?? [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<CrmTask['priority']>('medium');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setDeadline(task.deadline ? task.deadline.slice(0, 10) : '');
    setAssigneeId(task.assignee ? String(task.assignee.id) : '');
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.patch<CrmTask>(API.crm.taskDetail(taskId), payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'my-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.crm.taskArchive(taskId));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'my-tasks'] });
      queryClient.removeQueries({ queryKey: ['crm', 'task', taskId] });
      navigate(boardId ? `/crm/boards/${boardId}` : '/crm', { replace: true });
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.crm.taskUnarchive(taskId));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId, 'archived'] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'task', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'my-tasks'] });
    },
  });

  const handleSave = () => {
    if (!task || patchMutation.isPending) return;

    const payload: Record<string, unknown> = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitle(task.title);
      return;
    }
    if (trimmedTitle !== task.title) payload.title = trimmedTitle;
    if (description !== (task.description ?? '')) payload.description = description || null;
    if (priority !== task.priority) payload.priority = priority;

    const originalDeadline = task.deadline ? task.deadline.slice(0, 10) : '';
    if (deadline !== originalDeadline) payload.deadline = deadline || null;

    const originalAssigneeId = task.assignee ? String(task.assignee.id) : '';
    if (assigneeId !== originalAssigneeId) {
      payload.assignee_id = assigneeId ? parseInt(assigneeId, 10) : null;
    }

    if (Object.keys(payload).length === 0) return;

    patchMutation.mutate(payload);
  };

  const handleCancel = () => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setDeadline(task.deadline ? task.deadline.slice(0, 10) : '');
    setAssigneeId(task.assignee ? String(task.assignee.id) : '');
  };

  return {
    taskId,
    task,
    isLoading,
    isError,
    boardId,
    members,
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    deadline,
    setDeadline,
    assigneeId,
    setAssigneeId,
    patchMutation,
    archiveMutation,
    unarchiveMutation,
    handleSave,
    handleCancel,
  };
}
