import type {
  Note,
  Revision,
  RevisionStage,
  Subject,
  Topic,
} from '../types';

const revisionStages: RevisionStage[] = [1, 7, 21, 60];

const subjects: Subject[] = [
  {
    id: 'bangla',
    title: 'Bangla Language & Literature',
    totalTopics: 24,
    completedTopics: 8,
  },
  {
    id: 'english',
    title: 'English Language & Literature',
    totalTopics: 20,
    completedTopics: 5,
  },
  {
    id: 'bangladesh',
    title: 'Bangladesh Affairs',
    totalTopics: 18,
    completedTopics: 4,
  },
];

const topics: Topic[] = [
  {
    id: 'bangla-grammar',
    subjectId: 'bangla',
    title: 'Bangla Grammar: Sandhi',
    pdfUrl: '/pdfs/bangla-grammar.pdf',
    startPage: 12,
    endPage: 25,
    status: 'pending',
  },
  {
    id: 'english-grammar',
    subjectId: 'english',
    title: 'Parts of Speech',
    pdfUrl: '/pdfs/english-grammar.pdf',
    startPage: 30,
    endPage: 42,
    status: 'pending',
  },
  {
    id: 'liberation-war',
    subjectId: 'bangladesh',
    title: 'Liberation War of Bangladesh',
    pdfUrl: '/pdfs/bangladesh-affairs.pdf',
    startPage: 8,
    endPage: 21,
    status: 'completed',
  },
];

const notes: Note[] = [
  {
    id: 'note-liberation-war',
    topicId: 'liberation-war',
    content: 'Review the major dates, declarations, and international responses.',
    imageUrls: [],
    updatedAt: '2026-11-10T09:30:00.000Z',
  },
];

const revisions: Revision[] = [
  {
    id: 'revision-liberation-war-1',
    topicId: 'liberation-war',
    topicTitle: 'Liberation War of Bangladesh',
    stage: 1,
    dueDate: '2026-11-12T00:00:00.000Z',
    status: 'scheduled',
  },
  {
    id: 'revision-liberation-war-7',
    topicId: 'liberation-war',
    topicTitle: 'Liberation War of Bangladesh',
    stage: 7,
    dueDate: '2026-11-18T00:00:00.000Z',
    status: 'scheduled',
  },
];

const wait = (milliseconds = 150) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const createId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID()}`;

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
};

export async function getSubjects(): Promise<Subject[]> {
  await wait();
  return subjects.map((subject) => ({ ...subject }));
}

export async function getTopicsBySubject(subjectId: string): Promise<Topic[]> {
  await wait();
  return topics
    .filter((topic) => topic.subjectId === subjectId)
    .map((topic) => ({ ...topic }));
}

export async function getTopic(topicId: string): Promise<Topic | null> {
  await wait();
  const topic = topics.find((item) => item.id === topicId);
  return topic ? { ...topic } : null;
}

export async function getNoteByTopic(topicId: string): Promise<Note | null> {
  await wait();
  const note = notes.find((item) => item.topicId === topicId);
  return note ? { ...note, imageUrls: [...note.imageUrls] } : null;
}

export async function saveNote(
  input: Pick<Note, 'topicId' | 'content' | 'imageUrls'>,
): Promise<Note> {
  await wait();

  const existingNote = notes.find((note) => note.topicId === input.topicId);
  if (existingNote) {
    existingNote.content = input.content;
    existingNote.imageUrls = [...input.imageUrls];
    existingNote.updatedAt = new Date().toISOString();
    return { ...existingNote, imageUrls: [...existingNote.imageUrls] };
  }

  const note: Note = {
    id: createId('note'),
    ...input,
    imageUrls: [...input.imageUrls],
    updatedAt: new Date().toISOString(),
  };
  notes.push(note);
  return { ...note, imageUrls: [...note.imageUrls] };
}

export async function getRevisions(): Promise<Revision[]> {
  await wait();
  return revisions.map((revision) => ({ ...revision }));
}

export async function completeTopic(topicId: string): Promise<Revision[]> {
  await wait();

  const topic = topics.find((item) => item.id === topicId);
  if (!topic) {
    throw new Error(`Topic "${topicId}" was not found.`);
  }

  if (topic.status !== 'completed') {
    topic.status = 'completed';
    const subject = subjects.find((item) => item.id === topic.subjectId);
    if (subject) {
      subject.completedTopics = Math.min(
        subject.completedTopics + 1,
        subject.totalTopics,
      );
    }
  }

  const existingStages = new Set(
    revisions
      .filter((revision) => revision.topicId === topicId)
      .map((revision) => revision.stage),
  );
  const completedAt = new Date();

  for (const stage of revisionStages) {
    if (!existingStages.has(stage)) {
      revisions.push({
        id: createId('revision'),
        topicId,
        topicTitle: topic.title,
        stage,
        dueDate: addDays(completedAt, stage),
        status: 'scheduled',
      });
    }
  }

  return revisions
    .filter((revision) => revision.topicId === topicId)
    .map((revision) => ({ ...revision }));
}

export async function compressImage(
  file: File,
  maxWidth = 1280,
  quality = 0.8,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Unable to prepare image compression.');
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed.'))),
      'image/jpeg',
      quality,
    );
  });
}
