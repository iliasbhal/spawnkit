# Spawnkit lib

- Redis Adapter? Or through a worker???
  Should add TTL to some of the stuff on redis

- should create a queue for each type of instance
  to allow for easier migration and customization.

# Spawnkit cloud

- We need to ensure that clients don't have access to the whole database just by guessing the id. We can use a custom prefix per "workspace".

- should be able to upgrade an instance that is live. Probably by sending an end signal. Example, force stop the live instance -> spin an updated instance that will import the old data.

- The client sdk should not accept a redis connection but instead do everything through an API key.

- The user should be able to update the hosted Worker instances. We might need to rely on something to handle the code upload. ( or maybe have everything packaged as a WASM file that we run on our fargate ??? )
