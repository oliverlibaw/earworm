export interface StaticDialogueTurn {
  speaker: string;
  text: string;
  englishTranslation: string;
}

export interface StaticSlangNote {
  term: string;
  meaning: string;
  literalTranslation: string;
}

export interface StaticQuestion {
  id: string;
  difficultyLabel: string;
  category: "General Gist" | "Key Detail" | "Vocab & Slang";
  questionText: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  explanation: string;
  idealAnswerRubric: string;
}

export interface StaticLesson {
  _id: string;
  dateStr: string;
  language: string;
  level: string;
  isSideQuest: boolean;
  clipNumber: number;
  dialect: string;
  dialectNotes: string;
  sceneSummary?: string;
  title: string;
  audioUrl: string;
  dialogue: StaticDialogueTurn[];
  slangNotes: StaticSlangNote[];
  questions: StaticQuestion[];
}

export type VocabStarTier = "gold" | "silver" | "bronze" | "none";

export interface VocabStarInfo {
  tier: VocabStarTier;
  label: string;
  shortLabel: string;
  icon: string;
  badgeClass: string;
  description: string;
}

export function getVocabStarInfo(
  correctCount: number,
  totalCount = 5
): VocabStarInfo {
  if (totalCount <= 0 || correctCount <= 1) {
    return {
      tier: "none",
      label: "No Vocab Star Yet",
      shortLabel: "No Star",
      icon: "☆",
      badgeClass:
        "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
      description:
        "Complete the 5-question Audio Vocab Review to earn a Gold, Silver, or Bronze star!",
    };
  }
  const ratio = correctCount / totalCount;
  if (ratio >= 1.0) {
    return {
      tier: "gold",
      label: "Gold Vocab Star (100%)",
      shortLabel: "Gold Star",
      icon: "🥇",
      badgeClass:
        "border-amber-400 bg-amber-400/20 text-amber-800 dark:border-amber-400/60 dark:bg-amber-400/20 dark:text-amber-200",
      description: "Perfect 5/5! You aced 100% of today's Audio Vocab Review.",
    };
  }
  if (ratio >= 0.75) {
    return {
      tier: "silver",
      label: "Silver Vocab Star (Nearly All)",
      shortLabel: "Silver Star",
      icon: "🥈",
      badgeClass:
        "border-slate-400 bg-slate-300/30 text-slate-800 dark:border-slate-400/60 dark:bg-slate-400/20 dark:text-slate-200",
      description:
        "Great ear! You got nearly all (4/5) of today's Audio Vocab Review.",
    };
  }
  return {
    tier: "bronze",
    label: "Bronze Vocab Star (OK)",
    shortLabel: "Bronze Star",
    icon: "🥉",
    badgeClass:
      "border-orange-500/50 bg-orange-500/15 text-orange-800 dark:border-orange-400/50 dark:bg-orange-500/20 dark:text-orange-200",
    description: "Solid effort! Keep listening to level up to Gold.",
  };
}

export function getVocabStarInfoByTier(tier: VocabStarTier): VocabStarInfo {
  if (tier === "gold") return getVocabStarInfo(5, 5);
  if (tier === "silver") return getVocabStarInfo(4, 5);
  if (tier === "bronze") return getVocabStarInfo(3, 5);
  return getVocabStarInfo(0, 5);
}

export interface VocabHistoryEntry {
  key: string;
  dateStr: string;
  levelLabel: string;
  dialogTitle: string;
  items: StaticSlangNote[];
}

export interface GameScoreHistoryEntry {
  id: string;
  dateStr: string;
  level: string;
  clipNumber: number;
  scoreOutOf5: number;
  rawScore: number;
  finalScore: number;
  usedSlowdown: boolean;
  usedCafeMode: boolean;
  vocabStar?: VocabStarTier;
  timestamp: number;
}

export interface AudioVocabQuizQuestion {
  id: string;
  spanishTerm: string;
  literalTranslation: string;
  correctMeaning: string;
  sourceLabel: string;
  spokenContextSentence: string;
  englishContextSentence: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
}

export const DEFAULT_ACCESS_PASSWORD =
  process.env.NEXT_PUBLIC_ACCESS_PASSWORD || "earworm2026";

export function getPublicBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

const RAW_MEXICAN_LESSONS: Record<
  string,
  Omit<StaticLesson, "_id" | "dateStr" | "audioUrl">
