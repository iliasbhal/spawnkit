- Remove null typings from .data. add an initialize() function that returns the initial data. OR have to defined a .data attribute.
- should create a queue for each type of instance
  to allow for easier migration and customization.
- should be able to upgrade an instance that is live. Probably by sending an end signal. Example, force stop the live instance -> spin an updated instance that will import the old data.
