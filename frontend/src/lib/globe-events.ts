type GlobeEventCallback = (version: number) => void;

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

export function emitGlobeEvent(version: number): void {
  listeners.forEach((callback) => callback(version));
}
