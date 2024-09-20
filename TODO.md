# Spawnkit lib

- Start writing documentation / recipes.


- add methods to logger based on logLevel and channel
     ( .info .error. ... etc) for infra, per request.

- add replica support. we should be able to ????
- add client tolerence + affinity ( like Kubernetes ) ???


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
