import { useEffect, useMemo, useState } from 'react'
import {
  completeTopic,
  getRevisions,
  getSubjects,
  getTopicsBySubject,
} from './services/mockData'
import type { Revision, Subject, Topic } from './types'
import './App.css'

function App() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getSubjects(), getRevisions()])
      .then(([loadedSubjects, loadedRevisions]) => {
        setSubjects(loadedSubjects)
        setRevisions(loadedRevisions)
        setSelectedSubject(loadedSubjects[0]?.id ?? '')
      })
      .catch(() => setError('Unable to load your study plan.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedSubject) return
    getTopicsBySubject(selectedSubject)
      .then(setTopics)
      .catch(() => setError('Unable to load topics for this subject.'))
  }, [selectedSubject, subjects])

  const completedTopics = subjects.reduce(
    (total, subject) => total + subject.completedTopics,
    0,
  )
  const totalTopics = subjects.reduce(
    (total, subject) => total + subject.totalTopics,
    0,
  )
  const progress = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0
  const selectedSubjectTitle = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubject)?.title,
    [subjects, selectedSubject],
  )

  const markComplete = async (topic: Topic) => {
    try {
      const updatedRevisions = await completeTopic(topic.id)
      setRevisions((current) => [
        ...current.filter((revision) => revision.topicId !== topic.id),
        ...updatedRevisions,
      ])
      setTopics((current) =>
        current.map((item) =>
          item.id === topic.id ? { ...item, status: 'completed' } : item,
        ),
      )
      setSubjects((current) =>
        current.map((subject) =>
          subject.id === topic.subjectId &&
          subject.completedTopics < subject.totalTopics
            ? { ...subject, completedTopics: subject.completedTopics + 1 }
            : subject,
        ),
      )
    } catch {
      setError('Unable to update this topic.')
    }
  }

  if (loading) {
    return <main className="loading">Loading your BCS preparation plan...</main>
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BCS PREPARATION</p>
          <h1>Study smarter, every day.</h1>
          <p className="subtitle">Keep your subjects, notes, and revision schedule in one place.</p>
        </div>
        <div className="progress-card">
          <span>Overall progress</span>
          <strong>{progress}%</strong>
          <div className="progress-track">
            <div style={{ width: `${progress}%` }} />
          </div>
          <small>{completedTopics} of {totalTopics} topics completed</small>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="stats">
        <div><span>Subjects</span><strong>{subjects.length}</strong></div>
        <div><span>Topics completed</span><strong>{completedTopics}</strong></div>
        <div><span>Revisions queued</span><strong>{revisions.length}</strong></div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">YOUR CURRICULUM</p>
              <h2>{selectedSubjectTitle ?? 'Subjects'}</h2>
            </div>
            <select
              aria-label="Select subject"
              value={selectedSubject}
              onChange={(event) => setSelectedSubject(event.target.value)}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.title}</option>
              ))}
            </select>
          </div>
          <div className="topic-list">
            {topics.map((topic) => (
              <article className="topic" key={topic.id}>
                <div className={`topic-status ${topic.status}`}>
                  {topic.status === 'completed' ? '✓' : '○'}
                </div>
                <div className="topic-copy">
                  <h3>{topic.title}</h3>
                  <p>Pages {topic.startPage}-{topic.endPage}</p>
                </div>
                {topic.status === 'completed' ? (
                  <span className="done-label">Completed</span>
                ) : (
                  <button type="button" onClick={() => markComplete(topic)}>Mark complete</button>
                )}
              </article>
            ))}
            {!topics.length && <p className="empty">No topics found for this subject.</p>}
          </div>
        </div>

        <aside className="panel revision-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SPACED REPETITION</p>
              <h2>Upcoming revisions</h2>
            </div>
          </div>
          {revisions.map((revision) => (
            <div className="revision" key={revision.id}>
              <div>
                <strong>{revision.topicTitle}</strong>
                <span>Stage {revision.stage} revision</span>
              </div>
              <time dateTime={revision.dueDate}>
                {new Date(revision.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </time>
            </div>
          ))}
        </aside>
      </section>
    </main>
  )
}

export default App
