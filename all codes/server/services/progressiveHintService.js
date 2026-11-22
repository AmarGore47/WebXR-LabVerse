/**
 * progressiveHintService.js
 * Progressive Three-Tier Hint Service for LabVerse Socratic AI Tutor.
 *
 * Tier Structure:
 * - Level 1 (Conceptual Clue): Prompts student to reflect on physics principles without answer leakage.
 * - Level 2 (Directional Hint): Points student towards the specific component or circuit relationship.
 * - Level 3 (Specific Guidance): Clear, actionable physical instruction for resolution.
 */

export class ProgressiveHintService {
  constructor() {
    // Current hint levels tracked per session: topic/code -> level (1 | 2 | 3)
    this.currentLevels = new Map();

    // Multilingual graduated hint repository
    this.hintRepository = {
      // 1. Ammeter Placement & Series Loop
      ERR_AMMETER_SHORT: {
        en: [
          'Think about electric current like water flowing in a single pipeline. Should your flowmeter be inside the pipe or around it?',
          'Recall that an ammeter has nearly zero internal resistance and is wired in series. What happens to the current path if an ammeter is placed across the two ends of a resistor?',
          'Disconnect the ammeter from across the resistor. Wire it directly in series between Switch Contact (Right) and Ammeter (+).'
        ],
        hi: [
          'सोचिए कि विद्युत धारा एक पाइप में बहते पानी जैसी है। मीटर को मुख्य पाइप के अंदर होना चाहिए या उसके बाहर?',
          'याद रखें कि अमीटर का आंतरिक प्रतिरोध लगभग शून्य होता है। यदि इसे प्रतिरोधक के सिरों पर समांतर जोड़ेंगे तो धारा कहाँ जाएगी?',
          'अमीटर को प्रतिरोधक के आर-पार से हटाएँ और स्विच तथा प्रतिरोधक के बीच श्रेणीक्रम (Series) में जोड़ें।'
        ],
        mr: [
          'विद्युतप्रवाहाचा विचार एका नळातील पाण्याच्या प्रवाहासारखा करा. मोजणारे साधन थेट प्रवाहात असावे की बाजूला?',
          'लक्षात ठेवा अमीटरचा अंतर्गत रोध अत्यंत कमी असतो. जर तो रोधाच्या दोन टोकांमध्ये समांतर जोडला, तर काय घडेल?',
          'अमीटर रोधाच्या समांतर जोडणीतून काढा आणि स्विच व रोधाच्या दरम्यान एकसर (Series) जोडणीत जोडा.'
        ]
      },

      // 2. Voltmeter Placement & Parallel Connection
      ERR_VOLTMETER_IN_SERIES: {
        en: [
          'Consider what physical quantity a voltmeter measures. Does it measure current passing through, or the difference between two distinct points?',
          'A voltmeter has very high internal resistance (~10,000 Ω). What happens to the circuit current if a massive obstacle is placed directly in the main loop?',
          'Remove the voltmeter from the main series loop. Connect its (+) and (-) terminals in parallel across the two terminals of the fixed resistor coil.'
        ],
        hi: [
          'सोचिए कि वोल्टमीटर क्या मापता है। क्या यह प्रवाहित धारा मापता है या दो बिंदुओं के बीच का विभवांतर?',
          'वोल्टमीटर का आंतरिक प्रतिरोध बहुत अधिक (~10,000 Ω) होता है। यदि इसे मुख्य लूप में जोड़ेंगे, तो क्या धारा बह पाएगी?',
          'वोल्टमीटर को मुख्य लूप से हटाएँ। इसे प्रतिरोधक के दोनों टर्मिनलों (Resistor Left और Resistor Right) पर समांतर (Parallel) क्रम में जोड़ें।'
        ],
        mr: [
          'व्होल्टमीटर नक्की काय मोजतो याचा विचार करा. तो वाहणारा प्रवाह मोजतो की दोन टोकांमधील विभवांतर?',
          'व्होल्टमीटरचा अंतर्गत रोध अत्यंत उच्च असतो. मुख्य प्रवाहात इतका मोठा रोध टाकला तर काय होईल?',
          'व्होल्टमीटर मुख्य एकसर जोडणीतून काढा. तो रोधाच्या दोन्ही टोकांवर (Resistor Left आणि Resistor Right) समांतर जोडा.'
        ]
      },

      // 3. Reversed Meter Polarity
      ERR_REVERSED_POLARITY: {
        en: [
          'Look closely at the signs on your DC meters and power supply. In what direction does conventional current flow?',
          'Conventional current flows from the positive (+) red terminal of the battery toward the negative (-) black terminal.',
          'Swap the red and black leads on the reversed meter so the positive (+) terminal connects toward the battery positive side.'
        ],
        hi: [
          'मीटर और बैटरी के लाल (+) और काले (-) चिह्नों को ध्यान से देखें। विद्युत धारा किस दिशा में प्रवाहित होती है?',
          'धारा सदैव बैटरी के धनात्मक (+) सिरे से ऋणात्मक (-) सिरे की ओर बहती है।',
          'मीटर के तारों को आपस में बदलें ताकि धनात्मक (+) सिरा बैटरी के धनात्मक सिरे की ओर जुड़े।'
        ],
        mr: [
          'मीटर आणि बॅटरीवरील (+) आणि (-) चिन्हांचे नीट निरीक्षण करा. प्रवाह कोणत्या दिशेने वाहतो?',
          'विद्युतप्रवाह बॅटरीच्या धन (+) टोकाकडून ऋण (-) टोकाकडे वाहतो.',
          'उलटी जोडणी झालेल्या मीटरचे दोन्ही वायर बदला, जेणेकरून धन (+) टोक बॅटरीच्या धन बाजूला जोडले जाईल.'
        ]
      },

      // 4. Open Plug Key / Inactive Circuit
      WARN_KEY_OPEN: {
        en: [
          'All 7 wires are in place, but the meters read 0.00. Look closely at the plug key on the table.',
          'Current requires a completely closed conduction path without any physical air gaps.',
          'Click the "Start Current" button or insert the brass plug key to close the circuit and allow current to flow.'
        ],
        hi: [
          'सभी 7 तार जुड़े हैं, पर मीटर 0.00 दिखा रहे हैं। टेबल पर लगी प्लग-कुंजी (Key) को देखिए।',
          'विद्युत धारा के प्रवाह के लिए बिना किसी रुकावट या रिक्त स्थान का पूर्ण बंद परिपथ चाहिए।',
          '"Start Current" पर क्लिक करें या प्लग-कुंजी को सॉकेट में डालकर परिपथ पूर्ण करें।'
        ],
        mr: [
          'सर्व 7 वायर जोडल्या आहेत, पण मीटर 0.00 दाखवत आहेत. टेबलावरील प्लग की चे निरीक्षण करा.',
          'विद्युतप्रवाह वाहण्यासाठी परिपथ पूर्णपणे बंदिस्त असावे लागते.',
          '"Start Current" बटणावर क्लिक करा किंवा प्लग की घाला, ज्यामुळे परिपथ सुरू होईल.'
        ]
      },

      // 5. Incomplete Wiring
      ERR_INCOMPLETE_CIRCUIT: {
        en: [
          'Examine the blue glowing terminal rings on your lab table.',
          'A complete Ohm’s Law circuit requires exactly 7 wires forming a closed loop with voltmeter across the resistor.',
          'Connect the remaining highlighted terminal rings matching the tabletop schematic.'
        ],
        hi: [
          'टेबल पर चमक रहे नीले टर्मिनल रिंग्स को देखें।',
          'ओहम के नियम के लिए कुल 7 तारों की आवश्यकता होती है।',
          'टेबल पर दिए गए सर्किट चित्र के अनुसार शेष टर्मिनलों को तारों से जोड़ें।'
        ],
        mr: [
          'टेबलावरील चमकणाऱ्या निळ्या टर्मिनल रिंग्सचे निरीक्षण करा.',
          'ओहमच्या नियमाच्या प्रयोगासाठी एकूण 7 वायर्स लागतात.',
          'टेबलावरील रेखाचित्राप्रमाणे उर्वरित टर्मिनल्स वायरने जोडून घ्या.'
        ]
      },

      // 6. Varying Rheostat for Observations
      WARN_RHEOSTAT_STATIC: {
        en: [
          'To plot a reliable V–I graph, we need multiple distinct voltage and current pairs.',
          'Notice the rheostat slider on your workbench. What happens to total circuit resistance when you move it?',
          'Move the rheostat slider to a new position to change the current, then record your next observation.'
        ],
        hi: [
          'V–I ग्राफ बनाने के लिए हमें अलग-अलग मानों के 5 रीडिंग चाहिए।',
          'टेबल पर रखे रिओस्टॅट (चल-प्रतिरोध) के स्लाइडर को देखिए। उसे खिसकाने से क्या बदलेगा?',
          'रिओस्टॅट के स्लाइडर को आगे या पीछे खिसकाएँ ताकि धारा का मान बदले, फिर रीडिंग दर्ज करें।'
        ],
        mr: [
          'V–I आलेख काढण्यासाठी आपल्याला व्होल्टेज आणि करंटच्या 5 वेगवेगळ्या नोंदी लागतात.',
          'रिओस्टॅटच्या स्लाइडरचे निरीक्षण करा. स्लाइडर हलवल्याने एकूण रोध कसा बदलतो?',
          'रिओस्टॅटचा स्लाइडर पुढे किंवा मागे सरकवून करंट बदला आणि मग नवीन नोंद घ्या.'
        ]
      },

      // 7. General Ohm's Law Concept
      concept_ohms_law: {
        en: [
          'Think about what pushes electrons through a wire and what opposes their motion.',
          'Ohm’s law relates potential difference (V), electric current (I), and resistance (R) at constant temperature.',
          'Use the formula V = I × R. If resistance is constant, doubling V will double I.'
        ],
        hi: [
          'सोचिए कि इलेक्ट्रॉनों को प्रवाहित करने वाला बल (विभवांतर) और रुकावट (प्रतिरोध) में क्या संबंध है।',
          'ओहम का नियम स्थिर तापमान पर विभवांतर (V), धारा (I) और प्रतिरोध (R) के संबंध को बताता है।',
          'सूत्र V = I × R का उपयोग करें। यदि रोध स्थिर है, तो V को दोगुना करने पर धारा भी दोगुनी होगी।'
        ],
        mr: [
          'तारेतून इलेक्ट्रॉन वाहण्यासाठी लागणारा दाब (विभवांतर) आणि त्यातील अडथळा (रोध) यांचा विचार करा.',
          'ओहमचा नियम स्थिर तापमानाला विभवांतर (V), करंट (I) आणि रोध (R) मधील संबंध स्पष्ट करतो.',
          'V = I × R सूत्र वापरा. रोध स्थिर असल्यास, व्होल्टेज दुप्पट केल्यास करंटही दुप्पट होतो.'
        ]
      }
    };
  }

