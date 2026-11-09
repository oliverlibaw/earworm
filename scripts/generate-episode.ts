#!/usr/bin/env tsx
/**
 * Milestone 2: Automated CLI Content & Audio Generation Pipeline (`scripts/generate-episode.ts`)
 *
 * Executable via `npm run generate:episode` (using `tsx`).
 *
 * Supported Modes:
 *   1. Single Episode:
 *      npm run generate:episode -- --date 2026-11-10 --region Mexico --topic "Arguing over the bill at a taqueria" --ambient cafe
 *   2. 14-Day Batch Buffer:
 *      npm run generate:episode -- --batch 14 --start-date 2026-11-09
 *   3. Mock TTS (Offline FFmpeg tone/speech fallback):
 *      npm run generate:episode -- --batch 14 --start-date 2026-11-09 --mock-tts
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import ffmpegStatic from "ffmpeg-static";
// @ts-expect-error ffprobe-static does not ship bundled .d.ts
import ffprobeStatic from "ffprobe-static";
import OpenAI from "openai";
import type { DialogueLine, Episode, QuizQuestion } from "../src/types/episode";

const ROOT_DIR = process.cwd();
const TMP_DIR = path.join(ROOT_DIR, "tmp");
const AMBIENT_ASSETS_DIR = path.join(ROOT_DIR, "scripts", "assets", "ambient");
const PUBLIC_EPISODES_DIR = path.join(ROOT_DIR, "public", "episodes");
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/earworm";

const LEAD_IN_PAD_SEC = 0.5;
const INTER_LINE_GAP_SEC = 0.35;
const TAIL_PAD_SEC = 0.6;

// ============================================================================
// 2.1 Load .env.local & Verify FFmpeg / FFprobe
// ============================================================================
function loadEnvLocal(): void {
  const envPath = path.join(ROOT_DIR, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && val && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

function resolveBinary(
  name: "ffmpeg" | "ffprobe",
  staticFallback: string | null | undefined
): string {
  try {
    const sysPath = execFileSync("which", [name], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (sysPath && fs.existsSync(sysPath)) return sysPath;
  } catch {
    // Fallback to static binary below
  }

  for (const candidate of [
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`,
    staticFallback,
  ]) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Required binary "${name}" was not found in PATH or node_modules (${name}-static).`
  );
}

const FFMPEG_BIN = resolveBinary(
  "ffmpeg",
  typeof ffmpegStatic === "string" ? ffmpegStatic : null
);
const FFPROBE_BIN = resolveBinary("ffprobe", ffprobeStatic?.path);

function verifyFfmpegInstalled(): void {
  execFileSync(FFMPEG_BIN, ["-version"], { stdio: "ignore" });
  execFileSync(FFPROBE_BIN, ["-version"], { stdio: "ignore" });
}

// ============================================================================
// 2.2 Built-in 14+ Diverse B1/B2 Regional Seed Scenarios (6-8 lines each)
// ============================================================================
export interface SeedEpisodeSpec {
  topic: string;
  title: string;
  region: Episode["region"];
  regionFlag: string;
  ambientType: Episode["ambientType"];
  dialogue: Array<Omit<DialogueLine, "startTime" | "endTime">>;
  questions: QuizQuestion[];
}

const SEED_SCENARIOS: SeedEpisodeSpec[] = [
  // 1. Mexico 🇲🇽 — Street tacos outside the Metro
  {
    topic: "Pooling cash for basket tacos outside a Mexico City metro station",
    title: "Tacos de canasta afuera del metro",
    region: "Mexico",
    regionFlag: "🇲🇽",
    ambientType: "street",
    dialogue: [
      {
        id: 1,
        speaker: "Carlos",
        gender: "male",
        spanish:
          "Oye, Valeria, pues tengo muchísima hambre. ¿Vamos por unos tacos de canasta aquí afuera del metro?",
        english:
          "Hey, Valeria, well I'm super hungry. Shall we get some basket tacos right outside the subway?",
        slang: {
          term: "tacos de canasta",
          literalMeaning: "basket tacos",
          actualMeaning:
            "Steamed street tacos kept warm in a cloth-lined basket, often sold from a bicycle",
          example: "En la esquina del metro venden tacos de canasta buenísimos.",
        },
      },
      {
        id: 2,
        speaker: "Valeria",
        gender: "female",
        spanish:
          "¡Ay, sí, qué rico! Pero espera, o sea, ¿traes efectivo? Porque el señor de la bicicleta no acepta tarjeta.",
        english:
          "Oh, yes, delicious! But wait, I mean, do you have cash on you? Because the guy with the bicycle doesn't take cards.",
      },
      {
        id: 3,
        speaker: "Carlos",
        gender: "male",
        spanish:
          "Híjole, bueno, solo traigo un billete de cincuenta pesos en la cartera. ¿Cuánto cuesta la orden?",
        english:
          "Shoot, well, I only have a fifty-peso bill in my wallet. How much does an order cost?",
        slang: {
          term: "Híjole",
          literalMeaning: "little son (altered exclamation)",
          actualMeaning:
            "Shoot! / Gosh! / Oh man! (classic Mexican exclamation of surprise)",
          example: "¡Híjole, se me olvidaron las llaves adentro de la casa!",
        },
      },
      {
        id: 4,
        speaker: "Valeria",
        gender: "female",
        spanish:
          "Pues la orden de cinco tacos sale en cuarenta pesos. Y yo tengo veinte pesos en monedas para dos refrescos.",
        english:
          "Well an order of five tacos comes to forty pesos. And I have twenty pesos in coins for two sodas.",
      },
      {
        id: 5,
        speaker: "Carlos",
        gender: "male",
        spanish:
          "¡Ah, qué chido! Entonces compartimos la orden ahorita y en la tarde te paso mi parte por transferencia.",
        english:
          "Oh, awesome! Then let's share the order right now and this afternoon I'll send you my share by bank transfer.",
        slang: {
          term: "qué chido",
          literalMeaning: "how cool",
          actualMeaning: "How awesome / great / cool (classic Mexican slang)",
          example: "¡Qué chido que pudiste venir a la fiesta!",
        },
      },
      {
        id: 6,
        speaker: "Valeria",
        gender: "female",
        spanish:
          "Sale, pide dos de papa con chorizo y tres de frijol. ¡Pero aguas con la salsa verde que pica un montón!",
        english:
          "Deal, order two potato-and-chorizo ones and three bean ones. But watch out for the green salsa—it's super spicy!",
        slang: {
          term: "pica un montón",
          literalMeaning: "it bites a pile",
          actualMeaning: "It's super spicy / has a lot of chili heat",
          example: "No le pongas tanta salsa habanera porque pica un montón.",
        },
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question:
          "What are Carlos and Valeria trying to figure out outside the subway station?",
        options: [
          "Whether they have enough cash to buy street tacos and sodas",
          "Which subway line they need to take to get to a restaurant",
          "Where to find an ATM because they lost their wallets",
          "How to cook potato and bean tacos at home tonight",
        ],
        correctIndex: 0,
        explanation:
          "Carlos is hungry for tacos de canasta outside the metro, and Valeria checks if they have enough cash since the vendor doesn't take cards.",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "How much money does Carlos have on him, and how much does an order of 5 tacos cost?",
        options: [
          "He has a 20-peso bill, and the tacos cost 50 pesos",
          "He has a 50-peso bill, and the 5 tacos cost 40 pesos",
          "He has 100 pesos in coins, and the tacos cost 60 pesos",
          "He has no cash at all, so Valeria pays 40 pesos by card",
        ],
        correctIndex: 1,
        explanation:
          "Carlos says 'solo traigo un billete de cincuenta pesos' (50-peso bill), and Valeria says 'la orden de cinco tacos sale en cuarenta pesos' (40 pesos).",
      },
      {
        id: "q3",
        type: "comprehension",
        question:
          "Which taco fillings does Valeria ask Carlos to order for them to share?",
        options: [
          "Five pork tacos with red salsa",
          "Three chicken tacos and two cheese tacos",
          "Two potato-with-chorizo and three bean tacos",
          "Four steak tacos and one potato taco",
        ],
        correctIndex: 2,
        explanation:
          "Valeria says: 'Sale, pide dos de papa con chorizo y tres de frijol' (two potato-with-chorizo and three bean tacos).",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: When Carlos says 'Híjole' and '¡qué chido!', and Valeria warns the salsa 'pica un montón', what do those expressions mean?",
        options: [
          "'Híjole' = shoot/oh man; 'qué chido' = how awesome; 'pica un montón' = it's super spicy",
          "'Híjole' = hurry up; 'qué chido' = how expensive; 'pica un montón' = it costs extra",
          "'Híjole' = excuse me; 'qué chido' = how cold; 'pica un montón' = it's sour",
          "'Híjole' = thank you; 'qué chido' = how small; 'pica un montón' = it's very hot",
        ],
        correctIndex: 0,
        explanation:
          "In Mexican Spanish, 'híjole' is 'shoot/oh man', 'qué chido' is 'how cool/awesome', and 'pica un montón' means 'it's super spicy!'",
      },
    ],
  },

  // 2. Spain 🇪🇸 — Splitting the patio café bill in Madrid
  {
    topic: "Splitting the bill at a patio cafe in Madrid before the metro closes",
    title: "La cuenta dividida en el café de Madrid",
    region: "Spain",
    regionFlag: "🇪🇸",
    ambientType: "cafe",
    dialogue: [
      {
        id: 1,
        speaker: "Carmen",
        gender: "female",
        spanish:
          "Oye, Pablo, pues el camarero dice que no nos divide la cuenta aquí en la terraza.",
        english:
          "Hey, Pablo, well the waiter says he won't split the bill for us out here on the patio.",
      },
      {
        id: 2,
        speaker: "Pablo",
        gender: "male",
        spanish:
          "¡Qué fuerte, tía! Bueno, no pasa nada, pago yo todo con mi tarjeta porque sé que andas sin pasta.",
        english:
          "That's wild, girl! Well, no worries, I'll pay the whole thing with my card since I know you're out of cash.",
        slang: {
          term: "sin pasta",
          literalMeaning: "without pasta / dough",
          actualMeaning: "out of money / broke (very common slang across Spain)",
          example: "No salgo este finde porque ando sin pasta.",
        },
      },
      {
        id: 3,
        speaker: "Carmen",
        gender: "female",
        spanish:
          "Mil gracias, tío. O sea, te hago un Bizum de doce euros ahora mismo por mis tostadas y el café cortado.",
        english:
          "Thanks a million, dude. I mean, I'll send you a 12-euro Bizum transfer right now for my toast and espresso.",
        slang: {
          term: "tío",
          literalMeaning: "uncle",
          actualMeaning: "dude / mate / friend (everyday Spain address)",
          example: "¡Gracias por esperarme a la salida, tío!",
        },
      },
      {
        id: 4,
        speaker: "Pablo",
        gender: "male",
        spanish:
          "Tranqui, cuando puedas me lo pasas. Pero deja que pida el datáfono en la barra para no tardar.",
        english:
          "Relax, send it whenever you can. But let me ask for the card terminal at the bar so we don't take long.",
      },
      {
        id: 5,
        speaker: "Carmen",
        gender: "female",
        spanish:
          "Sí, porfa, que encima se está levantando un frío de narices aquí afuera.",
        english:
          "Yes, please, especially since it's getting freezing cold out here.",
      },
      {
        id: 6,
        speaker: "Pablo",
        gender: "male",
        spanish:
          "Vale, ya está pagado. Vámonos pitando que el último metro de la línea dos cierra en veinte minutos.",
        english:
          "Okay, it's paid. Let's get out of here fast because the last Line 2 metro closes in twenty minutes.",
        slang: {
          term: "Vámonos pitando",
          literalMeaning: "let's go whistling / honking",
          actualMeaning: "Let's leave in a big hurry / right away (irse pitando)",
          example: "Salí pitando de la oficina para no perder el tren.",
        },
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question: "What problem do Carmen and Pablo run into at the Madrid café?",
        options: [
          "The waiter says he won't split the bill on the patio",
          "The credit card terminal is broken",
          "The kitchen ran out of toast and coffee",
          "They forgot their phones at home",
        ],
        correctIndex: 0,
        explanation:
          "Carmen says: 'el camarero dice que no nos divide la cuenta aquí en la terraza.'",
      },
      {
        id: "q2",
        type: "comprehension",
        question: "How does Carmen offer to pay Pablo back for her share?",
        options: [
          "She gives him a 20-euro bill in cash",
          "She sends him a 12-euro Bizum mobile transfer",
          "She buys his metro ticket at the station",
          "She promises to buy breakfast tomorrow",
        ],
        correctIndex: 1,
        explanation:
          "Carmen says: 'te hago un Bizum de doce euros ahora mismo por mis tostadas y el café cortado.'",
      },
      {
        id: "q3",
        type: "comprehension",
        question: "Why do they need to leave the café quickly at the end?",
        options: [
          "It is starting to rain on the patio",
          "The last Line 2 metro closes in 20 minutes",
          "They have a movie reservation at eight",
          "The café is closing its terrace",
        ],
        correctIndex: 1,
        explanation:
          "Pablo says: 'Vámonos pitando que el último metro de la línea dos cierra en veinte minutos.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: When Pablo says 'andas sin pasta' and 'vámonos pitando', what do 'pasta' and 'irse pitando' mean in Spain?",
        options: [
          "'Pasta' = money/cash; 'irse pitando' = to leave in a hurry",
          "'Pasta' = Italian food; 'irse pitando' = to whistle a song",
          "'Pasta' = patience; 'irse pitando' = to take a taxi",
          "'Pasta' = battery; 'irse pitando' = to argue with the waiter",
        ],
        correctIndex: 0,
        explanation:
          "In Spain, 'pasta' is slang for money/cash, and 'irse pitando' means to leave in a rush!",
      },
    ],
  },

  // 3. Argentina 🇦🇷 — Closed subway line in Palermo
  {
    topic: "Dealing with a closed subway line and empty transit card in Buenos Aires",
    title: "El subte cerrado en Palermo",
    region: "Argentina",
    regionFlag: "🇦🇷",
    ambientType: "transit",
    dialogue: [
      {
        id: 1,
        speaker: "Julieta",
        gender: "female",
        spanish:
          "Che, Tomás, mirá el cartel en la escalera: la línea D del subte está cortada por obras.",
        english:
          "Hey, Tomás, look at the sign on the stairs: subway Line D is closed for maintenance.",
        slang: {
          term: "subte",
          literalMeaning: "underground (short for subterráneo)",
          actualMeaning: "the Buenos Aires subway / metro system",
          example: "Tomamos el subte en Plaza Italia para llegar rápido al centro.",
        },
      },
      {
        id: 2,
        speaker: "Tomás",
        gender: "male",
        spanish:
          "¡Uh, qué garrón! Y encima me parece que no tengo nada de saldo en la tarjeta SUBE para el colectivo.",
        english:
          "Ugh, what a bummer! And on top of that I don't think I have any balance on my SUBE card for the bus.",
        slang: {
          term: "qué garrón",
          literalMeaning: "what a claw / ankle",
          actualMeaning: "what a total bummer / drag / bad luck (Argentine slang)",
          example: "¡Qué garrón que se largó a llover justo ahora!",
        },
      },
      {
        id: 3,
        speaker: "Julieta",
        gender: "female",
        spanish:
          "Bueno, tranquilo, boludo, acá a media cuadra sobre Santa Fe hay un kiosco abierto donde cargan saldo.",
        english:
          "Well, relax, dude, half a block from here on Santa Fe Avenue there's an open kiosk where they load balance.",
        slang: {
          term: "boludo",
          literalMeaning: "foolish / big-balled",
          actualMeaning:
            "dude / buddy (friendly everyday Argentine address between close friends)",
          example: "Che, boludo, ¿a qué hora nos encontramos hoy?",
        },
      },
      {
        id: 4,
        speaker: "Tomás",
        gender: "male",
        spanish:
          "Menos mal, porque si llamamos un taxi a esta hora nos va a salir carísimo con el tráfico.",
        english:
          "Thank goodness, because if we call a taxi at this hour it's going to be super expensive with the traffic.",
      },
      {
        id: 5,
        speaker: "Julieta",
        gender: "female",
        spanish:
          "Tal cual. El colectivo sesenta y ocho nos deja a dos cuadras del teatro en quince minutos.",
        english:
          "Totally. The number 68 bus drops us off two blocks from the theater in fifteen minutes.",
      },
      {
        id: 6,
        speaker: "Tomás",
        gender: "male",
        spanish:
          "Bárbaro. Carguemos mil pesos en el kiosco y de paso compro unas medialunas para el viaje.",
        english:
          "Awesome. Let's load a thousand pesos at the kiosk and while we're at it I'll buy some croissants for the ride.",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question:
          "Why can't Julieta and Tomás take the subway ('el subte') downtown?",
        options: [
          "Line D is closed due to maintenance work",
          "They lost their SUBE transit cards",
          "The station already closed for the night",
          "The train is too crowded to board",
        ],
        correctIndex: 0,
        explanation:
          "Julieta explains: 'la línea D del subte está cortada por obras' (Line D is closed for maintenance work).",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "Where do they go to add balance to Tomás's SUBE transit card, and which bus will they take?",
        options: [
          "A neighborhood kiosk half a block away, then bus #68",
          "A bank two blocks away, then bus #15",
          "A supermarket across the avenue, then a taxi",
          "They pay the bus driver in cash on bus #40",
        ],
        correctIndex: 0,
        explanation:
          "Julieta points out a 'kiosco' half a block away on Santa Fe Avenue and says 'El colectivo sesenta y ocho nos deja a dos cuadras del teatro.'",
      },
      {
        id: "q3",
        type: "comprehension",
        question:
          "How much money does Tomás want to load, and what snack does he mention?",
        options: [
          "500 pesos and empanadas",
          "1,000 pesos and croissants ('medialunas')",
          "2,000 pesos and a coffee",
          "300 pesos and a sandwich",
        ],
        correctIndex: 1,
        explanation:
          "Tomás says: 'Carguemos mil pesos en el kiosco y de paso compro unas medialunas para el viaje.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: When Tomás exclaims '¡Qué garrón!', what does 'un garrón' mean in Argentine Spanish?",
        options: [
          "A total bummer / drag / piece of bad luck",
          "A great bargain / discount",
          "A fast express train",
          "A delicious bakery pastry",
        ],
        correctIndex: 0,
        explanation:
          "In Argentina, '¡Qué garrón!' means 'What a bummer!' or 'What a drag!'",
      },
    ],
  },

  // 4. Colombia 🇨🇴 — Fresh fruit market in Medellín
  {
    topic: "Bargaining for fresh tropical fruit at a market stall in Medellín",
    title: "Fruta fresca en la plaza de Medellín",
    region: "Colombia",
    regionFlag: "🇨🇴",
    ambientType: "market",
    dialogue: [
      {
        id: 1,
        speaker: "Camila",
        gender: "female",
        spanish:
          "¡Quiubo, parcero! Mirá qué lulos y mangos tan bonitos tienen en este puesto de la plaza.",
        english:
          "What's up, buddy! Look how nice the lulo fruits and mangoes are at this market stall.",
        slang: {
          term: "parcero",
          literalMeaning: "partner / sharecropper",
          actualMeaning: "buddy / close friend (iconic Colombian slang)",
          example: "Ese man es mi parcero desde el colegio.",
        },
      },
      {
        id: 2,
        speaker: "Sebastián",
        gender: "male",
        spanish:
          "¡Uy, sí, están una chimba! Pues llevemos una bolsa grande para hacer jugo frío en la casa.",
        english:
          "Oh, yeah, they look amazing! Well let's get a big bag to make cold juice at home.",
        slang: {
          term: "una chimba",
          literalMeaning: "awesome / super cool",
          actualMeaning: "fantastic / amazing / top-notch (Medellín slang)",
          example: "¡El concierto de anoche estuvo una chimba!",
        },
      },
      {
        id: 3,
        speaker: "Camila",
        gender: "female",
        spanish:
          "Bueno, pregunté el precio y la señora dice que la docena vale ocho mil pesos.",
        english:
          "Well, I asked the price and the lady says a dozen costs eight thousand pesos.",
      },
      {
        id: 4,
        speaker: "Sebastián",
        gender: "male",
        spanish:
          "O sea, está súper bien de precio. Preguntále si nos deja llevar también unas guayabas.",
        english:
          "I mean, that's a super good price. Ask her if she'll let us grab some guavas too.",
      },
      {
        id: 5,
        speaker: "Camila",
        gender: "female",
        spanish:
          "Dice que si compramos la docena nos regala dos maracuyás bien maduros de ñapa.",
        english:
          "She says if we buy the dozen she'll throw in two ripe passion fruits as a free bonus.",
        slang: {
          term: "de ñapa",
          literalMeaning: "from the Quechua 'yapa' (extra addition)",
          actualMeaning: "as a free extra / baker's dozen bonus at a market",
          example: "Compré tres empanadas y me dieron una más de ñapa.",
        },
      },
      {
        id: 6,
        speaker: "Sebastián",
        gender: "male",
        spanish:
          "¡De una! Pagá vos en efectivo que yo te invito las arepas de queso acá al lado.",
        english:
          "Let's do it! You pay in cash and I'll treat you to cheese corn cakes right next door.",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question:
          "Why do Camila and Sebastián want to buy 'lulos' at the Medellín market?",
        options: [
          "To make cold juice at home",
          "To bake a birthday cake",
          "To bring them to their office party",
          "To sell them at their own restaurant",
        ],
        correctIndex: 0,
        explanation:
          "Sebastián says: 'llevemos una bolsa grande para hacer jugo frío en la casa.'",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "How much does a dozen cost, and what does the vendor include for free?",
        options: [
          "5,000 pesos plus free bananas",
          "8,000 pesos plus two free passion fruits ('dos maracuyás de ñapa')",
          "10,000 pesos plus a glass of orange juice",
          "12,000 pesos plus a cheese arepa",
        ],
        correctIndex: 1,
        explanation:
          "Camila says a dozen costs 8,000 pesos and the vendor gives them 'dos maracuyás bien maduros de ñapa.'",
      },
      {
        id: "q3",
        type: "comprehension",
        question:
          "What does Sebastián offer to buy for Camila if she pays cash at the fruit stand?",
        options: [
          "Cheese corn cakes ('arepas de queso') next door",
          "Two cups of Colombian coffee",
          "A taxi ride home",
          "Tickets to a soccer match",
        ],
        correctIndex: 0,
        explanation:
          "Sebastián says: 'Pagá vos en efectivo que yo te invito las arepas de queso acá al lado.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: In Colombian Spanish, what do 'parcero', 'una chimba', and 'de ñapa' mean?",
        options: [
          "'Parcero' = friend/buddy; 'una chimba' = amazing/cool; 'de ñapa' = as a free bonus",
          "'Parcero' = vendor; 'una chimba' = expensive; 'de ñapa' = on credit",
          "'Parcero' = cousin; 'una chimba' = sour; 'de ñapa' = tomorrow",
          "'Parcero' = neighbor; 'una chimba' = heavy; 'de ñapa' = in a bag",
        ],
        correctIndex: 0,
        explanation:
          "In Colombia, 'parcero' means friend/buddy, 'una chimba' means awesome/amazing, and 'de ñapa' is a free extra thrown in by a vendor!",
      },
    ],
  },

  // 5. Mexico 🇲🇽 — Spiced coffee and sweet bread in Coyoacán
  {
    topic: "Grabbing café de olla and sweet bread in Coyoacán before catching the bus",
    title: "El café de olla y el pan dulce en Coyoacán",
    region: "Mexico",
    regionFlag: "🇲🇽",
    ambientType: "cafe",
    dialogue: [
      {
        id: 1,
        speaker: "Sofía",
        gender: "female",
        spanish:
          "Oye, Luis, pues ¿pedimos dos cafés de olla aquí en la panadería antes de tomar el camión?",
        english:
          "Hey, Luis, well should we order two spiced pot coffees here at the bakery before taking the bus?",
        slang: {
          term: "el camión",
          literalMeaning: "the truck",
          actualMeaning: "the city passenger bus (standard everyday word in Mexico)",
          example: "El camión al centro pasa cada diez minutos.",
        },
      },
      {
        id: 2,
        speaker: "Luis",
        gender: "male",
        spanish:
          "¿Mande? Perdón, es que estaba contestando un mensaje del trabajo. Sí, buena idea, hace bastante frío hoy.",
        english:
          "Pardon? Sorry, I was replying to a work message. Yes, good idea, it's pretty cold today.",
        slang: {
          term: "¿Mande?",
          literalMeaning: "command me?",
          actualMeaning:
            "Pardon? / What did you say? (Polite Mexican way to ask someone to repeat)",
          example: "¿Mande, abuelita? No te escuché bien.",
        },
      },
      {
        id: 3,
        speaker: "Sofía",
        gender: "female",
        spanish:
          "Bueno, también voy a llevar dos conchas de vainilla recién salidas del horno para desayunar en la oficina.",
        english:
          "Well, I'm also going to get two vanilla sweet breads fresh out of the oven for breakfast at the office.",
      },
      {
        id: 4,
        speaker: "Luis",
        gender: "male",
        spanish:
          "¡Qué rico huele! O sea, ¿cuánto es por los dos cafés y el pan dulce?",
        english:
          "It smells so good! I mean, how much is it for the two coffees and the sweet bread?",
      },
      {
        id: 5,
        speaker: "Sofía",
        gender: "female",
        spanish:
          "La señorita de la caja dice que son sesenta y cinco pesos en total por todo.",
        english:
          "The cashier lady says it's sixty-five pesos total for everything.",
      },
      {
        id: 6,
        speaker: "Luis",
        gender: "male",
        spanish:
          "Yo invito hoy, Sofía. Pero apúrate porque nuestro camión pasa en ocho minutos por la avenida.",
        english:
          "It's my treat today, Sofía. But hurry up because our bus comes down the avenue in eight minutes.",
        slang: {
          term: "Yo invito",
          literalMeaning: "I invite",
          actualMeaning: "It's my treat / I'm paying for both of us",
          example: "Guarda tu cartera, hoy yo invito los tacos.",
        },
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question: "Why does Luis say '¿Mande?' when Sofía first speaks to him?",
        options: [
          "He was replying to a work message on his phone and didn't catch what she said",
          "He doesn't like spiced coffee",
          "He forgot his wallet at home",
          "The bakery music is too loud",
        ],
        correctIndex: 0,
        explanation:
          "Luis replies: '¿Mande? Perdón, es que estaba contestando un mensaje del trabajo.'",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "What does Sofía pick up to eat at the office, and how much is the entire order?",
        options: [
          "Two vanilla conchas (sweet breads), and the total with coffees is 65 pesos",
          "Three churros, and the total is 50 pesos",
          "One ham sandwich, and the total is 45 pesos",
          "Two tamales, and the total is 30 pesos",
        ],
        correctIndex: 0,
        explanation:
          "Sofía gets 'dos conchas de vainilla' and says 'son sesenta y cinco pesos en total por todo.'",
      },
      {
        id: "q3",
        type: "comprehension",
        question: "Why does Luis tell Sofía to hurry up at the end?",
        options: [
          "Their bus ('el camión') comes down the avenue in 8 minutes",
          "The bakery is about to close",
          "It is starting to rain outside",
          "Their boss just called on his cell phone",
        ],
        correctIndex: 0,
        explanation:
          "Luis says: 'apúrate porque nuestro camión pasa en ocho minutos por la avenida.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: In Mexican Spanish, what do '¿Mande?', 'el camión', and 'Yo invito' mean?",
        options: [
          "'¿Mande?' = Pardon?; 'el camión' = the city bus; 'Yo invito' = It's my treat",
          "'¿Mande?' = Send it; 'el camión' = the subway; 'Yo invito' = Come to my party",
          "'¿Mande?' = Hurry up; 'el camión' = the bicycle; 'Yo invito' = Let's split it",
          "'¿Mande?' = Excuse me; 'el camión' = the taxi; 'Yo invito' = You pay today",
        ],
        correctIndex: 0,
        explanation:
          "In Mexico, '¿Mande?' is the polite way to say 'Pardon?', 'el camión' is the passenger bus, and 'Yo invito' means 'My treat!'",
      },
    ],
  },

  // 6. Spain 🇪🇸 — After-work tapas in Lavapiés
  {
    topic: "Unwinding with tapas and draft beer in Lavapiés after a busy workday",
    title: "Tapas de última hora en Lavapiés",
    region: "Spain",
    regionFlag: "🇪🇸",
    ambientType: "street",
    dialogue: [
      {
        id: 1,
        speaker: "Lucía",
        gender: "female",
        spanish:
          "¡Hola, Javi! Bueno, ¿qué tal el curro hoy? Te veo con una cara de cansado impresionante.",
        english:
          "Hi, Javi! Well, how was work today? You look completely exhausted.",
        slang: {
          term: "el curro",
          literalMeaning: "the job / gig",
          actualMeaning: "work / job (everyday colloquial word in Spain)",
          example: "Salgo del curro a las seis y nos vemos en el centro.",
        },
      },
      {
        id: 2,
        speaker: "Javi",
        gender: "male",
        spanish:
          "Uf, ni me hables, tía. Pues estuve súper liado con un informe toda la tarde, pero ya me muero de hambre.",
        english:
          "Phew, don't even get me started, girl. Well I was super tied up with a report all afternoon, but now I'm starving.",
        slang: {
          term: "súper liado",
          literalMeaning: "super tied / wrapped up",
          actualMeaning: "swamped / super busy with something",
          example: "Perdona que no te llamara, anduve súper liado toda la mañana.",
        },
      },
      {
        id: 3,
        speaker: "Lucía",
        gender: "female",
        spanish:
          "Venga, entremos a esta taberna de la esquina que ponen unas patatas bravas que flipas por cinco euros.",
        english:
          "Come on, let's go into this corner tavern—they serve mind-blowing patatas bravas for five euros.",
        slang: {
          term: "que flipas",
          literalMeaning: "that you flip out",
          actualMeaning: "mind-blowing / incredible / amazing (Spain slang)",
          example: "En ese bar hacen una tortilla de patatas que flipas.",
        },
      },
      {
        id: 4,
        speaker: "Javi",
        gender: "male",
        spanish:
          "¡Ostras, qué buena pinta! O sea, ¿también tienen croquetas caseras de jamón?",
        english:
          "Whoa, that sounds great! I mean, do they also have homemade ham croquettes?",
      },
      {
        id: 5,
        speaker: "Lucía",
        gender: "female",
        spanish:
          "Sí, la ración de seis croquetas sale a ocho euros y viene con pan recién tostado.",
        english:
          "Yes, a plate of six croquettes is eight euros and comes with freshly toasted bread.",
      },
      {
        id: 6,
        speaker: "Javi",
        gender: "male",
        spanish:
          "¡De lujo! Pide tú dos cañas bien frías en la barra mientras busco una mesa libre al fondo.",
        english:
          "Awesome! You order two ice-cold draft beers at the bar while I look for an empty table in the back.",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question: "Why does Javi look so tired when he meets Lucía?",
        options: [
          "He was swamped working on a report all afternoon",
          "He walked all the way across Madrid in the rain",
          "He stayed up late watching a soccer match",
          "He just came back from the gym",
        ],
        correctIndex: 0,
        explanation:
          "Javi explains: 'estuve súper liado con un informe toda la tarde' (he was swamped with a report all afternoon).",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "What two dishes do they plan to order at the tavern, and what do they cost?",
        options: [
          "Patatas bravas for 5 euros and six ham croquettes for 8 euros",
          "Spanish tortilla for 10 euros and calamari for 12 euros",
          "Two bocadillos for 6 euros each",
          "Olives for 3 euros and paella for 18 euros",
        ],
        correctIndex: 0,
        explanation:
          "Lucía mentions patatas bravas for 5 euros and a plate of six ham croquettes for 8 euros.",
      },
      {
        id: "q3",
        type: "comprehension",
        question:
          "What does Javi ask Lucía to order at the bar while he looks for a table?",
        options: [
          "Two cold draft beers ('dos cañas bien frías')",
          "A pitcher of sangria",
          "Two bottles of sparkling water",
          "Two cups of espresso",
        ],
        correctIndex: 0,
        explanation:
          "Javi says: 'Pide tú dos cañas bien frías en la barra mientras busco una mesa libre al fondo.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: In Spain, what do 'el curro', 'estar súper liado', and 'que flipas' mean?",
        options: [
          "'El curro' = work/job; 'súper liado' = swamped/busy; 'que flipas' = mind-blowing/amazing",
          "'El curro' = the bus; 'súper liado' = lost; 'que flipas' = overpriced",
          "'El curro' = the boss; 'súper liado' = hungry; 'que flipas' = very spicy",
          "'El curro' = the gym; 'súper liado' = sleepy; 'que flipas' = frozen",
        ],
        correctIndex: 0,
        explanation:
          "In Spain, 'el curro' means work, 'estar liado' means to be busy/swamped, and 'que flipas' means amazing/mind-blowing!",
      },
    ],
  },

  // 7. Argentina 🇦🇷 — Sunday Asado shopping in San Telmo
  {
    topic: "Shopping at a San Telmo market butcher shop for Sunday asado",
    title: "Asado del domingo en San Telmo",
    region: "Argentina",
    regionFlag: "🇦🇷",
    ambientType: "market",
    dialogue: [
      {
        id: 1,
        speaker: "Martín",
        gender: "male",
        spanish:
          "Che, Flor, mirá qué suerte: acá en la carnicería del mercado queda el último kilo de vacío para el asado.",
        english:
          "Hey, Flor, look how lucky: right here at the market butcher shop they have the last kilo of flank steak for the barbecue.",
      },
      {
        id: 2,
        speaker: "Flor",
        gender: "female",
        spanish:
          "¡Qué joya! Bueno, llevate también cuatro chorizos criollos y una bolsa grande de carbón antes de que se acabe.",
        english:
          "What a gem! Well, grab four sausages and a big bag of charcoal too before it sells out.",
        slang: {
          term: "Qué joya",
          literalMeaning: "what a jewel",
          actualMeaning: "Awesome! / Fantastic! / Great news! (Argentine slang)",
          example: "¿Conseguiste entradas para el partido? ¡Qué joya!",
        },
      },
      {
        id: 3,
        speaker: "Martín",
        gender: "male",
        spanish:
          "Dale, el carnicero dice que son doce mil mangos en total por la carne y el carbón.",
        english:
          "Sounds good, the butcher says it's twelve thousand pesos total for the meat and charcoal.",
        slang: {
          term: "mangos",
          literalMeaning: "mangoes / handles",
          actualMeaning: "bucks / pesos (classic Argentine slang for money)",
          example: "Esta campera me salió veinte mil mangos.",
        },
      },
      {
        id: 4,
        speaker: "Flor",
        gender: "female",
        spanish:
          "O sea, está re bien. ¿Ponemos mitad y mitad ahora o preferís que yo compre las bebidas?",
        english:
          "I mean, that's really good. Should we split it fifty-fifty now or do you prefer I buy the drinks?",
      },
      {
        id: 5,
        speaker: "Martín",
        gender: "male",
        spanish:
          "Mejor comprá vos el vino tinto, el pan francés y los tomates para la ensalada en la verdulería.",
        english:
          "Better yet, you buy the red wine, French bread, and tomatoes for the salad at the produce stand.",
      },
      {
        id: 6,
        speaker: "Flor",
        gender: "female",
        spanish:
          "De una, yo me encargo de eso acá al lado. ¡Nos va a quedar re copado el almuerzo en la terraza!",
        english:
          "Deal, I'll take care of that right next door. Lunch on the rooftop is going to turn out super cool!",
        slang: {
          term: "re copado",
          literalMeaning: "very topped / filled",
          actualMeaning: "super cool / awesome (Argentine 're' + 'copado')",
          example: "El lugar nuevo en Palermo está re copado.",
        },
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question:
          "What items do Martín and Flor buy at the butcher shop for Sunday's barbecue?",
        options: [
          "The last kilo of 'vacío' (flank steak), four sausages ('chorizos'), and charcoal",
          "Two chickens, potatoes, and salad greens",
          "Fish fillets, lemons, and white wine",
          "Pork ribs and a dozen empanadas",
        ],
        correctIndex: 0,
        explanation:
          "Martín spots 'el último kilo de vacío' and Flor tells him to grab 'cuatro chorizos criollos y una bolsa grande de carbón.'",
      },
      {
        id: "q2",
        type: "comprehension",
        question: "How much does the butcher shop order cost in total?",
        options: [
          "5,000 pesos",
          "8,000 pesos",
          "12,000 pesos ('doce mil mangos')",
          "20,000 pesos",
        ],
        correctIndex: 2,
        explanation:
          "Martín says: 'el carnicero dice que son doce mil mangos en total' (12,000 pesos total).",
      },
      {
        id: "q3",
        type: "comprehension",
        question: "How do they divide the expenses for the barbecue?",
        options: [
          "Martín pays for the meat/charcoal, and Flor buys the red wine, bread, and tomatoes next door",
          "Flor pays for everything with her credit card",
          "They ask their friends to transfer money first",
          "They decide to eat at a restaurant instead",
        ],
        correctIndex: 0,
        explanation:
          "Martín asks Flor to buy the red wine, French bread, and tomatoes next door while he pays the butcher.",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: In Argentina, what do '¡Qué joya!', 'doce mil mangos', and 're copado' mean?",
        options: [
          "'Qué joya' = Fantastic!; 'mangos' = pesos/bucks; 're copado' = super cool",
          "'Qué joya' = How expensive!; 'mangos' = tropical fruit; 're copado' = too crowded",
          "'Qué joya' = What a ring!; 'mangos' = coins; 're copado' = burnt on the grill",
          "'Qué joya' = Hurry up!; 'mangos' = grams; 're copado' = very late",
        ],
        correctIndex: 0,
        explanation:
          "In Argentine Spanish, '¡Qué joya!' is 'Fantastic!', 'mangos' means pesos/bucks, and 're copado' means super cool!",
      },
    ],
  },

  // 8. Colombia 🇨🇴 — Black coffee before a Bogotá downpour
  {
    topic: "Ducking into a Bogotá bakery for hot coffee and cheese bread before a storm",
    title: "Un tinto antes del aguacero en Bogotá",
    region: "Colombia",
    regionFlag: "🇨🇴",
    ambientType: "cafe",
    dialogue: [
      {
        id: 1,
        speaker: "Natalia",
        gender: "female",
        spanish:
          "Uy, Andrés, mirá esas nubes negras sobre los cerros de Monserrate. Se va a venir un aguacero tenaz.",
        english:
          "Whoa, Andrés, look at those dark clouds over the Monserrate hills. A fierce downpour is about to hit.",
        slang: {
          term: "tenaz",
          literalMeaning: "tenacious / stubborn",
          actualMeaning: "intense / fierce / crazy (very common Bogotá slang)",
          example: "El tráfico por la Séptima hoy está tenaz.",
        },
      },
      {
        id: 2,
        speaker: "Andrés",
        gender: "male",
        spanish:
          "Pues sí, qué frío tan berraco y ninguno de los dos trajo sombrilla hoy.",
        english:
          "Well yeah, it's freezing cold and neither of us brought an umbrella today.",
      },
      {
        id: 3,
        speaker: "Natalia",
        gender: "female",
        spanish:
          "Bueno, entremos rápido a esta cafetería de la esquina y nos tomamos un tinto bien caliente.",
        english:
          "Well, let's duck quickly into this corner café and have a piping hot black coffee.",
        slang: {
          term: "un tinto",
          literalMeaning: "a tinted/red one",
          actualMeaning:
            "a cup of black coffee (in Colombia, 'tinto' means black coffee, not red wine!)",
          example: "¿Me regala un tinto sin azúcar, por favor?",
        },
      },
      {
        id: 4,
        speaker: "Andrés",
        gender: "male",
        spanish:
          "Buena idea. O sea, aprovechamos para pedir dos almojábanas recién salidas del horno mientras escampa.",
        english:
          "Good idea. I mean, let's take the chance to order two cheese breads fresh out of the oven while the rain stops.",
      },
      {
        id: 5,
        speaker: "Natalia",
        gender: "female",
        spanish:
          "Sí, el señor dice que cada combo de tinto con almojábana cuesta seis mil pesos.",
        english:
          "Yes, the man says each combo of black coffee with cheese bread costs six thousand pesos.",
      },
      {
        id: 6,
        speaker: "Andrés",
        gender: "male",
        spanish:
          "Listo, de una. Apenas pare la lluvia caminamos dos cuadras a la estación de TransMilenio.",
        english:
          "Done, let's do it. As soon as the rain stops we'll walk two blocks to the TransMilenio bus station.",
        slang: {
          term: "de una",
          literalMeaning: "of one",
          actualMeaning: "right away / let's do it / count me in",
          example: "¿Vamos a almorzar ya? ¡De una!",
        },
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question: "Why do Natalia and Andrés decide to duck into a café in Bogotá?",
        options: [
          "It's freezing cold, neither brought an umbrella, and a fierce rainstorm ('aguacero') is coming",
          "They have a business meeting with a client there",
          "Andrés needs Wi-Fi to send an email",
          "The TransMilenio station is closed",
        ],
        correctIndex: 0,
        explanation:
          "Natalia sees dark clouds ('se va a venir un aguacero tenaz') and Andrés notes neither of them brought an umbrella.",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "What food do they order with their coffee, and how much is each combo?",
        options: [
          "Warm cheese breads ('almojábanas') for 6,000 pesos per combo",
          "Chocolate cake for 12,000 pesos",
          "Fried plantains for 8,000 pesos",
          "Beef empanadas for 4,000 pesos",
        ],
        correctIndex: 0,
        explanation:
          "They order 'dos almojábanas recién salidas del horno' and Natalia says each combo costs 6,000 pesos.",
      },
      {
        id: "q3",
        type: "comprehension",
        question: "What is their plan once the rain stops ('mientras escampa')?",
        options: [
          "Walk two blocks to the TransMilenio bus station",
          "Call a taxi to go to the airport",
          "Visit a museum downtown",
          "Go grocery shopping",
        ],
        correctIndex: 0,
        explanation:
          "Andrés says: 'Apenas pare la lluvia caminamos dos cuadras a la estación de TransMilenio.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: When Natalia orders 'un tinto bien caliente' in Colombia, what is she ordering?",
        options: [
          "A cup of hot black coffee (not red wine!)",
          "A glass of mulled red wine",
          "A cup of hot chocolate with cheese",
          "A herbal tea with honey",
        ],
        correctIndex: 0,
        explanation:
          "False-friend alert! In Colombia, 'un tinto' always means a small cup of black coffee, whereas in Spain 'vino tinto' is red wine.",
      },
    ],
  },

  // 9. Mexico 🇲🇽 — The scratched bumper on a borrowed car in Guadalajara
  {
    topic: "Confronting a friend over a scratched bumper on a borrowed car in Guadalajara",
    title: "El coche prestado y el raspón en Guadalajara",
    region: "Mexico",
    regionFlag: "🇲🇽",
    ambientType: "street",
    dialogue: [
      {
        id: 1,
        speaker: "Diego",
        gender: "male",
        spanish:
          "Oye, Fernanda, no manches... Acabo de bajar al estacionamiento y vi que mi coche tiene un raspón enorme en la defensa trasera.",
        english:
          "Hey, Fernanda, no way... I just went down to the parking lot and saw that my car has a huge scratch on the back bumper.",
        slang: {
          term: "no manches",
          literalMeaning: "don't stain",
          actualMeaning: "No way! / You've got to be kidding me!",
          example: "¡No manches, qué rápido llegaste!",
        },
      },
      {
        id: 2,
        speaker: "Fernanda",
        gender: "female",
        spanish:
          "Ay, Diego, pues te iba a decir ahorita que saliéramos. Ayer que me lo prestaste para ir por las cosas de mi chamba, una columna estaba súper pegada.",
        english:
          "Oh, Diego, well I was going to tell you right now when we went out. Yesterday when you lent it to me to pick up my work stuff, a pillar was super close.",
        slang: {
          term: "chamba",
          literalMeaning: "job / gig",
          actualMeaning: "work / job (everyday Mexican slang)",
          example: "Conseguí una nueva chamba cerca de mi casa.",
        },
      },
      {
        id: 3,
        speaker: "Diego",
        gender: "male",
        spanish:
          "¿Y pensabas hacerte pato o qué? O sea, sabes que lo acabo de sacar del taller hace dos semanas.",
        english:
          "And were you planning to play dumb or what? I mean, you know I just got it out of the repair shop two weeks ago.",
        slang: {
          term: "hacerte pato",
          literalMeaning: "to make yourself a duck",
          actualMeaning: "to play dumb / dodge responsibility",
          example: "No te hagas pato, hoy te toca lavar los platos.",
        },
      },
      {
        id: 4,
        speaker: "Fernanda",
        gender: "female",
        spanish:
          "¡Claro que no! Bueno, ya hablé con el taller de mi tío Memo en Zapopan y dice que mañana lo pule y lo pinta por mil quinientos pesos.",
        english:
          "Of course not! Well, I already spoke with my uncle Memo's body shop in Zapopan and he says tomorrow he'll buff and paint it for fifteen hundred pesos.",
      },
      {
        id: 5,
        speaker: "Diego",
        gender: "male",
        spanish:
          "Bueno, menos mal... Pero esa lana la pones tú, ¿eh? Y me llevas a mi oficina en la mañana mientras lo arreglan.",
        english:
          "Well, thank goodness... But you're paying that cash, alright? And you're driving me to my office in the morning while they fix it.",
      },
      {
        id: 6,
        speaker: "Fernanda",
        gender: "female",
        spanish:
          "Trato hecho. Yo pago todo el taller y encima te compro tu torta ahogada para que se te baje el coraje.",
        english:
          "Deal. I'll pay for the whole shop and on top of that I'll buy you your drowned pork sandwich so you stop being mad.",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question:
          "Why is Diego upset with Fernanda at the start of the conversation?",
        options: [
          "He found a big scratch on the back bumper of his car after lending it to her",
          "She returned his car with an empty gas tank",
          "She forgot to pick him up from the repair shop",
          "She parked his car in a tow-away zone",
        ],
        correctIndex: 0,
        explanation:
          "Diego saw a huge scratch ('un raspón enorme') on the rear bumper ('la defensa trasera') after lending his car to Fernanda yesterday.",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "How did the car get scratched, and what plan did Fernanda already arrange?",
        options: [
          "She scraped a tight pillar; her Uncle Memo's shop in Zapopan will buff and paint it tomorrow for 1,500 pesos",
          "Another driver hit her in traffic; her insurance will pay 3,000 pesos",
          "A shopping cart hit the door; she bought touch-up paint for 500 pesos",
          "She backed into a tree; Diego's mechanic will fix it next week",
        ],
        correctIndex: 0,
        explanation:
          "Fernanda scraped a tight pillar and arranged for her Uncle Memo's body shop in Zapopan to buff and paint it tomorrow for 1,500 pesos.",
      },
      {
        id: "q3",
        type: "comprehension",
        question:
          "In addition to Fernanda paying for the repair, what else does Diego demand—and what food does Fernanda offer him?",
        options: [
          "She must drive him to his office in the morning, and she offers to buy him a 'torta ahogada'",
          "She must wash his car, and she offers him street tacos",
          "She must lend him her bicycle, and she offers to buy him coffee",
          "She must pay his parking fee, and she offers to cook dinner",
        ],
        correctIndex: 0,
        explanation:
          "Diego insists she pay the cash and drive him to his office in the morning, and she offers him a 'torta ahogada'.",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: What do the Mexican idioms 'no manches', 'la chamba', and 'hacerse pato' mean?",
        options: [
          "'No manches' = No way!; 'la chamba' = work/job; 'hacerse pato' = play dumb",
          "'No manches' = Don't paint; 'la chamba' = party; 'hacerse pato' = drive fast",
          "'No manches' = Hurry up; 'la chamba' = garage; 'hacerse pato' = apologize",
          "'No manches' = Calm down; 'la chamba' = school; 'hacerse pato' = get angry",
        ],
        correctIndex: 0,
        explanation:
          "In Mexican Spanish, 'no manches' is 'No way!', 'la chamba' is work/job, and 'hacerse pato' means to play dumb!",
      },
    ],
  },

  // 10. Spain 🇪🇸 — Almost missing the high-speed AVE train in Atocha
  {
    topic: "Sprinting through Madrid Atocha station to catch the high-speed AVE train",
    title: "Perdiendo el AVE en Atocha",
    region: "Spain",
    regionFlag: "🇪🇸",
    ambientType: "transit",
    dialogue: [
      {
        id: 1,
        speaker: "Álvaro",
        gender: "male",
        spanish:
          "¡Corre, Elena, tía, que el control de equipaje del AVE a Valencia cierra en tres minutos!",
        english:
          "Run, Elena, girl, the baggage check for the high-speed train to Valencia closes in three minutes!",
      },
      {
        id: 2,
        speaker: "Elena",
        gender: "female",
        spanish:
          "¡Madre mía, qué agobio! Pues es que el autobús venía a tope por el atasco en el paseo de la Castellana.",
        english:
          "Oh my goodness, how stressful! Well the bus was packed to the gills because of the traffic jam on La Castellana.",
        slang: {
          term: "a tope",
          literalMeaning: "to the bumper / limit",
          actualMeaning: "packed full / to the max (very common in Spain)",
          example: "El vagón del metro iba a tope a las ocho de la mañana.",
        },
      },
      {
        id: 3,
        speaker: "Álvaro",
        gender: "male",
        spanish:
          "Bueno, pasa tú primero la maleta por el escáner mientras yo enseño los billetes en el móvil.",
        english:
          "Well, put your suitcase through the scanner first while I show the tickets on my phone.",
      },
      {
        id: 4,
        speaker: "Elena",
        gender: "female",
        spanish:
          "Vale, ya pasamos. O sea, ¿en qué vía está estacionado nuestro tren?",
        english:
          "Okay, we're through. I mean, which platform is our train parked on?",
      },
      {
        id: 5,
        speaker: "Álvaro",
        gender: "male",
        spanish:
          "Vía cuatro, hemos entrado por los pelos... Mira, somos el coche número tres, asientos de ventanilla.",
        english:
          "Platform four, we made it by the skin of our teeth... Look, we're car number three, window seats.",
        slang: {
          term: "por los pelos",
          literalMeaning: "by the hairs",
          actualMeaning: "by the skin of one's teeth / just barely in time",
          example: "Llegamos al embarque del avión por los pelos.",
        },
      },
      {
        id: 6,
        speaker: "Elena",
        gender: "female",
        spanish:
          "¡Uf, qué alivio! En cuanto arranque el tren me pido un café en la cafetería y me echo una siesta.",
        english:
          "Phew, what a relief! As soon as the train pulls out I'm ordering a coffee in the café car and taking a nap.",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question:
          "Why were Álvaro and Elena almost late for their high-speed train ('el AVE')?",
        options: [
          "Their bus was packed and stuck in a traffic jam on La Castellana",
          "Elena packed the wrong suitcase",
          "They went to the wrong train station in Madrid",
          "Their alarm clock didn't ring",
        ],
        correctIndex: 0,
        explanation:
          "Elena says: 'el autobús venía a tope por el atasco en el paseo de la Castellana.'",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "Which platform and train car do they board, and what city are they traveling to?",
        options: [
          "Platform 4, Car 3, window seats, heading to Valencia",
          "Platform 1, Car 1, aisle seats, heading to Barcelona",
          "Platform 7, Car 5, dining car, heading to Seville",
          "Platform 2, Car 2, window seats, heading to Toledo",
        ],
        correctIndex: 0,
        explanation:
          "Álvaro says the train to Valencia is on 'Vía cuatro... coche número tres, asientos de ventanilla.'",
      },
      {
        id: "q3",
        type: "comprehension",
        question:
          "How much time was left before baggage security closed when they arrived?",
        options: ["3 minutes", "15 minutes", "30 minutes", "1 hour"],
        correctIndex: 0,
        explanation:
          "Álvaro shouts: 'el control de equipaje del AVE a Valencia cierra en tres minutos!'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: In Spain, what do 'venir a tope' and 'por los pelos' mean?",
        options: [
          "'A tope' = packed full / to the max; 'por los pelos' = by the skin of our teeth / just barely",
          "'A tope' = very slowly; 'por los pelos' = without luggage",
          "'A tope' = empty; 'por los pelos' = with messy hair",
          "'A tope' = broken down; 'por los pelos' = way too early",
        ],
        correctIndex: 0,
        explanation:
          "'A tope' means packed full / at maximum capacity, and 'por los pelos' means just barely / by a hair!",
      },
    ],
  },

  // 11. Argentina 🇦🇷 — Afternoon Mate and Pastries on the Waterfront
  {
    topic: "Sharing mate and bakery pastries along the Buenos Aires waterfront",
    title: "Mate y facturas en la costanera",
    region: "Argentina",
    regionFlag: "🇦🇷",
    ambientType: "street",
    dialogue: [
      {
        id: 1,
        speaker: "Micaela",
        gender: "female",
        spanish:
          "Che, Nico, mirá qué lindo solcito hay hoy en la costanera. ¿Trajiste el termo con agua caliente?",
        english:
          "Hey, Nico, look what lovely sunshine there is on the waterfront today. Did you bring the thermos with hot water?",
      },
      {
        id: 2,
        speaker: "Nico",
        gender: "male",
        spanish:
          "¡Olvidate! Está a ochenta grados, ideal para cebar unos buenos mates amargos.",
        english:
          "You bet! It's at eighty degrees, ideal for brewing some good unsweetened mates.",
        slang: {
          term: "¡Olvidate!",
          literalMeaning: "forget about it!",
          actualMeaning:
            "You bet! / Of course! / Definitely! (enthusiastic Argentine affirmation)",
          example: "¿Venís al cumple de Sofi mañana? ¡Olvidate!",
        },
      },
      {
        id: 3,
        speaker: "Micaela",
        gender: "female",
        spanish:
          "Bueno, yo pasé recién por la panadería del barrio y compré una docena de facturas con dulce de leche.",
        english:
          "Well, I just stopped by the neighborhood bakery and bought a dozen pastries with dulce de leche.",
        slang: {
          term: "facturas",
          literalMeaning: "invoices / bills",
          actualMeaning:
            "sweet bakery pastries (in Argentina, 'facturas' at a bakery are pastries!)",
          example: "Traje una docena de facturas para tomar el mate en la tarde.",
        },
      },
      {
        id: 4,
        speaker: "Nico",
        gender: "male",
        spanish:
          "¡Sos una genia total! O sea, hacía toda la semana que tenía ganas de comer vigilantes y medialunas.",
        english:
          "You're an absolute legend! I mean, all week long I've been craving pastries and croissants.",
      },
      {
        id: 5,
        speaker: "Micaela",
        gender: "female",
        spanish:
          "Sentémonos en ese banco de madera frente al río que corre una brisa divina.",
        english:
          "Let's sit on that wooden bench facing the river where there's a lovely breeze.",
      },
      {
        id: 6,
        speaker: "Nico",
        gender: "male",
        spanish:
          "Dale, pero ojo con el primer mate que siempre sale un poco fuerte y caliente, ¿viste?",
        english:
          "Sure, just watch out for the first mate since it always comes out a bit strong and hot, you know?",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question: "Where are Micaela and Nico spending the afternoon?",
        options: [
          "On a wooden bench facing the river along the waterfront ('la costanera')",
          "Inside a shopping mall downtown",
          "At Nico's office",
          "On a long-distance bus",
        ],
        correctIndex: 0,
        explanation:
          "They are at 'la costanera' (the waterfront) and sit on 'ese banco de madera frente al río.'",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "What did Micaela buy at the neighborhood bakery to share with the mate?",
        options: [
          "A dozen pastries ('facturas') with dulce de leche",
          "Two ham and cheese sandwiches",
          "A bag of apples and oranges",
          "A box of pizza",
        ],
        correctIndex: 0,
        explanation:
          "Micaela says: 'compré una docena de facturas con dulce de leche.'",
      },
      {
        id: "q3",
        type: "comprehension",
        question: "What does Nico warn Micaela about at the end?",
        options: [
          "The first mate always comes out a bit strong and hot",
          "The water in the thermos is already cold",
          "The seagulls might steal their pastries",
          "The park closes at five o'clock",
        ],
        correctIndex: 0,
        explanation:
          "Nico warns: 'ojo con el primer mate que siempre sale un poco fuerte y caliente.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: When Nico says '¡Olvidate!' and Micaela mentions 'una docena de facturas', what do they mean in Argentina?",
        options: [
          "'¡Olvidate!' = You bet / Of course!; 'facturas' = sweet bakery pastries",
          "'¡Olvidate!' = I forgot it!; 'facturas' = electricity bills",
          "'¡Olvidate!' = Never mind; 'facturas' = bus tickets",
          "'¡Olvidate!' = Wait for me; 'facturas' = tea bags",
        ],
        correctIndex: 0,
        explanation:
          "In Argentina, '¡Olvidate!' is an enthusiastic 'You bet / Of course!' (not 'I forgot!'), and 'facturas' are bakery pastries!",
      },
    ],
  },

  // 12. Mexico 🇲🇽 — Roommates arguing over a doubled electricity bill in Colonia Roma
  {
    topic: "Roommates negotiating a doubled electricity bill in Mexico City",
    title: "El recibo de la luz en la colonia Roma",
    region: "Mexico",
    regionFlag: "🇲🇽",
    ambientType: "cafe",
    dialogue: [
      {
        id: 1,
        speaker: "Mateo",
        gender: "male",
        spanish:
          "Oye, Lucía, no te pases... Acabo de ver el recibo de la luz de este bimestre y casi me da un infarto.",
        english:
          "Hey, Lucía, come on now... I just saw this two-month electricity bill and I almost had a heart attack.",
        slang: {
          term: "no te pases",
          literalMeaning: "don't pass yourself",
          actualMeaning: "come on / don't go too far / you're kidding me",
          example: "¡No te pases, te comiste todo el pastel!",
        },
      },
      {
        id: 2,
        speaker: "Lucía",
        gender: "female",
        spanish:
          "Aguanta, Mateo, pues no te esponjes. Es que la semana pasada hizo un frío horrible y dejé el calentador eléctrico prendido.",
        english:
          "Hold on, Mateo, well don't get worked up. Last week it was freezing cold and I left the electric space heater on.",
        slang: {
          term: "no te esponjes",
          literalMeaning: "don't sponge yourself up",
          actualMeaning: "don't get puffed up / don't get worked up or angry",
          example: "Tranquilo, no te esponjes, fue solo una broma.",
        },
      },
      {
        id: 3,
        speaker: "Mateo",
        gender: "male",
        spanish:
          "¡Pero si subió al doble! O sea, tú sabes que ahorita ando bien bruja porque no me han pagado el proyecto de diseño.",
        english:
          "It doubled! I mean, you know I'm super broke right now because they haven't paid me for the design project yet.",
        slang: {
          term: "ando bien bruja",
          literalMeaning: "I'm walking around very witch",
          actualMeaning: "I'm completely broke / out of money (Mexican idiom)",
          example: "Fin de quincena y ya ando bien bruja.",
        },
      },
      {
        id: 4,
        speaker: "Lucía",
        gender: "female",
        spanish:
          "Bueno, tranquilo, mi primo Javi me debía una lana de los boletos del concierto y me acaba de transferir.",
        english:
          "Well, relax, my cousin Javi owed me cash for the concert tickets and he just sent me a transfer.",
      },
      {
        id: 5,
        speaker: "Mateo",
        gender: "male",
        spanish:
          "Uf, qué alivio... Porque el casero ya me estaba mandando mensajes por WhatsApp desde las ocho de la mañana.",
        english:
          "Phew, what a relief... Because the landlord was already sending me messages on WhatsApp since eight in the morning.",
      },
      {
        id: 6,
        speaker: "Lucía",
        gender: "female",
        spanish:
          "Yo pongo el setenta por ciento ahorita en la app y te invito unos esquites si me echas la mano con las cajas de la bodega.",
        english:
          "I'll pay seventy percent right now in the app and treat you to some corn cups if you give me a hand with the storage room boxes.",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question:
          "What caused the two-month electricity bill in Mateo and Lucía's apartment to double?",
        options: [
          "Lucía left the electric space heater on during freezing nights last week",
          "Mateo left his computer running day and night",
          "The landlord billed them for the whole building",
          "Their refrigerator broke",
        ],
        correctIndex: 0,
        explanation:
          "Lucía admits she left the electric space heater on ('dejé el calentador eléctrico prendido').",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "Why is Mateo broke right now, and how much of the bill does Lucía agree to cover?",
        options: [
          "He hasn't been paid for his design project yet; Lucía covers 70% of the bill",
          "He bought concert tickets; Lucía covers 50% of the bill",
          "He lost his wallet; Lucía covers 100% of the bill",
          "He paid the water bill; Lucía covers 30% of the bill",
        ],
        correctIndex: 0,
        explanation:
          "Mateo hasn't been paid for his design project yet, and Lucía covers 70% after her cousin Javi paid her back.",
      },
      {
        id: "q3",
        type: "comprehension",
        question:
          "What favor does Lucía ask of Mateo in exchange for treating him to 'esquites'?",
        options: [
          "Help her with the boxes in the storage room ('la bodega')",
          "Walk her dog in the park",
          "Call the landlord back",
          "Wash the dishes after dinner",
        ],
        correctIndex: 0,
        explanation:
          "Lucía says: 'te invito unos esquites si me echas la mano con las cajas de la bodega.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: What do 'no te pases', 'no te esponjes', and 'andar bien bruja' mean in Mexican Spanish?",
        options: [
          "'No te pases' = come on/don't go too far; 'no te esponjes' = don't get worked up; 'andar bruja' = to be broke",
          "'No te pases' = don't walk by; 'no te esponjes' = don't get wet; 'andar bruja' = to stay up late",
          "'No te pases' = hurry up; 'no te esponjes' = don't eat too much; 'andar bruja' = to be angry",
          "'No te pases' = excuse me; 'no te esponjes' = don't fall asleep; 'andar bruja' = to be lucky",
        ],
        correctIndex: 0,
        explanation:
          "'No te pases' means 'come on!', 'no te esponjes' means 'don't get puffed up/angry', and 'andar bruja' means to be broke!",
      },
    ],
  },

  // 13. Colombia 🇨🇴 — Stuck in Chapinero traffic on the way to a party
  {
    topic: "Stuck in Bogotá traffic on Seventh Avenue while friends wait at a bar in Chapinero",
    title: "Rumba y trancones en Chapinero",
    region: "Colombia",
    regionFlag: "🇨🇴",
    ambientType: "transit",
    dialogue: [
      {
        id: 1,
        speaker: "Valentina",
        gender: "female",
        spanish:
          "¡Aló, Pipe! Pues ¿dónde vienen ustedes? Llevamos media hora haciendo fila en la entrada del bar.",
        english:
          "Hello, Pipe! Well where are you guys? We've been waiting in line at the bar entrance for half an hour.",
      },
      {
        id: 2,
        speaker: "Pipe",
        gender: "male",
        spanish:
          "¡Ay, qué pena con vos, Vale! Mirá que nos cogió un trancón horrible por toda la carrera Séptima.",
        english:
          "Oh, I'm so sorry, Vale! Look, we got caught in a terrible traffic jam all along Seventh Avenue.",
        slang: {
          term: "un trancón",
          literalMeaning: "a big bolt / blockage",
          actualMeaning: "a massive traffic jam / gridlock (Colombian Spanish)",
          example: "Salí temprano pero había un trancón monumental en la autopista.",
        },
      },
      {
        id: 3,
        speaker: "Valentina",
        gender: "female",
        spanish:
          "¡No me digás eso! Bueno, apúrense que antes de las diez no cobran cover y la rumba está buenísima.",
        english:
          "Don't tell me that! Well, hurry up because before ten o'clock there's no cover charge and the party is awesome.",
        slang: {
          term: "la rumba",
          literalMeaning: "the rumba dance",
          actualMeaning: "the party / night out dancing (standard in Colombia)",
          example: "Este viernes se armó la rumba en Chapinero.",
        },
      },
      {
        id: 4,
        speaker: "Pipe",
        gender: "male",
        spanish:
          "O sea, el taxista dice que hay un semáforo dañado en la calle sesenta y tres, entonces no avanza nada.",
        english:
          "I mean, the taxi driver says there's a broken traffic light at 63rd Street, so nothing is moving.",
      },
      {
        id: 5,
        speaker: "Valentina",
        gender: "female",
        spanish:
          "Pues bájense ahí mismo en la esquina y caminan tres cuadras que llegan mucho más rápido.",
        english:
          "Well hop out right there on the corner and walk three blocks—you'll get here way faster.",
      },
      {
        id: 6,
        speaker: "Pipe",
        gender: "male",
        spanish:
          "Listo, ya le pagué la carrera al señor y vamos corriendo. ¡Guardanos puesto en la mesa del balcón!",
        english:
          "Done, I just paid the driver for the ride and we're running over. Save us a spot at the balcony table!",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question: "Why is Pipe running late to meet Valentina at the bar?",
        options: [
          "His taxi got stuck in a terrible traffic jam ('un trancón') on Seventh Avenue due to a broken traffic light",
          "He forgot his ID card at home",
          "He went to the wrong neighborhood",
          "His phone battery died",
        ],
        correctIndex: 0,
        explanation:
          "Pipe says they got caught in 'un trancón horrible por toda la carrera Séptima' because of a broken traffic light at 63rd Street.",
      },
      {
        id: "q2",
        type: "comprehension",
        question: "Why is it important that Pipe arrive before 10:00 PM?",
        options: [
          "There is no cover charge before 10:00 PM",
          "The kitchen closes at 10:00 PM",
          "Valentina has to leave at 10:00 PM",
          "Drinks are half-price until 10:00 PM",
        ],
        correctIndex: 0,
        explanation:
          "Valentina says: 'antes de las diez no cobran cover y la rumba está buenísima.'",
      },
      {
        id: "q3",
        type: "comprehension",
        question: "What does Valentina suggest Pipe and his friends do to get there faster?",
        options: [
          "Hop out of the taxi on the corner and walk three blocks",
          "Rent electric scooters",
          "Take the subway",
          "Wait inside the taxi until traffic clears",
        ],
        correctIndex: 0,
        explanation:
          "Valentina says: 'bájense ahí mismo en la esquina y caminan tres cuadras que llegan mucho más rápido.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: In Colombia, what do '¡Qué pena con vos!', 'un trancón', and 'la rumba' mean?",
        options: [
          "'¡Qué pena!' = I'm so sorry; 'un trancón' = a traffic jam; 'la rumba' = the party / night out",
          "'¡Qué pena!' = How sad; 'un trancón' = a big drink; 'la rumba' = the band",
          "'¡Qué pena!' = How embarrassing; 'un trancón' = a rainstorm; 'la rumba' = the street",
          "'¡Qué pena!' = What a pity; 'un trancón' = a police checkpoint; 'la rumba' = the line",
        ],
        correctIndex: 0,
        explanation:
          "In Colombia, '¡Qué pena con vos!' is the polite way to say 'I'm so sorry', 'un trancón' is a traffic jam, and 'la rumba' is a party/night out!",
      },
    ],
  },

  // 14. Mexico 🇲🇽 — Ticket scanner panic outside Foro Sol concert
  {
    topic: "Panic at the Foro Sol stadium gate when a concert QR code flashes red",
    title: "El boleto falso afuera del Foro Sol",
    region: "Mexico",
    regionFlag: "🇲🇽",
    ambientType: "street",
    dialogue: [
      {
        id: 1,
        speaker: "Paco",
        gender: "male",
        spanish:
          "¡No manches, Mariana! El lector de códigos aquí en la puerta del Foro Sol acaba de prender en rojo con mi boleto.",
        english:
          "No way, Mariana! The barcode scanner right here at the Foro Sol gate just flashed red on my ticket.",
      },
      {
        id: 2,
        speaker: "Mariana",
        gender: "female",
        spanish:
          "¡No me digas eso! Pues te advertí que ese revendedor de internet se veía súper chafa, Paco.",
        english:
          "Don't tell me that! Well I warned you that online reseller looked super sketchy, Paco.",
        slang: {
          term: "súper chafa",
          literalMeaning: "super shoddy / low-grade",
          actualMeaning: "sketchy, fake, or low-quality (Mexican slang)",
          example: "Compré unos audífonos baratos pero salieron súper chafas.",
        },
      },
      {
        id: 3,
        speaker: "Paco",
        gender: "male",
        spanish:
          "Espérate, bueno, ya me puse nervioso porque me costó carísimo y me quedé sin un quinto para toda la quincena.",
        english:
          "Wait a second, well, now I'm nervous because it cost me a fortune and left me without a cent for the whole two-week pay period.",
        slang: {
          term: "sin un quinto",
          literalMeaning: "without a five-cent coin",
          actualMeaning: "penniless / without a single cent left",
          example: "Después de pagar la renta me quedé sin un quinto.",
        },
      },
      {
        id: 4,
        speaker: "Mariana",
        gender: "female",
        spanish:
          "A ver, enséñame la pantalla de tu celular... ¡Ay, Paco, o sea, estás bien dormido!",
        english:
          "Hold on, show me your phone screen... Oh, Paco, I mean, you're half asleep!",
      },
      {
        id: 5,
        speaker: "Paco",
        gender: "male",
        spanish:
          "¿Por qué? ¡Ah, qué oso hice con el guardia! Estaba enseñando el código QR del estacionamiento en vez del concierto.",
        english:
          "Why? Oh, how embarrassing in front of the guard! I was showing the QR code for the parking lot instead of the concert.",
        slang: {
          term: "qué oso",
          literalMeaning: "what a bear",
          actualMeaning: "How embarrassing! / What a blunder!",
          example: "¡Qué oso cuando me tropecé frente a toda la oficina!",
        },
      },
      {
        id: 6,
        speaker: "Mariana",
        gender: "female",
        spanish:
          "Mira, ya se puso en verde. ¡Córrele que la banda está por tocar la primera rola y nos toca hasta la pista!",
        english:
          "Look, it just turned green. Run now, the band is about to play their first song and our spot is all the way down on the floor!",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question:
          "Why do Paco and Mariana panic when they arrive at the entrance to the Foro Sol concert venue?",
        options: [
          "The ticket scanner flashes red on Paco's ticket, making them fear he bought a fake ticket",
          "Paco forgot his cell phone in the parking lot",
          "The concert was canceled due to rain",
          "Mariana bought tickets for the wrong date",
        ],
        correctIndex: 0,
        explanation:
          "The scanner flashes red ('acaba de prender en rojo'), making them fear the online reseller sold Paco a fake ticket.",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "What silly mistake does Mariana discover when she looks at Paco's phone screen?",
        options: [
          "He was showing the QR code for the parking lot instead of the concert ticket",
          "His screen brightness was turned all the way down",
          "He was showing an old movie ticket",
          "His phone battery had died",
        ],
        correctIndex: 0,
        explanation:
          "Paco realizes: 'Estaba enseñando el código QR del estacionamiento en vez del concierto.'",
      },
      {
        id: "q3",
        type: "comprehension",
        question: "Why do they have to run once the real ticket scans green?",
        options: [
          "The band is about to play their first song ('la primera rola') and their spot is down on the floor ('la pista')",
          "The stadium gates are closing in one minute",
          "It is starting to rain heavily",
          "They need to meet their friends at the merchandise booth",
        ],
        correctIndex: 0,
        explanation:
          "Mariana says: 'la banda está por tocar la primera rola y nos toca hasta la pista.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: What do 'súper chafa', 'sin un quinto', and '¡qué oso!' mean in Mexican slang?",
        options: [
          "'Súper chafa' = sketchy/low-quality; 'sin un quinto' = penniless; 'qué oso' = how embarrassing",
          "'Súper chafa' = polite; 'sin un quinto' = five minutes late; 'qué oso' = how lucky",
          "'Súper chafa' = expensive; 'sin un quinto' = without a ticket; 'qué oso' = how scary",
          "'Súper chafa' = famous; 'sin un quinto' = alone; 'qué oso' = how funny",
        ],
        correctIndex: 0,
        explanation:
          "In Mexico City slang, 'chafa' is sketchy/shoddy, 'sin un quinto' is penniless, and '¡qué oso!' means 'how embarrassing!'",
      },
    ],
  },

  // 15. Spain 🇪🇸 — Flea market bargaining at El Rastro in Madrid
  {
    topic: "Bargaining for a vintage leather jacket at El Rastro flea market in Madrid",
    title: "Regateando una cazadora en El Rastro",
    region: "Spain",
    regionFlag: "🇪🇸",
    ambientType: "market",
    dialogue: [
      {
        id: 1,
        speaker: "Marta",
        gender: "female",
        spanish:
          "¡Oye, Dani, mira qué cazadora de cuero tan chula tienen colgada en este puesto del Rastro!",
        english:
          "Hey, Dani, look what a cool leather jacket they have hanging at this stall in El Rastro!",
        slang: {
          term: "tan chula",
          literalMeaning: "so cocky / cute",
          actualMeaning: "so cool / stylish / pretty (everyday Spain slang)",
          example: "¡Qué zapatillas tan chulas te has comprado!",
        },
      },
      {
        id: 2,
        speaker: "Dani",
        gender: "male",
        spanish:
          "Pues te queda genial de talla, tía. Pregúntale al chico cuánto pide por ella.",
        english:
          "Well it fits you great, girl. Ask the guy how much he's asking for it.",
      },
      {
        id: 3,
        speaker: "Marta",
        gender: "female",
        spanish:
          "Bueno, dice que son sesenta pavos, pero tiene un pequeño roce aquí en el bolsillo.",
        english:
          "Well, he says it's sixty bucks, but it has a small scuff right here on the pocket.",
        slang: {
          term: "sesenta pavos",
          literalMeaning: "sixty turkeys",
          actualMeaning: "sixty euros / bucks (colloquial Spain slang for euros)",
          example: "La entrada del festival me costó cincuenta pavos.",
        },
      },
      {
        id: 4,
        speaker: "Dani",
        gender: "male",
        spanish:
          "O sea, sesenta es un poco caro para ser de segunda mano. Dile que le das cuarenta en efectivo ahora mismo.",
        english:
          "I mean, sixty is a bit pricey for secondhand. Tell him you'll give him forty in cash right now.",
      },
      {
        id: 5,
        speaker: "Marta",
        gender: "female",
        spanish:
          "Vale, hemos cerrado el trato en cuarenta y cinco euros y me regala este pañuelo de seda.",
        english:
          "Okay, we closed the deal at forty-five euros and he's throwing in this silk scarf for free.",
      },
      {
        id: 6,
        speaker: "Dani",
        gender: "male",
        spanish:
          "¡Qué triunfada, tía! Venga, vamos a tomar un vermut con aceitunas en la plaza de Cascorro.",
        english:
          "What a score, girl! Come on, let's go grab a vermouth with olives at Cascorro square.",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question: "What item is Marta buying at El Rastro flea market in Madrid?",
        options: [
          "A secondhand leather jacket ('una cazadora de cuero')",
          "A pair of vintage boots",
          "An antique wooden chair",
          "An acoustic guitar",
        ],
        correctIndex: 0,
        explanation:
          "Marta spots 'qué cazadora de cuero tan chula' hanging at the market stall.",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "What was the seller's initial price, and what final price do they agree on?",
        options: [
          "Initially 60 euros; they settle on 45 euros plus a free silk scarf",
          "Initially 100 euros; they settle on 80 euros",
          "Initially 40 euros; Marta pays the full 40 euros",
          "Initially 50 euros; they settle on 25 euros",
        ],
        correctIndex: 0,
        explanation:
          "The seller initially asks for 'sesenta pavos' (60 euros), and Marta bargains down to 45 euros plus a silk scarf.",
      },
      {
        id: "q3",
        type: "comprehension",
        question: "Where do Dani and Marta head after buying the jacket?",
        options: [
          "To Cascorro square to have vermouth and olives",
          "To the subway station to go home",
          "To a shoe store on Gran Vía",
          "To the Prado Museum",
        ],
        correctIndex: 0,
        explanation:
          "Dani says: 'vamos a tomar un vermut con aceitunas en la plaza de Cascorro.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: In Spain, what do 'tan chula' and 'sesenta pavos' mean?",
        options: [
          "'Tan chula' = so cool/stylish; 'sesenta pavos' = 60 euros (bucks)",
          "'Tan chula' = so heavy; 'sesenta pavos' = 60 turkeys",
          "'Tan chula' = so warm; 'sesenta pavos' = 60 minutes",
          "'Tan chula' = so old; 'sesenta pavos' = 60 cents",
        ],
        correctIndex: 0,
        explanation:
          "In Spain, 'chulo/chula' means cool or stylish, and 'pavos' (literally turkeys) is slang for euros/bucks!",
      },
    ],
  },

  // 16. Argentina 🇦🇷 — Splitting pizzas at a historic pizzeria on Corrientes Ave
  {
    topic: "Ordering fugazzeta pizza after a theater show on Avenida Corrientes in Buenos Aires",
    title: "Pizza de molde en la avenida Corrientes",
    region: "Argentina",
    regionFlag: "🇦🇷",
    ambientType: "cafe",
    dialogue: [
      {
        id: 1,
        speaker: "Lucas",
        gender: "male",
        spanish:
          "Che, Agus, ¡qué buena estuvo la obra de teatro! Pero ahora tengo un hambre bárbaro.",
        english:
          "Hey, Agus, that play was so good! But now I'm super hungry.",
      },
      {
        id: 2,
        speaker: "Agustina",
        gender: "female",
        spanish:
          "Mal, yo también estoy muerta de hambre. Mirá, entremos a esta pizzería clásica acá en Corrientes.",
        english:
          "Totally, I'm starving too. Look, let's go into this classic pizzeria right here on Corrientes Avenue.",
        slang: {
          term: "Mal",
          literalMeaning: "badly / wrong",
          actualMeaning:
            "Totally! / Tell me about it! / I agree 100%! (Argentine slang affirmation)",
          example: "—Hace muchísimo calor hoy. —¡Mal, no se aguanta!",
        },
      },
      {
        id: 3,
        speaker: "Lucas",
        gender: "male",
        spanish:
          "Bueno, el salón del fondo está lleno, pero podemos comer de parado en la barra como hace todo el mundo.",
        english:
          "Well, the back dining room is full, but we can eat standing up at the counter like everyone else does.",
      },
      {
        id: 4,
        speaker: "Agustina",
        gender: "female",
        spanish:
          "¡Re va! Pidamos dos porciones de muzzarella bien gratinada y dos de fugazzeta rellena con fainá.",
        english:
          "I'm totally down! Let's order two slices of melted mozzarella pizza and two of stuffed onion fugazzeta with chickpea flatbread.",
        slang: {
          term: "Re va",
          literalMeaning: "it super goes",
          actualMeaning: "That totally works! / I'm totally down for that!",
          example: "¿Pedimos helado de postre? ¡Re va!",
        },
      },
      {
        id: 5,
        speaker: "Lucas",
        gender: "male",
        spanish:
          "O sea, con eso quedamos pipón. Yo pido en la caja y traigo dos aguas con gas bien frías.",
        english:
          "I mean, with that we'll be stuffed. I'll order at the register and bring two ice-cold sparkling waters.",
      },
      {
        id: 6,
        speaker: "Agustina",
        gender: "female",
        spanish:
          "Dale, genial, yo voy guardando este rincón de la barra antes de que salga la gente del otro teatro.",
        english:
          "Awesome, I'll hold this corner of the counter before the crowd from the other theater gets out.",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question:
          "Where did Lucas and Agustina just come from before stopping at the pizzeria?",
        options: [
          "A theater play ('la obra de teatro') on Corrientes Avenue",
          "A soccer game at the stadium",
          "A late shift at the hospital",
          "An airport terminal",
        ],
        correctIndex: 0,
        explanation:
          "Lucas says: '¡qué buena estuvo la obra de teatro! Pero ahora tengo un hambre bárbaro.'",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "Why do they decide to eat standing up at the counter ('de parado en la barra')?",
        options: [
          "The back dining room is full, and eating at the counter is a classic tradition there",
          "Counter slices are half price",
          "The pizzeria is closing in five minutes",
          "They are waiting for a takeaway box",
        ],
        correctIndex: 0,
        explanation:
          "Lucas notes: 'el salón del fondo está lleno, pero podemos comer de parado en la barra como hace todo el mundo.'",
      },
      {
        id: "q3",
        type: "comprehension",
        question: "What specific food order does Agustina suggest?",
        options: [
          "Two slices of mozzarella and two slices of stuffed onion fugazzeta with fainá",
          "One large pepperoni pizza and a salad",
          "Four beef empanadas and red wine",
          "Two ham sandwiches and coffee",
        ],
        correctIndex: 0,
        explanation:
          "Agustina says: 'Pidamos dos porciones de muzzarella bien gratinada y dos de fugazzeta rellena con fainá.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: When Agustina replies '¡Mal!' and '¡Re va!', what do those Argentine expressions mean in context?",
        options: [
          "'¡Mal!' = Totally / I completely agree!; '¡Re va!' = I'm totally down / That works great!",
          "'¡Mal!' = I feel sick; '¡Re va!' = Leave right now!",
          "'¡Mal!' = That's wrong; '¡Re va!' = It's too expensive",
          "'¡Mal!' = Bad service; '¡Re va!' = The bus is coming",
        ],
        correctIndex: 0,
        explanation:
          "In Argentine slang, replying '¡Mal!' to a friend's statement means 'Totally / Tell me about it!', and '¡Re va!' means 'That totally works / I'm in!'",
      },
    ],
  },

  // 17. Colombia 🇨🇴 — Cable car ride on the Medellín Metrocable
  {
    topic: "Riding the Medellín Metrocable up to Parque Arví on a sunny morning",
    title: "Subiendo en el Metrocable a Parque Arví",
    region: "Colombia",
    regionFlag: "🇨🇴",
    ambientType: "transit",
    dialogue: [
      {
        id: 1,
        speaker: "Daniela",
        gender: "female",
        spanish:
          "¡Uy, Mateo, mirá esa vista de todo el valle desde la cabina del Metrocable! Qué belleza, ¿cierto?",
        english:
          "Whoa, Mateo, look at that view of the whole valley from the Metrocable gondola! What a beauty, right?",
      },
      {
        id: 2,
        speaker: "Mateo",
        gender: "male",
        spanish:
          "¡Sí, está bacanísimo! Pues menos mal que madrugamos hoy porque la fila en la estación Acevedo ya estaba larga.",
        english:
          "Yes, it's super cool! Well thank goodness we got up early today because the line at Acevedo station was already long.",
        slang: {
          term: "bacanísimo",
          literalMeaning: "super bacano",
          actualMeaning: "super cool / awesome / fantastic (Colombian slang)",
          example: "El paseo por el eje cafetero estuvo bacanísimo.",
        },
      },
      {
        id: 3,
        speaker: "Daniela",
        gender: "female",
        spanish:
          "Bueno, acuérdate que en la estación Santo Domingo tenemos que hacer transbordo a la línea del parque.",
        english:
          "Well, remember that at Santo Domingo station we have to transfer to the park line.",
      },
      {
        id: 4,
        speaker: "Mateo",
        gender: "male",
        spanish:
          "O sea, ¿allá arriba en el bosque hace mucho más frío que acá en Medellín?",
        english:
          "I mean, is it much colder up there in the forest than down here in Medellín?",
      },
      {
        id: 5,
        speaker: "Daniela",
        gender: "female",
        spanish:
          "Claro, baja como ocho grados. Por eso traje dos chompas en el morral para no pasar frío.",
        english:
          "Of course, it drops about eight degrees. That's why I brought two jackets in my backpack so we don't get cold.",
        slang: {
          term: "chompas",
          literalMeaning: "jumpers",
          actualMeaning: "jackets / hoodies / warm sweaters (Colombian & Andean Spanish)",
          example: "Llevá la chompa porque por la noche refresca bastante.",
        },
      },
      {
        id: 6,
        speaker: "Mateo",
        gender: "male",
        spanish:
          "¡Qué jugada maestra! Apenas lleguemos arriba compramos fresas con crema en el mercado campesino.",
        english:
          "What a pro move! As soon as we get to the top let's buy strawberries and cream at the farmers' market.",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "comprehension",
        question: "How are Daniela and Mateo traveling up to Parque Arví?",
        options: [
          "By aerial gondola on the Medellín Metrocable, transferring at Santo Domingo station",
          "By rental car along the highway",
          "By mountain bike",
          "By tour bus from downtown Bogotá",
        ],
        correctIndex: 0,
        explanation:
          "They are riding 'la cabina del Metrocable' and transferring at 'la estación Santo Domingo.'",
      },
      {
        id: "q2",
        type: "comprehension",
        question:
          "Why did Daniela pack two jackets ('dos chompas') in her backpack?",
        options: [
          "The temperature up in the forest drops about 8 degrees cooler than in the city",
          "She wants to sell them at the market",
          "The air conditioning inside the gondola is too strong",
          "They are camping overnight in the woods",
        ],
        correctIndex: 0,
        explanation:
          "Daniela explains: 'baja como ocho grados. Por eso traje dos chompas en el morral para no pasar frío.'",
      },
      {
        id: "q3",
        type: "comprehension",
        question:
          "What snack does Mateo want to buy when they arrive at the farmers' market at the top?",
        options: [
          "Strawberries with cream ('fresas con crema')",
          "Roasted corn on the cob",
          "Cheese empanadas",
          "Hot chocolate with bread",
        ],
        correctIndex: 0,
        explanation:
          "Mateo says: 'Apenas lleguemos arriba compramos fresas con crema en el mercado campesino.'",
      },
      {
        id: "q4",
        type: "slang",
        question:
          "Slang Side Quest: In Colombia, what do 'bacanísimo', 'chompas', and 'morral' mean?",
        options: [
          "'Bacanísimo' = super cool/awesome; 'chompas' = jackets/hoodies; 'morral' = backpack",
          "'Bacanísimo' = very high up; 'chompas' = boots; 'morral' = ticket",
          "'Bacanísimo' = scary; 'chompas' = sandwiches; 'morral' = wallet",
          "'Bacanísimo' = crowded; 'chompas' = umbrellas; 'morral' = camera",
        ],
        correctIndex: 0,
        explanation:
          "In Colombia, 'bacano / bacanísimo' means cool/awesome, 'una chompa' is a jacket/hoodie, and 'el morral' is a backpack!",
      },
    ],
  },
];

// ============================================================================
// 2.3 Step 1: Optional Live LLM Script & Quiz Generator (Anthropic / OpenAI / Gemini)
// ============================================================================
const REGION_FLAGS: Record<Episode["region"], string> = {
  Mexico: "🇲🇽",
  Spain: "🇪🇸",
  Argentina: "🇦🇷",
  Colombia: "🇨🇴",
};

async function generateEpisodeFromLLM(params: {
  region: Episode["region"];
  topic: string;
  ambientType: Episode["ambientType"];
}): Promise<SeedEpisodeSpec | null> {
  const { region, topic, ambientType } = params;
  const regionFlag = REGION_FLAGS[region] || "🇲🇽";

  const systemPrompt = `You are a native Spanish dialogue writer for Earshot, a daily Spanish listening comprehension game.
Write a natural 6-to-8-line, 2-speaker Spanish dialogue (35 to 50 seconds total spoken length) set in ${region} (${regionFlag}) about: "${topic}".
Requirements:
- Include natural conversational fillers ("pues", "bueno", "o sea", "mirá", "tío", etc.) appropriate for ${region}.
- Embed 2 to 3 authentic ${region} slang terms naturally in specific lines, populating the \`slang\` object on those DialogueLine items (\`term\` MUST be an exact case-sensitive substring of \`spanish\`).
- Alternate between 1 male speaker and 1 female speaker.
- Generate 3 comprehension questions (\`type: "comprehension"\`) + 1 final dedicated "Slang Side Quest" question (\`type: "slang"\`, 4th question) testing one of the regional idioms in context.
Return ONLY valid JSON matching the schema:
{
  "title": "Spanish title",
  "dialogue": [
    {
      "id": 1,
      "speaker": "Name",
      "gender": "male" | "female",
      "spanish": "...",
      "english": "...",
      "slang": { "term": "exact substring", "literalMeaning": "...", "actualMeaning": "...", "example": "..." } // optional, include on 2-3 lines
    }
  ],
  "questions": [
    {
      "id": "q1",
      "type": "comprehension" | "slang",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "..."
    }
  ]
}`;

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await anthropic.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 2000,
        messages: [{ role: "user", content: systemPrompt }],
      });
      const textBlock = msg.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            topic,
            title: parsed.title,
            region,
            regionFlag,
            ambientType,
            dialogue: parsed.dialogue,
            questions: parsed.questions,
          };
        }
      }
    }

    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: systemPrompt }],
      });
      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          topic,
          title: parsed.title,
          region,
          regionFlag,
          ambientType,
          dialogue: parsed.dialogue,
          questions: parsed.questions,
        };
      }
    }

    if (process.env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: systemPrompt,
        config: { responseMimeType: "application/json" },
      });
      if (response.text) {
        const parsed = JSON.parse(response.text);
        return {
          topic,
          title: parsed.title,
          region,
          regionFlag,
          ambientType,
          dialogue: parsed.dialogue,
          questions: parsed.questions,
        };
      }
    }
  } catch (err) {
    console.warn(
      `  [LLM Fallback] Could not generate live LLM script (${(err as Error).message}), using built-in regional scenario.`
    );
  }

  return null;
}

// ============================================================================
// 2.3 Step 2: Per-Line TTS Synthesis (`tmp/line-{i}.mp3`) & `ffprobe` Measurement
// ============================================================================
const ELEVENLABS_VOICES: Record<
  Episode["region"],
  { male: string; female: string }
> = {
  Mexico: { male: "ErXwobaYiN019PkySvjV", female: "EXAVITQu4vr4xnSDxMaL" },
  Spain: { male: "VR6AewLTigWG4xSOukaG", female: "XB0fDUnXU5powFXDhCwa" },
  Argentina: { male: "TxGEqnHWrfWFTfGW9XjX", female: "21m00Tcm4TlvDq8ikWAM" },
  Colombia: { male: "yoZ06aMxZJJ28mfd3POQ", female: "AZnzlk1XvdvUeBnXmlld" },
};

const OPENAI_VOICES: Record<
  Episode["region"],
  { male: "onyx" | "echo" | "ash"; female: "nova" | "shimmer" | "coral" }
> = {
  Mexico: { male: "onyx", female: "nova" },
  Spain: { male: "echo", female: "shimmer" },
  Argentina: { male: "ash", female: "coral" },
  Colombia: { male: "onyx", female: "shimmer" },
};

function fetchHttpsBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (d) => chunks.push(Buffer.from(d)));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      )
      .on("error", reject);
  });
}

function getGoogleRegionalLocale(
  region: Episode["region"],
  gender: "male" | "female",
  lineIndex: number
): string {
  if (region === "Spain") {
    return gender === "female" ? "es-ES" : "es-US";
  }
  if (region === "Mexico") {
    return gender === "female" ? "es-MX" : "es-US";
  }
  return gender === "female"
    ? lineIndex % 2 === 0
      ? "es-MX"
      : "es-US"
    : "es-ES";
}

async function synthesizeSingleLineToMp3(params: {
  line: Omit<DialogueLine, "startTime" | "endTime">;
  lineIndex: number;
  region: Episode["region"];
  outPath: string;
  mockTts: boolean;
}): Promise<void> {
  const { line, lineIndex, region, outPath, mockTts } = params;

  // 0. If --mock-tts is passed, generate a deterministic speech-timed pleasant tone via FFmpeg
  if (mockTts) {
    const wordCount = line.spanish.trim().split(/\s+/).length;
    const estDuration = Math.max(2.6, Math.min(7.5, wordCount * 0.36));
    const freq = line.gender === "female" ? 240 : 165;
    execFileSync(
      FFMPEG_BIN,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=${freq}:duration=${estDuration.toFixed(2)}:sample_rate=24000`,
        "-af",
        "volume=0.18,afade=t=in:st=0:d=0.05,afade=t=out:st=" +
          Math.max(0.1, estDuration - 0.1).toFixed(2) +
          ":d=0.08",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "128k",
        outPath,
      ],
      { stdio: "ignore" }
    );
    return;
  }

  // 1. ElevenLabs (`eleven_multilingual_v2`) if ELEVENLABS_API_KEY is set
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const voiceId =
        ELEVENLABS_VOICES[region]?.[line.gender] ??
        ELEVENLABS_VOICES.Mexico[line.gender];
      const resp = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: line.spanish,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.78 },
          }),
        }
      );
      if (resp.ok) {
        const arrBuf = await resp.arrayBuffer();
        fs.writeFileSync(outPath, Buffer.from(arrBuf));
        return;
      }
    } catch {
      // Fallback to OpenAI or Neural TTS below
    }
  }

  // 2. OpenAI (`gpt-4o-mini-tts` or `tts-1-hd`) if OPENAI_API_KEY is set
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const voice =
        OPENAI_VOICES[region]?.[line.gender] ??
        OPENAI_VOICES.Mexico[line.gender];
      const mp3Resp = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice,
        input: line.spanish,
        response_format: "mp3",
      });
      const arrBuf = await mp3Resp.arrayBuffer();
      fs.writeFileSync(outPath, Buffer.from(arrBuf));
      return;
    } catch {
      // Fallback to Neural TTS below
    }
  }

  // 3. Natural Neural Spanish TTS (clause-level synthesis + FFmpeg silence trim)
  try {
    const tl = getGoogleRegionalLocale(region, line.gender, lineIndex);
    const clauses = line.spanish
      .split(/(?<=[.?!¡¿])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const rawClausePaths: string[] = [];
    for (let c = 0; c < clauses.length; c++) {
      const clauseUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        clauses[c]
      )}&tl=${tl}&client=tw-ob&ttsspeed=1.0`;
      const buf = await fetchHttpsBuffer(clauseUrl);
      const clausePath = path.join(TMP_DIR, `clause-${lineIndex}-${c}.mp3`);
      fs.writeFileSync(clausePath, buf);
      rawClausePaths.push(clausePath);
    }

    if (rawClausePaths.length === 1) {
      // Trim leading/trailing dead air with FFmpeg silenceremove so ffprobe measures tight speech bounds
      execFileSync(
        FFMPEG_BIN,
        [
          "-y",
          "-i",
          rawClausePaths[0],
          "-af",
          "silenceremove=start_periods=1:start_silence=0.04:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_silence=0.06:start_threshold=-48dB,areverse",
          "-ar",
          "24000",
          "-ac",
          "1",
          "-c:a",
          "libmp3lame",
          "-b:a",
          "128k",
          outPath,
        ],
        { stdio: "ignore" }
      );
    } else {
      // Concatenate clauses with a natural 0.16s breath pause
      const inputs: string[] = [];
      const filterParts: string[] = [];
      rawClausePaths.forEach((p, idx) => {
        inputs.push("-i", p);
        filterParts.push(
          `[${idx}:a]silenceremove=start_periods=1:start_silence=0.04:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_silence=0.06:start_threshold=-48dB,areverse,apad=pad_dur=${
            idx < rawClausePaths.length - 1 ? "0.16" : "0.02"
          }[c${idx}]`
        );
      });
      const concatInputs = rawClausePaths.map((_, idx) => `[c${idx}]`).join("");
      filterParts.push(
        `${concatInputs}concat=n=${rawClausePaths.length}:v=0:a=1[outa]`
      );

      execFileSync(
        FFMPEG_BIN,
        [
          "-y",
          ...inputs,
          "-filter_complex",
          filterParts.join(";"),
          "-map",
          "[outa]",
          "-ar",
          "24000",
          "-ac",
          "1",
          "-c:a",
          "libmp3lame",
          "-b:a",
          "128k",
          outPath,
        ],
        { stdio: "ignore" }
      );
    }

    for (const p of rawClausePaths) {
      fs.rmSync(p, { force: true });
    }
    return;
  } catch {
    // Offline fallback: synthesize via --mock-tts tone
    await synthesizeSingleLineToMp3({
      line,
      lineIndex,
      region,
      outPath,
      mockTts: true,
    });
  }
}

/**
 * Probes an audio file using `ffprobe` and returns its exact duration in seconds
 * rounded to 2 decimal places.
 */