> = {
  // =========================================================================
  // BASIC (A1) — DIALOG #1 (~15 sec, 3 short turns, ~1/3 length of Intro)
  // =========================================================================
  "A1:1": {
    language: "Spanish",
    level: "A1",
    isSideQuest: false,
    clipNumber: 1,
    title: "Un agua de mango en el parque",
    dialect: "Mexican Spanish 🇲🇽",
    dialectNotes:
      "Basic level: Short, slow 3-line conversation (~15 seconds) using essential Mexican survival phrases like '¿me da...?', 'chica o grande', and 'veinte pesos'.",
    sceneSummary:
      "Ordering a cold fruit drink ('agua fresca') from a vendor in a Mexico City park.",
    dialogue: [
      {
        speaker: "Ana",
        text: "Hola, buenos días. ¿Me da un agua de mango, por favor?",
        englishTranslation:
          "Hello, good morning. Can you give me a mango water, please?",
      },
      {
        speaker: "Don Pepe",
        text: "¡Claro que sí! ¿Grande o chica? La grande cuesta treinta pesos.",
        englishTranslation:
          "Of course! Large or small? The large one costs thirty pesos.",
      },
      {
        speaker: "Ana",
        text: "Chica, por favor. Aquí tiene veinte pesos. ¡Muchas gracias!",
        englishTranslation:
          "Small, please. Here is twenty pesos. Thank you very much!",
      },
    ],
    slangNotes: [
      {
        term: "¿me da...?",
        meaning:
          "Can you give me...? / May I have...? (Most common polite way to order food or drinks in Mexico)",
        literalTranslation: "do you give me...?",
      },
      {
        term: "agua de mango",
        meaning:
          "Fresh mango fruit drink ('agua fresca' made with blended fruit, water, and a touch of sugar)",
        literalTranslation: "mango water",
      },
      {
        term: "¿grande o chica?",
        meaning:
          "Large or small? (In Mexico, 'chico/chica' is used instead of 'pequeño' for drink and clothing sizes)",
        literalTranslation: "big or small?",
      },
      {
        term: "treinta / veinte pesos",
        meaning: "Thirty / twenty pesos",
        literalTranslation: "30 / 20 pesos",
      },
    ],
    questions: [
      {
        id: "q1",
        difficultyLabel: "Q1 • Easy (General Gist)",
        category: "General Gist",
        questionText: "What is Ana buying from Don Pepe in the park?",
        options: [
          "A mango fruit drink ('agua de mango')",
          "A cup of hot coffee with milk",
          "A ticket to enter the museum",
          "Two chicken tacos with salsa",
        ],
        correctOptionIndex: 0,
        explanation:
          "Ana greets Don Pepe and asks: '¿Me da un agua de mango, por favor?' (Can you give me a mango water, please?).",
        idealAnswerRubric: "She is buying a mango fruit drink (agua de mango).",
      },
      {
        id: "q2",
        difficultyLabel: "Q2 • Easy-Medium (Key Detail)",
        category: "Key Detail",
        questionText: "What two cup sizes does Don Pepe offer her?",
        options: [
          "Hot or cold ('caliente o fría')",
          "Large or small ('grande o chica')",
          "Sweet or plain ('dulce o simple')",
          "Bottle or cup ('botella o vaso')",
        ],
        correctOptionIndex: 1,
        explanation:
          "Don Pepe asks '¿Grande o chica?' — in Mexico, 'chica' is the everyday word for size small.",
        idealAnswerRubric: "Large or small (grande o chica).",
      },
      {
        id: "q3",
        difficultyLabel: "Q3 • Medium (Numbers)",
        category: "Key Detail",
        questionText: "How much does the large ('grande') drink cost?",
        options: [
          "10 pesos ('diez pesos')",
          "15 pesos ('quince pesos')",
          "30 pesos ('treinta pesos')",
          "50 pesos ('cincuenta pesos')",
        ],
        correctOptionIndex: 2,
        explanation:
          "Don Pepe says: 'La grande cuesta treinta pesos' (The large one costs 30 pesos).",
        idealAnswerRubric: "The large drink costs 30 pesos (treinta pesos).",
      },
      {
        id: "q4",
        difficultyLabel: "Q4 • Medium (Key Detail)",
        category: "Key Detail",
        questionText:
          "Which size does Ana choose at the end, and how much does she hand Don Pepe?",
        options: [
          "Large ('grande'), and she pays 30 pesos",
          "Small ('chica'), and she hands him 20 pesos",
          "Two small drinks, and she pays 40 pesos",
          "She decides not to buy anything",
        ],
        correctOptionIndex: 1,
        explanation:
          "Ana replies: 'Chica, por favor. Aquí tiene veinte pesos' (Small, please. Here is 20 pesos).",
        idealAnswerRubric: "She chooses the small size (chica) and pays 20 pesos.",
      },
      {
        id: "q5",
        difficultyLabel: "Q5 • Everyday Mexican Phrase",
        category: "Vocab & Slang",
        questionText:
          "In Mexico, what does the phrase '¿Me da...?' mean when ordering at a stand or café?",
        options: [
          "Can you give me / May I have...?",
          "Where is the bathroom?",
          "Do you accept credit cards?",
          "What time do you close?",
        ],
        correctOptionIndex: 0,
        explanation:
          "'¿Me da...?' (literally 'Do you give me...?') is the #1 polite, natural way to order food or drinks in Mexico.",
        idealAnswerRubric: "Can you give me / May I have...?",
      },
    ],
  },

  // =========================================================================
  // BASIC (A1) — DIALOG #2 (~15 sec, 3 short turns, ~1/3 length of Intro)
  // =========================================================================
  "A1:2": {
    language: "Spanish",
    level: "A1",
    isSideQuest: false,
    clipNumber: 2,
    title: "Buscando la estación del metro",
    dialect: "Mexican Spanish 🇲🇽",
    dialectNotes:
      "Basic level: Short, slow 3-line conversation (~15 seconds) covering polite street directions ('disculpe', 'cuadras', 'derecho', 'a la izquierda').",
    sceneSummary:
      "Asking a passerby on the street how to walk to the nearest subway station.",
    dialogue: [
      {
        speaker: "Marco",
        text: "Disculpe, señorita. ¿Dónde está la estación del metro más cercana?",
        englishTranslation:
          "Excuse me, miss. Where is the nearest subway station?",
      },
      {
        speaker: "Elena",
        text: "Está muy cerca. Camine dos cuadras derecho y doble a la izquierda.",
        englishTranslation:
          "It's very close. Walk two blocks straight ahead and turn left.",
      },
      {
        speaker: "Marco",
        text: "¡Perfecto! Está al lado del banco, ¿verdad? ¡Buen día!",
        englishTranslation:
          "Perfect! It's next to the bank, right? Have a good day!",
      },
    ],
    slangNotes: [
      {
        term: "disculpe",
        meaning:
          "Excuse me (polite way to get a stranger's attention on the street)",
        literalTranslation: "forgive / excuse",
      },
      {
        term: "dos cuadras derecho",
        meaning:
          "Two blocks straight ahead (in Mexico, 'cuadra' means city block and 'derecho' means straight ahead)",
        literalTranslation: "two blocks straight",
      },
      {
        term: "doble a la izquierda",
        meaning: "Turn to the left",
        literalTranslation: "fold/turn to the left",
      },
      {
        term: "al lado del banco",
        meaning: "Next to the bank",
        literalTranslation: "at the side of the bank",
      },
    ],
    questions: [
      {
        id: "q1",
        difficultyLabel: "Q1 • Easy (General Gist)",
        category: "General Gist",
        questionText: "What place is Marco looking for?",
        options: [
          "The nearest subway station ('la estación del metro')",
          "A hotel near the airport",
          "A taco restaurant on the corner",
          "A pharmacy that is open late",
        ],
        correctOptionIndex: 0,
        explanation:
          "Marco asks: '¿Dónde está la estación del metro más cercana?' (Where is the nearest subway station?).",
        idealAnswerRubric: "The nearest subway station.",
      },
      {
        id: "q2",
        difficultyLabel: "Q2 • Easy-Medium (Key Detail)",
        category: "Key Detail",
        questionText:
          "How many blocks straight ahead ('derecho') does Elena tell him to walk?",
        options: [
          "One block ('una cuadra')",
          "Two blocks ('dos cuadras')",
          "Five blocks ('cinco cuadras')",
          "Ten blocks ('diez cuadras')",
        ],
        correctOptionIndex: 1,
        explanation:
          "Elena says: 'Camine dos cuadras derecho' (Walk two blocks straight ahead).",
        idealAnswerRubric: "Two blocks straight ahead (dos cuadras derecho).",
      },
      {
        id: "q3",
        difficultyLabel: "Q3 • Medium (Directions)",
        category: "Key Detail",
        questionText:
          "After walking two blocks straight ahead, which way should Marco turn?",
        options: [
          "Turn left ('doble a la izquierda')",
          "Turn right ('doble a la derecha')",
          "Go back the way he came",
          "Go inside the shopping mall",
        ],
        correctOptionIndex: 0,
        explanation:
          "Elena tells him: 'y doble a la izquierda' (and turn to the left).",
        idealAnswerRubric: "Turn left (a la izquierda).",
      },
      {
        id: "q4",
        difficultyLabel: "Q4 • Medium (Key Detail)",
        category: "Key Detail",
        questionText: "What building is the subway station right next to?",
        options: [
          "Next to the bank ('al lado del banco')",
          "Next to the hospital ('al lado del hospital')",
          "Next to the school ('al lado de la escuela')",
          "Next to the church ('al lado de la iglesia')",
        ],
        correctOptionIndex: 0,
        explanation:
          "Marco confirms: 'Está al lado del banco, ¿verdad?' (It's next to the bank, right?).",
        idealAnswerRubric: "Next to the bank (al lado del banco).",
      },
      {
        id: "q5",
        difficultyLabel: "Q5 • Everyday Mexican Vocab",
        category: "Vocab & Slang",
        questionText:
          "In Mexican Spanish directions, what do 'una cuadra' and 'derecho' mean?",
        options: [
          "'Cuadra' = a city block; 'derecho' = straight ahead",
          "'Cuadra' = a traffic light; 'derecho' = upstairs",
          "'Cuadra' = a bus stop; 'derecho' = slowly",
          "'Cuadra' = a ticket booth; 'derecho' = on the left",
        ],
        correctOptionIndex: 0,
        explanation:
          "In Mexico and Latin America, 'una cuadra' is a street block, and walking 'derecho' means walking straight ahead!",
        idealAnswerRubric:
          "Cuadra means a city block and derecho means straight ahead.",
      },
    ],
  },

  // =========================================================================
  // INTRO (A2) — DIALOG #1
  // =========================================================================
  "A2:1": {
    language: "Spanish",
    level: "A2",
    isSideQuest: false,
    clipNumber: 1,
    title: "Tacos de canasta afuera del metro",
    dialect: "Mexican Spanish 🇲🇽",
    dialectNotes:
      "Intro level: Clear Mexico City Spanish using everyday words like 'híjole', 'ahorita', 'chido', and 'sale'.",
    dialogue: [
      {
        speaker: "Carlos",
        text: "Oye, Valeria, tengo muchísima hambre. ¿Vamos por unos tacos de canasta aquí afuera del metro?",
        englishTranslation:
          "Hey, Valeria, I'm super hungry. Shall we get some basket tacos right outside the subway?",
      },
      {
        speaker: "Valeria",
        text: "¡Ay, sí, qué rico! Pero espera, ¿tienes efectivo? Es que el señor de la bicicleta no acepta tarjeta.",
        englishTranslation:
          "Oh, yes, delicious! But wait, do you have cash? The guy with the bicycle doesn't take cards.",
      },
      {
        speaker: "Carlos",
        text: "Híjole, solo traigo un billete de cincuenta pesos. ¿Cuánto cuestan?",
        englishTranslation:
          "Shoot, I only have a fifty-peso bill on me. How much do they cost?",
      },
      {
        speaker: "Valeria",
        text: "La orden de cinco tacos cuesta cuarenta pesos. Y yo traigo veinte pesos en monedas para dos refrescos.",
        englishTranslation:
          "An order of five tacos costs forty pesos. And I have twenty pesos in coins for two sodas.",
      },
      {
        speaker: "Carlos",
        text: "¡Ah, qué chido! Entonces compartimos la orden ahorita y luego en la tarde te pago con transferencia.",
        englishTranslation:
          "Oh, awesome! Then let's share the order right now and later this afternoon I'll pay you back by bank transfer.",
      },
      {
        speaker: "Valeria",
        text: "Sale, pide dos de papa con chorizo y tres de frijol. ¡Pero cuidado con la salsa verde que pica un montón!",
        englishTranslation:
          "Deal, order two potato-and-chorizo ones and three bean ones. But watch out for the green salsa—it's super spicy!",
      },
    ],
    slangNotes: [
      {
        term: "tacos de canasta",
        meaning:
          "Steamed street tacos kept warm in a cloth-lined basket, often sold from a bicycle",
        literalTranslation: "basket tacos",
      },
      {
        term: "efectivo",
        meaning: "Cash (paper bills and coins, as opposed to card)",
        literalTranslation: "effective / cash",
      },
      {
        term: "híjole",
        meaning: "Shoot / gosh / oh man (mild Mexican exclamation of surprise)",
        literalTranslation: "little son (altered exclamation)",
      },
      {
        term: "qué chido",
        meaning: "How cool / awesome / great (classic Mexican slang)",
        literalTranslation: "how cool",
      },
      {
        term: "ahorita",
        meaning: "Right now / in just a moment",
        literalTranslation: "little now",
      },
      {
        term: "sale",
        meaning: "Deal / sounds good / okay",
        literalTranslation: "it goes out",
      },
      {
        term: "pica un montón",
        meaning: "It's super spicy",
        literalTranslation: "it bites a pile",
      },
    ],
    questions: [
      {
        id: "q1",
        difficultyLabel: "Q1 • Easy (General Gist)",
        category: "General Gist",
        questionText:
          "What are Carlos and Valeria trying to figure out outside the subway station?",
        options: [
          "Whether they have enough cash to buy street tacos and sodas",
          "Which subway line they need to take to get to a restaurant",
          "Where to find an ATM because they lost their wallets",
          "How to cook potato and bean tacos at home tonight",
        ],
        correctOptionIndex: 0,
        explanation:
          "Carlos is hungry for tacos de canasta outside the metro, and Valeria checks if they have enough cash ('efectivo') since the bicycle vendor doesn't take cards.",
        idealAnswerRubric:
          "Whether they have enough cash to buy basket tacos and sodas from the vendor on the bicycle outside the metro.",
      },
      {
        id: "q2",
        difficultyLabel: "Q2 • Medium-Easy (Key Detail)",
        category: "Key Detail",
        questionText:
          "How much money does Carlos have on him, and how much does an order of 5 tacos cost?",
        options: [
          "He has a 20-peso bill, and the tacos cost 50 pesos",
          "He has a 50-peso bill, and the order of 5 tacos costs 40 pesos",
          "He has 100 pesos in coins, and the tacos cost 60 pesos",
          "He has no cash at all, so Valeria pays 40 pesos by card",
        ],
        correctOptionIndex: 1,
        explanation:
          "Carlos says 'solo traigo un billete de cincuenta pesos' (50-peso bill), and Valeria says 'La orden de cinco tacos cuesta cuarenta pesos' (40 pesos).",
        idealAnswerRubric:
          "Carlos has a 50-peso bill and the order of 5 tacos costs 40 pesos.",
      },
      {
        id: "q3",
        difficultyLabel: "Q3 • Medium (Key Detail)",
        category: "Key Detail",
        questionText:
          "Which taco fillings does Valeria ask Carlos to order for them to share?",
        options: [
          "Five carnitas tacos with red salsa",
          "Three chicken tacos and two cheese tacos",
          "Two potato-with-chorizo tacos and three bean tacos",
          "Four steak tacos and one potato taco",
        ],
        correctOptionIndex: 2,
        explanation:
          "Valeria says: 'Sale, pide dos de papa con chorizo y tres de frijol' (two potato-with-chorizo and three bean tacos).",
        idealAnswerRubric:
          "Two potato with chorizo (papa con chorizo) and three bean (frijol) tacos.",
      },
      {
        id: "q4",
        difficultyLabel: "Q4 • Medium-Hard (Vocabulary)",
        category: "Vocab & Slang",
        questionText:
          "When Valeria asks '¿Tienes efectivo?' and Carlos replies 'Híjole...', what do 'efectivo' and 'híjole' mean here?",
        options: [
          "'Efectivo' means a subway ticket, and 'híjole' means 'hurry up'",
          "'Efectivo' means cash, and 'híjole' means 'shoot / oh man'",
          "'Efectivo' means appetite, and 'híjole' means 'of course'",
          "'Efectivo' means receipt, and 'híjole' means 'wait for me'",
        ],
        correctOptionIndex: 1,
        explanation:
          "In Spanish, 'efectivo' means cash (as opposed to 'tarjeta' / card), and 'híjole' is a classic Mexican exclamation meaning 'shoot!' or 'oh man!'",
        idealAnswerRubric:
          "Efectivo means cash and híjole means shoot / oh man.",
      },
      {
        id: "q5",
        difficultyLabel: "Q5 • Hard (Slang & Nuance)",
        category: "Vocab & Slang",
        questionText:
          "At the very end, Valeria warns Carlos: '¡Cuidado con la salsa verde que pica un montón!' What is she warning him about?",
        options: [
          "The green salsa costs extra money",
          "The green salsa is super spicy",
          "The green salsa is sour and spoiled",
          "The green salsa stains your clothes easily",
        ],
        correctOptionIndex: 1,
        explanation:
          "In Mexican Spanish, 'picar' refers to chili heat, so 'pica un montón' means 'it's super spicy!'",
        idealAnswerRubric: "She warns him that the green salsa is super spicy.",
      },
    ],
  },

  // =========================================================================
  // INTRO (A2) — DIALOG #2
  // =========================================================================
  "A2:2": {
    language: "Spanish",
    level: "A2",
    isSideQuest: false,
    clipNumber: 2,
    title: "El café de olla y el pan dulce en Coyoacán",
    dialect: "Mexican Spanish 🇲🇽",
    dialectNotes:
      "Intro level: Clear Mexican Spanish featuring everyday vocabulary like '¿mande?', 'concha', 'camión' (bus), and 'yo invito'.",
    dialogue: [
      {
        speaker: "Sofía",
        text: "Oye, Luis, ¿pedimos dos cafés de olla aquí en la panadería antes de tomar el camión?",
        englishTranslation:
          "Hey, Luis, should we order two spiced pot coffees here at the bakery before taking the bus?",
      },
      {
        speaker: "Luis",
        text: "¿Mande? Perdón, estaba viendo mi celular. Sí, buena idea, hace bastante frío esta mañana.",
        englishTranslation:
          "Pardon? Sorry, I was looking at my phone. Yes, good idea, it's pretty cold this morning.",
      },
      {
        speaker: "Sofía",
        text: "También voy a llevar dos conchas de vainilla para desayunar en la oficina. Son treinta y cinco pesos en total.",
        englishTranslation:
          "I'm also going to get two vanilla sweet breads to eat for breakfast at the office. It's thirty-five pesos total.",
      },
      {
        speaker: "Luis",
        text: "Yo invito hoy, Sofía. Pero apúrate porque nuestro camión pasa en ocho minutos por la avenida.",
        englishTranslation:
          "It's my treat today, Sofía. But hurry up because our bus comes down the avenue in eight minutes.",
      },
    ],
    slangNotes: [
      {
        term: "¿mande?",
        meaning:
          "Pardon? / What did you say? (Polite Mexican way to ask someone to repeat)",
        literalTranslation: "command me?",
      },
      {
        term: "el camión",
        meaning: "The city bus (in Mexico, 'camión' means passenger bus)",
        literalTranslation: "the truck",
      },
      {
        term: "café de olla",
        meaning:
          "Traditional Mexican coffee brewed with cinnamon and piloncillo (unrefined cane sugar)",
        literalTranslation: "pot coffee",
      },
      {
        term: "concha de vainilla",
        meaning:
          "Classic Mexican sweet bread roll topped with a shell-patterned vanilla sugar crust",
        literalTranslation: "vanilla shell",
      },
      {
        term: "yo invito",
        meaning: "It's my treat / I'm paying",
        literalTranslation: "I invite",
      },
      {
        term: "apúrate",
        meaning: "Hurry up / get a move on",
        literalTranslation: "hurry yourself",
      },
    ],
    questions: [
      {
        id: "q1",
        difficultyLabel: "Q1 • Easy (General Gist)",
        category: "General Gist",
        questionText:
          "Where are Sofía and Luis stopping on their way to work, and why?",
        options: [
          "At a bakery to grab hot coffee and sweet bread on a cold morning",
          "At a pharmacy because Luis has a cold and needs medicine",
          "At a phone repair shop because Luis dropped his cell phone",
          "At a supermarket to buy groceries for dinner tonight",
        ],
        correctOptionIndex: 0,
        explanation:
          "Sofía suggests stopping at the bakery ('la panadería') for two 'cafés de olla' and two 'conchas de vainilla' before their bus arrives.",
        idealAnswerRubric:
          "At a bakery to get spiced coffee and vanilla sweet bread before taking the bus to the office.",
      },
      {
        id: "q2",
        difficultyLabel: "Q2 • Medium-Easy (Key Detail)",
        category: "Key Detail",
        questionText:
          "Why didn't Luis catch what Sofía said the first time she spoke?",
        options: [
          "A loud bus was passing by on the avenue",
          "He was distracted looking at his cell phone",
          "He was talking to the bakery cashier",
          "He was still half-asleep because he woke up late",
        ],
        correctOptionIndex: 1,
        explanation:
          "Luis apologizes: '¿Mande? Perdón, estaba viendo mi celular' (Sorry, I was looking at my cell phone).",
        idealAnswerRubric: "He was distracted looking at his cell phone.",
      },
      {
        id: "q3",
        difficultyLabel: "Q3 • Medium (Key Detail)",
        category: "Key Detail",
        questionText:
          "How much does the bakery order cost in total, and how soon does their bus arrive?",
        options: [
          "50 pesos total, and the bus arrives in 15 minutes",
          "20 pesos total, and the bus arrives in 5 minutes",
          "35 pesos total, and the bus arrives in 8 minutes",
          "45 pesos total, and the bus is already waiting outside",
        ],
        correctOptionIndex: 2,
        explanation:
          "Sofía says 'Son treinta y cinco pesos en total' (35 pesos), and Luis says 'nuestro camión pasa en ocho minutos' (8 minutes).",
        idealAnswerRubric: "35 pesos total, and the bus arrives in 8 minutes.",
      },
      {
        id: "q4",
        difficultyLabel: "Q4 • Medium-Hard (Vocabulary)",
        category: "Vocab & Slang",
        questionText:
          "In Mexican Spanish, what do '¿Mande?' and 'el camión' mean in this conversation?",
        options: [
          "'¿Mande?' means 'Where to?' and 'el camión' means 'the delivery truck'",
          "'¿Mande?' means 'Pardon / What did you say?' and 'el camión' means 'the city bus'",
          "'¿Mande?' means 'Order for me' and 'el camión' means 'the subway train'",
          "'¿Mande?' means 'Are you sure?' and 'el camión' means 'the taxi'",
        ],
        correctOptionIndex: 1,
        explanation:
          "In Mexico, '¿Mande?' is the polite everyday way to say 'Pardon?' and 'el camión' is the standard word for a city passenger bus.",
        idealAnswerRubric:
          "¿Mande? means Pardon? and el camión means the city bus.",
      },
      {
        id: "q5",
        difficultyLabel: "Q5 • Hard (Slang & Nuance)",
        category: "Vocab & Slang",
        questionText:
          "When Luis says 'Yo invito hoy, Sofía. Pero apúrate...', what is he telling her?",
        options: [
          "He is inviting her to a party tonight, if she finishes work early",
          "It's his treat (he's paying today), but she needs to hurry up",
          "She should pay today, and he will pay her back on the bus",
          "He wants her to order for him while he goes to the bus stop",
        ],
        correctOptionIndex: 1,
        explanation:
          "'Yo invito' literally translates to 'I invite', which is the standard Spanish idiom for 'It's my treat / I'm paying', and 'apúrate' means 'hurry up!'",
        idealAnswerRubric:
          "It's his treat (he is paying), and he tells her to hurry up.",
      },
    ],
  },

  // =========================================================================
  // CONVERSATIONAL (B1) — DIALOG #1
  // =========================================================================
  "B1:1": {
    language: "Spanish",
    level: "B1",
    isSideQuest: false,
    clipNumber: 1,
    title: "El coche prestado y el raspón en Guadalajara",
    dialect: "Mexican Spanish 🇲🇽",
    dialectNotes:
      "Conversational level: Natural Mexican Spanish with colloquialisms like 'no manches', 'chamba', 'lana', and 'hacerse pato'.",
    dialogue: [
      {
        speaker: "Diego",
        text: "Oye, Fernanda, no manches... Acabo de bajar al estacionamiento y vi que mi coche tiene un raspón enorme en la defensa trasera.",
        englishTranslation:
          "Hey, Fernanda, no way... I just went down to the parking lot and saw that my car has a huge scratch on the back bumper.",
      },
      {
        speaker: "Fernanda",
        text: "Ay, Diego, te iba a decir ahorita que saliéramos. Ayer que me lo prestaste para ir por las cosas de mi chamba, un poste estaba súper pegado en la rampa.",
        englishTranslation:
          "Oh, Diego, I was going to tell you right now when we went out. Yesterday when you lent it to me to pick up my work stuff, a pillar was super close on the ramp.",
      },
      {
        speaker: "Diego",
        text: "¿Y pensabas hacerte pato o qué? Sabes que lo acabo de sacar del taller hace dos semanas.",
        englishTranslation:
          "And were you planning to play dumb or what? You know I just got it out of the repair shop two weeks ago.",
      },
      {
        speaker: "Fernanda",
        text: "¡Claro que no me iba a hacer pato! Ya hablé con el taller de mi tío Memo en Zapopan. Dice que mañana mismo lo pule y lo pinta por mil quinientos pesos.",
        englishTranslation:
          "Of course I wasn't going to play dumb! I already spoke with my uncle Memo's body shop in Zapopan. He says tomorrow he'll buff and paint it for fifteen hundred pesos.",
      },
      {
        speaker: "Diego",
        text: "Bueno, menos mal... Pero esa lana la pones tú, ¿eh? Y me llevas a mi oficina en la mañana mientras lo arreglan.",
        englishTranslation:
          "Well, thank goodness... But you're paying that cash, alright? And you're driving me to my office in the morning while they fix it.",
      },
      {
        speaker: "Fernanda",
        text: "Trato hecho. Yo pago todo el taller y encima te compro tu torta ahogada para que se te baje el coraje.",
        englishTranslation:
          "Deal. I'll pay for the whole shop and on top of that I'll buy you your drowned pork sandwich so you stop being mad.",
      },
    ],
    slangNotes: [
      {
        term: "no manches",
        meaning: "No way / you've got to be kidding me",
        literalTranslation: "don't stain",
      },
      {
        term: "un raspón en la defensa",
        meaning: "A scrape/scratch on the car bumper",
        literalTranslation: "a big scratch on the defense",
      },
      {
        term: "la chamba",
        meaning: "Work / job / gig (Mexican slang)",
        literalTranslation: "the job",
      },
      {
        term: "hacerse pato",
        meaning:
          "To play dumb / pretend nothing happened / dodge responsibility",
        literalTranslation: "to make oneself a duck",
      },
      {
        term: "la lana",
        meaning: "Money / cash",
        literalTranslation: "the wool",
      },
      {
        term: "bajarse el coraje",
        meaning: "To cool off / stop being angry",
        literalTranslation: "to lower the anger",
      },
    ],
    questions: [
      {
        id: "q1",
        difficultyLabel: "Q1 • Easy (General Gist)",
        category: "General Gist",
        questionText:
          "Why is Diego upset with Fernanda at the start of the conversation?",
        options: [
          "She returned his car with an empty gas tank",
          "He found a big scratch on the back bumper of his car after lending it to her",
          "She forgot to pick him up from the repair shop two weeks ago",
          "She parked his car in a tow-away zone outside her office",
        ],
        correctOptionIndex: 1,
        explanation:
          "Diego just went down to the parking lot and saw a huge scratch ('un raspón enorme') on the rear bumper ('la defensa trasera') after lending his car to Fernanda yesterday.",
        idealAnswerRubric:
          "He found a huge scratch on the rear bumper after lending her his car.",
      },
      {
        id: "q2",
        difficultyLabel: "Q2 • Medium-Easy (Key Detail)",
        category: "Key Detail",
        questionText:
          "How did the car get scratched, and what plan did Fernanda already arrange?",
        options: [
          "Another driver hit her in traffic; her insurance will pay 3,000 pesos",
          "She scraped a tight pillar on a ramp; her Uncle Memo's shop in Zapopan will buff and paint it tomorrow for 1,500 pesos",
          "A shopping cart hit the door; she bought touch-up paint for 500 pesos",
          "She backed into a tree at night; Diego's mechanic will fix it next week",
        ],
        correctOptionIndex: 1,
        explanation:
          "Fernanda explains a pillar ('un poste') was super close on the ramp when she went to pick up her work stuff ('cosas de mi chamba'), and her Uncle Memo's body shop in Zapopan will buff and paint it tomorrow for 1,500 pesos.",
        idealAnswerRubric:
          "She scraped a pillar on a ramp, and her Uncle Memo's shop in Zapopan will buff and paint it tomorrow for 1,500 pesos.",
      },
      {
        id: "q3",
        difficultyLabel: "Q3 • Medium (Key Detail)",
        category: "Key Detail",
        questionText:
          "In addition to Fernanda paying for the repair, what else does Diego demand—and what food does Fernanda offer him?",
        options: [
          "She must wash his car, and she offers him street tacos",
          "She must drive him to his office in the morning, and she offers to buy him a 'torta ahogada'",
          "She must lend him her bicycle, and she offers to buy him coffee",
          "She must pay his parking fee, and she offers to cook dinner",
        ],
        correctOptionIndex: 1,
        explanation:
          "Diego insists she pay the cash ('esa lana la pones tú') and drive him to his office in the morning ('me llevas a mi oficina'), and Fernanda offers him a Guadalajara 'torta ahogada' sandwich.",
        idealAnswerRubric:
          "She must drive him to his office in the morning, and she offers to buy him a torta ahogada.",
      },
      {
        id: "q4",
        difficultyLabel: "Q4 • Medium-Hard (Vocabulary)",
        category: "Vocab & Slang",
        questionText:
          "Diego asks: '¿Y pensabas hacerte pato o qué?' What does the Mexican idiom 'hacerse pato' mean?",
        options: [
          "To drive recklessly fast",
          "To play dumb and dodge responsibility",
          "To borrow something without asking",
          "To cry and make excuses",
        ],
        correctOptionIndex: 1,
        explanation:
          "Literally 'to make oneself a duck', 'hacerse pato' is a classic Mexican idiom meaning to play dumb or pretend nothing happened to avoid responsibility.",
        idealAnswerRubric: "To play dumb / dodge responsibility.",
      },
      {
        id: "q5",
        difficultyLabel: "Q5 • Hard (Slang & Nuance)",
        category: "Vocab & Slang",
        questionText:
          "In this dialogue, what do the Mexican slang terms 'la chamba', 'la lana', and 'para que se te baje el coraje' mean?",
        options: [
          "'Chamba' = party, 'lana' = sweater, 'baje el coraje' = feel braver",
          "'Chamba' = work/job, 'lana' = money/cash, 'baje el coraje' = stop being mad / cool off",
          "'Chamba' = garage, 'lana' = paint, 'baje el coraje' = get to work on time",
          "'Chamba' = school, 'lana' = debt, 'baje el coraje' = stop worrying",
        ],
        correctOptionIndex: 1,
        explanation:
          "In Mexican Spanish, 'la chamba' is work/job, 'la lana' is money/cash, and 'para que se te baje el coraje' means 'so your anger goes down / so you stop being mad.'",
        idealAnswerRubric:
          "Chamba means work/job, lana means money/cash, and bajarse el coraje means to stop being mad.",
      },
    ],
  },

  // =========================================================================
  // CONVERSATIONAL (B1) — DIALOG #2
  // =========================================================================
  "B1:2": {
    language: "Spanish",
    level: "B1",
    isSideQuest: false,
    clipNumber: 2,
    title: "El recibo de la luz en la colonia Roma",
    dialect: "Mexican Spanish 🇲🇽",
    dialectNotes:
      "Conversational level: Mexico City roommate banter with idioms like 'no te pases', 'andar bruja' (broke), and 'echar la mano'.",
    dialogue: [
      {
        speaker: "Mateo",
        text: "Oye, Lucía, no te pases... Acabo de ver el recibo de la luz de este bimestre y casi me da un infarto.",
        englishTranslation:
          "Hey, Lucía, come on now... I just saw this two-month electricity bill and I almost had a heart attack.",
      },
      {
        speaker: "Lucía",
        text: "Aguanta, Mateo, no te esponjes. Es que la semana pasada hizo un frío horrible y dejé el calentador eléctrico prendido un par de noches.",
        englishTranslation:
          "Hold on, Mateo, don't get worked up. Last week it was freezing cold and I left the electric space heater on for a couple of nights.",
      },
      {
        speaker: "Mateo",
        text: "¿Un par de noches? ¡Pero si subió al doble! Y tú sabes que ahorita ando bien bruja porque no me han pagado el proyecto de diseño.",
        englishTranslation:
          "A couple of nights? It doubled! And you know I'm super broke right now because they haven't paid me for the design project yet.",
      },
      {
        speaker: "Lucía",
        text: "Tranquilo, mi primo Javi me debía una lana de los boletos del concierto y me acaba de transferir. Yo pongo el setenta por ciento del recibo.",
        englishTranslation:
          "Relax, my cousin Javi owed me cash for the concert tickets and he just sent me a transfer. I'll cover seventy percent of the bill.",
      },
      {
        speaker: "Mateo",
        text: "Uf, qué alivio... Es que el casero ya me estaba moliendo por WhatsApp desde las ocho de la mañana.",
        englishTranslation:
          "Phew, what a relief... The landlord was already nagging me on WhatsApp since eight in the morning.",
      },
      {
        speaker: "Lucía",
        text: "Ya sé cómo se pone. Ándale, yo lo pago ahorita en la app y además te invito unos esquites si me echas la mano con las cajas de la bodega.",
        englishTranslation:
          "I know how he gets. Come on, I'll pay it right now in the app and treat you to some corn cups too if you give me a hand with the storage room boxes.",
      },
    ],
    slangNotes: [
      {
        term: "no te pases",
        meaning: "Come on / don't go too far / you're kidding me",
        literalTranslation: "don't pass yourself",
      },
      {
        term: "no te esponjes",
        meaning: "Don't get puffed up / don't get worked up or angry",
        literalTranslation: "don't sponge yourself up",
      },
      {
        term: "andar bruja",
        meaning: "To be completely broke / out of money (Mexican idiom)",
        literalTranslation: "to walk around like a witch",
      },
      {
        term: "estar moliendo",
        meaning: "To be nagging / pestering someone relentlessly",
        literalTranslation: "to be grinding",
      },
      {
        term: "echar la mano",
        meaning: "To lend a hand / help someone out",
        literalTranslation: "to throw the hand",
      },
    ],
    questions: [
      {
        id: "q1",
        difficultyLabel: "Q1 • Easy (General Gist)",
        category: "General Gist",
        questionText:
          "What caused the two-month electricity bill in Mateo and Lucía's apartment to double?",
        options: [
          "Mateo left his desktop computer running day and night for a design project",
          "Lucía left the electric space heater on for a couple of freezing nights last week",
          "The landlord accidentally billed them for the whole building",
          "Their refrigerator broke and was using twice as much power",
        ],
        correctOptionIndex: 1,
        explanation:
          "Lucía admits: 'la semana pasada hizo un frío horrible y dejé el calentador eléctrico prendido un par de noches' (she left the electric space heater on).",
        idealAnswerRubric:
          "Lucía left the electric space heater on for a couple of freezing nights.",
      },
      {
        id: "q2",
        difficultyLabel: "Q2 • Medium-Easy (Key Detail)",
        category: "Key Detail",
        questionText:
          "Why is Mateo unable to pay a big electricity bill right now, and who has been messaging him since 8 AM?",
        options: [
          "He spent his money on concert tickets, and the power company called him",
          "He hasn't been paid yet for his design project, and the landlord has been nagging him on WhatsApp",
          "He lost his wallet on the bus, and his boss is messaging him",
          "He lent money to his cousin Javi, and his roommate is messaging him",
        ],
        correctOptionIndex: 1,
        explanation:
          "Mateo says they haven't paid him for his design project ('no me han pagado el proyecto de diseño'), and the landlord ('el casero') has been nagging him on WhatsApp since 8 AM.",
        idealAnswerRubric:
          "He hasn't been paid for his design project yet, and the landlord has been nagging him on WhatsApp since 8 AM.",
      },
      {
        id: "q3",
        difficultyLabel: "Q3 • Medium (Key Detail)",
        category: "Key Detail",
        questionText:
          "Where did Lucía just get extra money from, and how much of the electricity bill does she agree to pay?",
        options: [
          "From her paycheck; she agrees to pay 50% of the bill",
          "Her cousin Javi transferred her money he owed for concert tickets; she covers 70% of the bill",
          "Her parents sent her a transfer; she covers 100% of the bill",
          "She sold her electric heater; she covers 60% of the bill",
        ],
        correctOptionIndex: 1,
        explanation:
          "Lucía says her cousin Javi owed her cash ('una lana') for concert tickets and just sent a transfer, so she will pay 70% ('el setenta por ciento') of the bill.",
        idealAnswerRubric:
          "Her cousin Javi paid her back for concert tickets, and she covers 70% of the bill.",
      },
      {
        id: "q4",
        difficultyLabel: "Q4 • Medium-Hard (Vocabulary)",
        category: "Vocab & Slang",
        questionText:
          "Mateo says 'ahorita ando bien bruja' and Lucía earlier told him 'no te esponjes'. What do those two Mexican expressions mean?",
        options: [
          "'Andar bruja' = to be exhausted; 'no te esponjes' = don't fall asleep",
          "'Andar bruja' = to be completely broke; 'no te esponjes' = don't get worked up / angry",
          "'Andar bruja' = to be superstitious; 'no te esponjes' = don't get wet in the rain",
          "'Andar bruja' = to be working late; 'no te esponjes' = don't complain",
        ],
        correctOptionIndex: 1,
        explanation:
          "In Mexican slang, 'andar bruja' (literally 'walking like a witch') means to be broke/out of money, and 'no te esponjes' (literally 'don't puff up like a sponge') means 'don't get worked up or angry.'",
        idealAnswerRubric:
          "Andar bruja means to be broke, and no te esponjes means don't get worked up.",
      },
      {
        id: "q5",
        difficultyLabel: "Q5 • Hard (Slang & Nuance)",
        category: "Vocab & Slang",
        questionText:
          "At the end, Lucía offers to buy Mateo 'esquites' if he 'le echa la mano con las cajas de la bodega'. What is she asking him to do?",
        options: [
          "Help her carry/move the boxes in the storage room",
          "Pay the remaining 30% of the bill in cash at the store",
          "Throw away the old cardboard boxes in the kitchen",
          "Go down to the street vendor to buy the corn cups himself",
        ],
        correctOptionIndex: 0,
        explanation:
          "'Echar la mano' means to lend a hand / help out, and 'la bodega' in a Mexican apartment building refers to the storage room/locker.",
        idealAnswerRubric:
          "She asks him to lend her a hand (help her) with the boxes in the storage room.",
      },
    ],
  },

  // =========================================================================
  // ADVANCED (B2) — DIALOG #1
  // =========================================================================
  "B2:1": {
    language: "Spanish",
    level: "B2",
    isSideQuest: false,
    clipNumber: 1,
    title: "El boleto falso afuera del Foro Sol",
    dialect: "Mexican Spanish 🇲🇽",
    dialectNotes:
      "Advanced level: Fast Mexico City street banter ('Chilango') packed with 'no mames', 'güey', 'chafa', 'pasarse de lanza', 'qué oso', and 'a huevo'.",
    dialogue: [
      {
        speaker: "Paco",
        text: "¡No mames, Mariana! El lector de códigos aquí en la puerta del Foro Sol acaba de prender en rojo con mi boleto, güey.",
        englishTranslation:
          "No freaking way, Mariana! The barcode scanner right here at the Foro Sol gate just flashed red on my ticket, dude.",
      },
      {
        speaker: "Mariana",
        text: "¡No me digas eso! Te advertí que ese revendedor de Facebook se veía súper chafa, Paco. ¡Se pasó de lanza el tipo si nos vendió uno clonado!",
        englishTranslation:
          "Don't tell me that! I warned you that Facebook reseller looked super sketchy, Paco. That guy totally ripped us off if he sold us a cloned ticket!",
      },
      {
        speaker: "Paco",
        text: "Espérate, ya me puse nervioso porque me costó un ojo de la cara y me quedé sin un quinto para toda la quincena.",
        englishTranslation:
          "Wait a second, now I'm nervous because it cost me an arm and a leg and left me without a cent for the whole two-week pay period.",
      },
      {
        speaker: "Mariana",
        text: "A ver, enséñame tu celular... ¡Ay, Paco, estás bien dormido! Estabas enseñando el código QR del estacionamiento en vez del boleto del concierto.",
        englishTranslation:
          "Hold on, show me your phone... Oh, Paco, you're half asleep! You were showing the QR code for the parking lot instead of the concert ticket.",
      },
      {
        speaker: "Paco",
        text: "¿Neta? ¡Qué oso hice con el de seguridad! Mira, ya escaneó el bueno y se puso en verde.",
        englishTranslation:
          "For real? How embarrassing in front of the security guard! Look, he just scanned the right one and it turned green.",
      },
      {
        speaker: "Mariana",
        text: "¡A huevo! Casi me da el patatús. Ya córrele que la banda está a punto de tocar la primera rola y nos toca hasta la pista.",
        englishTranslation:
          "Hell yeah! I almost had a heart attack. Run now, the band is about to play their first song and our spot is all the way down on the floor.",
      },
    ],
    slangNotes: [
      {
        term: "no mames, güey",
        meaning:
          "No freaking way, dude! (Quintessential Mexican street exclamation)",
        literalTranslation: "don't suck, dude",
      },
      {
        term: "chafa",
        meaning: "Low-quality, fake, sketchy, or bogus",
        literalTranslation: "shoddy",
      },
      {
        term: "pasarse de lanza",
        meaning: "To go way too far / rip someone off / take advantage",
        literalTranslation: "to go past the spear",
      },
      {
        term: "sin un quinto",
        meaning: "Penniless / without a single cent left",
        literalTranslation: "without a five-cent coin",
      },
      {
        term: "qué oso",
        meaning: "How embarrassing! / What a blunder!",
        literalTranslation: "what a bear",
      },
      {
        term: "a huevo",
        meaning: "Hell yeah / awesome / definitely",
        literalTranslation: "by egg",
      },
      {
        term: "la rola",
        meaning: "The song / music track",
        literalTranslation: "the roll",
      },
    ],
    questions: [
      {
        id: "q1",
        difficultyLabel: "Q1 • Easy (General Gist)",
        category: "General Gist",
        questionText:
          "Why do Paco and Mariana panic when they arrive at the entrance to the Foro Sol concert venue?",
        options: [
          "Paco forgot his cell phone in the parking lot",
          "The ticket scanner flashes red on Paco's ticket, making them fear he bought a fake ticket",
          "The concert was canceled at the last minute due to rain",
          "Mariana bought tickets for the wrong date",
        ],
        correctOptionIndex: 1,
        explanation:
          "The barcode scanner at the gate flashes red ('acaba de prender en rojo'), and Mariana fears the sketchy Facebook reseller sold Paco a cloned/fake ticket.",
        idealAnswerRubric:
          "The scanner flashes red on Paco's ticket and they fear the Facebook reseller sold him a cloned ticket.",
      },
      {
        id: "q2",
        difficultyLabel: "Q2 • Medium-Easy (Key Detail)",
        category: "Key Detail",
        questionText:
          "What silly mistake does Mariana discover when she looks at Paco's phone screen?",
        options: [
          "His screen brightness was turned all the way down",
          "He was showing the QR code for the parking lot instead of the concert ticket",
          "He was showing an old movie ticket from last week",
          "His phone battery had died right at the gate",
        ],
        correctOptionIndex: 1,
        explanation:
          "Mariana looks at his phone and says: 'Estabas enseñando el código QR del estacionamiento en vez del boleto del concierto' (he was showing the parking lot QR code).",
        idealAnswerRubric:
          "He was showing the parking lot QR code instead of the concert ticket.",
      },
      {
        id: "q3",
        difficultyLabel: "Q3 • Medium (Key Detail)",
        category: "Key Detail",
        questionText:
          "Why does Paco say the ticket 'me dejó sin un quinto para toda la quincena'?",
        options: [
          "He had to wait in line for five hours to buy it",
          "It was so expensive it left him without a cent for the whole two-week pay period",
          "He bought five tickets for his friends and nobody paid him back",
          "He lost a 500-peso bill at the stadium entrance",
        ],
        correctOptionIndex: 1,
        explanation:
          "'Me costó un ojo de la cara' (cost an arm and a leg) and 'me quedé sin un quinto para toda la quincena' means he's left without a cent for the entire two-week pay period.",
        idealAnswerRubric:
          "It cost him an arm and a leg and left him without a cent for the two-week pay period.",
      },
      {
        id: "q4",
        difficultyLabel: "Q4 • Medium-Hard (Vocabulary)",
        category: "Vocab & Slang",
        questionText:
          "Mariana says the reseller looked 'súper chafa' and 'se pasó de lanza', and Paco later says '¡Qué oso hice!'. What do 'chafa', 'pasarse de lanza', and 'qué oso' mean?",
        options: [
          "'Chafa' = polite, 'pasarse de lanza' = to be late, 'qué oso' = how lucky",
          "'Chafa' = sketchy/low-quality, 'pasarse de lanza' = to rip someone off / go too far, 'qué oso' = how embarrassing",
          "'Chafa' = expensive, 'pasarse de lanza' = to run away, 'qué oso' = how scary",
          "'Chafa' = famous, 'pasarse de lanza' = to charge extra, 'qué oso' = how funny",
        ],
        correctOptionIndex: 1,
        explanation:
          "In Mexico City slang, 'chafa' means sketchy/shoddy, 'pasarse de lanza' means to cross the line/rip someone off, and 'hacer un oso / ¡qué oso!' means 'how embarrassing!'",
        idealAnswerRubric:
          "Chafa means sketchy/low-quality, pasarse de lanza means to rip off/go too far, and qué oso means how embarrassing.",
      },
      {
        id: "q5",
        difficultyLabel: "Q5 • Hard (Slang & Nuance)",
        category: "Vocab & Slang",
        questionText:
          "At the end, Mariana shouts: '¡A huevo! ... la banda está a punto de tocar la primera rola y nos toca hasta la pista.' What does she mean?",
        options: [
          "Awesome! The band is about to play their first song and their spot is all the way down on the main floor",
          "Oh no! The band is already on their last song and they have to sit in the top balcony",
          "Hurry! They need to buy food before the opening band finishes their set",
          "Great! They won backstage passes to meet the band after the first song",
        ],
        correctOptionIndex: 0,
        explanation:
          "'¡A huevo!' means 'Hell yeah / Awesome!', 'la primera rola' means 'the first song', and 'la pista' is the general-admission floor section of the stadium.",
        idealAnswerRubric:
          "Hell yeah! The band is about to play their first song and their spot is all the way down on the floor.",
      },
    ],
  },

  // =========================================================================
  // ADVANCED (B2) — DIALOG #2
  // =========================================================================
  "B2:2": {
    language: "Spanish",
    level: "B2",
    isSideQuest: false,
    clipNumber: 2,
    title: "La carnita asada de última hora en Monterrey",
    dialect: "Mexican Spanish 🇲🇽",
    dialectNotes:
      "Advanced level: Fast Northern Mexican ('Regio') banter with 'compa', 'tirar a león', 'feria' (money), 'de volada', and 'con madre'.",
    dialogue: [
      {
        speaker: "Ramiro",
        text: "¿Qué onda, compa? ¿Por qué me tiraste a león toda la mañana? Quedamos de ir a comprar el carbón y la arrachera a la una.",
        englishTranslation:
          "What's up, buddy? Why did you ignore my calls all morning? We agreed to go buy the charcoal and flank steak at one o'clock.",
      },
      {
        speaker: "Valeria",
        text: "Nombre, Ramiro, discúlpame, se me armó un desmadre en la oficina porque se cayó el servidor y mi jefe no nos dejaba salir.",
        englishTranslation:
          "No way, Ramiro, I'm sorry, all hell broke loose at the office because the server crashed and my boss wouldn't let us leave.",
      },
      {
        speaker: "Ramiro",
        text: "Híjole, qué mala onda... Es que los invitados llegan a las cinco y yo no traigo suficiente feria para pagar toda la carne solo.",
        englishTranslation:
          "Shoot, what bad luck... The guests arrive at five and I don't have enough cash on me to pay for all the meat by myself.",
      },
      {
        speaker: "Valeria",
        text: "No te apures, ya pedí todo a domicilio por la carnicería San Juan y lo dejé pagado con mi tarjeta. Llega a tu casa de volada en veinte minutos.",
        englishTranslation:
          "Don't worry, I already ordered everything for delivery from San Juan butcher shop and paid with my card. It'll arrive at your house super fast in twenty minutes.",
      },
      {
        speaker: "Ramiro",
        text: "¡Sobres, te quedó con madre! Entonces yo voy prendiendo el asador y pongo las cheves en la hielera.",
        englishTranslation:
          "Awesome, you nailed it! Then I'll start lighting the grill and put the beers in the cooler.",
      },
    ],
    slangNotes: [
      {
        term: "tirar a león",
        meaning: "To ignore someone / ghost someone's calls or messages",
        literalTranslation: "to throw to the lion",
      },
      {
        term: "un desmadre",
        meaning: "Total chaos / a huge mess",
        literalTranslation: "an un-mothering",
      },
      {
        term: "la feria",
        meaning: "Money / cash / change (Northern Mexican slang)",
        literalTranslation: "the fair",
      },
      {
        term: "de volada",
        meaning: "Super fast / right away",
        literalTranslation: "on the fly",
      },
      {
        term: "con madre",
        meaning: "Awesome / top-notch (Monterrey slang)",
        literalTranslation: "with mother",
      },
      {
        term: "las cheves",
        meaning: "The beers (short for cheve / cerveza)",
        literalTranslation: "the beers",
      },
    ],
    questions: [
      {
        id: "q1",
        difficultyLabel: "Q1 • Easy (General Gist)",
        category: "General Gist",
        questionText:
          "What event are Ramiro and Valeria preparing for, and why didn't Valeria meet him at 1:00 PM?",
        options: [
          "A birthday party at a restaurant; her car broke down on the highway",
          "A backyard barbecue ('carnita asada'); the server crashed at her office and her boss wouldn't let them leave",
          "A camping trip in the mountains; she overslept after working late",
          "A soccer watch party; she was stuck in a dentist appointment",
        ],
        correctOptionIndex: 1,
        explanation:
          "They are preparing a barbecue ('carbón y arrachera'), and Valeria explains there was chaos ('un desmadre') at the office because the server crashed ('se cayó el servidor').",
        idealAnswerRubric:
          "A barbecue (carnita asada), and Valeria was stuck at the office because the server crashed.",
      },
      {
        id: "q2",
        difficultyLabel: "Q2 • Medium-Easy (Key Detail)",
        category: "Key Detail",
        questionText:
          "When do the guests arrive, and how did Valeria solve the meat and charcoal problem?",
        options: [
          "Guests arrive at 7 PM; she asked another friend to pick up the meat",
          "Guests arrive at 5 PM; she ordered everything for delivery from San Juan butcher shop paid with her card, arriving in 20 minutes",
          "Guests arrive at 6 PM; she transferred cash to Ramiro's bank account",
          "Guests arrive at 4 PM; she is bringing cooked food from a restaurant",
        ],
        correctOptionIndex: 1,
        explanation:
          "Ramiro says the guests arrive at 5 ('llegan a las cinco'), and Valeria already ordered delivery from 'la carnicería San Juan' paid with her card, arriving in 20 minutes.",
        idealAnswerRubric:
          "Guests arrive at 5 PM, and Valeria ordered everything for delivery from San Juan butcher shop paid with her card, arriving in 20 minutes.",
      },
      {
        id: "q3",
        difficultyLabel: "Q3 • Medium (Key Detail)",
        category: "Key Detail",
        questionText:
          "What two things is Ramiro going to do right now while waiting for the delivery?",
        options: [
          "Clean the patio and go buy tortillas",
          "Start lighting the grill and put the beers in the cooler",
          "Set the table and make guacamole",
          "Call the guests and tell them to arrive an hour later",
        ],
        correctOptionIndex: 1,
        explanation:
          "Ramiro says: 'yo voy prendiendo el asador y pongo las cheves en la hielera' (light the grill and put the beers in the cooler).",
        idealAnswerRubric:
          "Start lighting the grill and put the beers in the cooler.",
      },
      {
        id: "q4",
        difficultyLabel: "Q4 • Medium-Hard (Vocabulary)",
        category: "Vocab & Slang",
        questionText:
          "Ramiro asks: '¿Por qué me tiraste a león toda la mañana?' and says 'no traigo suficiente feria'. What do 'tirar a león' and 'feria' mean?",
        options: [
          "'Tirar a león' = to yell at someone; 'feria' = free time",
          "'Tirar a león' = to ignore/ghost someone; 'feria' = money/cash",
          "'Tirar a león' = to play a prank; 'feria' = space in the car",
          "'Tirar a león' = to arrive late; 'feria' = credit limit",
        ],
        correctOptionIndex: 1,
        explanation:
          "In Mexican slang, 'tirar a león' means to ignore/ghost someone's calls or messages, and in Northern Mexico ('Regio' slang), 'la feria' means money/cash.",
        idealAnswerRubric:
          "Tirar a león means to ignore/ghost someone, and feria means money/cash.",
      },
      {
        id: "q5",
        difficultyLabel: "Q5 • Hard (Slang & Nuance)",
        category: "Vocab & Slang",
        questionText:
          "Valeria says the delivery arrives 'de volada', and Ramiro replies '¡Sobres, te quedó con madre!'. What do those expressions mean?",
        options: [
          "'De volada' = by air mail; 'Sobres, te quedó con madre' = Wait, my mom is coming too",
          "'De volada' = super fast; 'Sobres, te quedó con madre' = Awesome/deal, you nailed it (it turned out great)!",
          "'De volada' = free of charge; 'Sobres, te quedó con madre' = Careful, don't spend too much",
          "'De volada' = tomorrow morning; 'Sobres, te quedó con madre' = Okay, I'll pay you back",
        ],
        correctOptionIndex: 1,
        explanation:
          "'De volada' means super fast/right away; '¡Sobres!' means 'Deal / Sounds good!', and 'con madre' is classic Monterrey slang for 'awesome / top-notch!'",
        idealAnswerRubric:
          "De volada means super fast, and Sobres, te quedó con madre means Awesome, you nailed it!",
      },
    ],
  },
};

