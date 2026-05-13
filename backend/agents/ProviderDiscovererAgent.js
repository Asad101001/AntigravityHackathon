/**
 * Agent 3: ProviderDiscovererAgent
 * Filters provider dataset from SQLite by service type + location
 */

const BaseAgent = require('./BaseAgent');
const db = require('../db');

class ProviderDiscovererAgent extends BaseAgent {
  constructor() {
    super('discover_providers', 3);
  }

  async execute(context) {
    const serviceType = context.service_type;
    const location = context.location;
    const city = context.city;

    if (!serviceType) {
      return {
        input: { service: serviceType, location },
        output: { providers: [], count: 0 },
        reasoning: 'Cannot discover providers without a service type.',
        contextUpdates: { providers: [] }
      };
    }

    const searchLoc = location || city || '';
    const providers = await db.findProviders(serviceType, searchLoc);

    let reasoning = `Found ${providers.length} ${serviceType} providers near ${searchLoc}. `;
    if (providers.length > 0) {
      reasoning += `Top rated: ${providers[0].name} (${providers[0].rating}★). `;
    }

    return {
      input: { service: serviceType, location, city },
      output: { providers, count: providers.length },
      reasoning,
      contextUpdates: { providers }
    };
  }
}

module.exports = ProviderDiscovererAgent;