function probeDurationSeconds(filePath: string): number {
  const out = execFileSync(
    FFPROBE_BIN,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf8" }
  ).trim();
  const parsed = Number.parseFloat(out);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`ffprobe returned invalid duration "${out}" for ${filePath}`);
  }
  return Number(parsed.toFixed(2));
}

// ============================================================================
// 2.3 Step 3: Self-Contained Ambient Bed Generator (`anoisesrc`) & `-24dB` Mixer
// ============================================================================
function ensureAmbientBedFile(ambientType: Episode["ambientType"]): string {
  fs.mkdirSync(AMBIENT_ASSETS_DIR, { recursive: true });
  const assetPath = path.join(AMBIENT_ASSETS_DIR, `${ambientType}.mp3`);
  if (fs.existsSync(assetPath)) {
    return assetPath;
  }

  // Self-Contained Fallback: Generate a warm band-passed pink-noise + room-tone bed via FFmpeg `anoisesrc`
  const filterByType: Record<Episode["ambientType"], string> = {
    cafe: "anoisesrc=d=65:c=pink:r=24000:a=0.18,highpass=f=140,lowpass=f=2200,equalizer=f=480:width_type=o:width=1.5:g=3",
    street:
      "anoisesrc=d=65:c=brown:r=24000:a=0.22,highpass=f=75,lowpass=f=1400,equalizer=f=180:width_type=o:width=1.2:g=4",
    market:
      "anoisesrc=d=65:c=pink:r=24000:a=0.20,highpass=f=180,lowpass=f=2800,equalizer=f=750:width_type=o:width=1.8:g=3",
    transit:
      "anoisesrc=d=65:c=brown:r=24000:a=0.24,highpass=f=60,lowpass=f=950,equalizer=f=110:width_type=o:width=1.0:g=5",
  };

  console.log(
    `  [Ambient Asset] Generating self-contained "${ambientType}" bed at scripts/assets/ambient/${ambientType}.mp3...`
  );
  execFileSync(
    FFMPEG_BIN,
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      filterByType[ambientType],
      "-ar",
      "24000",
      "-ac",
      "1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      assetPath,
    ],
    { stdio: "ignore" }
  );
  return assetPath;
}

