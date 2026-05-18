'use strict';

const os = require('os');

function pad(str, len = 30) {
  str = String(str || '');
  if (str.length >= len) return str.slice(0, len - 3) + '...';
  return str + ' '.repeat(len - str.length);
}

function sparkline(values = []) {
  const ticks = '▁▂▃▄▅▆▇█';
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map(v => ticks[Math.floor(((v - min) / range) * (ticks.length - 1))]).join('');
}

function renderProviderChart(providers) {
  if (!Array.isArray(providers) || !providers.length) return '';
  const top = providers.slice(0, 8);
  const scores = top.map(p => Number(p.score || p.rating || 0));
  const labels = top.map(p => (p.name || p.id || '').slice(0, 12));
  const bars = labels.map((lab, i) => {
    const pct = Math.round(scores[i] * 100);
    const bar = '▇'.repeat(Math.max(1, Math.round((pct / 10))));
    return `${lab.padEnd(12)} ${bar} ${pct}%`;
  });
  return bars.join(os.EOL);
}

function renderAgentLine({ agentName, action, input, output, durationMs, tracePath }) {
  const name = `${agentName}`.padEnd(20);
  const time = `${durationMs}ms`.padStart(8);
  let summary = '';
  try {
    if (action === 'discover_providers' && output && Array.isArray(output.providers)) {
      summary = `${output.providers.length} providers found`;
    } else if (action === 'rank_providers' && output && Array.isArray(output.ranked)) {
      summary = `${output.ranked.length} ranked (top: ${output.ranked[0]?.name || output.ranked[0]?.id || 'n/a'})`;
    } else if (action === 'execute_booking' && output && output.booking_id) {
      summary = `booking ${output.booking_id}`;
    } else if (action === 'resolve_location' && output && output.area_name) {
      summary = `${output.area_name}${output.city ? ', ' + output.city : ''}`;
    } else if (typeof output === 'string') {
      summary = output.slice(0, 60);
    } else if (output && output.message) {
      summary = String(output.message).slice(0, 60);
    } else {
      summary = '';
    }
  } catch (err) {
    summary = '';
  }

  console.log(`▶ ${name} — ${pad(summary, 40)} — ${time}  [trace: ${tracePath ? tracePath.replace(process.cwd() + '/', '') : 'n/a'}]`);

  // If ranking output includes provider scores, print a small chart
  try {
    const providers = output?.ranked || output?.providers || output?.candidates;
    if (Array.isArray(providers) && providers.length) {
      const chart = renderProviderChart(providers);
      if (chart) {
        console.log(chart);
      }
    }
  } catch (err) {
    // ignore
  }
}

module.exports = { renderAgentLine, sparkline };