/**
 * Seeded vocabulary from previous days played so the "Review Vocab" modal
 * and Audio Vocab Quiz always include previous days alongside today's dialog.
 */
export const SEEDED_PREVIOUS_DAYS_VOCAB: VocabHistoryEntry[] = [
  {
    key: "prev_day_1",
    dateStr: "Yesterday",
    levelLabel: "Conversational",
    dialogTitle: "La mochila olvidada en el Uber en la Condesa",
    items: [
      {
        term: "hacer un paro",
        meaning: "To do someone a huge favor / help someone out",
        literalTranslation: "to make a stop",
      },
      {
        term: "qué poca",
        meaning: "How unfair / how rude (short for 'qué poca madre')",
        literalTranslation: "what little",
      },
      {
        term: "la propina",
        meaning: "The tip / gratuity for the driver or waiter",
        literalTranslation: "the tip",
      },
      {
        term: "de pelos",
        meaning: "Awesome / fantastic / great news",
        literalTranslation: "of hairs",
      },
    ],
  },
  {
    key: "prev_day_2",
    dateStr: "2 Days Ago",
    levelLabel: "Intro",
    dialogTitle: "El tianguis del domingo en la Narvarte",
    items: [
      {
        term: "el tianguis",
        meaning: "Traditional Mexican open-air street market",
        literalTranslation: "open-air market (from Nahuatl)",
      },
      {
        term: "el pilón",
        meaning: "A free extra item thrown in by a market vendor",
        literalTranslation: "the bonus / sugar loaf",
      },
      {
        term: "está bara",
        meaning: "It's cheap / a great bargain (short for 'barato')",
        literalTranslation: "it's cheap",
      },
      {
        term: "aguas",
        meaning: "Watch out! / Be careful!",
        literalTranslation: "waters",
      },
    ],
  },
];

