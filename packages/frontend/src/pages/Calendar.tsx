import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventDropArg } from '@fullcalendar/core';
import { useQueryClient } from '@tanstack/react-query';
import { useTasks } from '../api/queries';
import { scheduleTask } from '../api/mutations';

export function Calendar() {
  const qc = useQueryClient();
  const { data: tasks } = useTasks();

  const events = tasks
    ?.filter(t => t.due_date || t.scheduled_date)
    .map(t => ({
      id: t.id,
      title: t.name,
      date: t.scheduled_date ?? t.due_date?.split('T')[0],
      start: t.scheduled_date && t.scheduled_start_time ? `${t.scheduled_date}T${t.scheduled_start_time}` : t.due_date ?? undefined,
      backgroundColor: t.status === 'done' ? '#374151' : t.recurrence_rule ? '#7c3aed' : '#1d4ed8',
      borderColor: 'transparent',
    })) ?? [];

  const handleEventDrop = async (info: EventDropArg) => {
    const date = info.event.startStr.split('T')[0];
    const time = info.event.startStr.includes('T') ? info.event.startStr.split('T')[1].substring(0, 5) : '09:00';
    await scheduleTask(info.event.id, { scheduledDate: date, scheduledStartTime: time });
    await qc.invalidateQueries();
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
        events={events}
        editable={true}
        droppable={true}
        eventDrop={handleEventDrop}
        height="auto"
        eventClassNames="cursor-pointer rounded"
      />
    </div>
  );
}
