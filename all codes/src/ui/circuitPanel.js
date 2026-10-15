/**
 * circuitPanel.js
 * Manages the "Circuit Connections" UI panel, wire list, undo/reset buttons,
 * instruction banner, selection cancellation, and SVG circuit schematic.
 */

import { CircuitValidator } from '../circuit/circuitValidator.js';
import { getTerminalDisplayName } from '../circuit/circuitConfig.js';

export class CircuitPanel {
  constructor(options) {
    this.circuitState = options.circuitState;
    this.wireRenderer = options.wireRenderer;
    this.interactionController = options.interactionController;
    this.simulation = options.simulation;
    this.onFeedback = options.onFeedback || (() => {});

    this.pendingResetConfirm = false;

    this.initDOM();
    this.circuitState.subscribe(() => this.render());
  }

  initDOM() {
    this.panelContainer = document.getElementById('circuit-panel');
    this.connectionCountBadge = document.getElementById('connection-count-badge');
    this.circuitStatusBadge = document.getElementById('circuit-status-badge');
    this.connectionList = document.getElementById('connection-list');
    this.emptyMessage = document.getElementById('empty-connections-message');
    this.instructionBanner = document.getElementById('instruction-banner');
    this.cancelSelectionBtn = document.getElementById('cancel-selection-btn');
    this.undoWireBtn = document.getElementById('undo-wire-btn');
    this.resetCircuitBtn = document.getElementById('reset-circuit-btn');
    this.schematicModal = document.getElementById('schematic-modal');
    this.toggleSchematicBtn = document.getElementById('toggle-schematic-btn');
    this.closeSchematicBtn = document.getElementById('close-schematic-btn');

    // Attach button listeners
    if (this.cancelSelectionBtn) {
      this.cancelSelectionBtn.addEventListener('click', () => {
        this.interactionController.cancelSelection();
      });
    }

    if (this.undoWireBtn) {
      this.undoWireBtn.addEventListener('click', () => {
        this.handleUndo();
      });
    }

    if (this.resetCircuitBtn) {
      this.resetCircuitBtn.addEventListener('click', () => {
        this.handleResetWithConfirm();
      });
    }

    if (this.toggleSchematicBtn && this.schematicModal) {
      this.toggleSchematicBtn.addEventListener('click', () => {
        this.schematicModal.classList.add('open');
      });
    }

    if (this.closeSchematicBtn && this.schematicModal) {
      this.closeSchematicBtn.addEventListener('click', () => {
        this.schematicModal.classList.remove('open');
      });
    }

    if (this.schematicModal) {
      this.schematicModal.addEventListener('click', (e) => {
        if (e.target === this.schematicModal) {
          this.schematicModal.classList.remove('open');
        }
      });
    }

    this.render();
  }

  /**
   * Handle undoing the last connection.
   */
  handleUndo() {
    const wasActive = this.simulation && this.simulation.keyClosed;
    const undone = this.circuitState.undoLastConnection();
    if (undone) {
      this.wireRenderer.removeWire(undone.id);

      if (wasActive) {
        const fb = this.simulation.handleWireRemovedWhileActive();
        this.circuitState.setSwitchClosed(false);
        this.onFeedback({
          type: 'warning',
          message: fb.message
        });
        return;
      }

      this.onFeedback({
        type: 'info',
        message: `Undid wire between ${getTerminalDisplayName(undone.from)} and ${getTerminalDisplayName(undone.to)}.`
      });
    }
  }

  /**
   * Handle resetting circuit with inline 2nd-click confirmation.
   */
  handleResetWithConfirm() {
    if (this.circuitState.connections.length === 0) {
      this.onFeedback({ type: 'info', message: 'Circuit is already empty.' });
      return;
    }

    if (!this.pendingResetConfirm) {
      this.pendingResetConfirm = true;
      this.resetCircuitBtn.textContent = '⚠️ Confirm Reset?';
      this.resetCircuitBtn.classList.add('confirming');

      setTimeout(() => {
        this.pendingResetConfirm = false;
        if (this.resetCircuitBtn) {
          this.resetCircuitBtn.textContent = '🔄 Reset Circuit';
          this.resetCircuitBtn.classList.remove('confirming');
        }
      }, 3500);
      return;
    }

    // Confirmed reset
    this.pendingResetConfirm = false;
    this.resetCircuitBtn.textContent = '🔄 Reset Circuit';
    this.resetCircuitBtn.classList.remove('confirming');

    if (this.simulation) {
      this.simulation.resetAll();
    }
    this.circuitState.reset();
    this.wireRenderer.clearAllWires();
    this.interactionController.cancelSelection();

    this.onFeedback({
      type: 'info',
      message: 'All user circuit wires removed. Ready for new connections.'
    });
  }

