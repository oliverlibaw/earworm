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
  questionText: string;
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
  title: string;
  audioUrl: string;
  dialogue: StaticDialogueTurn[];
  slangNotes: StaticSlangNote[];
  questions: StaticQuestion[];
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
  timestamp: number;
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

/**
 * Seeded vocabulary from previous days played so the "Review Vocab" modal
 * always includes previous days alongside today's dialog + any other dialogs the user plays.
 */
export const SEEDED_PREVIOUS_DAYS_VOCAB: VocabHistoryEntry[] = [
  {
    key: "prev_day_1",
    dateStr: "Yesterday",
    levelLabel: "Conversational",
    dialogTitle: "La mochila olvidada en el Uber en la Condesa",
    items: [
      {
        term: "qué poca",
        meaning: "How unfair / how rude (short for 'qué poca madre')",
        literalTranslation: "what little",
      },
      {
        term: "hacer un paro",
        meaning: "To do someone a huge favor / help someone out",
        literalTranslation: "to make a stop",
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

export function getStaticMexicanSpanishLesson(
  dateStr: string,
  level: string,
  clipNumber = 1
): StaticLesson {
  const safeLevel = ["A2", "B1", "B2"].includes(level) ? level : "B1";
  const safeClip = clipNumber === 2 ? 2 : 1;
  const key = `${safeLevel}:${safeClip}`;
  const base = RAW_MEXICAN_LESSONS[key] ?? RAW_MEXICAN_LESSONS["B1:1"];
  const basePath = getPublicBasePath();

  return {
    ...base,
    _id: `static_Spanish_${safeLevel}_${safeClip}`,
    dateStr,
    audioUrl: `${basePath}/audio/Spanish-${safeLevel}-${safeClip}.mp3`,
  };
}

export function calculateScoreOutOf5(params: {
  rawScore: number; // 0-100
  usedSlowdown: boolean;
  usedCafeMode: boolean;
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
  const baseRawOutOf5 = (Math.max(0, Math.min(100, params.rawScore)) / 100) * 5;
  const baseScoreOutOf5 = Number(baseRawOutOf5.toFixed(1));

  let multiplier = 1.0;
  const bonusesAndPenalties: Array<{
    label: string;
    effectText: string;
    type: "bonus" | "penalty" | "neutral";
  }> = [];

  if (params.usedSlowdown) {
    multiplier -= 0.2;
    bonusesAndPenalties.push({
      label: "Slow Playback (0.75x)",
      effectText: "-20% Penalty",
      type: "penalty",
    });
  }

  if (params.usedCafeMode) {
    multiplier += 0.15;
    bonusesAndPenalties.push({
      label: "Crowded Cafe Background Noise",
      effectText: "+15% Bonus",
      type: "bonus",
    });
  }

  if (bonusesAndPenalties.length === 0) {
    bonusesAndPenalties.push({
      label: "Standard Playback",
      effectText: "No bonuses or penalties (1.0x)",
      type: "neutral",
    });
  }

  const adjusted = Math.max(0, Math.min(5, baseRawOutOf5 * multiplier));
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

export function gradeAnswersLocally(params: {
  lesson: Pick<StaticLesson, "questions" | "slangNotes">;
  userAnswers: Array<{ questionId: string; answerText: string }>;
  usedSlowdown: boolean;
  usedCafeMode: boolean;
}): {
  rawScore: number;
  multiplier: number;
  finalScore: number;
  feedback: Array<{
    questionId: string;
    score: number;
    explanation: string;
    missedNuance: string;
  }>;
} {
  const maxPerQuestion = [34, 33, 33];
  const stopWords = new Set([
    "the",
    "and",
    "that",
    "this",
    "with",
    "from",
    "they",
    "their",
    "have",
    "has",
    "was",
    "were",
    "for",
    "are",
    "but",
    "not",
    "she",
    "him",
    "her",
    "his",
    "because",
    "about",
    "into",
    "while",
    "when",
    "what",
    "where",
    "which",
    "after",
    "before",
    "also",
    "very",
    "some",
    "them",
    "then",
  ]);

  const feedback = params.lesson.questions.map((q, idx) => {
    const maxPts = maxPerQuestion[idx] ?? 33;
    const userObj = params.userAnswers.find((a) => a.questionId === q.id);
    const answer = (userObj?.answerText ?? "").trim();
    const relatedSlang =
      params.lesson.slangNotes[idx] ?? params.lesson.slangNotes[0];

    if (!answer || answer.length < 2) {
      return {
        questionId: q.id,
        score: 0,
        explanation: `No answer provided (0/${maxPts} pts). Expected answer: ${q.idealAnswerRubric}`,
        missedNuance: relatedSlang
          ? `Slang tip: "${relatedSlang.term}" means "${relatedSlang.meaning}" (literally "${relatedSlang.literalTranslation}").`
          : "Listen closely for the speaker's main reason in this turn.",
      };
    }

    const rubricWords = q.idealAnswerRubric
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñüçàèìòù\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    const lowerAnswer = answer.toLowerCase();
    let matchedCount = 0;
    for (const rw of rubricWords) {
      const stem = rw.slice(0, Math.max(4, rw.length - 2));
      if (lowerAnswer.includes(stem)) {
        matchedCount++;
      }
    }

    if (matchedCount === 0) {
      const minimalEffortScore =
        lowerAnswer.includes("don't know") ||
        lowerAnswer.includes("idk") ||
        answer.length < 8
          ? 0
          : 4;
      return {
        questionId: q.id,
        score: minimalEffortScore,
        explanation: `Missed the key details on this question (${minimalEffortScore}/${maxPts} pts). What actually happened: ${q.idealAnswerRubric}`,
        missedNuance: relatedSlang
          ? `Key phrase to listen for: "${relatedSlang.term}" — ${relatedSlang.meaning} (literally "${relatedSlang.literalTranslation}").`
          : `Check Review Vocab to see how the speakers phrased this.`,
      };
    }

    const matchRatio =
      rubricWords.length > 0 ? matchedCount / rubricWords.length : 0.5;
    const normalizedScore = Math.min(
      1,
      Math.max(0.45, matchRatio * 1.7 + (matchedCount >= 3 ? 0.25 : 0.1))
    );
    const score = Math.round(normalizedScore * maxPts);

    const mentionedSlang =
      relatedSlang &&
      (lowerAnswer.includes(relatedSlang.term.toLowerCase()) ||
        lowerAnswer.includes(
          relatedSlang.meaning.toLowerCase().split(/\s+/)[0] ?? ""
        ));

    return {
      questionId: q.id,
      score,
      explanation:
        score >= maxPts * 0.82
          ? `Spot on! (${score}/${maxPts} pts) — You caught the key details: ${q.idealAnswerRubric}`
          : `Partial gist captured (${score}/${maxPts} pts) — You caught part of it! Full answer: ${q.idealAnswerRubric}`,
      missedNuance: mentionedSlang
        ? `Nice job catching the slang nuance around "${relatedSlang.term}"!`
        : relatedSlang
          ? `Slang spotlight: "${relatedSlang.term}" literally means "${relatedSlang.literalTranslation}", used here to mean "${relatedSlang.meaning}".`
          : `Notice how the speakers use conversational fillers to soften the conflict.`,
    };
  });

  const rawScore = Math.min(
    100,
    feedback.reduce((sum, f) => sum + f.score, 0)
  );

  let multiplier = 1.0;
  if (params.usedSlowdown) {
    multiplier -= 0.2;
  }
  if (params.usedCafeMode) {
    multiplier += 0.15;
  }
  multiplier = Number(multiplier.toFixed(2));
  const finalScore = Math.round(rawScore * multiplier);

  return {
    rawScore,
    multiplier,
    finalScore,
    feedback,
  };
}
