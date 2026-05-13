/**
 * Kanban board types for the employer pipeline view.
 * These are client-side view models derived from the backend Application entity.
 */

export type Stage =
  | 'NEW'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'ASSESSMENT'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED';

export type Application = {
  id: string;
  candidateName: string;
  jobTitle: string;
  stage: Stage;
  assessmentScore?: number;
  timeInStage: number;
  avatarUrl?: string;
};

export type PendingMutation = {
  cardId: string;
  fromStage: Stage;
  toStage: Stage;
  timestamp: number;
};

export type KanbanState = {
  columns: Record<Stage, Application[]>;
  pendingMutations: PendingMutation[];
};

export type MoveAction = {
  type: 'MOVE_CARD';
  cardId: string;
  toStage: Stage;
};
