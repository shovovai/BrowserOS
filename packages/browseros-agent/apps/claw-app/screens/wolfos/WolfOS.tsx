import { CalendarDays, Check, Circle, Mic, MicOff, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Page } from '@/components/layout/Page'
import { PageHeader } from '@/components/layout/PageHeader'

type Task = {
  id: string
  title: string
  dueDate: string
  done: boolean
}

type SpeechRecognitionResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechRecognitionLike = {
  lang: string
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

const STORAGE_KEY = 'wolfos.tasks.v1'
const today = () => new Date().toISOString().slice(0, 10)

function loadTasks(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed.filter(isTask) : []
  } catch {
    return []
  }
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const task = value as Partial<Task>
  return typeof task.id === 'string' && typeof task.title === 'string' && typeof task.dueDate === 'string' && typeof task.done === 'boolean'
}

function makeTask(title: string, dueDate = today()): Task {
  return { id: crypto.randomUUID(), title, dueDate, done: false }
}

export function WolfOS() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(today())
  const [list, setList] = useState<'today' | 'upcoming' | 'all'>('today')
  const [listening, setListening] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState('Try “add task, prepare my presentation” or “what are my tasks?”')

  function save(next: Task[]) {
    setTasks(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      setVoiceMessage('WolfOS could not save tasks in this browser profile.')
    }
  }

  function addTask(taskTitle: string, date = dueDate) {
    const clean = taskTitle.trim()
    if (!clean) return
    save([...tasks, makeTask(clean, date)])
    setTitle('')
    setVoiceMessage(`Added: ${clean}`)
  }

  function handleVoiceCommand(command: string) {
    const normalized = command.trim()
    const lower = normalized.toLowerCase()
    if (lower.includes('what are my tasks') || lower.includes('read my tasks') || lower.includes('my to do list')) {
      const remaining = tasks.filter((task) => !task.done)
      const response = remaining.length ? `You have ${remaining.length} tasks: ${remaining.map((task) => task.title).join(', ')}.` : 'You have no open tasks.'
      setVoiceMessage(response)
      if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(response))
      return
    }
    const taskTitle = normalized.replace(/^(hey wolfos[, ]*)?(please )?(add|create|remind me to|remember to) (a )?(task )?/i, '').trim()
    if (!taskTitle || taskTitle.toLowerCase() === normalized.toLowerCase()) {
      setVoiceMessage('Say “add task” followed by what you need to do, or ask me to read your tasks.')
      return
    }
    addTask(taskTitle)
    const response = `Added task: ${taskTitle}`
    if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(response))
  }

  function startListening() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceMessage('Voice input is not supported in this browser. Try a current Chromium-based browser.')
      return
    }
    const recognition = new Recognition()
    recognition.lang = navigator.language || 'en-US'
    recognition.onresult = (event) => handleVoiceCommand(event.results[0]?.[0]?.transcript ?? '')
    recognition.onerror = () => setVoiceMessage('I could not hear that. Check microphone permission and try again.')
    recognition.onend = () => setListening(false)
    setListening(true)
    setVoiceMessage('Listening… Your speech is handled by the browser speech-recognition service.')
    try {
      recognition.start()
    } catch {
      setListening(false)
      setVoiceMessage('Could not start the microphone. Please try again.')
    }
  }

  const visibleTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    if (list === 'today') return sorted.filter((task) => task.dueDate <= today())
    if (list === 'upcoming') return sorted.filter((task) => task.dueDate > today())
    return sorted
  }, [tasks, list])
  const openCount = tasks.filter((task) => !task.done).length

  return (
    <Page>
      <PageHeader
        title="WolfOS assistant"
        lede="Your personal browser companion for voice notes, tasks, and planning. Your task list stays in this browser profile."
        eyebrow={<span className="inline-flex items-center gap-2 rounded-full bg-accent-tint px-3 py-1 font-medium text-accent-ink text-xs"><Sparkles aria-hidden className="size-3.5" /> Personal workspace</span>}
      />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]" aria-label="WolfOS workspace">
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg text-ink">Your tasks</h2>
                <p className="mt-1 text-sm text-ink-3">{openCount} open {openCount === 1 ? 'task' : 'tasks'}</p>
              </div>
              <div className="flex rounded-lg bg-muted p-1" aria-label="Filter tasks">
                {(['today', 'upcoming', 'all'] as const).map((filter) => (
                  <button key={filter} type="button" onClick={() => setList(filter)} aria-pressed={list === filter} className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${list === filter ? 'bg-card text-ink shadow-sm' : 'text-ink-3 hover:text-ink'}`}>
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={(event) => { event.preventDefault(); addTask(title) }} className="mb-5 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="wolfos-task">New task</label>
              <input id="wolfos-task" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What do you need to do?" className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <label className="sr-only" htmlFor="wolfos-date">Due date</label>
              <input id="wolfos-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <button type="submit" disabled={!title.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground text-sm disabled:cursor-not-allowed disabled:opacity-50"><Plus aria-hidden className="size-4" /> Add</button>
            </form>

            <div className="divide-y divide-border">
              {visibleTasks.length === 0 ? (
                <div className="py-10 text-center">
                  <Check aria-hidden className="mx-auto mb-2 size-6 text-green" />
                  <p className="font-medium text-ink">Nothing on this list</p>
                  <p className="mt-1 text-sm text-ink-3">Add a task here or tell WolfOS by voice.</p>
                </div>
              ) : visibleTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3">
                  <button type="button" aria-label={task.done ? `Mark ${task.title} as not done` : `Complete ${task.title}`} onClick={() => save(tasks.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} className="shrink-0 rounded-full text-ink-3 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
                    {task.done ? <Check aria-hidden className="size-5 rounded-full bg-green p-0.5 text-white" /> : <Circle aria-hidden className="size-5" />}
                  </button>
                  <span className={`min-w-0 flex-1 break-words text-sm ${task.done ? 'text-ink-3 line-through' : 'text-ink'}`}>{task.title}</span>
                  <time dateTime={task.dueDate} className="shrink-0 text-xs text-ink-3">{task.dueDate === today() ? 'Today' : new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
                  <button type="button" aria-label={`Delete ${task.title}`} onClick={() => save(tasks.filter((item) => item.id !== task.id))} className="rounded-md p-1.5 text-ink-3 hover:bg-red-tint hover:text-red"><Trash2 aria-hidden className="size-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-accent-tint text-accent-ink"><CalendarDays aria-hidden className="size-5" /></span><div><h2 className="font-bold text-lg text-ink">Task planner</h2><p className="text-sm text-ink-3">A simple agenda from your task due dates</p></div></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleTasks.filter((task) => !task.done).slice(0, 6).map((task) => <div key={task.id} className="flex items-start gap-3 rounded-lg bg-muted/60 p-3"><time dateTime={task.dueDate} className="min-w-16 font-mono text-xs text-ink-3">{task.dueDate === today() ? 'TODAY' : new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</time><span className="text-sm text-ink">{task.title}</span></div>)}
              {visibleTasks.filter((task) => !task.done).length === 0 && <p className="col-span-full rounded-lg bg-muted/60 p-4 text-sm text-ink-3">Your upcoming agenda will appear here as you add tasks.</p>}
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-sm md:p-6" aria-label="Voice assistant">
          <div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-accent-tint text-accent-ink"><Sparkles aria-hidden className="size-5" /></span><div><h2 className="font-bold text-lg text-ink">Talk to WolfOS</h2><p className="text-sm text-ink-3">Voice task helper</p></div></div>
          <button type="button" onClick={startListening} disabled={listening} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60" aria-label={listening ? 'Listening' : 'Start voice input'}>
            {listening ? <><MicOff aria-hidden className="size-4" /> Listening…</> : <><Mic aria-hidden className="size-4" /> Start speaking</>}
          </button>
          <p role="status" aria-live="polite" className="mt-3 min-h-10 text-sm text-ink-2">{voiceMessage}</p>
          <div className="mt-5 border-t border-border pt-4"><h3 className="mb-2 font-semibold text-sm text-ink">Try saying</h3><ul className="space-y-2 text-sm text-ink-2"><li>“Add task, call the dentist”</li><li>“Remind me to review my notes”</li><li>“What are my tasks?”</li></ul></div>
          <p className="mt-5 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-ink-3">Microphone access is only used after you press the button. Speech recognition availability and processing depend on your browser. Tasks are stored locally in this browser profile; this is a starter assistant, not a general-purpose AI chat agent.</p>
        </aside>
      </section>
    </Page>
  )
}
