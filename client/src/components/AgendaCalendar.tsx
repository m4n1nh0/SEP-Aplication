import React, { useEffect, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core'

type AgendaItem = {
  id: number
  paciente_nome?: string
  paciente_tel?: string
  estagiario_nome?: string
  data_hora_inicio: string
  data_hora_fim?: string
  status: string
  modalidade?: string
  sala?: string
  sessao_numero?: number
}

type Range = { start: string; end: string }

const STATUS_COLOR: Record<string, string> = {
  pendente: '#b45309',
  confirmado: '#16a34a',
  realizado: '#0891b2',
  cancelado_admin: '#dc2626',
  cancelado_paciente: '#dc2626',
  faltou: '#7c3aed',
}

const AGENDA_TZ = 'America/Sao_Paulo'
const DEBUG_AGENDA_KEY = 'sep_debug_agenda'

const agendaLogsAtivos = () =>
  import.meta.env.DEV || localStorage.getItem(DEBUG_AGENDA_KEY) === '1'

const formatInAgendaTz = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: AGENDA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date).reduce<Record<string,string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value
    return acc
  }, {})

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
}

// Banco armazena horário local. Se a API entregar string com timezone/UTC, converte para São Paulo.
const toISO = (value?: string | null): string | undefined => {
  if (!value) return undefined
  const raw = String(value).trim()
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(raw)) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return formatInAgendaTz(d)
  }
  return raw.slice(0, 19).replace(' ', 'T')
}

// Garante duração de 60min quando data_hora_fim está ausente
const toISOEnd = (fim?: string | null, inicio?: string | null): string | undefined => {
  if (fim) return toISO(fim)
  if (!inicio) return undefined
  const start = toISO(inicio)
  if (!start) return undefined
  const [datePart, timePart] = start.slice(0,16).split('T')
  const [h, m] = timePart.split(':').map(Number)
  const total  = h * 60 + m + 60
  const fimH   = Math.floor(total / 60) % 24
  const fimM   = total % 60
  return `${datePart}T${String(fimH).padStart(2,'0')}:${String(fimM).padStart(2,'0')}:00`
}

// datesSet devolve startStr/endStr em UTC ("2026-04-21T03:00:00+00:00")
// Converte para BRT (-3h) para que o servidor filtre no fuso correto
const rangeDate = (value: string): string => {
  const d = new Date(value)                          // interpreta o UTC corretamente
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()) // ajusta para local do servidor
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