/**
 * Concatenates per-line MP3s (`tmp/line-0.mp3`, ...) with a `0.5s` lead-in pad and
 * `0.35s` inter-line silence gaps into `tmp/dialogue-dry.mp3`, then mixes with the
 * looping ambient bed attenuated to `-24dB` relative to the `-14 LUFS` normalized speech,
 * applying a 1.0s fade-in and 1.5s fade-out.
 */
function concatenateAndMixEpisodeAudio(params: {
  lineFiles: string[];
  ambientType: Episode["ambientType"];
  outputMp3Path: string;
}): number {
  const { lineFiles, ambientType, outputMp3Path } = params;
  const dryPath = path.join(TMP_DIR, "dialogue-dry.mp3");

  // Sample-accurate FFmpeg filter_complex concatenation:
  // 0.50s lead-in pad + each line padded with 0.35s inter-line silence (0.60s on final line)
  const inputs: string[] = [];
  const filterParts: string[] = [
    `anullsrc=r=24000:cl=mono:d=${LEAD_IN_PAD_SEC}[lead]`,
  ];
  const streamLabels: string[] = ["[lead]"];

  lineFiles.forEach((lf, idx) => {
    inputs.push("-i", lf);
    const padSec =
      idx < lineFiles.length - 1 ? INTER_LINE_GAP_SEC : TAIL_PAD_SEC;
    filterParts.push(
      `[${idx}:a]aformat=sample_fmts=fltp:sample_rates=24000:channel_layouts=mono,apad=pad_dur=${padSec}[l${idx}]`
    );
    streamLabels.push(`[l${idx}]`);
  });

  filterParts.push(
    `${streamLabels.join("")}concat=n=${streamLabels.length}:v=0:a=1[dry]`
  );

  execFileSync(
    FFMPEG_BIN,
    [
      "-y",
      ...inputs,
      "-filter_complex",
      filterParts.join(";"),
      "-map",
      "[dry]",
      "-ar",
      "24000",
      "-ac",
      "1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      dryPath,
    ],
    { stdio: "ignore" }
  );

  const totalDryDuration = probeDurationSeconds(dryPath);
  const ambientPath = ensureAmbientBedFile(ambientType);
  const fadeOutStart = Math.max(0, totalDryDuration - 1.5).toFixed(2);

  // Mix normalized speech (-14 LUFS) with ambient bed attenuated to -24dB
  // plus 1.0s fade-in at start and 1.5s fade-out at end
  execFileSync(
    FFMPEG_BIN,
    [
      "-y",
      "-i",
      dryPath,
      "-stream_loop",
      "-1",
      "-i",
      ambientPath,
      "-filter_complex",
      `[0:a]loudnorm=I=-14:TP=-1.5:LRA=11[speech];[1:a]volume=-24dB,afade=t=in:st=0:d=1.0,afade=t=out:st=${fadeOutStart}:d=1.5[amb];[speech][amb]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mixed];[mixed]afade=t=in:st=0:d=0.25,afade=t=out:st=${fadeOutStart}:d=1.5[outa]`,
      "-map",
      "[outa]",
      "-ar",
      "24000",
      "-ac",
      "1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      outputMp3Path,
    ],
    { stdio: "ignore" }
  );

  return probeDurationSeconds(outputMp3Path);
}

