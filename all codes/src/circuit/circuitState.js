/**
 * circuitState.js
 * Manages active user connections, circuit graph state, and undo history.
 */

export class CircuitState {
  constructor() {
    this.connections = []; // Array of { id, from, to, status, role, wireType, message, wireRef, timestamp }
    this.switchClosed = false;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this));
  }

  /**
   * Check if a connection already exists between two terminals (undirected).
   */
  hasConnection(termA, termB) {
    return this.connections.some(
      (c) => (c.from === termA && c.to === termB) || (c.from === termB && c.to === termA)
    );
  }

  /**
   * Get existing connection object between two terminals.
   */
  getConnection(termA, termB) {
    return this.connections.find(
      (c) => (c.from === termA && c.to === termB) || (c.from === termB && c.to === termA)
    ) || null;
  }

  /**
   * Get all active connections attached to a specific terminal.
   */
  getConnectionsForTerminal(termId) {
    return this.connections.filter((c) => c.from === termId || c.to === termId);
  }

  /**
   * Get count of active connections attached to a terminal.
   */
  getConnectionCountForTerminal(termId) {
    return this.getConnectionsForTerminal(termId).length;
  }

  /**
   * Add a new connection.
   */
  addConnection(from, to, validationResult) {
    const id = `conn_${from}_${to}_${Date.now()}`;
    const connection = {
      id,
      from,
      to,
      status: validationResult.status, // 'valid' | 'warning' | 'error'
      role: validationResult.role || 'unknown',
      wireType: validationResult.wireType || 'series',
      message: validationResult.message,
      ruleId: validationResult.ruleId || null,
      wireRef: null,
      timestamp: Date.now()
    };

    this.connections.push(connection);
    this.notify();
    return connection;
  }

  /**
   * Remove a connection by its unique ID.
   */
  removeConnection(id) {
    const index = this.connections.findIndex((c) => c.id === id);
    if (index !== -1) {
      const removed = this.connections.splice(index, 1)[0];
      this.notify();
      return removed;
    }
    return null;
  }

  /**
   * Undo the most recently added connection.
   */
  undoLastConnection() {
    if (this.connections.length > 0) {
      const removed = this.connections.pop();
      this.notify();
      return removed;
    }
    return null;
  }

  /**
   * Reset all user connections.
   */
  reset() {
    const removedList = [...this.connections];
    this.connections = [];
    this.switchClosed = false;
    this.notify();
    return removedList;
  }

  /**
   * Toggle the switch state (only permitted when circuit is complete).
   */
  setSwitchClosed(closed) {
    this.switchClosed = Boolean(closed);
    this.notify();
  }
}
