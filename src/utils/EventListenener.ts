export class EventListener<Channels extends Record<string, any>> {
  allHandlers = new Set<<EV extends keyof Channels>(change: { event: EV, data: Channels[EV] }) => void>();
  eventsHandlers = new Map<keyof Channels, Set<(data: Channels[keyof Channels]) => void>>();

  all(callback: (data: Channels[keyof Channels]) => void) {
    this.allHandlers.add(callback);

    return {
      unsubscribe: () => {
        this.allHandlers.delete(callback);
      },
    }
  }

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
    this.allHandlers.forEach((callback) => callback({ event, data }));


    const callbacks = this.eventsHandlers.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        callback(data);
      });
    }
  }

  clear() {
    this.eventsHandlers.clear();
    this.allHandlers.clear();
  }
}