// ============================================================================
// 2.3 Step 4: Assemble Complete Episode + Update `manifest.json` & `episodesBuffer.ts`
// ============================================================================
async function buildSingleEpisode(params: {
  episodeNumber: number;
  dateStr: string;
  spec: SeedEpisodeSpec;
  mockTts: boolean;
}): Promise<Episode> {
  const { episodeNumber, dateStr, spec, mockTts } = params;
  const epId = `ep-${String(episodeNumber).padStart(3, "0")}`;

  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_EPISODES_DIR, { recursive: true });

  console.log(
    `\n▶ Generating ${epId} (${dateStr}) — "${spec.title}" [${spec.regionFlag} ${spec.region} • ${spec.ambientType}]`
  );

  const lineFiles: string[] = [];
  const timedDialogue: DialogueLine[] = [];
  let cursorSec = LEAD_IN_PAD_SEC;

  for (let i = 0; i < spec.dialogue.length; i++) {
    const rawLine = spec.dialogue[i];
    const lineFile = path.join(TMP_DIR, `line-${i}.mp3`);
    await synthesizeSingleLineToMp3({
      line: rawLine,
      lineIndex: i,
      region: spec.region,
      outPath: lineFile,
      mockTts,
    });

    const lineDuration = probeDurationSeconds(lineFile);
    const startTime = Number(cursorSec.toFixed(2));
    const endTime = Number((cursorSec + lineDuration).toFixed(2));

    if (rawLine.slang && !rawLine.spanish.includes(rawLine.slang.term)) {
      throw new Error(
        `Slang term "${rawLine.slang.term}" not found as exact substring in "${rawLine.spanish}"`
      );
    }

    timedDialogue.push({
      id: rawLine.id ?? i + 1,
      speaker: rawLine.speaker,
      gender: rawLine.gender,
      spanish: rawLine.spanish,
      english: rawLine.english,
      startTime,
      endTime,
      ...(rawLine.slang ? { slang: rawLine.slang } : {}),
    });

    lineFiles.push(lineFile);
    cursorSec = endTime + INTER_LINE_GAP_SEC;
    console.log(
      `  • Line ${i + 1} (${rawLine.speaker}): ${startTime.toFixed(
        2
      )}s → ${endTime.toFixed(2)}s (${lineDuration.toFixed(2)}s)`
    );
  }

  const outMp3Path = path.join(PUBLIC_EPISODES_DIR, `${dateStr}.mp3`);
  const durationSeconds = concatenateAndMixEpisodeAudio({
    lineFiles,
    ambientType: spec.ambientType,
    outputMp3Path: outMp3Path,
  });

  const episode: Episode = {
    id: epId,
    episodeNumber,
    date: dateStr,
    title: spec.title,
    region: spec.region,
    regionFlag: spec.regionFlag,
    ambientType: spec.ambientType,
    audioUrl: `${BASE_PATH}/episodes/${dateStr}.mp3`,
    durationSeconds,
    dialogue: timedDialogue,
    questions: spec.questions,
  };

  const outJsonPath = path.join(PUBLIC_EPISODES_DIR, `${dateStr}.json`);
  fs.writeFileSync(outJsonPath, JSON.stringify(episode, null, 2));
  console.log(
    `  ✓ Saved public/episodes/${dateStr}.mp3 & ${dateStr}.json (Total: ${durationSeconds}s)`
  );

  return episode;
}

