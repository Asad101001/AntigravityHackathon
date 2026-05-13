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
      log.output = result.output || {};
      log.input = result.input || '';
      log.reasoning = result.reasoning || '';
      
      // Merge agent output into context
      Object.assign(context, result.contextUpdates || {});
    } catch (error) {
      log.status = 'error';
      log.error = error.message;
      console.error(`[Agent ${this.id}] ${this.name} failed:`, error.message);
    }

    log.duration_ms = Date.now() - startTime;
    
    // Add log entry to execution_logs
    if (!context.execution_logs) context.execution_logs = [];
    context.execution_logs.push(log);

    return context;
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