/**
 * Simulated friends for the static MVP Leaderboard so the user can preview
 * how the friend group leaderboard looks with `/ 5` scores and Vocab Stars.
 */
export const SIMULATED_GROUP_FRIENDS: Array<{
  userId: string;
  deviceId: string;
  username: string;
  currentStreak: number;
  scoreOutOf5: number;
  vocabStar: VocabStarTier;
}> = [
  {
    userId: "sim_friend_1",
    deviceId: "sim_1",
    username: "Sofia (Demo Friend)",
    currentStreak: 5,
    scoreOutOf5: 4.5,
    vocabStar: "gold",
  },
  {
    userId: "sim_friend_2",
    deviceId: "sim_2",
    username: "Mateo (Demo Friend)",
    currentStreak: 3,
    scoreOutOf5: 3.8,
    vocabStar: "silver",
  },
  {
    userId: "sim_friend_3",
    deviceId: "sim_3",
    username: "Camila (Demo Friend)",
    currentStreak: 2,
    scoreOutOf5: 3.0,
    vocabStar: "bronze",
  },
];

export function getStaticMexicanSpanishLesson(
  dateStr: string,
  level: string,
  clipNumber = 1
): StaticLesson {
  const safeLevel = ["A1", "A2", "B1", "B2"].includes(level) ? level : "B1";
  const safeClip = clipNumber === 2 ? 2 : 1;
  const key = `${safeLevel}:${safeClip}`;
  const base = RAW_MEXICAN_LESSONS[key] ?? RAW_MEXICAN_LESSONS["B1:1"];
  const basePath = getPublicBasePath();
  const ext = safeLevel === "A1" ? "m4a" : "mp3";

  return {
    ...base,
    _id: `static_Spanish_${safeLevel}_${safeClip}`,
    dateStr,
    audioUrl: `${basePath}/audio/Spanish-${safeLevel}-${safeClip}.${ext}`,
  };
}