export interface ManifestEntry {
  id: string;
  episodeNumber: number;
  date: string;
  title: string;
  region: Episode["region"];
  regionFlag: string;
  ambientType: Episode["ambientType"];
  durationSeconds: number;
  audioUrl: string;
}

function updateManifestAndBuffer(): void {
  const files = fs
    .readdirSync(PUBLIC_EPISODES_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();

  const episodes: Episode[] = files.map((file, idx) => {
    const fullPath = path.join(PUBLIC_EPISODES_DIR, file);
    const data = JSON.parse(fs.readFileSync(fullPath, "utf8")) as Episode;
    // Normalize sequential episode numbers & IDs by chronological date
    const epNum = idx + 1;
    const epId = `ep-${String(epNum).padStart(3, "0")}`;
    const updated: Episode = {
      ...data,
      id: epId,
      episodeNumber: epNum,
    };
    fs.writeFileSync(fullPath, JSON.stringify(updated, null, 2));
    return updated;
  });

  const manifest: ManifestEntry[] = episodes.map((ep) => ({
    id: ep.id,
    episodeNumber: ep.episodeNumber,
    date: ep.date,
    title: ep.title,
    region: ep.region,
    regionFlag: ep.regionFlag,
    ambientType: ep.ambientType,
    durationSeconds: ep.durationSeconds,
    audioUrl: ep.audioUrl,
  }));

  fs.writeFileSync(
    path.join(PUBLIC_EPISODES_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  fs.writeFileSync(
    path.join(PUBLIC_EPISODES_DIR, "index.json"),
    JSON.stringify(episodes, null, 2)
  );

  const bufferTs = `// Auto-generated by scripts/generate-episode.ts — DO NOT EDIT MANUALLY
import type { Episode } from "@/types/episode";

export const EPISODES_14_DAY_BUFFER: Episode[] = ${JSON.stringify(
    episodes,
    null,
    2
  )};
`;
  fs.writeFileSync(path.join(ROOT_DIR, "lib", "episodesBuffer.ts"), bufferTs);
  console.log(
    `\n✓ Updated public/episodes/manifest.json & lib/episodesBuffer.ts (${episodes.length} total episodes indexed)`
  );
}

function addDays(dateStr: string, offset: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + offset);
  return dt.toISOString().slice(0, 10);
}

function parseCliArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

async function main(): Promise<void> {
  loadEnvLocal();
  verifyFfmpegInstalled();
  console.log(`✓ Verified ffmpeg (${FFMPEG_BIN}) & ffprobe (${FFPROBE_BIN})`);

  const args = parseCliArgs(process.argv.slice(2));
  const mockTts = Boolean(args["mock-tts"]);

  // Single Episode Mode: --date YYYY-MM-DD [--region Mexico] [--topic "..."] [--ambient cafe]
  if (typeof args.date === "string" && !args.batch) {
    const dateStr = args.date;
    const region = ((args.region as Episode["region"]) ||
      "Mexico") as Episode["region"];
    const ambientType = ((args.ambient as Episode["ambientType"]) ||
      "cafe") as Episode["ambientType"];
    const topic =
      typeof args.topic === "string"
        ? args.topic
        : `Everyday conversation in ${region}`;

    let spec: SeedEpisodeSpec | null = null;
    if (typeof args.topic === "string") {
      spec = await generateEpisodeFromLLM({ region, topic, ambientType });
    }
    if (!spec) {
      const regionMatch = SEED_SCENARIOS.find((s) => s.region === region);
      spec = regionMatch
        ? { ...regionMatch, ambientType }
        : { ...SEED_SCENARIOS[0], region, ambientType };
    }

    await buildSingleEpisode({
      episodeNumber: 1,
      dateStr,
      spec,
      mockTts,
    });
    updateManifestAndBuffer();
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
    return;
  }

  // Batch Mode (Default or --batch N --start-date YYYY-MM-DD)
  const batchCount = Number(args.batch || 14);
  const startDate =
    typeof args["start-date"] === "string" ? args["start-date"] : "2026-11-09";

  // If start-date is 2026-11-09 (Today), also ensure the past 4 archive days
  // (2026-11-05 through 2026-11-08) are generated so Today + Past 3 Playable Days
  // + 1 Expired Archive Day + 14 Upcoming Days are all ready for testing!
  const archiveLeadDays = startDate === "2026-11-09" ? 4 : 0;
  const firstDate = addDays(startDate, -archiveLeadDays);
  const totalDaysToGenerate = batchCount + archiveLeadDays;

  console.log(
    `=== Running Batch Pipeline: ${totalDaysToGenerate} Episodes (${firstDate} → ${addDays(
      firstDate,
      totalDaysToGenerate - 1
    )}) ===`
  );

  for (let i = 0; i < totalDaysToGenerate; i++) {
    const dateStr = addDays(firstDate, i);
    const spec = SEED_SCENARIOS[i % SEED_SCENARIOS.length];
    await buildSingleEpisode({
      episodeNumber: i + 1,
      dateStr,
      spec,
      mockTts,
    });
  }

  updateManifestAndBuffer();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}

main().catch((err) => {
  console.error("Fatal error in scripts/generate-episode.ts:", err);
  process.exit(1);
});
