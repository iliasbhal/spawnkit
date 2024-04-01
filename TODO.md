- Remove null typings from .data. add an initialize() function that returns the initial data. OR have to defined a .data attribute.
- error thrown during a method call should be serialized to client
- should also emit an error event threw the this.emit function
- should create a queue for each type of instance
  to allow for easier migration and customization.
- should be able to upgrade an instance that is live. Probably by sending an end signal. Example, force stop the live instance -> spin an updated instance that will import the old data.

- // TODO: we should exclude methods that return a Stream from clientAPI.emit method;
