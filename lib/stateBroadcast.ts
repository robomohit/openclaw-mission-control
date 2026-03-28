import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

export const STATE_UPDATE_EVENT = 'state';

export function subscribeToStateUpdates(
  fn: (state: unknown) => void,
): () => void {
  emitter.on(STATE_UPDATE_EVENT, fn);
  return () => {
    emitter.off(STATE_UPDATE_EVENT, fn);
  };
}

export function publishStateUpdate(state: unknown): void {
  emitter.emit(STATE_UPDATE_EVENT, state);
}
