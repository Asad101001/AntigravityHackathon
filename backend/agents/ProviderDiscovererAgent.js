/**
 * Agent 3: ProviderDiscovererAgent
 * Filters mock provider dataset by service type + location
 * Supports 5km radius with 10km expansion fallback
 */

const BaseAgent = require('./BaseAgent');
const providers = require('../data/providers.json');

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

    // ── Primary Filter: service type + location (within 5km) ──
    let filtered = providers.filter(p => {
      const serviceMatch = p.service.toLowerCase() === serviceType.toLowerCase();
      const areaMatch = location ? p.area.toLowerCase() === location.toLowerCase() : true;
      const cityMatch = city ? p.city.toLowerCase() === city.toLowerCase() : true;
      return serviceMatch && (areaMatch || cityMatch) && p.distance_km <= 5;
    });

    let searchRadius = 5;
    let reasoning = '';

    // ── Fallback 1: Expand to same city, any area within 10km ──
    if (filtered.length === 0 && city) {
      filtered = providers.filter(p => {
        return p.service.toLowerCase() === serviceType.toLowerCase() &&
               p.city.toLowerCase() === city.toLowerCase() &&
               p.distance_km <= 10;
      });
      searchRadius = 10;
      reasoning = `No providers found in ${location || 'specified area'} within 5km. Expanded search to ${city} within 10km. `;
    }

    // ── Fallback 2: Any matching service, any city ──
    if (filtered.length === 0) {
      filtered = providers.filter(p => 
        p.service.toLowerCase() === serviceType.toLowerCase()
      ).slice(0, 5);
      searchRadius = 'any';
      reasoning = `No ${serviceType} providers found in ${city || 'specified area'}. Showing available providers from other areas. `;
    }

    // Sort by distance
    filtered.sort((a, b) => a.distance_km - b.distance_km);

    reasoning += `Found ${filtered.length} ${serviceType} providers within ${searchRadius}km of ${location || 'area'}. `;
    if (filtered.length > 0) {
      reasoning += `Closest: ${filtered[0].name} (${filtered[0].distance_km}km). Farthest: ${filtered[filtered.length - 1].name} (${filtered[filtered.length - 1].distance_km}km).`;
    }

    return {
      input: { service: serviceType, location, city, search_radius: searchRadius },
      output: { providers: filtered, count: filtered.length },
      reasoning,
      contextUpdates: { providers: filtered }
    };
  }
}

module.exports = ProviderDiscovererAgent;