  /**
   * Update instruction banner when terminal selection changes.
   */
  updateSelectionUI(selectedTerminalId) {
    if (selectedTerminalId) {
      const name = getTerminalDisplayName(selectedTerminalId);
      this.instructionBanner.textContent = `Selected: ${name}. Now click a second terminal to connect.`;
      this.instructionBanner.classList.add('selecting');
      if (this.cancelSelectionBtn) this.cancelSelectionBtn.style.display = 'inline-flex';
    } else {
      this.instructionBanner.textContent = 'Click one terminal, then click another terminal to connect a wire.';
      this.instructionBanner.classList.remove('selecting');
      if (this.cancelSelectionBtn) this.cancelSelectionBtn.style.display = 'none';
    }
  }

  /**
   * Render the connection list, counts, and validation status.
   */
  render() {
    const connections = this.circuitState.connections;
    const validation = CircuitValidator.validateFullCircuit(this.circuitState);

    // Update count badge
    if (this.connectionCountBadge) {
      this.connectionCountBadge.textContent = `${connections.length} / ${validation.requiredTotalCount} Wires`;
    }

    // Update status badge
    if (this.circuitStatusBadge) {
      if (validation.hasShortCircuit) {
        this.circuitStatusBadge.textContent = '⚠️ Short Circuit Warning';
        this.circuitStatusBadge.className = 'status-tag danger';
      } else if (validation.warningCount > 0) {
        this.circuitStatusBadge.textContent = '⚠️ Misplaced Wire';
        this.circuitStatusBadge.className = 'status-tag warning';
      } else if (validation.isFullyValid) {
        this.circuitStatusBadge.textContent = '🎉 Circuit Complete (Key Ready)';
        this.circuitStatusBadge.className = 'status-tag success';
      } else {
        this.circuitStatusBadge.textContent = 'Incomplete Circuit';
        this.circuitStatusBadge.className = 'status-tag incomplete';
      }
    }

    // Update Undo button state
    if (this.undoWireBtn) {
      this.undoWireBtn.disabled = connections.length === 0;
    }

    // Update Reset button state
    if (this.resetCircuitBtn) {
      this.resetCircuitBtn.disabled = connections.length === 0;
    }

    // Render connection items
    if (!this.connectionList) return;

    if (connections.length === 0) {
      this.emptyMessage.style.display = 'block';
      this.connectionList.innerHTML = '';
      return;
    }

    this.emptyMessage.style.display = 'none';
    this.connectionList.innerHTML = '';

    connections.forEach((conn) => {
      const li = document.createElement('li');
      li.className = `conn-item conn-${conn.status}`;

      const fromName = getTerminalDisplayName(conn.from);
      const toName = getTerminalDisplayName(conn.to);

      let icon = '✅';
      if (conn.status === 'error') icon = '❌';
      else if (conn.status === 'warning') icon = '⚠️';

      li.innerHTML = `
        <div class="conn-info">
          <span class="conn-icon">${icon}</span>
          <span class="conn-names"><strong>${fromName}</strong> ↔ <strong>${toName}</strong></span>
        </div>
        <button class="conn-remove-btn" title="Remove this wire" data-id="${conn.id}">✕</button>
      `;

      const removeBtn = li.querySelector('.conn-remove-btn');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const wasActive = this.simulation && this.simulation.keyClosed;
        const removed = this.circuitState.removeConnection(id);
        if (removed) {
          this.wireRenderer.removeWire(id);

          if (wasActive) {
            const fb = this.simulation.handleWireRemovedWhileActive();
            this.circuitState.setSwitchClosed(false);
            this.onFeedback({
              type: 'warning',
              message: fb.message
            });
            return;
          }

          this.onFeedback({
            type: 'info',
            message: `Removed wire between ${fromName} and ${toName}.`
          });
        }
      });

      this.connectionList.appendChild(li);
    });
  }
}
