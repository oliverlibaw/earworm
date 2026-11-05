import { GoogleGenAI, Modality, Type } from "@google/genai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, ActionCtx, internalAction } from "./_generated/server";

export interface DialogueTurn {
  speaker: string;
  text: string;
  englishTranslation: string;
}

export interface SlangNote {
  term: string;
  meaning: string;
  literalTranslation: string;
}

export interface ComprehensionQuestion {
  id: string;
  questionText: string;
  idealAnswerRubric: string;
}

export interface GeneratedLessonContent {
  title: string;
  dialect: string;
  dialectNotes: string;
  dialogue: DialogueTurn[];
  slangNotes: SlangNote[];
  questions: ComprehensionQuestion[];
}

/**
 * Curated Mexican Spanish QA Preset Bank:
 * 2 distinct Mexican Spanish clips (clipNumber 1 & 2) for each of the 3 levels:
 * - A2 (Intro)
 * - B1 (Conversational)
 * - B2 (Advanced)
 */
const CURATED_QA_LESSONS: Record<string, GeneratedLessonContent> = {
  // ==========================================
  // INTRO (A2) — Clear Mexican Spanish, everyday situations, slower pace
  // ==========================================
  "Spanish:A2:daily:1": {
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
        questionText:
          "Why do Carlos and Valeria need cash for the tacos, and how much money does each person have?",
        idealAnswerRubric:
          "The taco vendor on the bicycle only takes cash (no cards). Carlos has a 50-peso bill and Valeria has 20 pesos in coins.",
      },
      {
        id: "q2",
        questionText:
          "How much does an order of 5 tacos cost, and what do they use Valeria's 20 pesos for?",
        idealAnswerRubric:
          "An order of 5 tacos costs 40 pesos, and Valeria's 20 pesos in coins is used to buy two sodas (refrescos).",
      },
      {
        id: "q3",
        questionText:
          "Which taco flavors does Valeria ask Carlos to order, and what warning does she give him?",
        idealAnswerRubric:
          "She asks for two potato with chorizo (papa con chorizo) and three bean (frijol) tacos, and warns him that the green salsa (salsa verde) is very spicy.",
      },
    ],
  },

  "Spanish:A2:daily:2": {
    title: "El café de olla y el pan dulce en Coyoacán",
    dialect: "Mexican Spanish 🇲🇽",
    dialectNotes:
      "Intro level: Clear Mexican Spanish featuring everyday vocabulary like '¿mande?', 'concha', 'camión' (bus), and 'cambio'.",
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
        meaning: "Pardon? / What did you say? (Polite Mexican way to ask someone to repeat)",
        literalTranslation: "command me?",
      },
      {
        term: "el camión",
        meaning: "The city bus (in Mexico, 'camión' means passenger bus)",
        literalTranslation: "the truck",
      },
      {
        term: "café de olla",
        meaning: "Traditional Mexican coffee brewed with cinnamon and piloncillo (unrefined cane sugar)",
        literalTranslation: "pot coffee",
      },
      {
        term: "yo invito",
        meaning: "It's my treat / I'm paying",
        literalTranslation: "I invite",
      },
    ],
    questions: [
      {
        id: "q1",
        questionText: "Why didn't Luis hear Sofía the first time she spoke?",
        idealAnswerRubric:
          "He was distracted looking at his cell phone (celular).",
      },
      {
        id: "q2",
        questionText:
          "What drinks and food do they get at the bakery, and how much does it cost?",
        idealAnswerRubric:
          "Two spiced coffees (cafés de olla) and two vanilla sweet breads (conchas de vainilla) for breakfast at the office, costing 35 pesos total.",
      },
      {
        id: "q3",
        questionText: "Who pays, and why do they need to hurry?",
        idealAnswerRubric:
          "Luis pays ('yo invito'), and they need to hurry because their bus ('el camión') arrives on the avenue in 8 minutes.",
      },
    ],
  },

  // ==========================================
  // CONVERSATIONAL (B1) — Natural Mexican speed, everyday conflicts & idioms
  // ==========================================
  "Spanish:B1:daily:1": {
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
        term: "la chamba",
        meaning: "Work / job / gig (Mexican slang)",
        literalTranslation: "the job",
      },
      {
        term: "hacerse pato",
        meaning: "To play dumb / pretend nothing happened / dodge responsibility",
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
        questionText:
          "What damage did Diego discover on his car, and how did it happen?",
        idealAnswerRubric:
          "He found a huge scratch ('raspón') on the rear bumper ('defensa trasera'). Fernanda scraped a tight pillar on a parking ramp yesterday when she borrowed the car to pick up work ('chamba') supplies.",
      },
      {
        id: "q2",
        questionText:
          "What arrangement did Fernanda already make to fix the car, and how much will it cost?",
        idealAnswerRubric:
          "She already called her Uncle Memo's body shop in Zapopan, who will buff and paint the bumper tomorrow for 1,500 pesos.",
      },
      {
        id: "q3",
        questionText:
          "What two conditions does Diego insist on, and what local food does Fernanda offer to cheer him up?",
        idealAnswerRubric:
          "Diego insists Fernanda pay the full repair cost ('la lana') and drive him to his office in the morning. Fernanda agrees and offers to buy him a 'torta ahogada' sandwich.",
      },
    ],
  },

  "Spanish:B1:daily:2": {
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
        term: "echar la mano",
        meaning: "To lend a hand / help someone out",
        literalTranslation: "to throw the hand",
      },
    ],
    questions: [
      {
        id: "q1",
        questionText:
          "Why is Mateo stressed about the electricity bill, and why is he short on cash right now?",
        idealAnswerRubric:
          "The electricity bill doubled, the landlord has been nagging him on WhatsApp since 8 AM, and Mateo is broke ('ando bien bruja') because he hasn't been paid for his design project yet.",
      },
      {
        id: "q2",
        questionText: "Why did the electricity bill jump so high?",
        idealAnswerRubric:
          "Lucía left the electric space heater ('calentador eléctrico') on for a couple of nights because it was freezing last week.",
      },
      {
        id: "q3",
        questionText:
          "How does Lucía solve the problem, and what does she ask Mateo to help her with?",
        idealAnswerRubric:
          "Her cousin Javi just paid her back for concert tickets, so she pays 70% of the bill and offers to buy Mateo 'esquites' (street corn) if he helps her carry boxes to the storage room ('bodega').",
      },
    ],
  },

  // ==========================================
  // ADVANCED (B2) — Fast Mexican street banter, heavy slang & quick pacing
  // ==========================================
  "Spanish:B2:daily:1": {
    title: "El boleto falso afuera del Foro Sol",
    dialect: "Mexican Spanish 🇲🇽",
    dialectNotes:
      "Advanced level: Fast Mexico City street banter ('Chilango') packed with 'no mames', 'güey', 'chafa', 'pasarse de lanza', 'cañón', and 'a huevo'.",
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
        meaning: "No freaking way, dude! (Quintessential Mexican street exclamation)",
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
        meaning: "The song / track",
        literalTranslation: "the roll",
      },
    ],
    questions: [
      {
        id: "q1",
        questionText:
          "Why do Paco and Mariana panic at the concert gate, and why is Mariana suspicious of where he bought the ticket?",
        idealAnswerRubric:
          "The scanner flashes red on Paco's ticket, and Mariana thinks the sketchy ('chafa') Facebook reseller ripped him off ('se pasó de lanza') with a cloned ticket.",
      },
      {
        id: "q2",
        questionText:
          "What silly mistake did Mariana discover when she looked at Paco's phone?",
        idealAnswerRubric:
          "Paco was accidentally scanning the QR code for the parking lot ('estacionamiento') instead of the concert ticket QR code.",
      },
      {
        id: "q3",
        questionText: "Why do they have to run once the scanner turns green?",
        idealAnswerRubric:
          "The band is about to start playing their first song ('la primera rola') and their tickets are all the way down on the main floor ('la pista').",
      },
    ],
  },

  "Spanish:B2:daily:2": {
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
        meaning: "To ignore someone / ghost someone's messages",
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
        questionText:
          "Why did Valeria ignore Ramiro's messages ('tirar a león') all morning?",
        idealAnswerRubric:
          "There was chaos ('un desmadre') at her office because the server crashed and her boss wouldn't let anyone leave.",
      },
      {
        id: "q2",
        questionText:
          "Why couldn't Ramiro buy the barbecue supplies by himself before the guests arrive at 5 PM?",
        idealAnswerRubric:
          "He didn't have enough cash ('feria') on him to pay for all the meat alone.",
      },
      {
        id: "q3",
        questionText:
          "How did Valeria solve the problem, and what is Ramiro going to do while waiting?",
        idealAnswerRubric:
          "She ordered the meat and charcoal for delivery from the butcher shop paid with her card (arriving in 20 minutes), while Ramiro lights the grill and puts the beers ('las cheves') in the cooler.",
      },
    ],
  },
};

