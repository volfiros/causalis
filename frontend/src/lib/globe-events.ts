export interface GlobeEventPayload {
  version: number;
  entities: string[];
  selectedEntityId?: string;
  highlightedRouteIds?: string[];
}

type GlobeEventCallback = (payload: GlobeEventPayload) => void;

const listeners: GlobeEventCallback[] = [];

export function subscribeToGlobeEvents(callback: GlobeEventCallback): () => void {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

export function emitGlobeEvent(payload: GlobeEventPayload): void {
  listeners.forEach((callback) => callback(payload));
}
