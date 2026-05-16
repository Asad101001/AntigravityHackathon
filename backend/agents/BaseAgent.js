/**
 * BaseAgent — Abstract base class for all pipeline agents
 * Every agent extends this and implements execute(context)
 */

class BaseAgent {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }

  /**
   * Run the agent with timing, logging, and error handling
   * @param {Object} context — Shared Antigravity context object
   * @returns {Object} Updated context with agent output + log entry
   */
  async run(context) {
    const startTime = Date.now();
    const log = {
      id: this.id,
      name: this.name,
      status: 'running',
      start_time: new Date().toISOString(),
      duration_ms: 0,
      input: null,
      output: null,
      reasoning: '',
      error: null
    };

    try {
      const result = await this.execute(context);
      log.status = 'success';
      log.output = this._toLogSafe(result.output || {});
      log.input = this._toLogSafe(result.input || '');
      log.reasoning = result.reasoning || '';
      
      // Merge agent output into context
      Object.assign(context, result.contextUpdates || {});
    } catch (error) {
      log.status = 'error';
      log.error = error.message;
      console.error(`[Agent ${this.id}] ${this.name} failed:`, error.message);
    }

    log.duration_ms = Date.now() - startTime;
    
    const { logAgentTrace } = require('../traceLogger');
    logAgentTrace(this.name, this.name, log.input, log.output, log.duration_ms);

    // Add log entry to execution_logs
    if (!context.execution_logs) context.execution_logs = [];
    context.execution_logs.push(log);

    return context;
  }

  /**
   * Convert agent inputs/outputs into JSON-safe snapshots before storing them
   * in execution logs. Some agents pass the shared workflow context as their
   * input; keeping that object by reference makes context.execution_logs point
   * back to the log entry and Express cannot JSON.stringify the API response.
   *
   * @param {*} value
   * @returns {*} JSON-safe clone suitable for trace files and API responses
   */
  _toLogSafe(value) {
    const seen = new WeakSet();
    const serialized = JSON.stringify(value, (key, nestedValue) => {
      if (key === 'execution_logs') {
        return Array.isArray(nestedValue)
          ? `[${nestedValue.length} execution log(s) omitted]`
          : '[execution logs omitted]';
      }

      if (typeof nestedValue === 'object' && nestedValue !== null) {
        if (seen.has(nestedValue)) return '[Circular]';
        seen.add(nestedValue);
      }

      return nestedValue;
    });

    return serialized === undefined ? null : JSON.parse(serialized);
  }

  /**
   * Override in subclass — perform the actual agent work
   * @param {Object} context 
   * @returns {Object} { input, output, reasoning, contextUpdates }
   */
  async execute(context) {
    throw new Error(`Agent ${this.name} must implement execute()`);
  }
}

module.exports = BaseAgent;