/**
 * Builds a 5-question Audio Vocabulary Review Quiz combining slang/vocab
 * from Today's Dialog + Previous Days Played.
 */
export function buildAudioVocabQuizQuestions(
  lesson: StaticLesson,
  previousDays: VocabHistoryEntry[]
): AudioVocabQuizQuestion[] {
  const pool: Array<{
    term: string;
    meaning: string;
    literalTranslation: string;
    sourceLabel: string;
    spokenContextSentence: string;
    englishContextSentence: string;
  }> = [];

  // Add items from Today's Dialog first (Up to 3)
  for (const note of lesson.slangNotes.slice(0, 3)) {
    const firstWord = note.term
      .toLowerCase()
      .replace(/[¿?¡!]/g, "")
      .split(/\s+/)[0];
    const matchingLine = lesson.dialogue.find((d) =>
      d.text.toLowerCase().includes(firstWord)
    );
    pool.push({
      term: note.term,
      meaning: note.meaning,
      literalTranslation: note.literalTranslation,
      sourceLabel: `Today's Dialog • ${lesson.title}`,
      spokenContextSentence: matchingLine
        ? `${ note.term }. Por ejemplo: ${ matchingLine.text }`
        : `${ note.term }`,
      englishContextSentence: matchingLine
        ? matchingLine.englishTranslation
        : note.meaning,
    });
  }

  // Add items from Previous Days Played to reach 5 questions
  for (const entry of previousDays) {
    for (const item of entry.items) {
      if (pool.length >= 5) break;
      if (!pool.some((p) => p.term === item.term)) {
        pool.push({
          term: item.term,
          meaning: item.meaning,
          literalTranslation: item.literalTranslation,
          sourceLabel: `${entry.dateStr} • ${entry.dialogTitle}`,
          spokenContextSentence: item.term,
          englishContextSentence: item.meaning,
        });
      }
    }
    if (pool.length >= 5) break;
  }

  // Fallback distractor meanings pool
  const allMeanings = [
    ...lesson.slangNotes.map((s) => s.meaning),
    ...SEEDED_PREVIOUS_DAYS_VOCAB.flatMap((e) => e.items.map((i) => i.meaning)),
    "To miss the last subway train home",
    "To ask the waiter for the check immediately",
    "A rainstorm that floods the street",
  ];

  return pool.slice(0, 5).map((item, idx) => {
    const distractors = allMeanings
      .filter((m) => m !== item.meaning)
      .slice(idx, idx + 3);
    while (distractors.length < 3) {
      distractors.push("To arrive early to an appointment");
    }

    // Deterministic rotation of correct option index (0..3)
    const correctIndex = (idx * 3 + 1) % 4;
    const opts: string[] = [];
    let dIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i === correctIndex) {
        opts.push(item.meaning);
      } else {
        opts.push(distractors[dIdx++] ?? "An everyday greeting");
      }
    }

    return {
      id: `vquiz_${idx + 1}`,
      spanishTerm: item.term,
      literalTranslation: item.literalTranslation,
      correctMeaning: item.meaning,
      sourceLabel: item.sourceLabel,
      spokenContextSentence: item.spokenContextSentence,
      englishContextSentence: item.englishContextSentence,
      options: opts as [string, string, string, string],
      correctOptionIndex: correctIndex,
    };
  });
}

