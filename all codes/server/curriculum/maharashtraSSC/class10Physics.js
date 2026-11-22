/**
 * class10Physics.js
 * Official Maharashtra SSC Class 10 Science & Technology Part 1 Curriculum Alignment.
 *
 * Source Reference:
 * - Maharashtra State Bureau of Textbook Production and Curriculum Research (Balbharati), Pune.
 * - Textbook: Science and Technology Part 1, Standard X (2018 / Current Edition).
 * - Chapter 4: Effects of Electric Current (with foundational concepts from Std IX Chapter 3: Current Electricity).
 */

export const MAHARASHTRA_SSC_CURRICULUM = {
  board: 'Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE)',
  standard: 'Standard 10 (Class 10 SSC)',
  subject: 'Science and Technology Part 1',
  version: '2024-2025 Syllabus Alignment',

  practicals: {
    ohms_law: {
      id: 'ohms_law',
      title: 'Verification of Ohm’s Law and Determination of Resistance',
      chapterNumber: 4,
      chapterName: 'Effects of Electric Current',
      prerequisiteChapter: 'Current Electricity (Standard 9, Chapter 3)',
      textbookSource: 'Balbharati Science and Technology Part 1, Standard 10, Chapter 4',
      status: 'verified_active',

      aim: {
        en: 'To study the dependence of potential difference (V) across a resistor on the current (I) passing through it at constant temperature, determine its resistance, and plot the V–I graph.',
        hi: 'नियत तापमान पर किसी प्रतिरोधक के सिरों के विभवांतर (V) और उसमें से प्रवाहित विद्युत धारा (I) के संबंध का अध्ययन करना, उसका प्रतिरोध ज्ञात करना तथा V-I आलेख खींचना।',
        mr: 'स्थिर तापमानाला दिलेल्या रोधाच्या दोन टोकांमधील विभवांतर (V) आणि त्यातून वाहणारी विद्युतधारा (I) यांच्यातील संबंधाचा अभ्यास करणे, रोध काढणे आणि V–I आलेख काढणे.'
      },

      learningObjectives: [
        {
          id: 'obj_proportionality',
          text: 'Verify that electric current (I) is directly proportional to potential difference (V) across a metallic conductor at constant temperature (V ∝ I).'
        },
        {
          id: 'obj_formula',
          text: 'Apply Ohm’s Law mathematical formula: V = I × R (or R = V / I), where V is in Volts, I in Amperes, and R in Ohms.'
        },
        {
          id: 'obj_instrument_placement',
          text: 'Master correct meter connections: Ammeter in series (very low internal resistance) and Voltmeter in parallel across the resistor (very high internal resistance).'
        },
        {
          id: 'obj_rheostat_control',
          text: 'Use the rheostat as a variable resistor to vary circuit current systematically and record five distinct (V, I) observation pairs.'
        },
        {
          id: 'obj_switch_safety',
          text: 'Operate the plug key safely to prevent prolonged current flow and heating effects of electric current (Joule’s law: H = I²Rt), which would alter the conductor’s temperature.'
        },
        {
          id: 'obj_graphical_analysis',
          text: 'Plot potential difference (V) on the Y-axis and current (I) on the X-axis to verify that the graph is a straight line passing through the origin (0, 0), with slope equal to resistance R.'
        }
      ],

      requiredApparatus: [
        { name: 'DC Power Supply / Battery', specification: '0 - 6 V DC', role: 'Provides steady electromotive force (EMF)' },
        { name: 'Fixed Standard Resistor', specification: '10 Ω nichrome wire coil', role: 'Conductor under test' },
        { name: 'DC Ammeter', specification: '0 - 0.6 A range, low resistance (~0.2 Ω)', role: 'Measures circuit current in series' },
        { name: 'DC Voltmeter', specification: '0 - 6.0 V range, high resistance (~10 kΩ)', role: 'Measures potential difference across resistor in parallel' },
        { name: 'Rheostat (Variable Resistor)', specification: '0 - 20 Ω slider', role: 'Adjusts total circuit resistance to obtain multiple readings' },
        { name: 'Plug Key / One-Way Switch', specification: 'Removable copper contact key', role: 'Opens and closes the electrical circuit loop' },
        { name: 'Connecting Wires', specification: '7 insulated copper wires with spade terminals', role: 'Forms electrical conduction loop' }
      ],

      scientificFormulae: [
        {
          symbol: 'V = I * R',
          name: 'Ohm’s Law Formula',
          description: 'Potential difference (V) = Current (I) × Resistance (R)'
        },
        {
          symbol: 'R = V / I',
          name: 'Resistance Formula',
          description: 'Resistance (Ω) = Potential Difference (V) / Electric Current (A)'
        },
        {
          symbol: 'R_total = R_fixed + R_rheostat + R_ammeter',
          name: 'Total Series Circuit Resistance',
          description: 'Sum of all resistances in the unbranched series loop'
        },
        {
          symbol: 'Slope = ΔV / ΔI = R',
          name: 'Graph Slope Formula',
          description: 'Slope of the straight-line V–I graph represents the resistance of the fixed resistor'
        }
      ],

      commonMisconceptions: [
        {
          id: 'misc_ammeter_parallel',
          misconception: 'Connecting the ammeter in parallel with the resistor coil.',
          correction: 'An ammeter has near-zero internal resistance. Connecting it in parallel creates an unintended low-resistance bypass (short circuit), causing excessive current to bypass the resistor and potentially damaging the meter.',
          socraticPrompt: 'If water flows through a pipe, how would a flowmeter measure the entire flow if you place it beside the pipe instead of in line with it?'
        },
        {
          id: 'misc_voltmeter_series',
          misconception: 'Connecting the voltmeter in series in the main circuit loop.',
          correction: 'A voltmeter has an extremely high internal resistance (~10,000 Ω). If placed in series, it acts as an almost open circuit, dropping the entire current to near zero.',
          socraticPrompt: 'A voltmeter has very high internal resistance. What happens to the current in a series loop if you place a massive obstacle directly in its path?'
        },
        {
          id: 'misc_charge_loss',
          misconception: 'Electric current is consumed or used up as it passes through the resistor.',
          correction: 'Electric charge is strictly conserved. The number of coulombs entering the resistor per second exactly equals the number leaving it. What is lost is electrical potential energy, converted into heat.',
          socraticPrompt: 'Does water get used up inside a water wheel, or does it lose potential energy as it turns the wheel?'
        },
        {
          id: 'misc_open_key_flow',
          misconception: 'Expecting current to flow when the plug key is open or removed.',
          correction: 'Electric current requires an unbroken, closed conductive path. An open plug key creates an air gap with infinite resistance, preventing any charge flow.',
          socraticPrompt: 'Look at the gap in the plug key on your table. Can electrons leap across that physical gap?'
        },
        {
          id: 'misc_heating_effect',
          misconception: 'Leaving the plug key closed continuously between readings.',
          correction: 'Continuous current causes Joule heating (H = I²Rt). As temperature increases, the resistance of metallic conductors increases, violating the fundamental "at constant temperature" condition of Ohm’s law.',
          socraticPrompt: 'Ohm’s law states current is proportional to voltage "at constant temperature". What happens to the nichrome wire if current runs through it continuously?'
        }
      ],

      assessmentQuestions: [
        {
          id: 'q1',
          question: 'What happens to the current through a resistor if the potential difference across it is doubled at constant temperature?',
          expectedAnswer: 'The current is also doubled, because current is directly proportional to potential difference (I ∝ V).',
          conceptId: 'obj_proportionality'
        },
        {
          id: 'q2',
          question: 'Why must the plug key be opened immediately after taking each reading?',
          expectedAnswer: 'To prevent the resistor coil from heating up, which would alter its resistance and violate the constant temperature condition.',
          conceptId: 'obj_switch_safety'
        },
        {
          id: 'q3',
          question: 'What is represented by the slope of a V–I graph (with V on the y-axis and I on the x-axis)?',
          expectedAnswer: 'The slope (ΔV / ΔI) represents the electrical resistance (R) of the conductor.',
          conceptId: 'obj_graphical_analysis'
        }
      ]
    },

    // Additional practicals marked pending research per specification
    light_refraction: {
      id: 'light_refraction',
      title: 'Refraction of Light Through a Glass Slab',
      status: 'pending_curriculum_research',
      note: 'Marked pending research per Maharashtra SSC specification guidelines. Do not fabricate citations.'
    }
  }
};