export default function AgendaCalendar({
  items,
  loading,
  accent = '#0891b2',
  onlyTimeGrid = false,
  onRangeChange,
  onEventClick,
}: {
  items: AgendaItem[]
  loading?: boolean
  accent?: string
  onlyTimeGrid?: boolean
  onRangeChange?: (range: Range) => void
  onEventClick?: (item: AgendaItem) => void
}) {
  const events = useMemo<EventInput[]>(() => items.map(item => {
    const color = STATUS_COLOR[item.status] || '#78716c'
    const paciente = item.paciente_nome || 'Paciente'
    const estagiario = item.estagiario_nome ? ` - ${item.estagiario_nome}` : ''
    return {
      id: String(item.id),
      title: `${paciente}${estagiario}`,
      start: toISO(item.data_hora_inicio),
      end:   toISOEnd(item.data_hora_fim, item.data_hora_inicio),
      backgroundColor: color,
      borderColor: color,
      textColor: '#fff',
      extendedProps: { item },
    }
  }), [items])

  useEffect(() => {
    if (!agendaLogsAtivos()) return
    console.info('[SEP][Agenda] Itens normalizados para o calendario', {
      total: items.length,
      timezone_visual: AGENDA_TZ,
      amostra: items.slice(0, 3).map(item => ({
        id: item.id,
        inicio_api: item.data_hora_inicio,
        inicio_calendario: toISO(item.data_hora_inicio),
        fim_api: item.data_hora_fim,
        fim_calendario: toISOEnd(item.data_hora_fim, item.data_hora_inicio),
        status: item.status,
      })),
    })
  }, [items])

  const datesSet = (arg: DatesSetArg) => {
    onRangeChange?.({
      start: rangeDate(arg.startStr),
      end: rangeDate(arg.endStr),
    })
  }

  const eventClick = (arg: EventClickArg) => {
    onEventClick?.(arg.event.extendedProps.item as AgendaItem)
  }

  return (
    <div className="sep-calendar-wrap" style={{position:'relative'}}>
      <style>{`
        .sep-calendar-wrap {
          --fc-border-color: #e7e5e4;
          --fc-page-bg-color: #ffffff;
          --fc-neutral-bg-color: #faf9f6;
          --fc-today-bg-color: ${accent}12;
          --fc-now-indicator-color: #dc2626;
          color: #1c1917;
        }
        .sep-calendar-wrap .fc {
          font-family: inherit;
          font-size: 13px;
        }
        .sep-calendar-wrap .fc-toolbar {
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .sep-calendar-wrap .fc-toolbar-title {
          font-size: 20px;
          font-weight: 850;
          color: #1c1917;
          text-transform: capitalize;
        }
        .sep-calendar-wrap .fc-button-primary {
          background: #ffffff;
          border: 1px solid #d6d3d1;
          color: #57534e;
          border-radius: 8px;
          font-weight: 750;
          padding: 7px 11px;
          box-shadow: none;
          text-transform: capitalize;
        }
        .sep-calendar-wrap .fc-button-primary:hover,
        .sep-calendar-wrap .fc-button-primary:focus {
          background: #faf9f6;
          border-color: #a8a29e;
          color: #1c1917;
          box-shadow: none;
        }
        .sep-calendar-wrap .fc-button-primary:not(:disabled).fc-button-active,
        .sep-calendar-wrap .fc-button-primary:not(:disabled):active {
          background: ${accent};
          border-color: ${accent};
          color: #ffffff;
          box-shadow: none;
        }
        .sep-calendar-wrap .fc-col-header-cell {
          background: #faf9f6;
          padding: 8px 0;
        }
        .sep-calendar-wrap .fc-col-header-cell-cushion,
        .sep-calendar-wrap .fc-daygrid-day-number {
          color: #57534e;
          text-decoration: none;
          font-weight: 700;
        }
        .sep-calendar-wrap .fc-day-today .fc-daygrid-day-number {
          color: ${accent};
        }
        .sep-calendar-wrap .fc-event {
          border-radius: 7px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(28,25,23,.12);
        }
        .sep-calendar-wrap .fc-daygrid-event {
          padding: 2px 5px;
          margin-top: 3px;
        }
        .sep-calendar-wrap .fc-timegrid-event .fc-event-main {
          padding: 4px 6px;
        }
        .sep-calendar-wrap .fc-event-title,
        .sep-calendar-wrap .fc-event-time {
          font-weight: 700;
        }
        .sep-calendar-wrap .fc-timegrid-slot {
          height: 38px;
        }
        .sep-calendar-wrap .fc-timegrid-axis-cushion,
        .sep-calendar-wrap .fc-timegrid-slot-label-cushion {
          color: #78716c;
          font-size: 11px;
        }
        .sep-calendar-loading {
          position: absolute;
          right: 12px;
          top: 58px;
          z-index: 3;
          background: #ffffff;
          border: 1px solid #e7e5e4;
          color: #57534e;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 8px 24px rgba(28,25,23,.08);
        }
        @media (max-width: 760px) {
          .sep-calendar-wrap .fc-toolbar {
            align-items: stretch;
            flex-direction: column;
          }
          .sep-calendar-wrap .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 6px;
          }
          .sep-calendar-wrap .fc-toolbar-title {
            font-size: 17px;
            text-align: center;
          }
        }
      `}</style>
      {loading && <div className="sep-calendar-loading">Carregando...</div>}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locale={ptBrLocale}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: onlyTimeGrid ? 'timeGridWeek,timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        buttonText={{today:'Hoje', month:'Mês', week:'Semana', day:'Dia'}}
        events={events}
        datesSet={datesSet}
        eventClick={eventClick}
        height="auto"
        expandRows
        nowIndicator
        allDaySlot={false}
        firstDay={1}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:30:00"
        dayMaxEvents={3}
        eventTimeFormat={{hour:'2-digit', minute:'2-digit', hour12:false}}
        slotLabelFormat={{hour:'2-digit', minute:'2-digit', hour12:false}}
      />
    </div>
  )
}