  /**
   * Get progressive hint text for a given topic or error code.
   * @param {string|Object} topicOrCode - String topic or options object { topic, levelOverride, language }
   * @param {number} [requestedLevel] - 1, 2, or 3 (defaults to current tracked level)
   * @param {string} [language='English'] - 'English' | 'Hindi' | 'Marathi' | 'hi' | 'mr' | 'en'
   * @returns {{ topic: string, level: number, maxLevel: number, hint: string, text: string, language: string }}
   */
  getHint(topicOrCode, requestedLevel = null, language = 'English') {
    let topic = topicOrCode;
    let reqLevel = requestedLevel;
    let lang = language;

    if (typeof topicOrCode === 'object' && topicOrCode !== null) {
      topic = topicOrCode.topic || topicOrCode.code;
      reqLevel = topicOrCode.levelOverride ?? topicOrCode.level ?? topicOrCode.requestedLevel ?? null;
      lang = topicOrCode.language || 'English';
    }

    const key = this.hintRepository[topic] ? topic : 'concept_ohms_law';
    const langKey = (lang === 'hi' || lang === 'Hindi') ? 'hi' : ((lang === 'mr' || lang === 'Marathi') ? 'mr' : 'en');
    const hints = this.hintRepository[key][langKey] || this.hintRepository[key].en;

    let level;
    if (reqLevel !== null) {
      level = Math.max(1, Math.min(3, reqLevel));
    } else {
      level = this.currentLevels.get(key) || 1;
      this.currentLevels.set(key, Math.min(3, level + 1));
    }

    const hintText = hints[level - 1] || hints[0];

    return {
      topic: key,
      level,
      maxLevel: 3,
      hint: hintText,
      text: hintText,
      language: langKey
    };
  }

  /**
   * Advances the hint level (1 -> 2 -> 3) for a given topic.
   */
  advanceHint(topicOrCode, language = 'English') {
    let topic = topicOrCode;
    let lang = language;
    if (typeof topicOrCode === 'object' && topicOrCode !== null) {
      topic = topicOrCode.topic || topicOrCode.code;
      lang = topicOrCode.language || 'English';
    }
    const key = this.hintRepository[topic] ? topic : 'concept_ohms_law';
    const current = this.currentLevels.get(key) || 1;
    const nextLevel = Math.min(3, current + 1);
    this.currentLevels.set(key, nextLevel);
    return this.getHint(key, nextLevel, lang);
  }

  /**
   * Resets hint level for a specific resolved topic.
   */
  resetTopic(topicOrCode) {
    this.resetHint(topicOrCode);
  }

  resetHint(topicOrCode) {
    let topic = topicOrCode;
    if (typeof topicOrCode === 'object' && topicOrCode !== null) {
      topic = topicOrCode.topic || topicOrCode.code;
    }
    if (topic) {
      this.currentLevels.delete(topic);
    }
  }

  /**
   * Resets all hint progress across the session.
   */
  resetAll() {
    this.currentLevels.clear();
  }
}

