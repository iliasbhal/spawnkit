# Spawkit Plugins

- make it possible to load load hooks in parallel. Each plugin has a uuid generated on fly. And you can place yourself into the pipeline? I don't know, but we should figure out a way to make initializing plugins more parrallel.

- KV: Complete plugin using: 
// https://www.npmjs.com/package/keyv
// https://github.com/zaaack/keyv-file

- add hooks for method call middlware like trpc of fastify.

- Redis plugin. We should expose kv plugin will all the redis command. it should have the same api as redisio.

# Spawnkit lib

- TODO: message ordering from same client same timestamp. (same timestamp order + order within timstamp)

- Add ability to list using some queries. ( first X, lastX, between2 dates );

- Move instance validation within .spawn.

- Start writing documentation / recipes.

- use .emitInternal to handle remote eviction? 

- Add ability to create instance with certain args??

- each instance proxy should run on its own process, we cannot use Bull worker as it's a separate thread for all instance, we need one worker for each instance! when proxy is done, we should call process.exit(0) ??

- add methods to logger based on logLevel and channel
     ( .info .error. ... etc) for infra, per request.

# Spawnkit Redis Adapter:
- Redis Logger should also make use of an object storage(s3) ??
- Redis Events Store should also make use of an object storage(s3) ??
- Redis Data Store should also make use of an object storage(s3) ??
- make serialize/deserialize faster.

# Spawnkit cloud:
- Every machine is dedicated to their namespace so that the user can safly use and read the file system.
- We need to ensure that clients don't have access to the whole database just by guessing the id. We can use a custom prefix per "workspace".
- should be able to upgrade an instance that is live. Probably by sending an end signal. Example, force stop the live instance -> spin an updated instance that will import the old data.
- The client sdk should not accept a redis connection but instead do everything through an API key.
- The user should be able to update the hosted Worker instances. We might need to rely on something to handle the code upload. ( or maybe have everything packaged as a WASM file that we run on our fargate ??? )


# Documentation

- Talk about dispose, and that it removes all ressources used by the client instance. pubsub handlers are unsubscribed, etc.

- Talk about Response Streams and forwarded errors.
- Spawnkit is location independent. Workers and Client only need to connect to the same redis instance for everything to work. All the nitty gritty signaling, messaging and scheduling stuff is done in the background. 

- Write about 