export function calculateScoreOutOf5(params: {
  rawScore: number; // 0-100
  usedSlowdown: boolean;
  usedCafeMode: boolean;
  usedSecondAttempt?: boolean;
  usedSecondListen?: boolean;
  firstTryCorrectCount?: number;
  secondTryCorrectCount?: number;
}): {
  baseScoreOutOf5: number;
  scoreOutOf5: number;
  formattedScoreOutOf5: string;
  bonusesAndPenalties: Array<{
    label: string;
    effectText: string;
    type: "bonus" | "penalty" | "neutral";
  }>;
} {
  const firstTryCount = params.firstTryCorrectCount;
  const secondTryCount = params.secondTryCorrectCount ?? 0;
  const totalCorrectCount =
    firstTryCount !== undefined
      ? firstTryCount + secondTryCount
      : Math.round((Math.max(0, Math.min(100, params.rawScore)) / 100) * 5);

  const rawQuestionPoints =
    firstTryCount !== undefined
      ? firstTryCount * 1.0 + secondTryCount * 1.0
      : (Math.max(0, Math.min(100, params.rawScore)) / 100) * 5;
  const baseScoreOutOf5 = Number(rawQuestionPoints.toFixed(1));

  let runningScore = baseScoreOutOf5;
  const bonusesAndPenalties: Array<{
    label: string;
    effectText: string;
    type: "bonus" | "penalty" | "neutral";
  }> = [];

  // Penalty for needing a 2nd attempt / 2nd listen:
  // Each question answered on the 2nd try incurs -0.3 pts (worth 0.7 instead of 1.0).
  // Even if no new questions were answered on the 2nd try, using a 2nd listen / Take 2 incurs at least -0.3 pts
  // so a perfect 5/5 base score is ONLY possible on the first try with 1 listen.
  const secondTryPenalty = Number((secondTryCount * 0.3).toFixed(1));
  const needsSecondListenPenalty =
    Boolean(params.usedSecondAttempt || params.usedSecondListen) &&
    secondTryPenalty === 0 &&
    runningScore > 0;
  const totalRetryPenalty = needsSecondListenPenalty ? 0.3 : secondTryPenalty;

  if (totalRetryPenalty > 0) {
    runningScore = Math.max(0, runningScore - totalRetryPenalty);
    bonusesAndPenalties.push({
      label:
        secondTryCount > 0
          ? `2nd-Try / 2nd-Listen Penalty (${secondTryCount} retried)`
          : "2nd Listen Used",
      effectText: `-${totalRetryPenalty.toFixed(1)} pts`,
      type: "penalty",
    });
  } else if (totalCorrectCount === 5 && !params.usedSecondAttempt) {
    bonusesAndPenalties.push({
      label: "First-Try Sweep (5/5 on 1st Listen)",
      effectText: "Perfect 5.0 / 5 Base!",
      type: "bonus",
    });
  }

  if (params.usedSlowdown) {
    const slowPenalty = Number((baseScoreOutOf5 * 0.2).toFixed(1));
    runningScore = Math.max(0, runningScore - slowPenalty);
    bonusesAndPenalties.push({
      label: "Slow Playback (0.75x)",
      effectText: `-${slowPenalty.toFixed(1)} pts (-20%)`,
      type: "penalty",
    });
  }

  if (params.usedCafeMode) {
    // Traffic background noise grants up to +1.0 full bonus point (allowing 6 / 5 on a perfect first try!)
    const noiseBonus =
      totalCorrectCount > 0
        ? Number(((totalCorrectCount / 5) * 1.0).toFixed(1))
        : 0;
    runningScore += noiseBonus;
    bonusesAndPenalties.push({
      label: "City Traffic Background Noise",
      effectText: `+${noiseBonus.toFixed(1)} pt Bonus (up to 6/5)`,
      type: "bonus",
    });
  }

  if (bonusesAndPenalties.length === 0) {
    bonusesAndPenalties.push({
      label: "Standard Playback (1st Try)",
      effectText: "No bonuses or penalties",
      type: "neutral",
    });
  }

  const adjusted = Math.max(0, Math.min(6, runningScore));
  const scoreOutOf5 = Number(adjusted.toFixed(1));
  const formattedScoreOutOf5 = Number.isInteger(scoreOutOf5)
    ? `${scoreOutOf5}`
    : scoreOutOf5.toFixed(1);

  return {
    baseScoreOutOf5,
    scoreOutOf5,
    formattedScoreOutOf5,
    bonusesAndPenalties,
  };
}