function getCuratedQALessonContent(
  language: string,
  level: string,
  isSideQuest: boolean,
  clipNumber = 1
): GeneratedLessonContent {
  const exactKey = `Spanish:${level}:daily:${clipNumber}`;
  if (CURATED_QA_LESSONS[exactKey]) {
    return CURATED_QA_LESSONS[exactKey];
  }
  return (
    CURATED_QA_LESSONS[`Spanish:${level}:daily:1`] ??
    CURATED_QA_LESSONS["Spanish:B1:daily:1"]
  );
}

async function generateLessonContent(params: {
  dateStr: string;
  language: string;
  level: string;
  isSideQuest: boolean;
  clipNumber: number;
  useLiveLLM?: boolean;
  apiKey?: string;
}): Promise<GeneratedLessonContent> {
  if (!params.useLiveLLM) {
    return getCuratedQALessonContent(
      params.language,
      params.level,
      params.isSideQuest,
      params.clipNumber
    );
  }

  const apiKey = params.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return getCuratedQALessonContent(
      params.language,
      params.level,
      params.isSideQuest,
      params.clipNumber
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const levelDescriptions: Record<string, string> = {
      A2: "Intro (CEFR A2): Clear Mexican Spanish, shorter sentences, everyday situations, approachable slang, gentle pace.",
      B1: "Conversational (CEFR B1): Natural Mexican Spanish pace, everyday conflicts, moderate Mexican idioms and fillers.",
      B2: "Advanced (CEFR B2): Fast Mexican street banter, heavy Mexican slang (Chilango/Regio), overlapping thoughts, and idiomatic expressions.",
    };

    const prompt = `You are a native Mexican Spanish scriptwriter creating a 30-35 second, 2-speaker conversational dialogue for the daily listening game "Earworm".
Difficulty Level: ${levelDescriptions[params.level] ?? params.level}
Dialect: Mexican Spanish 🇲🇽

Requirements:
1. Set "dialect" to "Mexican Spanish 🇲🇽" and explain the level & Mexican slang features in "dialectNotes".
2. Write a 5-to-6 turn conversation matching the ${params.level} difficulty level.
3. Provide 4 to 5 Mexican slang/idiom/tricky vocabulary notes and 3 open-ended comprehension questions in English ("q1", "q2", "q3") with detailed grading rubrics.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: [
            "title",
            "dialect",
            "dialectNotes",
            "dialogue",
            "slangNotes",
            "questions",
          ],
          properties: {
            title: { type: Type.STRING },
            dialect: { type: Type.STRING },
            dialectNotes: { type: Type.STRING },
            dialogue: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["speaker", "text", "englishTranslation"],
                properties: {
                  speaker: { type: Type.STRING },
                  text: { type: Type.STRING },
                  englishTranslation: { type: Type.STRING },
                },
              },
            },
            slangNotes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["term", "meaning", "literalTranslation"],
                properties: {
                  term: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  literalTranslation: { type: Type.STRING },
                },
              },
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "questionText", "idealAnswerRubric"],
                properties: {
                  id: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  idealAnswerRubric: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    if (!response.text) {
      throw new Error("Empty response from gemini-2.5-flash");
    }
    const parsed = JSON.parse(response.text) as GeneratedLessonContent;
    parsed.questions = parsed.questions.slice(0, 3).map((q, idx) => ({
      ...q,
      id: `q${idx + 1}`,
    }));
    return parsed;
  } catch {
    return getCuratedQALessonContent(
      params.language,
      params.level,
      params.isSideQuest,
      params.clipNumber
    );
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.byteLength;
  }
  return result;
}

function ensureValidWavHeader(
  rawBytes: Uint8Array,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Uint8Array {
  if (
    rawBytes.byteLength > 44 &&
    ((rawBytes[0] === 0x52 &&
      rawBytes[1] === 0x49 &&
      rawBytes[2] === 0x46 &&
      rawBytes[3] === 0x46) ||
      (rawBytes[0] === 0x49 && rawBytes[1] === 0x44 && rawBytes[2] === 0x33) ||
      (rawBytes[0] === 0xff && (rawBytes[1] & 0xe0) === 0xe0))
  ) {
    return rawBytes;
  }

  const dataSize = rawBytes.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, (sampleRate * numChannels * bitsPerSample) / 8, true);
  view.setUint16(32, (numChannels * bitsPerSample) / 8, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const output = new Uint8Array(buffer);
  output.set(rawBytes, 44);
  return output;
}

function synthesizeDeterministicDialogueWav(
  dialogue: DialogueTurn[]
): { bytes: Uint8Array; mimeType: string } {
  const sampleRate = 24000;
  const speakers = Array.from(new Set(dialogue.map((d) => d.speaker)));
  const turnDurations = dialogue.map((turn) =>
    Math.max(3.5, Math.min(6.5, turn.text.length * 0.048))
  );
  const pauseDuration = 0.35;
  const totalSeconds =
    turnDurations.reduce((sum, d) => sum + d + pauseDuration, 0) + 0.5;
  const totalSamples = Math.floor(totalSeconds * sampleRate);
  const pcmBuffer = new ArrayBuffer(totalSamples * 2);
  const pcmView = new DataView(pcmBuffer);

  let cursorSample = Math.floor(0.25 * sampleRate);

  dialogue.forEach((turn, turnIdx) => {
    const speakerIdx = speakers.indexOf(turn.speaker);
    const baseFreq = speakerIdx % 2 === 0 ? 138 : 212;
    const formant1 = speakerIdx % 2 === 0 ? 520 : 680;
    const formant2 = speakerIdx % 2 === 0 ? 1180 : 1540;
    const durationSec = turnDurations[turnIdx];
    const turnSamples = Math.floor(durationSec * sampleRate);
    const words = turn.text.split(/\s+/).filter(Boolean);
    const syllables = Math.max(8, words.length * 2);

    for (let i = 0; i < turnSamples && cursorSample + i < totalSamples; i++) {
      const t = i / sampleRate;
      const progress = i / turnSamples;
      const pitchContour =
        1 +
        0.12 * Math.sin(2 * Math.PI * 1.3 * t + turnIdx) -
        0.08 * progress;
      const f0 = baseFreq * pitchContour;
      const syllableRate = syllables / durationSec;
      const sylPhase = (t * syllableRate) % 1;
      const sylEnvelope =
        sylPhase < 0.78
          ? Math.sin((sylPhase / 0.78) * Math.PI) ** 0.7
          : 0.04;
      const phraseEnvelope =
        Math.min(1, t / 0.08) * Math.min(1, (durationSec - t) / 0.12);
      const signal =
        0.52 * Math.sin(2 * Math.PI * f0 * t) +
        0.26 * Math.sin(2 * Math.PI * (f0 * 2) * t + 0.4) +
        0.14 * Math.sin(2 * Math.PI * formant1 * t) +
        0.08 * Math.sin(2 * Math.PI * formant2 * t);

      const sampleVal = Math.max(
        -1,
        Math.min(1, signal * sylEnvelope * phraseEnvelope * 0.45)
      );
      pcmView.setInt16(
        (cursorSample + i) * 2,
        Math.floor(sampleVal * 32767),
        true
      );
    }

    cursorSample += turnSamples + Math.floor(pauseDuration * sampleRate);
  });

  const wavBytes = ensureValidWavHeader(
    new Uint8Array(pcmBuffer),
    sampleRate,
    1,
    16
  );
  return { bytes: wavBytes, mimeType: "audio/wav" };
}

async function synthesizeMultiSpeakerAudio(params: {
  dialogue: DialogueTurn[];
  language: string;
  level: string;
  dialect: string;
  apiKey?: string;
}): Promise<{ bytes: Uint8Array; mimeType: string; provider: string }> {
  const geminiKey = params.apiKey || process.env.GEMINI_API_KEY;
  const speakers = Array.from(
    new Set(params.dialogue.map((d) => d.speaker))
  ).slice(0, 2);
  if (speakers.length === 1) {
    speakers.push("Speaker2");
  }

  const paceInstruction =
    params.level === "A2"
      ? "clearly and at a gentle, approachable Intro pace"
      : params.level === "B2"
        ? "at a brisk, fast-paced native Mexican banter speed"
        : "at a natural everyday Mexican conversational pace";

  const transcriptPrompt = [
    `TTS the following Mexican Spanish conversation between ${speakers[0]} and ${speakers[1]}, spoken ${paceInstruction}:`,
    ...params.dialogue.map((d) => `${d.speaker}: ${d.text}`),
  ].join("\n");

  // 1. Primary: Google Gen AI SDK `gemini-3.8-flash-tts`
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-tts",
        contents: transcriptPrompt,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: speakers[0],
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Puck" },
                  },
                },
                {
                  speaker: speakers[1],
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Kore" },
                  },
                },
              ],
            },
          },
        },
      });

      const inlineData =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) {
        const rawBytes = base64ToUint8Array(inlineData.data);
        const wavBytes = ensureValidWavHeader(rawBytes, 24000, 1, 16);
        if (wavBytes.byteLength > 10 * 1024) {
          return {
            bytes: wavBytes,
            mimeType: "audio/wav",
            provider: "gemini-3.8-flash-tts",
          };
        }
      }
    } catch {
      // Fallback to next TTS provider
    }
  }

  // 2. Spoken Mexican Spanish TTS MP3 per speaker turn (es-MX & es-US Latin American voices)
  try {
    const locales: [string, string] = ["es-MX", "es-US"];
    const ttsSpeed =
      params.level === "A2" ? "0.65" : params.level === "B2" ? "1.0" : "0.88";
    const mp3Buffers: Uint8Array[] = [];

    for (const turn of params.dialogue) {
      const tl = turn.speaker === speakers[0] ? locales[0] : locales[1];
      const textEncoded = encodeURIComponent(turn.text.slice(0, 195));
      const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${textEncoded}&tl=${tl}&ttsspeed=${ttsSpeed}&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });
      if (!res.ok) {
        throw new Error(`Translate TTS status ${res.status}`);
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      mp3Buffers.push(buf);
    }

    const stitchedMp3 = concatUint8Arrays(mp3Buffers);
    if (stitchedMp3.byteLength > 10 * 1024) {
      return {
        bytes: stitchedMp3,
        mimeType: "audio/mpeg",
        provider: `mexican-spanish-tts (es-MX/es-US, speed=${ttsSpeed})`,
      };
    }
  } catch {
    // Fallback to deterministic WAV
  }

  const deterministic = synthesizeDeterministicDialogueWav(params.dialogue);
  return {
    ...deterministic,
    provider: "deterministic-wav-fallback",
  };
}

async function runGenerateDailyLesson(
  ctx: ActionCtx,
  args: {
    dateStr: string;
    language: string;
    level: string;
    isSideQuest: boolean;
    clipNumber?: number;
    forceRegenerate?: boolean;
    useLiveLLM?: boolean;
    apiKey?: string;
  }
): Promise<{
  lessonId: Id<"lessons">;
  title: string;
  dialect: string;
  clipNumber: number;
  audioUrl: string;
  audioBytesSize: number;
  ttsProvider: string;
}> {
  const clipNumber = args.clipNumber ?? 1;

  if (!args.forceRegenerate) {
    const existing = await ctx.runQuery(
      internal.lessons.checkExistingLessonInternal,
      {
        dateStr: args.dateStr,
        language: args.language,
        level: args.level,
        isSideQuest: args.isSideQuest,
        clipNumber,
      }
    );
    if (existing && existing.dialect === "Mexican Spanish 🇲🇽") {
      return {
        lessonId: existing._id,
        title: existing.title,
        dialect: existing.dialect,
        clipNumber: existing.clipNumber ?? clipNumber,
        audioUrl: existing.audioUrl,
        audioBytesSize: 0,
        ttsProvider: "cached-existing",
      };
    }
  }

  const content = await generateLessonContent({
    dateStr: args.dateStr,
    language: args.language,
    level: args.level,
    isSideQuest: args.isSideQuest,
    clipNumber,
    useLiveLLM: args.useLiveLLM,
    apiKey: args.apiKey,
  });

  const audioResult = await synthesizeMultiSpeakerAudio({
    dialogue: content.dialogue,
    language: args.language,
    level: args.level,
    dialect: content.dialect,
    apiKey: args.apiKey,
  });

  if (audioResult.bytes.byteLength <= 10 * 1024) {
    throw new Error(
      `Self-Check Failed: Generated audio buffer is ${audioResult.bytes.byteLength} bytes (must be > 10KB)`
    );
  }

  const audioCopy = new Uint8Array(audioResult.bytes.byteLength);
  audioCopy.set(audioResult.bytes);
  const blob = new Blob([audioCopy.buffer], { type: audioResult.mimeType });
  const storageId = await ctx.storage.store(blob);
  const servingUrl = await ctx.storage.getUrl(storageId);

  if (!servingUrl) {
    throw new Error("Failed to retrieve serving URL from Convex Storage");
  }

  const lessonId: Id<"lessons"> = await ctx.runMutation(
    internal.lessons.saveLessonInternal,
    {
      dateStr: args.dateStr,
      language: args.language,
      level: args.level,
      isSideQuest: args.isSideQuest,
      clipNumber,
      dialect: content.dialect,
      dialectNotes: content.dialectNotes,
      title: content.title,
      audioStorageId: storageId,
      audioUrl: servingUrl,
      dialogue: content.dialogue,
      slangNotes: content.slangNotes,
      questions: content.questions,
    }
  );

  return {
    lessonId,
    title: content.title,
    dialect: content.dialect,
    clipNumber,
    audioUrl: servingUrl,
    audioBytesSize: audioResult.bytes.byteLength,
    ttsProvider: audioResult.provider,
  };
}

export const generateDailyLesson = action({
  args: {
    dateStr: v.string(),
    language: v.string(),
    level: v.string(),
    isSideQuest: v.boolean(),
    clipNumber: v.optional(v.number()),
    forceRegenerate: v.optional(v.boolean()),
    useLiveLLM: v.optional(v.boolean()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await runGenerateDailyLesson(ctx, args);
  },
});

export const generateDailyLessonInternal = internalAction({
  args: {
    dateStr: v.string(),
    language: v.string(),
    level: v.string(),
    isSideQuest: v.boolean(),
    clipNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await runGenerateDailyLesson(ctx, args);
  },
});

export const runScheduledDailyGeneration = internalAction({
  args: {},
  handler: async (ctx) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const results = [];
    for (const level of ["A2", "B1", "B2"]) {
      results.push(
        await runGenerateDailyLesson(ctx, {
          dateStr: todayStr,
          language: "Spanish",
          level,
          isSideQuest: false,
          clipNumber: 1,
        })
      );
    }
    return { todayStr, results };
  },
});

export const seedInitialLessons = action({
  args: {
    dateStr: v.optional(v.string()),
    language: v.optional(v.string()),
    level: v.optional(v.string()),
    clipNumber: v.optional(v.number()),
    seedAllLevelsForQA: v.optional(v.boolean()),
    forceRegenerate: v.optional(v.boolean()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dateStr = args.dateStr ?? new Date().toISOString().slice(0, 10);
    const language = "Spanish";

    if (args.seedAllLevelsForQA) {
      const seeded = [];
      for (const lvl of ["A2", "B1", "B2"]) {
        for (const clipNum of [1, 2]) {
          const item = await runGenerateDailyLesson(ctx, {
            dateStr,
            language,
            level: lvl,
            isSideQuest: false,
            clipNumber: clipNum,
            forceRegenerate: args.forceRegenerate ?? true,
            apiKey: args.apiKey,
          });
          seeded.push({ level: lvl, isSideQuest: false, ...item });
        }
      }
      return { dateStr, language, seededCount: seeded.length, seeded };
    }

    const level = args.level ?? "B1";
    const clipNumber = args.clipNumber ?? 1;

    const dailyLesson = await runGenerateDailyLesson(ctx, {
      dateStr,
      language,
      level,
      isSideQuest: false,
      clipNumber,
      forceRegenerate: args.forceRegenerate,
      apiKey: args.apiKey,
    });

    return {
      dateStr,
      language,
      level,
      clipNumber,
      dailyLesson,
    };
  },
});
