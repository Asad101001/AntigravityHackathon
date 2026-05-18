// Lightweight terminal renderer for human-friendly workflow output
function padRight(s, n){ s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }

function renderAgentLine(index, name, summary, ms){
  const label = `▶ Agent ${index}: ${name}`;
  console.log(`${padRight(label, 36)} — ${summary} — ${ms}ms`);
}

function renderProviderChart(providers){
  if(!providers || providers.length === 0) return;
  // take top 5
  const top = providers.slice(0,5);
  const scores = top.map(p => p.score || 0);
  const max = Math.max(...scores, 1);
  console.log('\nTop providers:');
  top.forEach(p => {
    const pct = Math.round(((p.score||0)/max) * 10);
    const bar = '▇'.repeat(pct || 1);
    console.log(` ${padRight(p.name || p.id || 'unknown',20)} ${bar} ${Math.round((p.score||0)*100)/100}`);
  });
  console.log('');
}

function renderWorkflowSummary(workflowId, chosen, durationMs, tracePath){
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`Workflow ${workflowId} completed — chosen: ${chosen?.name || chosen?.id || 'none'} (${chosen?.id||''})`);
  console.log(`Duration: ${durationMs}ms | trace: ${tracePath || 'logs/'}\n`);
}

module.exports = {
  renderAgentLine,
  renderProviderChart,
  renderWorkflowSummary
};