/**
 * Grades the 5 multiple-choice questions deterministically.
 * Questions answered right on the 1st try earn 20 raw points (1.0 / 5).
 * Questions answered right on the 2nd try earn 14 raw points (0.7 / 5).
 */
export function gradeMultipleChoiceLocally(params: {
  lesson: Pick<StaticLesson, "questions" | "slangNotes">;
  selectedIndices: Record<string, number | undefined>;
  usedSlowdown: boolean;
  usedCafeMode: boolean;
  round1CorrectMap?: Record<string, boolean>;
  isSecondAttempt?: boolean;
}): {
  rawScore: number;
  correctCount: number;
  firstTryCorrectCount: number;
  secondTryCorrectCount: number;
  multiplier: number;
  finalScore: number;
  feedback: Array<{
    questionId: string;
    isCorrect: boolean;
    wasFirstTryCorrect: boolean;
    selectedOptionIndex: number;
    correctOptionIndex: number;
    score: number; // 20 if 1st try correct, 14 if 2nd try correct, 0 if incorrect
    explanation: string;
    missedNuance: string;
  }>;
} {
  let correctCount = 0;
  let firstTryCorrectCount = 0;
  let secondTryCorrectCount = 0;

  const feedback = params.lesson.questions.map((q, idx) => {
    const wasFirstTryCorrect = Boolean(params.round1CorrectMap?.[q.id]);
    const selectedIdx = wasFirstTryCorrect
      ? q.correctOptionIndex
      : (params.selectedIndices[q.id] ?? -1);
    const isCorrect =
      wasFirstTryCorrect || selectedIdx === q.correctOptionIndex;

    if (isCorrect) {
      correctCount++;
      if (!params.isSecondAttempt || wasFirstTryCorrect) {
        firstTryCorrectCount++;
      } else {
        secondTryCorrectCount++;
      }
    }

    const relatedSlang =
      params.lesson.slangNotes[idx] ?? params.lesson.slangNotes[0];

    const questionScore = !isCorrect
      ? 0
      : !params.isSecondAttempt || wasFirstTryCorrect
        ? 20
        : 14;

    return {
      questionId: q.id,
      isCorrect,
      wasFirstTryCorrect: isCorrect && (!params.isSecondAttempt || wasFirstTryCorrect),
      selectedOptionIndex: selectedIdx,
      correctOptionIndex: q.correctOptionIndex,
      score: questionScore,
      explanation: q.explanation,
      missedNuance: relatedSlang
        ? `"${relatedSlang.term}" means "${relatedSlang.meaning}" (literally "${relatedSlang.literalTranslation}").`
        : q.explanation,
    };
  });

  const rawScore = firstTryCorrectCount * 20 + secondTryCorrectCount * 14;

  let multiplier = 1.0;
  if (params.usedSlowdown) {
    multiplier -= 0.2;
  }
  if (params.usedCafeMode) {
    multiplier += 0.2;
  }
  multiplier = Number(multiplier.toFixed(2));
  const finalScore = Math.min(120, Math.round(rawScore * multiplier));

  return {
    rawScore,
    correctCount,
    firstTryCorrectCount,
    secondTryCorrectCount,
    multiplier,
    finalScore,
    feedback,
  };
}
