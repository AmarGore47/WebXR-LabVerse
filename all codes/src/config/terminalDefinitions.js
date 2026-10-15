/**
 * terminalDefinitions.js
 * Central configuration of apparatus terminal snap points for future circuit wiring.
 *
 * Terminal IDs strictly implemented:
 * - battery_positive, battery_negative
 * - switch_left, switch_right
 * - ammeter_positive, ammeter_negative
 * - rheostat_in, rheostat_out
 * - resistor_left, resistor_right
 * - voltmeter_positive, voltmeter_negative
 */

// Flag to show/hide development visual markers (colored dots)
export let SHOW_DEBUG_TERMINALS = true;

export function setShowDebugTerminals(value) {
  SHOW_DEBUG_TERMINALS = Boolean(value);
}

/**
 * Terminal definitions with world-space coordinates mapped to the visible Blender apparatus.
 * Colors:
 * - red (0xef4444): positive terminal (+)
 * - dark/black (0x1e293b): negative terminal (-)
 * - yellow/gold (0xf59e0b): normal connection terminal
 */
export const TERMINAL_DEFINITIONS = [
  // 1. Battery / DC Power Supply (6V DC)
  {
    id: 'battery_positive',
    name: 'Battery (+)',
    apparatus: 'DC Power Supply',
    type: 'positive',
    colorHex: 0xef4444, // Red
    colorName: 'red',
    position: [-0.545, 0.826, 0.112],
    description: 'Positive 6V DC output terminal on the power supply front panel'
  },
  {
    id: 'battery_negative',
    name: 'Battery (-)',
    apparatus: 'DC Power Supply',
    type: 'negative',
    colorHex: 0x0f172a, // Dark/black
    colorName: 'black',
    position: [-0.490, 0.826, 0.112],
    description: 'Negative DC return terminal on the power supply front panel'
  },

  // 2. Plug Key / Switch
  {
    id: 'switch_left',
    name: 'Switch Contact (Left)',
    apparatus: 'Plug Key',
    type: 'connection',
    colorHex: 0xf59e0b, // Yellow
    colorName: 'yellow',
    position: [-0.272, 0.838, -0.030],
    description: 'Left contact block of the brass plug key switch'
  },
  {
    id: 'switch_right',
    name: 'Switch Contact (Right)',
    apparatus: 'Plug Key',
    type: 'connection',
    colorHex: 0xf59e0b, // Yellow
    colorName: 'yellow',
    position: [-0.168, 0.838, -0.030],
    description: 'Right contact block of the brass plug key switch'
  },

  // 3. Ammeter (0–1 A)
  {
    id: 'ammeter_positive',
    name: 'Ammeter (+)',
    apparatus: 'Ammeter (0–1 A)',
    type: 'positive',
    colorHex: 0xef4444, // Red
    colorName: 'red',
    position: [0.300, 0.816, 0.026],
    description: 'Positive (red) binding post of the ammeter for series current input'
  },
  {
    id: 'ammeter_negative',
    name: 'Ammeter (-)',
    apparatus: 'Ammeter (0–1 A)',
    type: 'negative',
    colorHex: 0x0f172a, // Dark/black
    colorName: 'black',
    position: [0.380, 0.816, 0.026],
    description: 'Negative (black) binding post of the ammeter for series current output'
  },

  // 4. Rheostat (Variable Resistor)
  {
    id: 'rheostat_in',
    name: 'Rheostat (Slider Terminal)',
    apparatus: 'Rheostat',
    type: 'connection',
    colorHex: 0xf59e0b, // Yellow
    colorName: 'yellow',
    position: [-0.058, 0.830, -0.035],
    description: 'Upper slider wiper contact terminal of the rheostat'
  },
  {
    id: 'rheostat_out',
    name: 'Rheostat (Base Terminal)',
    apparatus: 'Rheostat',
    type: 'connection',
    colorHex: 0xf59e0b, // Yellow
    colorName: 'yellow',
    position: [0.165, 0.890, -0.065],
    description: 'Lower fixed base terminal of the rheostat resistance winding'
  },

  // 5. Standard Resistor (5 Ω)
  {
    id: 'resistor_left',
    name: 'Resistor (Left Terminal)',
    apparatus: 'Standard Resistor (5 Ω)',
    type: 'connection',
    colorHex: 0xf59e0b, // Yellow
    colorName: 'yellow',
    position: [0.032, 0.838, 0.160],
    description: 'Left terminal screw of the standard resistance wire coil'
  },
  {
    id: 'resistor_right',
    name: 'Resistor (Right Terminal)',
    apparatus: 'Standard Resistor (5 Ω)',
    type: 'connection',
    colorHex: 0xf59e0b, // Yellow
    colorName: 'yellow',
    position: [0.168, 0.838, 0.160],
    description: 'Right terminal screw of the standard resistance wire coil'
  },

  // 6. Voltmeter (0–5 V)
  {
    id: 'voltmeter_positive',
    name: 'Voltmeter (+)',
    apparatus: 'Voltmeter (0–5 V)',
    type: 'positive',
    colorHex: 0xef4444, // Red
    colorName: 'red',
    position: [0.440, 0.816, 0.216],
    description: 'Positive (red) binding post of the voltmeter for parallel voltage measurement'
  },
  {
    id: 'voltmeter_negative',
    name: 'Voltmeter (-)',
    apparatus: 'Voltmeter (0–5 V)',
    type: 'negative',
    colorHex: 0x0f172a, // Dark/black
    colorName: 'black',
    position: [0.520, 0.816, 0.216],
    description: 'Negative (black) binding post of the voltmeter for parallel voltage measurement'
  }
];

/**
 * Helper to get a terminal by its unique ID.
 */
export function getTerminalById(id) {
  return TERMINAL_DEFINITIONS.find((t) => t.id === id) || null;
}
