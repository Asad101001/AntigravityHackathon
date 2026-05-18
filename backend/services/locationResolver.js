'use strict';

const LocationResolverAgent = require('../agents/LocationResolverAgent');

/**
 * Simple wrapper service to expose a promise-based resolve function for other modules.
 * This keeps the agent encapsulated and provides a stable API for other code.
 */
class LocationResolverService {
  constructor() {
    this.agent = new LocationResolverAgent();
  }

  async resolve(context = {}) {
    return this.agent.execute(context);
  }
}

module.exports = new LocationResolverService();
