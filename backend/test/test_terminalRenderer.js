'use strict';
const assert = require('assert');
const tr = require('../utils/terminalRenderer');

(async () => {
  // Ensure renderer exports renderAgentLine and sparkline
  assert(typeof tr.renderAgentLine === 'function', 'renderAgentLine missing');
  assert(typeof tr.sparkline === 'function', 'sparkline missing');

  // Test sparkline basic behavior
  const s = tr.sparkline([1, 2, 3, 4, 5]);
  assert(typeof s === 'string' && s.length >= 5, 'sparkline output unexpected');
})();
