import type { KanbanState, MoveAction, Stage } from './types';

/**
 * Moves a card from its current stage to the target stage.
 * Appends a PendingMutation to track the optimistic update.
 * Returns a new state object (immutable — does not mutate the input).
 *
 * If the card is not found in any column, returns the state unchanged.
 * If the card is already in the target stage, returns the state unchanged.
 *
 * Pure function — no side effects.
 */
export function moveCardReducer(
  state: KanbanState,
  action: MoveAction
): KanbanState {
  const { cardId, toStage } = action;

  // Find the card and its current stage
  let fromStage: Stage | undefined;
  let cardIndex = -1;

  for (const stage of Object.keys(state.columns) as Stage[]) {
    const idx = state.columns[stage].findIndex((app) => app.id === cardId);
    if (idx !== -1) {
      fromStage = stage;
      cardIndex = idx;
      break;
    }
  }

  // Card not found — return unchanged
  if (fromStage === undefined || cardIndex === -1) {
    return state;
  }

  // Already in target stage — return unchanged
  if (fromStage === toStage) {
    return state;
  }

  const card = state.columns[fromStage][cardIndex];

  // Build new columns immutably
  const newColumns = { ...state.columns };

  // Remove card from source stage
  newColumns[fromStage] = [
    ...state.columns[fromStage].slice(0, cardIndex),
    ...state.columns[fromStage].slice(cardIndex + 1),
  ];

  // Add card to target stage (update its stage field)
  const movedCard = { ...card, stage: toStage };
  newColumns[toStage] = [...state.columns[toStage], movedCard];

  // Append pending mutation
  const mutation = {
    cardId,
    fromStage,
    toStage,
    timestamp: Date.now(),
  };

  return {
    columns: newColumns,
    pendingMutations: [...state.pendingMutations, mutation],
  };
}
