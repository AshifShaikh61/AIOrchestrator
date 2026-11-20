import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar as CalendarIcon,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  List,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { useOrchestratorStore } from '../store/useOrchestratorStore';
import type { ScheduleDefinition, WorkflowExecution } from '../types/orchestrator';
import {
  describeCronExpression,
  getCalendarMonthGrid,
  getCalendarWeekDays,
  getScheduleOccurrencesForDate,
  isSameDay,
  parseCronExpression,
  toDateKey,
} from '../utils/cronCalendar';
import { formatDateTime, formatDuration } from '../utils/formatters';

const scheduleSchema = z.object({
  name: z.string().trim().min(3, 'Schedule name is required'),
  workflowId: z.string().min(1, 'Select a workflow'),
  cronExpression: z
    .string()
    .trim()
    .refine(
      (val) => /^(\S+\s+){4}\S+$/.test(val) && parseCronExpression(val).isValid,
      'Must be a valid 5-field CRON expression (e.g., 30 9 * * 1-5)'
    ),
  timezone: z.string().min(1),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type CadencePreset = 'every15' | 'hourly' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export function SchedulesPage() {
  const schedules = useOrchestratorStore((s) => s.schedules);
  const workflows = useOrchestratorStore((s) => s.workflows);
  const executions = useOrchestratorStore((s) => s.executions);
  const createSchedule = useOrchestratorStore((s) => s.createSchedule);
  const toggleSchedule = useOrchestratorStore((s) => s.toggleSchedule);
  const deleteSchedule = useOrchestratorStore((s) => s.deleteSchedule);
  const markScheduleTriggered = useOrchestratorStore((s) => s.markScheduleTriggered);
  const addExecution = useOrchestratorStore((s) => s.addExecution);
  const setActiveExecutionId = useOrchestratorStore((s) => s.setActiveExecutionId);
  const setActiveWorkflowId = useOrchestratorStore((s) => s.setActiveWorkflowId);
  const pushToast = useOrchestratorStore((s) => s.pushToast);
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarScale, setCalendarScale] = useState<'month' | 'week'>('month');
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'paused'>('all');
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<CadencePreset>('daily');
  const [triggerTime, setTriggerTime] = useState('09:00');
  const [deleteTarget, setDeleteTarget] = useState<ScheduleDefinition | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      name: '',
      workflowId: workflows[0]?.id ?? '',
      cronExpression: '0 9 * * *',
      timezone: 'UTC',
    },
  });

  const watchedCron = watch('cronExpression');

  const filteredSchedules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schedules.filter((sc) => {
      const statusOk =
        statusFilter === 'all' ||
        (statusFilter === 'enabled' && sc.enabled) ||
        (statusFilter === 'paused' && !sc.enabled);
      const qOk =
        !q ||
        sc.name.toLowerCase().includes(q) ||
        sc.workflowName.toLowerCase().includes(q) ||
        sc.cronExpression.toLowerCase().includes(q);
      return statusOk && qOk;
    });
  }, [schedules, statusFilter, search]);

  const monthDays = useMemo(() => getCalendarMonthGrid(cursorDate), [cursorDate]);
  const weekDays = useMemo(() => getCalendarWeekDays(cursorDate), [cursorDate]);

  const cronRunsByDay = useMemo(() => {
    const map = new Map<string, WorkflowExecution[]>();
    for (const ex of executions) {
      if (ex.trigger !== 'CRON') continue;
      const d = new Date(ex.startedAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = toDateKey(d);
      const list = map.get(key) ?? [];
      list.push(ex);
      map.set(key, list);
    }
    return map;
  }, [executions]);

  const selectedDayOccurrences = useMemo(
    () => getScheduleOccurrencesForDate(filteredSchedules, selectedDate),
    [filteredSchedules, selectedDate]
  );

  const selectedDayRuns = useMemo(
    () => cronRunsByDay.get(toDateKey(selectedDate)) ?? [],
    [cronRunsByDay, selectedDate]
  );

  const buildCronFromPreset = (preset: CadencePreset, timeVal: string, anchor: Date): string => {
    const [hRaw, mRaw] = timeVal.split(':');
    const hour = Number.isInteger(Number(hRaw)) ? Number(hRaw) : 9;
    const min = Number.isInteger(Number(mRaw)) ? Number(mRaw) : 0;

    switch (preset) {
      case 'every15':
        return '*/15 * * * *';
      case 'hourly':
        return `${min} * * * *`;
      case 'daily':
        return `${min} ${hour} * * *`;
      case 'weekdays':
        return `${min} ${hour} * * 1-5`;
      case 'weekly':
        return `${min} ${hour} * * ${anchor.getDay()}`;
      case 'monthly':
        return `${min} ${hour} ${anchor.getDate()} * *`;
    }
  };

  const openCreateModalForDate = (targetDate: Date, preset: CadencePreset = 'daily') => {
    setSelectedDate(targetDate);
    setSelectedPreset(preset);
    const defaultTime = '09:00';
    setTriggerTime(defaultTime);
    reset({
      name: '',
      workflowId: workflows[0]?.id ?? '',
      cronExpression: buildCronFromPreset(preset, defaultTime, targetDate),
      timezone: 'UTC',
    });
    setCreateOpen(true);
  };

  const handlePresetSelect = (preset: CadencePreset) => {
    setSelectedPreset(preset);
    const expr = buildCronFromPreset(preset, triggerTime, selectedDate);
    setValue('cronExpression', expr, { shouldValidate: true });
  };

  const handleTimeChange = (nextTime: string) => {
    setTriggerTime(nextTime);
    if (selectedPreset !== 'every15') {
      const expr = buildCronFromPreset(selectedPreset, nextTime, selectedDate);
      setValue('cronExpression', expr, { shouldValidate: true });
    }
  };

  const onSubmit = (values: ScheduleFormValues) => {
    const wf = workflows.find((w) => w.id === values.workflowId);
    if (!wf) return;
    createSchedule({
      name: values.name,
      workflowId: wf.id,
      workflowName: wf.name,
      cronExpression: values.cronExpression,
      timezone: values.timezone,
      enabled: true,
    });
    pushToast({
      type: 'success',
      title: 'Orchestration schedule created',
      description: `"${values.name}" scheduled (${describeCronExpression(values.cronExpression)}).`,
    });
    reset();
    setCreateOpen(false);
  };

  const handleTriggerNow = (sched: ScheduleDefinition) => {
    const wf = workflows.find((w) => w.id === sched.workflowId);
    const execId = `run_${Date.now().toString().slice(-5)}`;
    const now = new Date().toISOString();
    const exec: WorkflowExecution = {
      id: execId,
      workflowId: sched.workflowId,
      workflowName: sched.workflowName,
      trigger: 'CRON',
      status: 'completed',
      startedAt: now,
      endedAt: now,
      durationMs: 2450,
      completedNodes: wf?.nodes.length ?? 3,
      failedNodes: 0,
      totalNodes: wf?.nodes.length ?? 3,
      nodeExecutions: [],
      logs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toTimeString().slice(0, 8),
          level: 'INFO',
          message: `Manually triggered CRON schedule "${sched.name}" (${sched.cronExpression})`,
        },
      ],
      inputPayload: { scheduleId: sched.id, triggeredOn: toDateKey(selectedDate) },
      outputPayload: { status: 'completed', simulated: true },
      isSimulated: true,
    };
    addExecution(exec);
    markScheduleTriggered(sched.id, 'completed');
    pushToast({
      type: 'success',
      title: 'Scheduled run triggered',
      description: `Recorded simulated CRON execution ${execId}.`,
    });
  };

  const shiftCalendar = (direction: -1 | 1) => {
    if (calendarScale === 'month') {
      setCursorDate((d) => new Date(d.getFullYear(), d.getMonth() + direction, 1));
    } else {
      setCursorDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + direction * 7));
    }
  };

  const jumpToToday = () => {
    const now = new Date();
    setCursorDate(now);
    setSelectedDate(now);
  };

  const headerDateLabel = useMemo(() => {
    if (calendarScale === 'month') {
      return cursorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [calendarScale, cursorDate, weekDays]);

  return (
    <div className="max-w-[1440px] mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#0F172A]">
            Orchestration Schedule Calendar
          </h1>
          <p className="text-[14px] text-[#64748B] mt-1">
            Plan, visualize, and trigger recurring AI agent pipelines across a unified calendar and CRON engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center p-1 bg-white border border-[#E5E7EB] rounded-[8px]">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-[6px] text-[12px] font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-[6px] text-[12px] font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>CRON Table ({filteredSchedules.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateModalForDate(selectedDate, 'daily')}
            className="h-9 px-4 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Schedule</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E5E7EB] p-1 rounded-[8px]">
          {(
            [
              { id: 'all', label: `All Schedules (${schedules.length})` },
              {
                id: 'enabled',
                label: `Active (${schedules.filter((s) => s.enabled).length})`,
              },
              {
                id: 'paused',
                label: `Paused (${schedules.filter((s) => !s.enabled).length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-[6px] text-[12px] font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-white text-[#2563EB] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter schedules or workflows..."
            className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Calendar Grid Card */}
          <div className="xl:col-span-8 bg-white border border-[#E5E7EB] rounded-[12px] overflow-hidden shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
            {/* Calendar Toolbar */}
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-[#E5E7EB] bg-white rounded-[8px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => shiftCalendar(-1)}
                    className="h-8 w-8 flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] border-r border-[#E5E7EB]"
                    aria-label="Previous period"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={jumpToToday}
                    className="h-8 px-3 text-[12px] font-semibold text-[#0F172A] hover:bg-[#F8FAFC] border-r border-[#E5E7EB]"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftCalendar(1)}
                    className="h-8 w-8 flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC]"
                    aria-label="Next period"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <h2 className="text-[16px] font-semibold text-[#0F172A] ml-1">{headerDateLabel}</h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-[#64748B]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-[2px] bg-[#2563EB]" />
                    Active
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-[2px] bg-[#CBD5E1]" />
                    Paused
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                    Run OK
                  </span>
                </div>

                <div className="flex items-center p-0.5 bg-white border border-[#E5E7EB] rounded-[8px]">
                  <button
                    type="button"
                    onClick={() => setCalendarScale('month')}
                    className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-colors ${
                      calendarScale === 'month'
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarScale('week')}
                    className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-colors ${
                      calendarScale === 'week'
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Week
                  </button>
                </div>
              </div>
            </div>

            {calendarScale === 'month' ? (
              <div>
                {/* Weekday Header */}
                <div className="grid grid-cols-7 border-b border-[#E5E7EB] bg-[#F8FAFC]">
                  {WEEKDAY_HEADERS.map((day) => (
                    <div
                      key={day}
                      className="py-2 px-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[#64748B]"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* 42-Day Month Grid */}
                <div className="grid grid-cols-7 divide-x divide-y divide-[#E5E7EB]">
                  {monthDays.map((day) => {
                    const isCurrentMonth = day.getMonth() === cursorDate.getMonth();
                    const isTodayCell = isSameDay(day, today);
                    const isSelectedCell = isSameDay(day, selectedDate);
                    const dayKey = toDateKey(day);
                    const dayOccurrences = getScheduleOccurrencesForDate(filteredSchedules, day);
                    const dayRuns = cronRunsByDay.get(dayKey) ?? [];
                    const visibleItems = dayOccurrences.slice(0, 3);
                    const overflowCount = dayOccurrences.length - visibleItems.length;

                    return (
                      <div
                        key={dayKey}
                        onClick={() => setSelectedDate(day)}
                        className={`group min-h-[112px] p-1.5 cursor-pointer transition-colors flex flex-col justify-between ${
                          isSelectedCell
                            ? 'bg-[#EFF6FF]/60 ring-1 ring-inset ring-[#2563EB]'
                            : isCurrentMonth
                              ? 'bg-white hover:bg-[#F8FAFC]'
                              : 'bg-[#F8FAFC]/70 text-[#94A3B8] hover:bg-[#F1F5F9]/60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`w-6 h-6 rounded-[6px] flex items-center justify-center text-[12px] font-mono tabular-nums ${
                                isTodayCell
                                  ? 'bg-[#2563EB] text-white font-semibold'
                                  : isSelectedCell
                                    ? 'bg-[#DBEAFE] text-[#2563EB] font-semibold'
                                    : isCurrentMonth
                                      ? 'text-[#0F172A] font-medium'
                                      : 'text-[#94A3B8]'
                              }`}
                            >
                              {day.getDate()}
                            </span>

                            <div className="flex items-center gap-1">
                              {dayRuns.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#DCFCE7] text-[#16A34A] text-[10px] font-mono font-semibold"
                                  title={`${dayRuns.length} CRON execution(s) recorded`}
                                >
                                  {dayRuns.length} run{dayRuns.length > 1 ? 's' : ''}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCreateModalForDate(day, 'monthly');
                                }}
                                className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-[4px] hover:bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center transition-opacity"
                                title={`Add schedule on ${day.toLocaleDateString()}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            {visibleItems.map((occ) => (
                              <div
                                key={`${dayKey}-${occ.schedule.id}`}
                                className={`px-1.5 py-0.5 rounded-[4px] border text-[11px] truncate flex items-center justify-between gap-1 ${
                                  occ.schedule.enabled
                                    ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                                    : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#64748B] border-dashed'
                                }`}
                                title={`${occ.schedule.name} (${occ.humanSummary})`}
                              >
                                <span className="truncate font-medium">{occ.schedule.name}</span>
                                <span className="font-mono text-[10px] shrink-0 opacity-80">
                                  {occ.timesLabel}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {overflowCount > 0 && (
                          <div className="text-[10px] font-mono font-semibold text-[#2563EB] px-1 pt-0.5">
                            +{overflowCount} more
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* 7-Day Week Schedule Grid */
              <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB]">
                {weekDays.map((day) => {
                  const dayKey = toDateKey(day);
                  const isTodayCell = isSameDay(day, today);
                  const isSelectedCell = isSameDay(day, selectedDate);
                  const dayOccurrences = getScheduleOccurrencesForDate(filteredSchedules, day);
                  const dayRuns = cronRunsByDay.get(dayKey) ?? [];

                  return (
                    <div
                      key={dayKey}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[340px] p-2.5 cursor-pointer flex flex-col gap-2 transition-colors ${
                        isSelectedCell ? 'bg-[#EFF6FF]/50' : 'bg-white hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                        <div>
                          <div className="text-[11px] font-semibold uppercase text-[#64748B]">
                            {WEEKDAY_HEADERS[day.getDay()]}
                          </div>
                          <div
                            className={`mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-[6px] font-mono text-[13px] font-semibold ${
                              isTodayCell
                                ? 'bg-[#2563EB] text-white'
                                : isSelectedCell
                                  ? 'bg-[#DBEAFE] text-[#2563EB]'
                                  : 'text-[#0F172A]'
                            }`}
                          >
                            {day.getDate()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreateModalForDate(day, 'weekly');
                          }}
                          className="w-6 h-6 rounded-[6px] border border-[#E5E7EB] bg-white hover:border-[#2563EB] text-[#2563EB] flex items-center justify-center"
                          title="Schedule on this day"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5 flex-1">
                        {dayOccurrences.length === 0 ? (
                          <p className="text-[11px] text-[#94A3B8] py-4 text-center">No triggers</p>
                        ) : (
                          dayOccurrences.map((occ) => (
                            <div
                              key={occ.schedule.id}
                              className={`p-2 rounded-[6px] border text-left space-y-1 ${
                                occ.schedule.enabled
                                  ? 'bg-[#EFF6FF] border-[#BFDBFE]'
                                  : 'bg-[#F8FAFC] border-[#E5E7EB] border-dashed opacity-75'
                              }`}
                            >
                              <div className="text-[11px] font-mono font-semibold text-[#2563EB]">
                                {occ.timesLabel}
                              </div>
                              <div className="text-[12px] font-semibold text-[#0F172A] leading-tight line-clamp-2">
                                {occ.schedule.name}
                              </div>
                              <div className="text-[10px] text-[#64748B] truncate">
                                {occ.schedule.workflowName}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {dayRuns.length > 0 && (
                        <div className="pt-2 border-t border-[#F1F5F9] space-y-1">
                          <div className="text-[10px] font-mono uppercase text-[#64748B]">
                            Recorded Runs ({dayRuns.length})
                          </div>
                          {dayRuns.slice(0, 2).map((run) => (
                            <div
                              key={run.id}
                              className="px-1.5 py-1 rounded-[4px] bg-[#DCFCE7]/70 text-[#16A34A] font-mono text-[10px] truncate"
                            >
                              {run.id} · {run.status}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Selected Day Agenda & Trigger Controls */}
          <aside className="xl:col-span-4 bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#2563EB] font-semibold">
                  Selected Day Agenda
                </div>
                <h3 className="text-[15px] font-semibold text-[#0F172A]">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => openCreateModalForDate(selectedDate, 'monthly')}
                className="h-8 px-2.5 rounded-[8px] bg-white border border-[#E5E7EB] hover:border-[#2563EB] text-[12px] font-semibold text-[#2563EB] flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="p-4 space-y-5 max-h-[640px] overflow-y-auto">
              {/* Scheduled Pipelines for Selected Date */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#0F172A]">
                    Scheduled Workflows ({selectedDayOccurrences.length})
                  </span>
                  <span className="text-[11px] font-mono text-[#64748B]">
                    {selectedDayOccurrences.filter((o) => o.schedule.enabled).length} active
                  </span>
                </div>

                {selectedDayOccurrences.length === 0 ? (
                  <div className="p-6 rounded-[8px] border border-dashed border-[#E5E7EB] bg-[#F8FAFC] text-center space-y-2">
                    <CalendarClock className="w-7 h-7 text-[#94A3B8] mx-auto" />
                    <p className="text-[12px] text-[#64748B]">
                      No orchestration schedules match this date.
                    </p>
                    <button
                      type="button"
                      onClick={() => openCreateModalForDate(selectedDate, 'monthly')}
                      className="text-[12px] font-semibold text-[#2563EB] hover:underline"
                    >
                      + Schedule a workflow for{' '}
                      {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDayOccurrences.map(({ schedule, humanSummary, sampleTimes, triggerCountInDay }) => (
                      <div
                        key={schedule.id}
                        className={`p-3 rounded-[8px] border space-y-2.5 transition-colors ${
                          schedule.enabled
                            ? 'bg-white border-[#E5E7EB]'
                            : 'bg-[#F8FAFC] border-[#E5E7EB] opacity-80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-[#0F172A] truncate">
                              {schedule.name}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveWorkflowId(schedule.workflowId);
                                navigate(`/builder/${schedule.workflowId}`);
                              }}
                              className="text-[12px] text-[#2563EB] hover:underline flex items-center gap-1 mt-0.5 text-left truncate max-w-full"
                            >
                              <span className="truncate">{schedule.workflowName}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleSchedule(schedule.id)}
                            className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
                              schedule.enabled ? 'bg-[#2563EB] justify-end' : 'bg-[#CBD5E1] justify-start'
                            }`}
                            aria-label={`Toggle ${schedule.name}`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[#475569] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[6px] px-2.5 py-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                          <span className="font-sans font-medium text-[#0F172A]">{humanSummary}</span>
                          <span>·</span>
                          <span>{schedule.cronExpression}</span>
                          <span className="text-[#64748B]">({schedule.timezone})</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          {sampleTimes.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded-[4px] bg-[#EFF6FF] text-[#2563EB] font-mono text-[10px] font-medium"
                            >
                              {t}
                            </span>
                          ))}
                          {triggerCountInDay > 4 && (
                            <span className="text-[10px] font-mono text-[#64748B]">
                              +{triggerCountInDay - 4} runs
                            </span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {schedule.lastStatus ? (
                              <StatusBadge status={schedule.lastStatus} compact />
                            ) : (
                              <span className="text-[11px] text-[#94A3B8]">Pending first run</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleTriggerNow(schedule)}
                              className="h-7 px-2.5 rounded-[6px] bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Run Now
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(schedule)}
                              className="p-1.5 rounded-[6px] text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                              title="Delete schedule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recorded CRON Executions on Selected Date */}
              <div className="pt-4 border-t border-[#E5E7EB] space-y-2.5">
                <span className="text-[12px] font-semibold text-[#0F172A] block">
                  Recorded CRON Executions ({selectedDayRuns.length})
                </span>
                {selectedDayRuns.length === 0 ? (
                  <p className="text-[12px] text-[#64748B]">
                    No historical CRON executions recorded on this date.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedDayRuns.map((run) => (
                      <button
                        key={run.id}
                        type="button"
                        onClick={() => {
                          setActiveExecutionId(run.id);
                          navigate(`/runs?runId=${run.id}`);
                        }}
                        className="w-full p-2.5 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] hover:bg-white text-left flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-[#0F172A] truncate">
                            {run.workflowName}
                          </div>
                          <div className="text-[11px] font-mono text-[#64748B]">
                            {run.id} · {formatDuration(run.durationMs)}
                          </div>
                        </div>
                        <StatusBadge status={run.status} compact />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* CRON Table List View */
        <div className="bg-white border border-[#E5E7EB] rounded-[12px] overflow-hidden shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-4">Schedule Name</th>
                  <th className="py-3 px-4">Target Workflow</th>
                  <th className="py-3 px-4">Cadence &amp; CRON</th>
                  <th className="py-3 px-4">Next Run</th>
                  <th className="py-3 px-4">Last Status</th>
                  <th className="py-3 px-4">Enabled</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[13px]">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#64748B]">
                      <CalendarClock className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                      No workflow schedules match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((sched) => (
                    <tr key={sched.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#0F172A]">{sched.name}</td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/builder/${sched.workflowId}`)}
                          className="text-[#2563EB] hover:underline font-medium text-left"
                        >
                          {sched.workflowName}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-[12px] font-medium text-[#0F172A]">
                          {describeCronExpression(sched.cronExpression)}
                        </div>
                        <div className="font-mono text-[11px] text-[#64748B]">
                          {sched.cronExpression} ({sched.timezone})
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[12px] text-[#64748B]">
                        {formatDateTime(sched.nextRunAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        {sched.lastStatus ? (
                          <StatusBadge status={sched.lastStatus} compact />
                        ) : (
                          <span className="text-[12px] text-[#94A3B8]">Never run</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSchedule(sched.id)}
                          className={`w-10 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                            sched.enabled ? 'bg-[#2563EB] justify-end' : 'bg-[#CBD5E1] justify-start'
                          }`}
                          aria-label={`Toggle ${sched.name}`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTriggerNow(sched)}
                            className="h-7 px-2.5 rounded-[6px] bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] text-[12px] font-semibold flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Trigger Now
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(sched)}
                            className="p-1.5 rounded-[6px] text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                            title="Delete schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-[12px] shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-[#0F172A]">
                  Schedule Orchestration Pipeline
                </h2>
                <p className="text-[12px] text-[#64748B]">
                  Anchor date:{' '}
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1 rounded-[6px] text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-[#0F172A]">Schedule Name</label>
                <input
                  {...register('name')}
                  placeholder="e.g., Daily Multi-Agent Audit"
                  className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] text-[13px]"
                />
                {errors.name && <p className="text-[11px] text-[#DC2626]">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-[#0F172A]">Target Workflow</label>
                <select
                  {...register('workflowId')}
                  className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px]"
                >
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[12px] font-medium text-[#0F172A]">
                  Cadence Preset
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'every15', label: 'Every 15m' },
                      { id: 'hourly', label: 'Hourly' },
                      { id: 'daily', label: 'Daily' },
                      { id: 'weekdays', label: 'Weekdays' },
                      { id: 'weekly', label: `Weekly (${WEEKDAY_HEADERS[selectedDate.getDay()]})` },
                      { id: 'monthly', label: `Monthly (Day ${selectedDate.getDate()})` },
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`px-2.5 py-1.5 rounded-[6px] border text-[12px] font-medium transition-colors ${
                        selectedPreset === preset.id
                          ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB] font-semibold'
                          : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#475569] hover:text-[#0F172A]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Run Time</label>
                  <input
                    type="time"
                    value={triggerTime}
                    disabled={selectedPreset === 'every15'}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-full h-[38px] px-2.5 rounded-[8px] border border-[#E5E7EB] font-mono text-[13px] disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">
                    CRON Expression
                  </label>
                  <input
                    {...register('cronExpression')}
                    className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Timezone</label>
                  <select
                    {...register('timezone')}
                    className="w-full h-[38px] px-2.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px]"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>
              </div>
              {errors.cronExpression && (
                <p className="text-[11px] text-[#DC2626]">{errors.cronExpression.message}</p>
              )}

              <div className="px-3 py-2 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-between text-[12px]">
                <span className="text-[#64748B]">Schedule Preview</span>
                <span className="font-mono font-semibold text-[#2563EB]">
                  {describeCronExpression(watchedCron || '')}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="h-9 px-4 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Schedule"
        description={`Delete schedule "${deleteTarget?.name}"? Future automated triggers will stop immediately.`}
        confirmLabel="Delete Schedule"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteSchedule(deleteTarget.id);
            pushToast({ type: 'info', title: 'Schedule deleted' });
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
