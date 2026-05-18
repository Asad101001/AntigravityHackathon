const tr = require('../utils/terminalRenderer');

function run(){
  console.log('Running terminalRenderer smoke test');
  tr.renderAgentLine(3, 'discover_providers', '12 providers found (4 local, 8 remote)', 1778);
  tr.renderProviderChart([
    { id: 'AC069', name: 'PECHS Clean AC Technician Zahid', score: 0.82 },
    { id: 'PL200', name: 'Scheme 33 Clean Plumber Hassan', score: 0.78 },
    { id: 'AC101', name: 'Northside AC Repair', score: 0.62 }
  ]);
  tr.renderWorkflowSummary('WF_TEST', { id: 'AC069', name: 'Zahid' }, 3752, 'logs/test');
  console.log('test_terminalRenderer done');
}

run();
