/**
 * circuitConfig.js
 * Central configuration and rules for Ohm's Law circuit validation.
 * Uses existing terminal definitions from src/config/terminalDefinitions.js.
 */

import { TERMINAL_DEFINITIONS, getTerminalById } from '../config/terminalDefinitions.js';

export { TERMINAL_DEFINITIONS, getTerminalById };

/**
 * Required connections for the first valid Ohm's Law practical setup:
 *
 * Main series path:
 * battery_positive → switch_left
 * (switch_left ↔ switch_right inside switch)
 * switch_right → ammeter_positive
 * (ammeter_positive ↔ ammeter_negative inside ammeter)
 * ammeter_negative → rheostat_in
 * (rheostat_in ↔ rheostat_out inside rheostat)
 * rheostat_out → resistor_left
 * (resistor_left ↔ resistor_right inside resistor)
 * resistor_right → battery_negative
 *
 * Voltmeter parallel branch:
 * voltmeter_positive → resistor_left
 * voltmeter_negative → resistor_right
 */
export const REQUIRED_CONNECTIONS = [
  {
    id: 'req_battery_switch',
    from: 'battery_positive',
    to: 'switch_left',
    name: 'Battery (+) ↔ Switch (Left)',
    role: 'series',
    wireType: 'positive',
    description: 'Main series path: Connects power supply positive terminal to the plug key.'
  },
  {
    id: 'req_switch_ammeter',
    from: 'switch_right',
    to: 'ammeter_positive',
    name: 'Switch (Right) ↔ Ammeter (+)',
    role: 'series',
    wireType: 'positive',
    description: 'Main series path: Connects the plug key output to ammeter positive input.'
  },
  {
    id: 'req_ammeter_rheostat',
    from: 'ammeter_negative',
    to: 'rheostat_in',
    name: 'Ammeter (-) ↔ Rheostat (Slider)',
    role: 'series',
    wireType: 'series',
    description: 'Main series path: Connects ammeter negative output to the variable rheostat slider.'
  },
  {
    id: 'req_rheostat_resistor',
    from: 'rheostat_out',
    to: 'resistor_left',
    name: 'Rheostat (Base) ↔ Resistor (Left)',
    role: 'series',
    wireType: 'series',
    description: 'Main series path: Connects rheostat base terminal to the standard 5 Ω resistor.'
  },
  {
    id: 'req_resistor_battery',
    from: 'resistor_right',
    to: 'battery_negative',
    name: 'Resistor (Right) ↔ Battery (-)',
    role: 'series',
    wireType: 'negative',
    description: 'Main series path: Completes the loop back to power supply negative terminal.'
  },
  {
    id: 'req_voltmeter_pos',
    from: 'voltmeter_positive',
    to: 'resistor_left',
    name: 'Voltmeter (+) ↔ Resistor (Left)',
    role: 'parallel',
    wireType: 'meter',
    description: 'Parallel branch: Connects voltmeter positive lead across the high-potential side of the resistor.'
  },
  {
    id: 'req_voltmeter_neg',
    from: 'voltmeter_negative',
    to: 'resistor_right',
    name: 'Voltmeter (-) ↔ Resistor (Right)',
    role: 'parallel',
    wireType: 'meter',
    description: 'Parallel branch: Connects voltmeter negative lead across the low-potential side of the resistor.'
  }
];

/**
 * Terminal connection capacity limits:
 * Resistor terminals allow 2 connections (1 series wire + 1 voltmeter parallel lead).
 * All other single terminals allow a maximum of 1 connection.
 */
export const MAX_TERMINAL_CONNECTIONS = {
  resistor_left: 2,
  resistor_right: 2
};

export function getMaxConnectionsForTerminal(termId) {
  return MAX_TERMINAL_CONNECTIONS[termId] || 1;
}

export function isAllowedBranchingTerminal(termId) {
  return (MAX_TERMINAL_CONNECTIONS[termId] || 1) > 1;
}

/**
 * Friendly display name for a terminal pair.
 */
export function getTerminalDisplayName(termId) {
  const t = getTerminalById(termId);
  return t ? t.name : termId;
}
