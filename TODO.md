# Spawnkit lib

- Move client validation within .spawn and check if process.env === 'developement'

- Start writing documentation / recipes.

- Client should wait for a response/ if reponse take too long, then client will timeout, unless a signal is sent to the client to tall that the message is still processing and everything is fine.

- ability to control how many request can be handled at the same time. ( concurrency )

- use .emitInternal to handle remote eviction? 

- Add ability to send stream 
     1. Send event to instance to set up a realtime channel
     2. emit messages to that channel
     ( we could do that for instead of scheduling messages?? ).

- Add ability to create instance with certain args??

- each instance proxy should run on its own process, we cannot use Bull worker as it's a separate thread for all instance, we need one worker for each instance! when proxy is done, we should call process.exit(0) ??

- add methods to logger based on logLevel and channel
     ( .info .error. ... etc) for infra, per request.

- add replica support. we should be able to ????

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
