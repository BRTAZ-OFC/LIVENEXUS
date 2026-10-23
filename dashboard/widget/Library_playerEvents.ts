class PlayerEvents {
  listeners = new Map();

  on(event, listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event, value) {
    this.listeners.get(event)?.forEach((listener) => listener(value));
  }
}

export const playerEvents = new PlayerEvents();
