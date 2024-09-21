

export class EventListener<Channels extends Record<string, any>> {
  eventsHandlers = new Map<keyof Channels, Set<(data: Channels[keyof Channels]) => void>>();

  on<EV extends keyof Channels>(event: EV, callback: (data: Channels[EV]) => void) {
    if (!this.eventsHandlers.has(event)) {
      this.eventsHandlers.set(event, new Set());
    }

    this.eventsHandlers.get(event)!.add(callback);

    return {
      notifyAll: (data: Channels[EV]) => {
        this.notify(event, data);
      },
      notify: (data: Channels[EV]) => {
        callback(data);
      },
      unsubscribe: () => {
        this.off(event, callback);
      },
    }
  }

  off<EV extends keyof Channels>(event: EV, callback: (data: Channels[EV]) => void) {
    const callbacks = this.eventsHandlers.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  notify<EV extends keyof Channels>(event: EV, data: Channels[EV]) {
    const callbacks = this.eventsHandlers.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        callback(data);
      });
    }
  }

  clear() {
    this.eventsHandlers.clear();
  }
}