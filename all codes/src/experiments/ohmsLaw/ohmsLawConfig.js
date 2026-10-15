/**
 * ohmsLawConfig.js
 * Centralized scientific constants and physical parameters for
 * Maharashtra Std. 10 Ohm's Law Virtual Physics Practical.
 */

export const OHMS_LAW_CONFIG = {
  // 1. Power Supply (Regulated DC Source)
  supplyVoltageMax: 6.0, // Volts (V)

  // 2. Standard Unknown / Test Resistor
  fixedResistor: 10.0, // Ohms (Ω)

  // 3. Meter Internal Resistances
  ammeterInternalResistance: 0.2, // Ohms (Ω) - Low resistance in series
  voltmeterInternalResistance: 1000000.0, // Ohms (Ω) - Very high resistance in parallel (~negligible loading)

  // 4. Rheostat Specifications
  rheostatMinimumResistance: 0.5, // Ohms (Ω)
  rheostatMaximumResistance: 20.0, // Ohms (Ω)
  rheostatDefaultResistance: 12.0, // Ohms (Ω) - Safe mid-range initial setting

  // 5. Safety & Operational Limits
  safeCurrentLimit: 0.50, // Amperes (A) - Overheating threshold for fixed resistor
  precisionDecimals: 2, // 2 decimal places for student displays

  // 6. Practical Workflow & Readings Thresholds
  minReadingsForVerification: 5, // Minimum distinct readings needed to verify Ohm's Law
  maxReadings: 6, // Maximum table rows

  // Duplicate rejection thresholds to ensure distinct readings
  duplicateToleranceCurrent: 0.015, // Amperes
  duplicateToleranceResistance: 0.4, // Ohms

  // 7. Textbook Experiment Information (Maharashtra Std. 10)
  experimentInfo: {
    title: "To Study the Relationship Between Potential Difference and Current (Ohm's Law)",
    aim: "To determine the resistance of a given wire resistor by plotting a graph of potential difference (V) versus current (I), and to verify Ohm’s Law.",
    formula: "V = I × R  =>  R = V / I",
    conclusionText: "At constant temperature, the potential difference (V) across the ends of a conductor is directly proportional to the current (I) flowing through it. The V–I graph is a straight line passing through the origin. Therefore, Ohm’s Law is verified.",
    precautions: [
      "The ammeter must always be connected in series with the circuit.",
      "The voltmeter must always be connected in parallel across the given resistor.",
      "Ensure all connections are tight and clean before closing the plug key.",
      "The plug key should be closed only while taking readings to prevent resistor heating.",
      "Change the rheostat position smoothly and gradually to take distinct readings."
    ]
  }
};
