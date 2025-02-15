<picture>
  <!-- <source srcset="./banner-dark.png" media="(prefers-color-scheme: dark)"> -->
  <!-- <source srcset="./banner.png" media="(prefers-color-scheme: light)"> -->
  <img src="./assets/readme-hero.png" alt="Spawnkit Logo">
</picture>

# 🌟 Spawnkit

[![npm](https://img.shields.io/npm/dm/better-auth)](https://npm.chart.dev/better-auth?primary=neutral&gray=neutral&theme=dark)
[![npm version](https://img.shields.io/npm/v/better-auth.svg)](https://www.npmjs.com/package/better-auth)
[![GitHub stars](https://img.shields.io/github/stars/better-auth/better-auth)](https://github.com/better-auth/better-auth/stargazers)

Spawnkit is a powerful open-source alternative to Cloudflare Workers, designed for building distributed, stateful microservices with real-time capabilities.
While Cloudflare Workers excel at edge computing, Spawnkit provides a more flexible and self-hosted solution for dynamic and complex distributed systems.
Spawnkit provides a comprehensive set of features out of the box and includes a plugin ecosystem that simplifies adding advanced functionalities with minimal code in short amount of time.

The mental model of building backend application using Spawnkit is so much simpler. You can litteraly ship what would have been an extremely complex apps in a matter of hours without having to sacrifice ergonomics, cost, productivity, vendor lock in. 

## Quick Links:

<div>
  💬 <a href="https://discord.com/invite/GYC3W7tZzb">Discord</a><br/>
  💻 <a href="https://better-auth.com">Website</a><br/>
  🐛 <a href="https://github.com/better-auth/better-auth/issues">Issues</a><br/>
</div>

## Features


- **Full Control**: Self-host your infrastructure without vendor lock-in
- **No Cold Starts**: Persistent instances eliminate cold start latency
- **Cost Effective**: Pay only for your infrastructure, not per-request serverless
- **Local Development**: Develop and test locally with full feature parity, it's the same thing.

- **Custom Networking**: Deploy anywhere, including private networks ( only redis for now )
- **Monitoring Dashboard**: Detailed insights into your distributed system ( wip )
- **Resource Control**: Fine-grained control over compute resources ( wip )

### 🚀 Instance Management
- Persistent state across instance restarts

### 🔄 Real-time Communication
- Response streaming support
- Broadcast capabilities
- Pub/sub messaging system
- Remote procedure calls (RPC)

### ⏰ Scheduling
- Delayed job execution
- Cron-style scheduling
- Job cancellation and management
- Schedule listing and status tracking

### 🔌 Plugin System
- Extensible plugin architecture
- Support for Multiple SQLite databases per instance

### 🔧 Developer Experience
- TypeScript support, Strong type safety
- Graceful error propagation

## Installation

```md
npm install spawnkit
# or
yarn add spawnkit
```

## Get Started - Quick Start

Here's a simple example showing how to create and use a basic instance:

```tsx
import * as Spawnkit from 'spawnkit';

// Define your instance
class OrderBook extends Spawnkit.Instance {
  async buy(order: { tick: string, qty: number }) {
    return {
      success: true,
      status: "pending...",
      order
    };
  }
}

// Create a client
const client = Spawnkit.Client.from({
    adapters: createAdapters(), // Your adapter configuration
    instances: {
      OrderBook,
    },
});

// Start the client
await client.start();

// Spawn an instance
const orderbook = client.spawn("OrderBook", "BTC/EUR");

// Call the instance method as if it's local method.
const order = await orderbook.buy({
    tick: "APPL",
    qty: 100
});
```

## Advanced Features

### Response Streaming
Spawnkit provides simple yet powerful streaming API for handling real-time data flows.
Here's an example:

```tsx
class ChatRoom extends Spawnkit.Instance {
  activeUsers = new Set<string>();
  eventBus = new EventBus();

  setUserActive(userId: string) {
    const alreadyActive = this.activeUsers.has(userId);
    this.activeUsers.add(userId);

    if (!alreadyActive) {
      this.eventBus.publish('active-user', userId);
    }
  }

  subscribeNotifications(config: { count: number }) {
    const eventReceiver = createLiveEventReceiverFromAnySource();
    return new Spawnkit.Stream<string>(async (stream) => {
      return this.eventBus.on('active-user', (userId) => {
        stream.emit(userId);
      })
    });
  }
}
```

### Scheduling
Spawnkit offers flexible scheduling options for both delayed and recurring tasks:

```tsx
// Schedule a one-time task with delay
const scheduleId = await instance.schedule({ delay: 5000 })
  .someMethod("arg1", "arg2");

// Schedule a recurring task using cron syntax
const cronId = await instance.schedule({ cron: "*/5 * * * *" })
  .someMethod();


instance.unschedule(scheduleId);
instance.unschedule(cronId);
```

## Plugins
Spawnkit supports a powerful plugin system that allows you to intercept and handle various lifecycle events of instances. Plugins can be used to add cross-cutting concerns like logging, monitoring, or custom business logic.

Here's an example of a plugin that logs instance lifecycle events:

## Patterns
- Publish / subscribe
- **Long-running Operations**: Perfect for background jobs and data processing
- **Cross-instance Communication**: Direct communication between service instances

## Documentation

For detailed documentation and more examples, visit our [documentation site](https://docs.spawnkit.dev).


## Contribution

Better Auth is free and open source project licensed under the [MIT License](./LICENSE.md). You are free to do whatever you want with it.
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

- [Contribute to the source code](./CONTRIBUTING.md)
- [Suggest new features and report issues](https://github.com/better-auth/better-auth/issues)


## Security
If you discover a security vulnerability within Better Auth, please send an e-mail to security@better-auth.com.

All reports will be promptly addressed, and you'll be credited accordingly.
