import { useEffect, useMemo, useState } from 'react'
import {
  completeTopic,
  getNoteByTopic,
  getRevisions,
  getSubjects,
  getTopicsBySubject,
  saveNote,
} from './services/mockData'
import type { Note, Revision, RevisionStage, Subject, Topic } from './types'
import './App.css'

const stages: RevisionStage[] = [1, 7, 21, 60]
const today = new Date().toISOString().slice(0, 10)

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function relativeDate(date: string) {
  const difference = Math.round(
    (new Date(`${date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) /
      86400000,
  )
  if (difference === 0) return 'Today'
  if (difference === 1) return 'Tomorrow'
  if (difference > 1 && difference < 7) return `In ${difference} days`
  return formatDate(date)
}

function App() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [noteTopic, setNoteTopic] = useState<Topic | null>(null)
  const [note, setNote] = useState<Note | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [showAddTopic, setShowAddTopic] = useState(false)
  const [newTopic, setNewTopic] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getSubjects(), getRevisions()])
      .then(async ([loadedSubjects, loadedRevisions]) => {
        const topicGroups = await Promise.all(
          loadedSubjects.map((subject) => getTopicsBySubject(subject.id)),
        )
        setSubjects(loadedSubjects)
        setRevisions(loadedRevisions)
        setAllTopics(topicGroups.flat())
      })
      .catch(() => setError('Unable to load your study plan.'))
      .finally(() => setLoading(false))
  }, [])

  const completedTopics = subjects.reduce((total, subject) => total + subject.completedTopics, 0)
  const totalTopics = subjects.reduce((total, subject) => total + subject.totalTopics, 0)
  const progress = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0
  const dueToday = revisions.filter((revision) => revision.dueDate.slice(0, 10) === today)
  const upcoming = revisions.filter((revision) => revision.dueDate.slice(0, 10) !== today)
  const visibleTopics = useMemo(
    () =>
      selectedSubject === 'all'
        ? allTopics
        : allTopics.filter((topic) => topic.subjectId === selectedSubject),
    [allTopics, selectedSubject],
  )

  const markComplete = async (topic: Topic) => {
    try {
      const updatedRevisions = await completeTopic(topic.id)
      setRevisions((current) => [
        ...current.filter((revision) => revision.topicId !== topic.id),
        ...updatedRevisions,
      ])
      setAllTopics((current) =>
        current.map((item) => (item.id === topic.id ? { ...item, status: 'completed' } : item)),
      )
      setSubjects((current) =>
        current.map((subject) =>
          subject.id === topic.subjectId && subject.completedTopics < subject.totalTopics
            ? { ...subject, completedTopics: subject.completedTopics + 1 }
            : subject,
        ),
      )
    } catch {
      setError('Unable to update this topic.')
    }
  }

  const openNotes = async (topic: Topic) => {
    try {
      const loadedNote = await getNoteByTopic(topic.id)
      setNoteTopic(topic)
      setNote(loadedNote)
      setNoteContent(loadedNote?.content ?? '')
    } catch {
      setError('Unable to load notes for this topic.')
    }
  }

  const saveCurrentNote = async () => {
    if (!noteTopic) return
    try {
      const saved = await saveNote({ topicId: noteTopic.id, content: noteContent, imageUrls: [] })
      setNote(saved)
    } catch {
      setError('Unable to save this note.')
    }
  }

  const addTopic = () => {
    const title = newTopic.trim()
    if (!title || selectedSubject === 'all') return
    setAllTopics((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        subjectId: selectedSubject,
        title,
        pdfUrl: '',
        startPage: 0,
        endPage: 0,
        status: 'pending',
      },
    ])
    setNewTopic('')
    setShowAddTopic(false)
  }

  if (loading) return <main className="loading">Loading your BCS preparation plan...</main>

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BCS PREPARATION / DAILY REVIEW</p>
          <h1>Study smarter, every day.</h1>
          <p className="subtitle">A calm place to learn, revise, and keep moving forward.</p>
        </div>
        <div className="progress-card">
          <div className="progress-card-top"><span>Overall progress</span><strong>{progress}%</strong></div>
          <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
          <small>{completedTopics} of {totalTopics} topics completed</small>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="stats">
        <div className="stat-card stat-accent"><span>Due today</span><strong>{dueToday.length}</strong><small>Reviews waiting</small></div>
        <div className="stat-card"><span>Study streak</span><strong>6 days</strong><small>Keep the rhythm going</small></div>
        <div className="stat-card"><span>Revisions queued</span><strong>{revisions.length}</strong><small>Across {subjects.length} subjects</small></div>
      </section>

      <section className="content-grid">
        <div className="panel curriculum-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">YOUR CURRICULUM</p><h2>Topic library</h2></div>
            <span className="topic-count">{visibleTopics.length} shown</span>
          </div>
          <div className="subject-pills" role="tablist" aria-label="Filter subjects">
            <button className={selectedSubject === 'all' ? 'pill active' : 'pill'} onClick={() => setSelectedSubject('all')}>All <b>{totalTopics}</b></button>
            {subjects.map((subject) => (
              <button key={subject.id} className={selectedSubject === subject.id ? 'pill active' : 'pill'} onClick={() => setSelectedSubject(subject.id)}>
                {subject.title} <b>{subject.completedTopics}/{subject.totalTopics}</b>
              </button>
            ))}
          </div>
          <div className="topic-list">
            {visibleTopics.map((topic) => {
              const topicRevisions = revisions.filter((revision) => revision.topicId === topic.id)
              const completedStages = new Set(topicRevisions.filter((revision) => new Date(revision.dueDate) < new Date()).map((revision) => revision.stage))
              return (
                <article className="topic" key={topic.id}>
                  <div className={`topic-status ${topic.status}`}>{topic.status === 'completed' ? '✓' : '○'}</div>
                  <div className="topic-copy">
                    <h3>{topic.title}</h3>
                    <p>{topic.startPage ? `Pages ${topic.startPage}–${topic.endPage}` : 'New topic'}</p>
                    <div className="stage-row" aria-label="Revision stages">
                      {stages.map((stage) => <span className={completedStages.has(stage) ? 'stage-dot complete' : 'stage-dot'} key={stage} title={`Stage ${stage}`}>{completedStages.has(stage) ? '●' : '○'}</span>)}
                      <span className="stage-label">S1 · S7 · S21 · S60</span>
                    </div>
                  </div>
                  <div className="topic-actions">
                    <button className="text-button" onClick={() => openNotes(topic)}>Notes</button>
                    {topic.status === 'completed' ? <span className="done-label">Completed</span> : <button onClick={() => markComplete(topic)}>Complete</button>}
                  </div>
                </article>
              )
            })}
            {!visibleTopics.length && <p className="empty">No topics found for this subject.</p>}
          </div>
          {selectedSubject !== 'all' && (showAddTopic ? (
            <div className="add-topic-form"><input autoFocus value={newTopic} onChange={(event) => setNewTopic(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addTopic()} placeholder="Topic name" /><button onClick={addTopic}>Add topic</button><button className="text-button" onClick={() => setShowAddTopic(false)}>Cancel</button></div>
          ) : <button className="add-topic" onClick={() => setShowAddTopic(true)}>＋ Add topic to this subject</button>)}
        </div>

        <aside className="panel revision-panel">
          <div className="panel-heading"><div><p className="eyebrow">SPACED REPETITION</p><h2>Review queue</h2></div><span className="queue-icon">↗</span></div>
          <div className="queue-section">
            <div className="queue-heading"><span>Due today</span><b>{dueToday.length}</b></div>
            {dueToday.length ? dueToday.map((revision) => <div className="urgent-revision" key={revision.id}><div><strong>{revision.topicTitle}</strong><span>Stage {revision.stage} · {formatDate(revision.dueDate)}</span></div><button onClick={() => { const topic = allTopics.find((item) => item.id === revision.topicId); if (topic) markComplete(topic) }}>Review now</button></div>) : <p className="empty">You are all caught up for today.</p>}
          </div>
          <div className="queue-section upcoming-section">
            <div className="queue-heading"><span>Upcoming</span><b>{upcoming.length}</b></div>
            {upcoming.map((revision) => <div className="revision" key={revision.id}><div><strong>{revision.topicTitle}</strong><span>Stage {revision.stage}</span></div><time>{relativeDate(revision.dueDate.slice(0, 10))}</time></div>)}
          </div>
        </aside>
      </section>

      {noteTopic && <div className="drawer-backdrop" onClick={() => setNoteTopic(null)}><aside className="notes-drawer" onClick={(event) => event.stopPropagation()}><button className="close-button" onClick={() => setNoteTopic(null)}>×</button><p className="eyebrow">TOPIC NOTES</p><h2>{noteTopic.title}</h2><p className="drawer-meta">{noteTopic.startPage ? `Pages ${noteTopic.startPage}–${noteTopic.endPage}` : 'Personal topic'}</p><textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Capture the key idea, a mnemonic, or a question..." /><button onClick={saveCurrentNote}>{note ? 'Save changes' : 'Save note'}</button></aside></div>}
    </main>
  )
}

export default App
