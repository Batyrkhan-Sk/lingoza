import type { CourseEntry } from "../types.js";

/**
 * A2 — Elementary.
 *
 * The level where the past tenses arrive. Preterite and imperfect are taught
 * separately and only then contrasted, because learners who meet them together
 * conflate them permanently.
 */
export const A2_COURSE: CourseEntry = {
  slug: "spanish-a2",
  title: "Spanish A2 — Elementary",
  description:
    "Talk about the past and the future, handle travel, shopping, work and health, and hold a longer conversation.",
  levelCode: "A2",
  modules: [
    {
      slug: "a2-past-preterite",
      title: "The Preterite",
      description: "Report what happened.",
      theme: "Past tenses",
      icon: "History",
      lessons: [
        {
          slug: "a2-preterite-regular",
          title: "The preterite: what happened",
          objective: "Narrate completed past events with regular preterite verbs.",
          estimatedMinutes: 18,
          explanation:
            "The preterite reports a finished event: it happened, it ended, and you are telling us about it.\n\n**-ar** → hablé, hablaste, habló, hablamos, hablasteis, hablaron\n**-er/-ir** → comí, comiste, comió, comimos, comisteis, comieron\n\nThe accents are not decoration. *Hablo* is 'I speak'; *habló* is 'he spoke'. Losing the accent changes both the tense and the person.\n\nTime markers that force the preterite: *ayer, anoche, el año pasado, la semana pasada, hace dos días*.",
          review: "Completed events. Watch the accents: hablo ≠ habló. Ayer, anoche, el año pasado → preterite.",
          grammar: ["preterite"],
          vocabulary: ["ayer", "el año pasado", "ayer por la noche"],
          examples: [
            { spanish: "Ayer comí en un restaurante peruano.", english: "Yesterday I ate at a Peruvian restaurant." },
            { spanish: "¿Qué hiciste el fin de semana?", english: "What did you do at the weekend?", realWorld: true },
            { spanish: "Estudié español durante tres años.", english: "I studied Spanish for three years.", note: "A closed period → preterite." },
          ],
          exercises: [
            {
              title: "Preterite drill",
              kind: "fill_blank",
              prompt: "Put the verb into the preterite.",
              section: "practice",
              grammarSlug: "preterite",
              questions: [
                { kind: "fill_blank", prompt: "Ayer yo ___ (hablar) con Marta.", correctAnswer: "hablé", explanation: "-ar preterite yo form: -é, with the accent." },
                { kind: "fill_blank", prompt: "Ella ___ (comer) paella.", correctAnswer: "comió", explanation: "-er/-ir third person: -ió." },
                { kind: "fill_blank", prompt: "Nosotros ___ (vivir) en Chile dos años.", correctAnswer: "vivimos", explanation: "-ir verbs share the same nosotros form in present and preterite; context tells them apart." },
                {
                  kind: "multiple_choice",
                  prompt: "Which means 'he spoke'?",
                  correctAnswer: "habló",
                  explanation: "The accent moves the stress and changes the meaning entirely.",
                  options: [
                    { text: "habló" },
                    { text: "hablo", feedback: "Without the accent this is 'I speak'." },
                    { text: "hablé", feedback: "That is 'I spoke'." },
                  ],
                },
              ],
            },
          ],
        },
        {
          slug: "a2-preterite-irregular",
          title: "Irregular preterites",
          objective: "Use the common irregular preterites: ser/ir, tener, hacer, estar, poder.",
          estimatedMinutes: 16,
          explanation:
            "A small group of very frequent verbs has irregular preterite stems, and — usefully — they all take the **same set of endings**, with no accents at all: *-e, -iste, -o, -imos, -isteis, -ieron*.\n\ntener → **tuv-** · estar → **estuv-** · poder → **pud-** · poner → **pus-** · hacer → **hic-** · querer → **quis-** · venir → **vin-** · decir → **dij-**\n\n**ser** and **ir** share one preterite completely: *fui, fuiste, fue, fuimos, fuisteis, fueron*. Context alone tells them apart — *fui médico* (I was a doctor) versus *fui a Madrid* (I went to Madrid).",
          review: "Irregular stems, unaccented endings. ser and ir are identical in the preterite.",
          prerequisites: ["a2-preterite-regular"],
          grammar: ["preterite"],
          examples: [
            { spanish: "Fui a Barcelona el año pasado.", english: "I went to Barcelona last year." },
            { spanish: "No pude venir porque tuve que trabajar.", english: "I couldn't come because I had to work." },
            { spanish: "¿Qué dijo?", english: "What did he say?", note: "decir → dij-, and the ellos form is dijeron, not dijieron." },
          ],
          exercises: [
            {
              title: "Irregular preterites",
              kind: "fill_blank",
              prompt: "Complete in the preterite.",
              section: "test",
              grammarSlug: "preterite",
              questions: [
                { kind: "fill_blank", prompt: "Yo ___ (tener) que salir temprano.", correctAnswer: "tuve", explanation: "tener → tuv- + -e, with no accent." },
                { kind: "fill_blank", prompt: "Ellos ___ (ir) al cine.", correctAnswer: "fueron", explanation: "ser and ir share the preterite: fueron." },
                { kind: "fill_blank", prompt: "¿Qué ___ (hacer) tú ayer?", correctAnswer: "hiciste", explanation: "hacer → hic-, and the tú form is hiciste." },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a2-past-imperfect",
      title: "The Imperfect",
      description: "Describe how things used to be.",
      theme: "Past tenses",
      icon: "CloudFog",
      lessons: [
        {
          slug: "a2-imperfect",
          title: "The imperfect: how things were",
          objective: "Describe past habits, settings and ongoing situations.",
          estimatedMinutes: 16,
          explanation:
            "The imperfect describes rather than reports. It is the tense of childhood, of scene-setting, and of 'used to'.\n\n**-ar** → hablaba, hablabas, hablaba, hablábamos, hablabais, hablaban\n**-er/-ir** → comía, comías, comía, comíamos, comíais, comían\n\nOnly three verbs in the entire language are irregular here: **ser** (era), **ir** (iba), **ver** (veía).\n\nUse it for: what you used to do, what things were like, ages and times in the past, and actions already in progress when something else happened.",
          review: "Habits, descriptions, background. Only ser, ir and ver are irregular.",
          prerequisites: ["a2-preterite-irregular"],
          grammar: ["imperfect"],
          examples: [
            { spanish: "Cuando era niño, vivía en el campo.", english: "When I was a child, I lived in the countryside." },
            { spanish: "Llovía y no había nadie en la calle.", english: "It was raining and there was nobody in the street.", note: "Scene-setting." },
            { spanish: "Antes fumaba, pero lo dejé.", english: "I used to smoke, but I gave up." },
          ],
          exercises: [
            {
              title: "Imperfect drill",
              kind: "fill_blank",
              prompt: "Complete in the imperfect.",
              section: "practice",
              grammarSlug: "imperfect",
              questions: [
                { kind: "fill_blank", prompt: "Cuando yo ___ (ser) joven, jugaba al fútbol.", correctAnswer: "era", explanation: "ser is irregular: era, eras, era…" },
                { kind: "fill_blank", prompt: "Todos los veranos ___ (ir) a la playa.", correctAnswer: "íbamos", acceptedAnswers: ["iba"], explanation: "ir → iba/íbamos. A repeated habit takes the imperfect." },
                { kind: "fill_blank", prompt: "Mi abuela ___ (cocinar) muy bien.", correctAnswer: "cocinaba", explanation: "A general description of how things were." },
              ],
            },
          ],
        },
        {
          slug: "a2-preterite-vs-imperfect",
          title: "Preterite or imperfect",
          objective: "Choose the right past tense to tell a story.",
          estimatedMinutes: 20,
          explanation:
            "Now the two meet, and this is where the level is won or lost.\n\nThink of a film. The **imperfect** is everything already on screen when the camera starts: the weather, the setting, what people were doing. The **preterite** is what then happens — the plot.\n\n> *Era de noche y llovía.* (setting — imperfect)\n> *Entonces sonó el teléfono.* (event — preterite)\n\nThat is why interrupted actions combine them: *Dormía cuando llamaste* — I was sleeping (imperfect background) when you called (preterite event).\n\nA few verbs shift meaning between the two: *sabía* (I knew) vs *supe* (I found out); *quería* (I wanted) vs *quise* (I tried); *conocía* (I knew someone) vs *conocí* (I met them).",
          review:
            "Imperfect = the set. Preterite = the plot. Interruptions use both. Some verbs change meaning between them.",
          prerequisites: ["a2-imperfect"],
          grammar: ["preterite", "imperfect"],
          examples: [
            { spanish: "Estudiaba cuando llamaste.", english: "I was studying when you called." },
            { spanish: "La conocí en 2019.", english: "I met her in 2019.", note: "conocer in the preterite = met." },
            { spanish: "Ya la conocía.", english: "I already knew her.", note: "Imperfect = the ongoing state of knowing." },
          ],
          exercises: [
            {
              title: "Which past tense?",
              kind: "multiple_choice",
              prompt: "Choose the correct tense.",
              section: "test",
              grammarSlug: "imperfect",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "Cuando era niño, ___ al fútbol todos los días.",
                  correctAnswer: "jugaba",
                  explanation: "A repeated childhood habit → imperfect.",
                  options: [{ text: "jugaba" }, { text: "jugué", feedback: "The preterite would mean one single occasion." }],
                },
                {
                  kind: "multiple_choice",
                  prompt: "Ayer ___ a las ocho.",
                  correctAnswer: "llegué",
                  explanation: "'Ayer' plus a specific time → a completed event.",
                  options: [{ text: "llegué" }, { text: "llegaba", feedback: "The imperfect would describe a habit, not yesterday's single arrival." }],
                },
                {
                  kind: "multiple_choice",
                  prompt: "___ cuando sonó el teléfono.",
                  correctAnswer: "Dormía",
                  explanation: "The background action is imperfect; the interruption is preterite.",
                  options: [{ text: "Dormía" }, { text: "Dormí", feedback: "That would mean the sleeping finished, then the phone rang." }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a2-future",
      title: "The Future",
      description: "Talk about plans and predictions.",
      theme: "Future",
      icon: "CalendarClock",
      lessons: [
        {
          slug: "a2-future-forms",
          title: "Two ways to talk about the future",
          objective: "Use ir a + infinitive and the simple future.",
          estimatedMinutes: 14,
          explanation:
            "**ir a + infinitive** is the everyday future — plans, intentions, things you can see coming. *Voy a llamarla mañana.*\n\nThe **simple future** adds the endings *-é, -ás, -á, -emos, -éis, -án* to the whole infinitive: *hablaré, comerás, vivirán*. It is used for more distant or formal predictions — and, oddly, for **present-tense speculation**: *¿Dónde estará Ana?* means 'Where can Ana be?', not 'where will she be'.\n\nA dozen verbs have irregular future stems: tener → tendr-, salir → saldr-, hacer → har-, decir → dir-, poder → podr-, querer → querr-, saber → sabr-, poner → pondr-, venir → vendr-.",
          review: "ir a + inf for plans; the simple future for predictions and for guessing about now.",
          grammar: ["near-future"],
          examples: [
            { spanish: "Voy a estudiar esta noche.", english: "I'm going to study tonight." },
            { spanish: "Mañana hará frío.", english: "It will be cold tomorrow." },
            { spanish: "¿Qué hora será?", english: "I wonder what time it is.", note: "The future used to speculate about the present." },
          ],
          exercises: [
            {
              title: "Future forms",
              kind: "fill_blank",
              prompt: "Complete the sentence.",
              section: "practice",
              grammarSlug: "near-future",
              questions: [
                { kind: "fill_blank", prompt: "Mañana ___ a ir al médico.", correctAnswer: "voy", explanation: "ir a + infinitive: voy a ir." },
                { kind: "fill_blank", prompt: "El año que viene ___ (tener, yo) más tiempo.", correctAnswer: "tendré", explanation: "tener has the irregular future stem tendr-." },
                {
                  kind: "multiple_choice",
                  prompt: "Which is correct?",
                  correctAnswer: "Voy a estudiar.",
                  explanation: "The 'a' is obligatory in this construction.",
                  options: [{ text: "Voy a estudiar." }, { text: "Voy estudiar.", feedback: "The 'a' cannot be dropped." }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a2-travel",
      title: "Travel",
      description: "Airports, hotels, directions and transport.",
      theme: "Travel",
      icon: "Plane",
      lessons: [
        {
          slug: "a2-travel-getting-around",
          title: "Getting around",
          objective: "Book a room, ask for directions, and handle transport.",
          estimatedMinutes: 16,
          explanation:
            "Travel Spanish is built on a small set of high-value phrases plus the **usted** commands you will hear in reply.\n\n*¿Cómo llego a…?* — how do I get to…?\n*Siga recto y gire a la derecha.* — go straight on and turn right.\n*¿A qué hora sale el tren?* — what time does the train leave?\n*Tengo una reserva a nombre de…* — I have a booking in the name of…\n\nYou need to *recognise* commands far more than produce them: *siga, gire, coja, baje, cruce*.",
          review: "¿Cómo llego a…? · siga / gire / cruce · ¿A qué hora sale…? · Tengo una reserva a nombre de…",
          prerequisites: ["a2-future-forms"],
          vocabulary: ["el viaje", "el billete", "el aeropuerto", "el hotel", "la habitación", "reservar", "el equipaje"],
          grammar: ["commands"],
          culturalNote:
            "In Spain a *billete* is a ticket and a *boleto* is a raffle ticket; in Latin America *boleto* is the normal word for a travel ticket. Ask for *un billete de ida y vuelta* in Madrid, *un boleto redondo* in Mexico City.",
          examples: [
            { spanish: "¿Cómo llego al centro?", english: "How do I get to the centre?", realWorld: true },
            { spanish: "Un billete de ida y vuelta, por favor.", english: "A return ticket, please.", realWorld: true },
            { spanish: "Tengo una reserva a nombre de Smith.", english: "I have a booking under Smith.", realWorld: true },
          ],
          listening: [
            {
              slug: "a2-listen-directions",
              title: "Asking for directions",
              levelCode: "A2",
              format: "conversation",
              speed: "normal",
              accent: "Madrid",
              region: "es-ES",
              intro: "A tourist asks a passer-by how to reach the museum.",
              segments: [
                { speaker: "Turista", spanish: "Perdone, ¿cómo llego al museo?", english: "Excuse me, how do I get to the museum?" },
                { speaker: "Señora", spanish: "Siga recto por esta calle unos doscientos metros.", english: "Go straight along this street for about two hundred metres." },
                { speaker: "Señora", spanish: "Luego gire a la derecha en el semáforo.", english: "Then turn right at the traffic light." },
                { speaker: "Turista", spanish: "¿Está lejos?", english: "Is it far?" },
                { speaker: "Señora", spanish: "No, a diez minutos andando.", english: "No, ten minutes on foot." },
                { speaker: "Turista", spanish: "Muchas gracias.", english: "Thank you very much." },
              ],
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "Where should the tourist turn right?",
                  correctAnswer: "At the traffic light",
                  explanation: "'Gire a la derecha en el semáforo.'",
                  options: [{ text: "At the traffic light" }, { text: "At the square" }, { text: "At the museum" }],
                },
                {
                  kind: "short_answer",
                  prompt: "How long does it take on foot?",
                  correctAnswer: "10 minutes",
                  acceptedAnswers: ["diez minutos", "ten minutes"],
                  explanation: "'A diez minutos andando.'",
                },
              ],
            },
          ],
          exercises: [
            {
              title: "Travel phrases",
              kind: "translate",
              prompt: "Translate into Spanish.",
              section: "test",
              questions: [
                { kind: "translate", prompt: "What time does the train leave?", correctAnswer: "¿A qué hora sale el tren?", acceptedAnswers: ["A qué hora sale el tren"], explanation: "salir for departures." },
                { kind: "translate", prompt: "I have a booking.", correctAnswer: "Tengo una reserva", explanation: "tener + reserva." },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a2-work-health",
      title: "Work, Health & Relationships",
      description: "Jobs, the doctor, and people in your life.",
      theme: "Daily life",
      icon: "Briefcase",
      lessons: [
        {
          slug: "a2-health-doctor",
          title: "At the doctor",
          objective: "Describe symptoms using doler and body vocabulary.",
          estimatedMinutes: 15,
          explanation:
            "**Doler** works like *gustar* — backwards from English. The body part is the subject:\n\n*Me duele la cabeza* — literally 'the head hurts to me'.\n*Me duelen los pies* — plural body part, so *duelen*.\n\nAlso note that Spanish uses the **definite article** with body parts, not a possessive: *me duele **la** cabeza*, never *mi cabeza*.\n\nUseful whole phrases: *No me encuentro bien* (I don't feel well), *Tengo fiebre* (I have a temperature), *Me duele desde hace dos días* (it's hurt for two days).",
          review: "doler agrees with the body part. Use the article, not a possessive. Tengo fiebre / No me encuentro bien.",
          prerequisites: ["a2-travel-getting-around"],
          vocabulary: ["la salud", "doler", "la cabeza", "el médico", "enfermo", "la cita"],
          grammar: ["direct-indirect-pronouns"],
          examples: [
            { spanish: "Me duele la garganta.", english: "My throat hurts.", realWorld: true },
            { spanish: "Me duelen las piernas.", english: "My legs hurt.", note: "Plural body part → duelen." },
            { spanish: "Quería pedir cita con el médico.", english: "I'd like to make a doctor's appointment.", realWorld: true },
          ],
          exercises: [
            {
              title: "Symptoms",
              kind: "fill_blank",
              prompt: "Complete with doler.",
              section: "practice",
              questions: [
                { kind: "fill_blank", prompt: "Me ___ la cabeza.", correctAnswer: "duele", explanation: "Singular body part → duele." },
                { kind: "fill_blank", prompt: "Me ___ los ojos.", correctAnswer: "duelen", explanation: "Plural body part → duelen." },
                {
                  kind: "multiple_choice",
                  prompt: "Which is correct?",
                  correctAnswer: "Me duele la cabeza.",
                  explanation: "Spanish uses the definite article with body parts.",
                  options: [
                    { text: "Me duele la cabeza." },
                    { text: "Me duele mi cabeza.", feedback: "The 'me' already tells us whose head it is." },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
