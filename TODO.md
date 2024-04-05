- Add ability to do a custom initial load. After the spawnkit has loaded .data using the snaphot adapter. The developer can specifiy a way to load other things (example: .data has the url of a database, then the user loads an SDK that connects to that URL). Remove null typings from .data. add an initialize() function that returns the initial data. OR have to defined a .data attribute.

- Redis Adapter? Or through a worker???
  Should add TTL to some of the stuff on redis

- should create a queue for each type of instance
  to allow for easier migration and customization.
- should be able to upgrade an instance that is live. Probably by sending an end signal. Example, force stop the live instance -> spin an updated instance that will import the old data.
