export type TopicStatus = 'pending' | 'completed';
export type RevisionStatus = 'scheduled' | 'completed';
export type RevisionStage = 1 | 7 | 21 | 60;

export interface Subject {
  id: string;
  title: string;
  totalTopics: number;
  completedTopics: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  pdfUrl: string;
  startPage: number;
  endPage: number;
  status: TopicStatus;
}

export interface Note {
  id: string;
  topicId: string;
  content: string;
  imageUrls: string[];
  updatedAt: string;
}

export interface Revision {
  id: string;
  topicId: string;
  topicTitle: string;
  stage: RevisionStage;
  dueDate: string;
  status: RevisionStatus;
}
