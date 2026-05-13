import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupByStage } from '../lib/kanban/groupByStage.ts';
import { moveCardReducer } from '../lib/kanban/reducer.ts';
import { toggleSelection } from '../lib/kanban/selection.ts';
import type { Application, Stage, KanbanState, MoveAction } from '../lib/kanban/types.ts';

const ALL_STAGES: Stage[] = ['NEW', 'SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'HIRED', 'REJECTED'];

function makeApp(overrides: Partial<Application> & { id: string; stage: Stage }): Application {
  return {
    candidateName: 'Test User',
    jobTitle: 'Engineer',
    timeInStage: 3,
    ...overrides,
  };
}

describe('groupByStage', () => {
  it('returns all stages with empty arrays when no apps provided', () => {
    const result = groupByStage([], ALL_STAGES);
    for (const stage of ALL_STAGES) {
      assert.deepEqual(result[stage], []);
    }
  });

  it('groups applications into correct stages', () => {
    const apps: Application[] = [
      makeApp({ id: '1', stage: 'NEW' }),
      makeApp({ id: '2', stage: 'INTERVIEW' }),
      makeApp({ id: '3', stage: 'NEW' }),
    ];
    const result = groupByStage(apps, ALL_STAGES);
    assert.equal(result['NEW'].length, 2);
    assert.equal(result['INTERVIEW'].length, 1);
    assert.equal(result['SCREENING'].length, 0);
  });

  it('preserves order within each stage', () => {
    const apps: Application[] = [
      makeApp({ id: 'a', stage: 'OFFER' }),
      makeApp({ id: 'b', stage: 'OFFER' }),
      makeApp({ id: 'c', stage: 'OFFER' }),
    ];
    const result = groupByStage(apps, ALL_STAGES);
    assert.deepEqual(
      result['OFFER'].map((a) => a.id),
      ['a', 'b', 'c']
    );
  });

  it('ignores apps whose stage is not in the provided stages list', () => {
    const apps: Application[] = [
      makeApp({ id: '1', stage: 'HIRED' }),
    ];
    const result = groupByStage(apps, ['NEW', 'SCREENING']);
    assert.equal(result['NEW'].length, 0);
    assert.equal(result['SCREENING'].length, 0);
    assert.equal(result['HIRED' as Stage], undefined);
  });
});

describe('moveCardReducer', () => {
  function makeState(apps: Application[]): KanbanState {
    return {
      columns: groupByStage(apps, ALL_STAGES),
      pendingMutations: [],
    };
  }

  it('moves a card from one stage to another', () => {
    const state = makeState([
      makeApp({ id: '1', stage: 'NEW' }),
      makeApp({ id: '2', stage: 'NEW' }),
    ]);
    const action: MoveAction = { type: 'MOVE_CARD', cardId: '1', toStage: 'SCREENING' };
    const next = moveCardReducer(state, action);

    assert.equal(next.columns['NEW'].length, 1);
    assert.equal(next.columns['SCREENING'].length, 1);
    assert.equal(next.columns['SCREENING'][0].id, '1');
    assert.equal(next.columns['SCREENING'][0].stage, 'SCREENING');
  });

  it('appends a pending mutation', () => {
    const state = makeState([makeApp({ id: '1', stage: 'NEW' })]);
    const action: MoveAction = { type: 'MOVE_CARD', cardId: '1', toStage: 'INTERVIEW' };
    const next = moveCardReducer(state, action);

    assert.equal(next.pendingMutations.length, 1);
    assert.equal(next.pendingMutations[0].cardId, '1');
    assert.equal(next.pendingMutations[0].fromStage, 'NEW');
    assert.equal(next.pendingMutations[0].toStage, 'INTERVIEW');
    assert.equal(typeof next.pendingMutations[0].timestamp, 'number');
  });

  it('returns unchanged state when card not found', () => {
    const state = makeState([makeApp({ id: '1', stage: 'NEW' })]);
    const action: MoveAction = { type: 'MOVE_CARD', cardId: 'nonexistent', toStage: 'SCREENING' };
    const next = moveCardReducer(state, action);

    assert.strictEqual(next, state);
  });

  it('returns unchanged state when card already in target stage', () => {
    const state = makeState([makeApp({ id: '1', stage: 'NEW' })]);
    const action: MoveAction = { type: 'MOVE_CARD', cardId: '1', toStage: 'NEW' };
    const next = moveCardReducer(state, action);

    assert.strictEqual(next, state);
  });

  it('does not mutate the original state', () => {
    const state = makeState([
      makeApp({ id: '1', stage: 'NEW' }),
      makeApp({ id: '2', stage: 'NEW' }),
    ]);
    const originalAppliedLength = state.columns['NEW'].length;
    const action: MoveAction = { type: 'MOVE_CARD', cardId: '1', toStage: 'OFFER' };
    moveCardReducer(state, action);

    assert.equal(state.columns['NEW'].length, originalAppliedLength);
    assert.equal(state.pendingMutations.length, 0);
  });
});

describe('toggleSelection', () => {
  it('adds an id when not present', () => {
    const set = new Set<string>();
    const result = toggleSelection(set, 'a');
    assert.equal(result.has('a'), true);
    assert.equal(result.size, 1);
  });

  it('removes an id when present', () => {
    const set = new Set(['a', 'b']);
    const result = toggleSelection(set, 'a');
    assert.equal(result.has('a'), false);
    assert.equal(result.has('b'), true);
    assert.equal(result.size, 1);
  });

  it('is an involution: toggle(toggle(set, id), id) equals original', () => {
    const set = new Set(['x', 'y']);
    const once = toggleSelection(set, 'x');
    const twice = toggleSelection(once, 'x');
    assert.deepEqual(twice, set);
  });

  it('does not mutate the original set', () => {
    const set = new Set(['a']);
    toggleSelection(set, 'a');
    assert.equal(set.has('a'), true);
    assert.equal(set.size, 1);
  });
});
