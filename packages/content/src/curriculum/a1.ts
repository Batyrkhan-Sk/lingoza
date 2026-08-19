import type { CourseEntry } from "../types.js";

/**
 * A1 — Complete Beginner.
 *
 * The order of these modules is the pedagogy and is not arbitrary: sounds
 * before words, words before sentences, and every lesson's prerequisites are
 * declared so nothing can be reached before the material it depends on (§23).
 */
export const A1_COURSE: CourseEntry = {
  slug: "spanish-a1",
  title: "Spanish A1 — Foundations",
  description:
    "From knowing nothing to holding a simple conversation about yourself, your family and your day.",
  levelCode: "A1",
  modules: [
    {
      slug: "a1-alphabet",
      title: "Alphabet & Pronunciation",
      description: "The sounds of Spanish, and why spelling will never trick you again.",
      theme: "Pronunciation",
      icon: "Volume2",
      lessons: [
        {
          slug: "a1-alphabet-vowels",
          title: "The five vowels",
          objective: "Pronounce the five Spanish vowels purely and consistently.",
          estimatedMinutes: 10,
          explanation:
            "Spanish has exactly five vowel sounds, and they never change. English has around twenty and spells them unpredictably; this is the first place Spanish is *easier* than your own language, and it is worth getting exactly right on day one because every word you ever say is built from these five sounds.\n\n**a** — like the *a* in *father*\n**e** — like the *e* in *bet*\n**i** — like the *ee* in *see*\n**o** — like the *o* in *or*\n**u** — like the *oo* in *food*\n\nThe critical habit to build: keep them **short and pure**. English glides its vowels — *no* comes out as *nou*, *say* as *seiy*. Spanish never does this. Cut the vowel off cleanly.",
          review:
            "Five vowels, one sound each, never gliding. If you can say *a-e-i-o-u* cleanly you can pronounce any Spanish word you can read.",
          grammar: ["alphabet-and-sounds"],
          examples: [
            { spanish: "casa", english: "house", note: "Two clean 'a' sounds — not 'ka-suh'." },
            { spanish: "mesa", english: "table", note: "The 'e' is short, as in 'bet'." },
            { spanish: "libro", english: "book", note: "The 'i' is 'ee', never the English short 'i'." },
            { spanish: "no", english: "no", note: "A pure 'o'. Do not let it slide into 'ou'." },
            { spanish: "universidad", english: "university", note: "Five vowels, all short and even." },
          ],
          speaking: [
            {
              slug: "a1-speak-vowels",
              title: "The five vowels",
              levelCode: "A1",
              instruction: "Say the five vowels slowly and clearly, then the word 'universidad'.",
              targetText: "a, e, i, o, u. Universidad.",
              focusSounds: ["vowels"],
              mode: "repeat",
            },
          ],
          exercises: [
            {
              title: "Vowel sounds",
              kind: "multiple_choice",
              prompt: "Choose the correct description of the vowel sound.",
              section: "practice",
              grammarSlug: "alphabet-and-sounds",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "How is the 'i' in 'libro' pronounced?",
                  correctAnswer: "like 'ee' in 'see'",
                  explanation: "Spanish 'i' is always the 'ee' sound — libro is 'LEE-bro'.",
                  options: [
                    { text: "like 'ee' in 'see'" },
                    { text: "like 'i' in 'sit'", feedback: "That short English 'i' does not exist in Spanish." },
                    { text: "like 'ai' in 'file'", feedback: "That is how the letter is named in English, not how it sounds in Spanish." },
                  ],
                },
                {
                  kind: "multiple_choice",
                  prompt: "Which word contains a silent letter?",
                  correctAnswer: "hola",
                  explanation: "The letter h is silent in every Spanish word — 'hola' is said 'OH-la'.",
                  options: [
                    { text: "hola" },
                    { text: "mesa", feedback: "Every letter in 'mesa' is pronounced." },
                    { text: "libro", feedback: "Every letter in 'libro' is pronounced." },
                  ],
                },
              ],
            },
          ],
        },
        {
          slug: "a1-alphabet-consonants",
          title: "The consonants that trip you up",
          objective: "Produce the rolled r, the Spanish j, and ñ, and read c/g correctly.",
          estimatedMinutes: 14,
          explanation:
            "Most Spanish consonants behave the way you expect. Five do not, and they account for almost every mispronunciation an English speaker makes.\n\n**h** is always silent. *Hola* is 'OH-la'.\n**j** is a rasp from the back of the throat, like the *ch* in Scottish *loch*. *Jamón*, *trabajo*.\n**ñ** is a single sound, the *ny* of *canyon*. *Año* (year) and *ano* (anus) differ by exactly this — it matters.\n**rr** is rolled; a single **r** between vowels is a quick tap. *Perro* (dog) vs *pero* (but).\n**c** and **g** soften before *e* and *i*: *casa* has a hard k, *cena* does not.\n\nThe rolled **rr** takes most learners weeks. That is normal and not a sign you cannot do it.",
          review:
            "h silent · j from the throat · ñ is one sound · rr rolled, r tapped · c and g soften before e/i.",
          prerequisites: ["a1-alphabet-vowels"],
          grammar: ["alphabet-and-sounds"],
          culturalNote:
            "In most of Spain, **c** before e/i and **z** are pronounced 'th' as in *think* — *cinco* is 'THEEN-ko'. In all of Latin America and in southern Spain they are pronounced 's' — 'SEEN-ko'. Both are entirely correct; the Latin American 's' pronunciation is used by far more speakers.",
          examples: [
            { spanish: "perro / pero", english: "dog / but", note: "The roll is the only difference between these two words." },
            { spanish: "año / ano", english: "year / anus", note: "A good reason to learn ñ properly." },
            { spanish: "jamón", english: "ham", note: "The j is a throat rasp, not an English h." },
            { spanish: "gente", english: "people", note: "g before e sounds like the Spanish j." },
            { spanish: "guitarra", english: "guitar", note: "gu keeps the g hard; the u is silent." },
          ],
          speaking: [
            {
              slug: "a1-speak-rr",
              title: "The rolled R",
              levelCode: "A1",
              instruction: "Say these three words, rolling the double r.",
              targetText: "Perro. Carro. Guitarra.",
              focusSounds: ["rr"],
              mode: "repeat",
            },
          ],
          exercises: [
            {
              title: "Tricky consonants",
              kind: "multiple_choice",
              prompt: "Choose the correct answer.",
              section: "test",
              grammarSlug: "alphabet-and-sounds",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "Which pair differ only by a rolled r?",
                  correctAnswer: "perro / pero",
                  explanation: "perro (dog) has the rolled rr; pero (but) has a single tapped r.",
                  options: [
                    { text: "perro / pero" },
                    { text: "casa / cosa", feedback: "These differ by a vowel, not the r." },
                    { text: "año / ano", feedback: "These differ by ñ." },
                  ],
                },
                {
                  kind: "multiple_choice",
                  prompt: "How is 'gente' pronounced?",
                  correctAnswer: "HEN-te (throaty h)",
                  explanation: "g before e or i takes the throaty j sound.",
                  options: [
                    { text: "HEN-te (throaty h)" },
                    { text: "GEN-te (hard g as in 'go')", feedback: "The g only stays hard before a, o, u — or when written gu." },
                  ],
                },
                {
                  kind: "true_false",
                  prompt: "The letter h is pronounced in 'hola'.",
                  correctAnswer: "false",
                  explanation: "h is silent in every Spanish word.",
                  options: [{ text: "true" }, { text: "false" }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a1-greetings",
      title: "Basic Greetings",
      description: "Open and close a conversation, and handle the formal/informal choice.",
      theme: "Greetings",
      icon: "Hand",
      lessons: [
        {
          slug: "a1-greetings-hello",
          title: "Hello and goodbye",
          objective: "Greet someone and say goodbye at any time of day.",
          estimatedMinutes: 12,
          explanation:
            "Spanish greetings are tied to the time of day, and the boundaries are not the same as in English.\n\n**Buenos días** — from waking until roughly 2pm (lunch).\n**Buenas tardes** — from lunch until dark, which in Spain can be 10pm in summer.\n**Buenas noches** — after dark, used both as a greeting *and* as 'good night' when leaving.\n\n**Hola** works at any hour and with anyone. It is not informal in the way English 'hey' is — you can say *hola* to a doctor.\n\nNotice that *días* is masculine plural and *tardes*/*noches* are feminine plural, which is why the adjective changes: *buenos* días, *buenas* tardes.",
          review:
            "Hola always works. Buenos días until lunch, buenas tardes until dark, buenas noches after. Adiós or hasta luego to leave.",
          prerequisites: ["a1-alphabet-consonants"],
          vocabulary: ["hola", "adiós", "buenos días", "buenas tardes", "buenas noches", "por favor", "gracias", "de nada"],
          grammar: ["gender-and-articles"],
          culturalNote:
            "In Spain, two kisses on the cheek (right first) are standard between women, and between a man and a woman, in social settings. Men usually shake hands or embrace. In much of Latin America a single kiss is the norm. In a professional first meeting anywhere, a handshake is safe.",
          examples: [
            { spanish: "¡Hola! ¿Qué tal?", english: "Hi! How's it going?", note: "The everyday greeting between people who know each other." },
            { spanish: "Buenos días, señora García.", english: "Good morning, Mrs. García.", note: "Polite and formal — surname, not first name." },
            { spanish: "Hasta luego.", english: "See you later.", note: "By far the most common way to leave; used even if you will not see the person again." },
            { spanish: "Adiós, buenas noches.", english: "Goodbye, good night." },
          ],
          listening: [
            {
              slug: "a1-listen-greetings",
              title: "Two neighbours meet",
              levelCode: "A1",
              format: "conversation",
              speed: "slow",
              accent: "Madrid",
              region: "es-ES",
              intro: "Two neighbours run into each other in the morning.",
              segments: [
                { speaker: "Ana", spanish: "¡Buenos días, Carlos!", english: "Good morning, Carlos!" },
                { speaker: "Carlos", spanish: "¡Hola, Ana! ¿Qué tal?", english: "Hi, Ana! How's it going?" },
                { speaker: "Ana", spanish: "Muy bien, gracias. ¿Y tú?", english: "Very well, thanks. And you?" },
                { speaker: "Carlos", spanish: "Bien también. Hasta luego.", english: "Good too. See you later." },
                { speaker: "Ana", spanish: "¡Hasta luego!", english: "See you!" },
              ],
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "What time of day is it?",
                  correctAnswer: "Morning",
                  explanation: "'Buenos días' is used until around lunchtime.",
                  options: [{ text: "Morning" }, { text: "Afternoon" }, { text: "Night" }],
                },
              ],
            },
          ],
          exercises: [
            {
              title: "Greetings practice",
              kind: "multiple_choice",
              prompt: "Choose the right greeting.",
              section: "practice",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "It is 9am. You greet your neighbour.",
                  correctAnswer: "Buenos días",
                  explanation: "Before lunch, it is buenos días.",
                  options: [
                    { text: "Buenos días" },
                    { text: "Buenas tardes", feedback: "That starts after lunch." },
                    { text: "Buenas noches", feedback: "That is for after dark." },
                  ],
                },
                {
                  kind: "fill_blank",
                  prompt: "—Gracias. —De ___.",
                  correctAnswer: "nada",
                  explanation: "'De nada' is 'you're welcome' — literally 'of nothing'.",
                },
                {
                  kind: "translate",
                  prompt: "Translate: See you later.",
                  correctAnswer: "Hasta luego",
                  acceptedAnswers: ["hasta luego", "Hasta pronto"],
                  explanation: "'Hasta luego' is the standard everyday goodbye.",
                },
              ],
            },
          ],
        },
        {
          slug: "a1-greetings-tu-usted",
          title: "Tú or usted",
          objective: "Choose correctly between informal tú and formal usted.",
          estimatedMinutes: 12,
          explanation:
            "English lost this distinction centuries ago; Spanish still has it, and getting it wrong is socially noticeable.\n\n**tú** — friends, family, children, colleagues your own age, anyone who has invited it.\n**usted** — older strangers, officials, doctors, your boss on the first day, anyone you want to show respect to.\n\nThe grammar consequence: *usted* takes the **third person** verb form, the same as *él/ella*. So *¿Cómo estás?* (tú) becomes *¿Cómo está?* (usted).\n\nThe safe strategy: use *usted* with any adult stranger and switch when they switch, or when they say *puedes tutearme* ('you can use tú with me').",
          review: "tú for peers, usted for respect. Usted takes the él/ella verb form.",
          prerequisites: ["a1-greetings-hello"],
          grammar: ["subject-pronouns"],
          culturalNote:
            "Spain uses *tú* far more freely than most of Latin America — in Madrid a shop assistant your own age will likely use *tú* immediately. In Colombia and Costa Rica *usted* is used even between friends and family. In Argentina and Uruguay, *tú* is replaced by **vos**, with its own verb forms: *vos tenés* instead of *tú tienes*.",
          examples: [
            { spanish: "¿Cómo estás?", english: "How are you? (informal)", note: "tú form — note the -s." },
            { spanish: "¿Cómo está usted?", english: "How are you? (formal)", note: "Third-person form, no -s." },
            { spanish: "¿De dónde eres?", english: "Where are you from? (tú)" },
            { spanish: "¿De dónde es usted?", english: "Where are you from? (usted)" },
          ],
          exercises: [
            {
              title: "Formal or informal",
              kind: "multiple_choice",
              prompt: "Pick the appropriate form.",
              section: "test",
              grammarSlug: "subject-pronouns",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "You are speaking to an elderly stranger. How do you ask how they are?",
                  correctAnswer: "¿Cómo está usted?",
                  explanation: "An older stranger takes usted, which uses the third-person verb form.",
                  options: [
                    { text: "¿Cómo está usted?" },
                    { text: "¿Cómo estás?", feedback: "That is the tú form — too familiar with a stranger." },
                  ],
                },
                {
                  kind: "multiple_choice",
                  prompt: "Which verb form goes with 'usted'?",
                  correctAnswer: "The same as él/ella",
                  explanation: "Usted is grammatically third person, even though it means 'you'.",
                  options: [
                    { text: "The same as él/ella" },
                    { text: "The same as tú", feedback: "This is the most common mistake with usted." },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a1-introducing-yourself",
      title: "Introducing Yourself",
      description: "Say who you are, where you are from, and what you do.",
      theme: "Identity",
      icon: "UserRound",
      lessons: [
        {
          slug: "a1-intro-name-origin",
          title: "Name, origin and ser",
          objective: "Introduce yourself with your name, nationality and job using ser.",
          estimatedMinutes: 15,
          explanation:
            "Introducing yourself needs one verb — **ser** — and one reflexive expression, **llamarse**.\n\n*Me llamo Ana* is literally 'I call myself Ana'. *Soy de Inglaterra* — 'I am from England'. *Soy profesor* — 'I am a teacher'.\n\nTwo things surprise English speakers here. First, **no article before a profession**: it is *soy profesor*, never *soy un profesor*. Second, nationalities and professions are **not capitalised**: *soy inglés*, not *soy Inglés*.\n\nser: **soy, eres, es, somos, sois, son**.",
          review:
            "Me llamo… · Soy de… · Soy [profession, no article]. Nationalities and jobs are lowercase.",
          prerequisites: ["a1-greetings-tu-usted"],
          vocabulary: ["ser", "el nombre", "el trabajo", "la ciudad"],
          grammar: ["ser", "subject-pronouns"],
          examples: [
            { spanish: "Me llamo Elena.", english: "My name is Elena.", note: "Literally 'I call myself'." },
            { spanish: "Soy de Manchester, pero vivo en Madrid.", english: "I'm from Manchester, but I live in Madrid.", realWorld: true },
            { spanish: "Soy ingeniera.", english: "I'm an engineer.", note: "No 'una' — and feminine because the speaker is a woman." },
            { spanish: "Es mi primera vez en España.", english: "It's my first time in Spain.", realWorld: true },
          ],
          speaking: [
            {
              slug: "a1-speak-intro",
              title: "Introduce yourself",
              levelCode: "A1",
              instruction: "Say your name, where you are from, and what you do — three sentences.",
              mode: "freeform",
            },
          ],
          writing: [
            {
              slug: "a1-write-intro",
              title: "Introduce yourself",
              levelCode: "A1",
              instruction: "Write a short introduction: your name, where you are from, where you live, and what you do.",
              minWords: 25,
              maxWords: 60,
              targetStructures: ["me llamo", "ser", "vivir en"],
            },
          ],
          exercises: [
            {
              title: "Introductions",
              kind: "fill_blank",
              prompt: "Complete the sentence.",
              section: "practice",
              grammarSlug: "ser",
              questions: [
                {
                  kind: "fill_blank",
                  prompt: "Me ___ Carlos.",
                  correctAnswer: "llamo",
                  explanation: "llamarse is reflexive: me llamo, te llamas, se llama.",
                },
                {
                  kind: "fill_blank",
                  prompt: "___ de México.",
                  correctAnswer: "Soy",
                  acceptedAnswers: ["soy"],
                  explanation: "Origin uses ser: soy de + place.",
                },
                {
                  kind: "multiple_choice",
                  prompt: "Which is correct?",
                  correctAnswer: "Soy profesora.",
                  explanation: "Spanish drops the article before an unmodified profession.",
                  options: [
                    { text: "Soy profesora." },
                    { text: "Soy una profesora.", feedback: "No article before a plain profession." },
                    { text: "Estoy profesora.", feedback: "A profession is identity, so it takes ser." },
                  ],
                },
                {
                  kind: "translate",
                  prompt: "Translate: I'm from Ireland.",
                  correctAnswer: "Soy de Irlanda",
                  explanation: "ser + de + country for origin.",
                },
              ],
            },
          ],
        },
        {
          slug: "a1-intro-ser-estar",
          title: "Ser and estar",
          objective: "Choose correctly between ser and estar in everyday sentences.",
          estimatedMinutes: 18,
          explanation:
            "Spanish has two verbs for 'to be', and choosing between them is the single most persistent difficulty English speakers have. The good news: the rule is learnable in one sitting, and then it is practice.\n\n**Ser** answers *what is this?* — identity, origin, profession, material, time.\n**Estar** answers *how or where is this right now?* — location, state, mood, and anything in progress.\n\n> *Soy estudiante.* — I am a student. (That is who I am.)\n> *Estoy cansado.* — I am tired. (That is how I am right now.)\n\nThe usual shorthand of 'permanent vs temporary' works often but breaks down: *Madrid está en España* uses estar although Madrid is not going anywhere, and *está muerto* uses estar although death is permanent. The more reliable version: **ser defines, estar describes a condition or position**.\n\nSome adjectives take both and change meaning entirely — *es aburrido* (he is boring) versus *está aburrido* (he is bored).",
          review:
            "Ser defines what something is. Estar describes how or where it is now. Location is always estar; profession and origin are always ser.",
          prerequisites: ["a1-intro-name-origin"],
          vocabulary: ["ser", "estar", "cansado", "contento", "la casa"],
          grammar: ["ser", "estar"],
          examples: [
            { spanish: "Soy estudiante.", english: "I am a student.", note: "Identity → ser." },
            { spanish: "Estoy cansado.", english: "I am tired.", note: "Current state → estar." },
            { spanish: "Madrid está en España.", english: "Madrid is in Spain.", note: "Location is always estar, permanent or not." },
            { spanish: "La sopa está fría.", english: "The soup is cold.", note: "It became cold — a change of state." },
            { spanish: "El hielo es frío.", english: "Ice is cold.", note: "An inherent property of ice → ser." },
            { spanish: "Está lloviendo.", english: "It's raining.", note: "The progressive always uses estar." },
          ],
          listening: [
            {
              slug: "a1-listen-ser-estar",
              title: "How are you? Who are you?",
              levelCode: "A1",
              format: "conversation",
              speed: "slow",
              accent: "Ciudad de México",
              region: "es-419",
              intro: "Two students meet on the first day of class.",
              segments: [
                { speaker: "Luis", spanish: "Hola, me llamo Luis. ¿Y tú?", english: "Hi, my name is Luis. And you?" },
                { speaker: "Marta", spanish: "Soy Marta. Soy de Perú.", english: "I'm Marta. I'm from Peru." },
                { speaker: "Luis", spanish: "¿Estás cansada?", english: "Are you tired?" },
                { speaker: "Marta", spanish: "Sí, estoy muy cansada. El viaje fue largo.", english: "Yes, I'm very tired. The trip was long." },
                { speaker: "Luis", spanish: "¿Eres estudiante?", english: "Are you a student?" },
                { speaker: "Marta", spanish: "Sí, soy estudiante de medicina.", english: "Yes, I'm a medical student." },
              ],
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "Why does Luis say 'estás cansada' and not 'eres cansada'?",
                  correctAnswer: "Being tired is a temporary state",
                  explanation: "'Eres cansada' would suggest she is a tiring person by nature.",
                  options: [
                    { text: "Being tired is a temporary state" },
                    { text: "Because she is a woman", feedback: "Gender changes the ending, not the choice of verb." },
                    { text: "Because she is from Peru", feedback: "Origin is unrelated to this choice." },
                  ],
                },
              ],
            },
          ],
          exercises: [
            {
              title: "Ser or estar",
              kind: "multiple_choice",
              prompt: "Choose ser or estar.",
              section: "practice",
              grammarSlug: "ser",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "Yo ___ profesor.",
                  correctAnswer: "soy",
                  explanation: "A profession is identity → ser.",
                  options: [
                    { text: "soy" },
                    { text: "estoy", feedback: "'Estoy profesor' is not possible — a job is who you are, not how you are." },
                  ],
                },
                {
                  kind: "multiple_choice",
                  prompt: "El café ___ caliente.",
                  correctAnswer: "está",
                  explanation: "The coffee became hot — a current condition → estar.",
                  options: [
                    { text: "está" },
                    { text: "es", feedback: "'Es caliente' would describe coffee as inherently hot by nature." },
                  ],
                },
                {
                  kind: "multiple_choice",
                  prompt: "Nosotros ___ en Barcelona.",
                  correctAnswer: "estamos",
                  explanation: "Location is always estar.",
                  options: [
                    { text: "estamos" },
                    { text: "somos", feedback: "'Somos de Barcelona' would mean we are from there — a different sentence." },
                  ],
                },
                {
                  kind: "fill_blank",
                  prompt: "María ___ muy inteligente.",
                  correctAnswer: "es",
                  explanation: "Intelligence is a defining characteristic → ser.",
                },
                {
                  kind: "fill_blank",
                  prompt: "¿Dónde ___ el baño?",
                  correctAnswer: "está",
                  explanation: "Location → estar. This is a sentence worth memorising whole.",
                },
              ],
            },
            {
              title: "Ser and estar — short test",
              kind: "translate",
              prompt: "Translate into Spanish.",
              section: "test",
              grammarSlug: "estar",
              questions: [
                {
                  kind: "translate",
                  prompt: "I am tired.",
                  correctAnswer: "Estoy cansado",
                  acceptedAnswers: ["Estoy cansada", "estoy cansado"],
                  explanation: "A temporary state → estar. Use cansada if you are female.",
                },
                {
                  kind: "translate",
                  prompt: "She is a doctor.",
                  correctAnswer: "Es médica",
                  acceptedAnswers: ["Ella es médica", "Es doctora", "Es médico"],
                  explanation: "Profession → ser, with no article.",
                },
                {
                  kind: "translate",
                  prompt: "Where are you from?",
                  correctAnswer: "¿De dónde eres?",
                  acceptedAnswers: ["De dónde eres", "¿De dónde es usted?"],
                  explanation: "Origin → ser.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a1-numbers",
      title: "Numbers",
      description: "Count, give your age and phone number, and handle prices.",
      theme: "Numbers",
      icon: "Hash",
      lessons: [
        {
          slug: "a1-numbers-1-100",
          title: "Numbers 0–100",
          objective: "Count to 100 and use numbers for age, prices and time.",
          estimatedMinutes: 14,
          explanation:
            "0–15 must be memorised: *cero, uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez, once, doce, trece, catorce, quince*.\n\n16–29 are written as one word: *dieciséis, diecisiete… veintiuno, veintidós*.\n\nFrom 31 upward they are three words with **y**: *treinta y uno, cuarenta y dos, noventa y nueve*.\n\nThe tens: *diez, veinte, treinta, cuarenta, cincuenta, sesenta, setenta, ochenta, noventa, cien*.\n\nCrucially, **age uses tener, not ser**: *Tengo veinte años* — literally 'I have twenty years'. Saying *soy veinte años* is one of the most recognisable beginner errors.",
          review: "0–15 memorised, 16–29 one word, 31+ with y. Age: tengo X años.",
          prerequisites: ["a1-intro-name-origin"],
          vocabulary: ["uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "veinte", "cien", "tener"],
          grammar: ["tener-expressions"],
          examples: [
            { spanish: "Tengo veintiocho años.", english: "I'm twenty-eight." },
            { spanish: "Son treinta y cinco euros.", english: "That's thirty-five euros.", realWorld: true },
            { spanish: "Mi número es seis, seis, siete…", english: "My number is six, six, seven…", note: "Spanish phone numbers are usually read in pairs.", realWorld: true },
          ],
          exercises: [
            {
              title: "Numbers and age",
              kind: "fill_blank",
              prompt: "Complete or translate.",
              section: "practice",
              grammarSlug: "tener-expressions",
              questions: [
                {
                  kind: "translate",
                  prompt: "I am 20 years old.",
                  correctAnswer: "Tengo veinte años",
                  acceptedAnswers: ["tengo 20 años"],
                  explanation: "Age uses tener — 'I have 20 years'. 'Soy 20 años' is wrong.",
                  hint: "Which verb does Spanish use for age?",
                },
                {
                  kind: "short_answer",
                  prompt: "Write 45 in words.",
                  correctAnswer: "cuarenta y cinco",
                  explanation: "From 31 up, the tens and units are joined with y.",
                },
                {
                  kind: "short_answer",
                  prompt: "Write 16 in words.",
                  correctAnswer: "dieciséis",
                  acceptedAnswers: ["dieciseis"],
                  explanation: "16–29 are written as a single word.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a1-family",
      title: "Family",
      description: "Describe your family and possessions.",
      theme: "Family",
      icon: "Users",
      lessons: [
        {
          slug: "a1-family-members",
          title: "Family members and possessives",
          objective: "Describe your family using possessive adjectives and tener.",
          estimatedMinutes: 15,
          explanation:
            "Family vocabulary comes in gendered pairs — *hermano/hermana*, *hijo/hija*, *tío/tía*. The **masculine plural covers a mixed group**: *mis hermanos* can mean 'my brothers' or 'my brothers and sisters', and *mis padres* means 'my parents', not 'my fathers'.\n\nPossessives agree with the **thing owned**, not the owner: *mi hermano*, *mis hermanos*. *Nuestro* also changes for gender: *nuestra casa*, *nuestro coche*.\n\nTo say a family has members, use **tener**: *Tengo dos hermanas*.",
          review:
            "Masculine plural covers mixed groups. Possessives agree with what is owned, not who owns it.",
          prerequisites: ["a1-numbers-1-100"],
          vocabulary: ["la familia", "la madre", "el padre", "el hermano", "la hermana", "el hijo", "la hija", "tener"],
          grammar: ["gender-and-articles", "tener-expressions", "adjective-agreement"],
          culturalNote:
            "Spanish speakers carry two surnames: the father's first, then the mother's. Ana García López is Ana, daughter of a García and a López — and she keeps both after marriage. Filing her under 'López' is a common foreign mistake; the first surname is the one used.",
          examples: [
            { spanish: "Tengo dos hermanas y un hermano.", english: "I have two sisters and a brother." },
            { spanish: "Mis padres viven en Valencia.", english: "My parents live in Valencia.", note: "padres = parents, not fathers." },
            { spanish: "Nuestra casa es pequeña.", english: "Our house is small.", note: "nuestra agrees with casa (feminine)." },
          ],
          writing: [
            {
              slug: "a1-write-family",
              title: "Your family",
              levelCode: "A1",
              instruction: "Describe your family: how many people, who they are, and one detail about each.",
              minWords: 30,
              maxWords: 80,
              targetStructures: ["tener", "possessive adjectives", "ser"],
            },
          ],
          exercises: [
            {
              title: "Family and possessives",
              kind: "multiple_choice",
              prompt: "Choose the correct form.",
              section: "test",
              grammarSlug: "adjective-agreement",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "___ hermanas son profesoras.",
                  correctAnswer: "Mis",
                  explanation: "Possessives agree with the thing owned — hermanas is plural, so mis.",
                  options: [{ text: "Mis" }, { text: "Mi", feedback: "Mi is singular; hermanas is plural." }],
                },
                {
                  kind: "multiple_choice",
                  prompt: "'Mis padres' means:",
                  correctAnswer: "My parents",
                  explanation: "The masculine plural covers a mixed group.",
                  options: [
                    { text: "My parents" },
                    { text: "My fathers", feedback: "Spanish uses the masculine plural for mixed groups." },
                  ],
                },
                {
                  kind: "fill_blank",
                  prompt: "___ casa es grande. (our)",
                  correctAnswer: "Nuestra",
                  acceptedAnswers: ["nuestra"],
                  explanation: "Casa is feminine, so nuestro becomes nuestra.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a1-present-tense",
      title: "Present Tense & Basic Verbs",
      description: "Conjugate regular verbs and the essential irregulars.",
      theme: "Verbs",
      icon: "Zap",
      lessons: [
        {
          slug: "a1-present-regular",
          title: "Regular verbs in the present",
          objective: "Conjugate -ar, -er and -ir verbs in the present tense.",
          estimatedMinutes: 18,
          explanation:
            "Every Spanish verb ends in **-ar**, **-er** or **-ir**. Take that ending off and you have the stem; add the endings for the person you mean.\n\n**hablar** → hablo, hablas, habla, hablamos, habláis, hablan\n**comer** → como, comes, come, comemos, coméis, comen\n**vivir** → vivo, vives, vive, vivimos, vivís, viven\n\nNotice that -er and -ir verbs differ only in the *nosotros* and *vosotros* forms. That is the whole difference.\n\nOne Spanish present covers three English ones: *hablo* is 'I speak', 'I am speaking' and 'I do speak'. There is no separate progressive needed, and no 'do' for questions.",
          review:
            "Three families, one stem, one set of endings each. -er and -ir differ only in nosotros/vosotros.",
          prerequisites: ["a1-intro-ser-estar"],
          vocabulary: ["hablar", "comer", "vivir", "trabajar", "estudiar", "beber"],
          grammar: ["present-tense-regular", "subject-pronouns"],
          examples: [
            { spanish: "Hablo español todos los días.", english: "I speak Spanish every day." },
            { spanish: "¿Dónde vives?", english: "Where do you live?", note: "No 'do' — the verb ending carries it." },
            { spanish: "Comemos a las dos.", english: "We eat at two." },
            { spanish: "Trabajan en un hospital.", english: "They work in a hospital." },
          ],
          speaking: [
            {
              slug: "a1-speak-routine",
              title: "Your day",
              levelCode: "A1",
              instruction: "Say three things you do every day, using -ar, -er and -ir verbs.",
              mode: "freeform",
            },
          ],
          exercises: [
            {
              title: "Conjugation drill",
              kind: "fill_blank",
              prompt: "Put the verb into the correct form.",
              section: "practice",
              grammarSlug: "present-tense-regular",
              questions: [
                { kind: "fill_blank", prompt: "Yo ___ (hablar) español.", correctAnswer: "hablo", explanation: "-ar verbs take -o in the yo form." },
                { kind: "fill_blank", prompt: "Nosotros ___ (vivir) en Madrid.", correctAnswer: "vivimos", explanation: "-ir verbs take -imos, not -emos." },
                { kind: "fill_blank", prompt: "¿Tú ___ (comer) carne?", correctAnswer: "comes", explanation: "-er verbs take -es in the tú form." },
                { kind: "fill_blank", prompt: "Ellos ___ (trabajar) mucho.", correctAnswer: "trabajan", explanation: "-ar verbs take -an in the ellos form." },
                {
                  kind: "multiple_choice",
                  prompt: "Which is correct?",
                  correctAnswer: "Como pizza.",
                  explanation: "The infinitive can never be the main verb — it must be conjugated.",
                  options: [
                    { text: "Como pizza." },
                    { text: "Yo comer pizza.", feedback: "'Comer' is the infinitive; it must be conjugated." },
                    { text: "Estoy comer pizza.", feedback: "Do not translate 'I am eating' literally." },
                  ],
                },
              ],
            },
          ],
        },
        {
          slug: "a1-present-irregular",
          title: "The verbs you cannot avoid",
          objective: "Use tener, ir, hacer, querer and poder in the present.",
          estimatedMinutes: 16,
          explanation:
            "A handful of verbs are irregular and are also the most common verbs in the language, so they must be memorised rather than derived.\n\n**tener** (to have): tengo, tienes, tiene, tenemos, tenéis, tienen\n**ir** (to go): voy, vas, va, vamos, vais, van\n**hacer** (to do/make): hago, haces, hace, hacemos, hacéis, hacen\n**querer** (to want): quiero, quieres, quiere, queremos, queréis, quieren\n**poder** (can): puedo, puedes, puede, podemos, podéis, pueden\n\nTwo patterns are worth naming, because they recur across dozens of verbs: the **e→ie** change (*querer → quiero*) and the **o→ue** change (*poder → puedo*). Both leave the *nosotros* form alone.\n\nThree constructions make these immediately useful: **tener que** + infinitive (have to), **ir a** + infinitive (going to), and **querer** + infinitive (want to).",
          review:
            "tengo/voy/hago/quiero/puedo. Stem changes skip nosotros. tener que, ir a and querer all take a plain infinitive.",
          prerequisites: ["a1-present-regular"],
          vocabulary: ["tener", "ir", "hacer", "querer", "poder", "necesitar"],
          grammar: ["tener-expressions", "near-future"],
          examples: [
            { spanish: "Tengo que trabajar mañana.", english: "I have to work tomorrow." },
            { spanish: "Voy a estudiar esta noche.", english: "I'm going to study tonight." },
            { spanish: "¿Qué haces?", english: "What are you doing?", realWorld: true },
            { spanish: "¿Puedes ayudarme?", english: "Can you help me?", realWorld: true },
            { spanish: "Quiero un café, por favor.", english: "I'd like a coffee, please." },
          ],
          exercises: [
            {
              title: "Irregular verbs",
              kind: "fill_blank",
              prompt: "Complete with the correct form.",
              section: "test",
              grammarSlug: "tener-expressions",
              questions: [
                { kind: "fill_blank", prompt: "Yo ___ (tener) tres hermanos.", correctAnswer: "tengo", explanation: "tener is irregular in the yo form: tengo." },
                { kind: "fill_blank", prompt: "Nosotros ___ (ir) al cine.", correctAnswer: "vamos", explanation: "ir: voy, vas, va, vamos, vais, van." },
                { kind: "fill_blank", prompt: "Ella ___ (querer) un té.", correctAnswer: "quiere", explanation: "e→ie stem change: quiero, quieres, quiere." },
                {
                  kind: "translate",
                  prompt: "I have to study.",
                  correctAnswer: "Tengo que estudiar",
                  explanation: "tener que + infinitive expresses obligation.",
                },
                {
                  kind: "word_order",
                  prompt: "Arrange: mañana / a / voy / Madrid / ir / a",
                  correctAnswer: "Voy a ir a Madrid mañana",
                  acceptedAnswers: ["Mañana voy a ir a Madrid"],
                  explanation: "ir a + infinitive for plans; the second 'a' introduces the destination.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a1-food",
      title: "Food & Ordering",
      description: "Order in a bar or restaurant and talk about what you eat.",
      theme: "Food",
      icon: "UtensilsCrossed",
      lessons: [
        {
          slug: "a1-food-ordering",
          title: "Ordering food and drink",
          objective: "Order in a café or restaurant and ask for the bill.",
          estimatedMinutes: 15,
          explanation:
            "Ordering needs surprisingly little grammar and a few fixed phrases.\n\n*Para mí, …* — 'for me, …', the most natural way to order.\n*Quiero…* works but is blunt; ***Quería*** or ***Me gustaría*** is what adults actually say.\n*¿Me pone…?* is the standard phrasing in Spain — literally 'will you put me…'.\n*La cuenta, por favor* — the bill, please.\n\nThe verb **gustar** works backwards compared to English: *me gusta el café* is literally 'coffee is pleasing to me'. So the thing liked is the subject, and it decides the ending: *me gusta el café* but *me gustan los churros*.",
          review:
            "Para mí… · Quería… · ¿Me pone…? · La cuenta, por favor. Gustar agrees with the thing liked, not with you.",
          prerequisites: ["a1-present-irregular"],
          vocabulary: ["la comida", "el agua", "el café", "el pan", "la cerveza", "el restaurante", "la cuenta", "gustar", "querer"],
          grammar: ["present-tense-regular"],
          culturalNote:
            "In a Spanish bar you usually order at the counter, drink standing up, and pay when you leave rather than per round. Tapas may arrive free with a drink in Granada and León; elsewhere you pay for them. Tipping is not expected — rounding up is generous.",
          examples: [
            { spanish: "Para mí, una caña, por favor.", english: "A small draught beer for me, please.", note: "'Caña' is the standard small beer in Spain.", realWorld: true },
            { spanish: "¿Me pone un café con leche?", english: "Could I have a white coffee?", realWorld: true },
            { spanish: "Me gusta el pescado, pero no me gustan los mariscos.", english: "I like fish, but I don't like shellfish.", note: "Singular gusta vs plural gustan." },
            { spanish: "La cuenta, por favor.", english: "The bill, please.", realWorld: true },
          ],
          listening: [
            {
              slug: "a1-listen-cafe",
              title: "In a café",
              levelCode: "A1",
              format: "conversation",
              speed: "slow",
              accent: "Sevilla",
              region: "es-ES",
              intro: "A customer orders breakfast in a Spanish café.",
              segments: [
                { speaker: "Camarero", spanish: "Buenos días, ¿qué le pongo?", english: "Good morning, what can I get you?" },
                { speaker: "Cliente", spanish: "Un café con leche y una tostada, por favor.", english: "A white coffee and a piece of toast, please." },
                { speaker: "Camarero", spanish: "¿La tostada con tomate o con mantequilla?", english: "Toast with tomato or with butter?" },
                { speaker: "Cliente", spanish: "Con tomate, gracias.", english: "With tomato, thanks." },
                { speaker: "Camarero", spanish: "Muy bien. Son tres euros con cincuenta.", english: "Very good. That's three fifty." },
              ],
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "What does the customer order?",
                  correctAnswer: "Coffee with milk and toast with tomato",
                  explanation: "Café con leche and a tostada con tomate — the standard Spanish breakfast.",
                  options: [
                    { text: "Coffee with milk and toast with tomato" },
                    { text: "Black coffee and a croissant" },
                    { text: "Tea and toast with butter" },
                  ],
                },
                {
                  kind: "short_answer",
                  prompt: "How much is it?",
                  correctAnswer: "3.50",
                  acceptedAnswers: ["tres euros con cincuenta", "3,50", "3 euros 50"],
                  explanation: "'Tres euros con cincuenta' — three euros fifty.",
                },
              ],
            },
          ],
          exercises: [
            {
              title: "At the café",
              kind: "multiple_choice",
              prompt: "Choose the best answer.",
              section: "practice",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "How do you ask for the bill?",
                  correctAnswer: "La cuenta, por favor.",
                  explanation: "'La cuenta' is the bill.",
                  options: [
                    { text: "La cuenta, por favor." },
                    { text: "El menú, por favor.", feedback: "That asks for the menu." },
                    { text: "La mesa, por favor.", feedback: "That asks for a table." },
                  ],
                },
                {
                  kind: "multiple_choice",
                  prompt: "___ los churros. (I like churros)",
                  correctAnswer: "Me gustan",
                  explanation: "Churros is plural, so gustar becomes gustan.",
                  options: [
                    { text: "Me gustan" },
                    { text: "Me gusta", feedback: "Gustar agrees with the thing liked — churros is plural." },
                    { text: "Yo gusto", feedback: "That would mean 'I am pleasing'." },
                  ],
                },
                {
                  kind: "translate",
                  prompt: "I would like a coffee, please.",
                  correctAnswer: "Quería un café, por favor",
                  acceptedAnswers: ["Me gustaría un café, por favor", "Quiero un café, por favor"],
                  explanation: "'Quería' or 'me gustaría' is politer than 'quiero'.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a1-time",
      title: "Time & Dates",
      description: "Tell the time, name the days, and arrange to meet.",
      theme: "Time",
      icon: "Clock",
      lessons: [
        {
          slug: "a1-time-telling",
          title: "Telling the time",
          objective: "Ask and tell the time, and name days and months.",
          estimatedMinutes: 14,
          explanation:
            "Ask with *¿Qué hora es?* Answer with **ser**, and note that it is plural for everything except one o'clock:\n\n*Es la una.* — It's one o'clock.\n*Son las tres.* — It's three o'clock.\n*Son las tres y media.* — Half past three.\n*Son las tres y cuarto.* — Quarter past three.\n*Son las tres menos cuarto.* — Quarter to three.\n\nFor appointments use **a**: *a las ocho* — at eight.\n\nDays and months are **not capitalised**: *lunes, martes, miércoles, jueves, viernes, sábado, domingo*. To say 'on Monday', use the article and no preposition: *el lunes* — and *los lunes* means 'on Mondays'.",
          review:
            "Es la una, son las demás. y cuarto / y media / menos cuarto. el lunes = on Monday; los lunes = on Mondays.",
          prerequisites: ["a1-numbers-1-100"],
          vocabulary: ["la hora", "el día", "la semana", "el lunes", "hoy", "mañana", "ayer", "ahora"],
          grammar: ["ser"],
          culturalNote:
            "Spanish daily rhythm runs late: lunch is 2–3pm, dinner 9–10pm, and shops often close 2–5pm. An invitation for 'la cena' at 10pm is normal, not rude. In Latin America mealtimes are generally earlier.",
          examples: [
            { spanish: "¿Qué hora es? — Son las nueve y media.", english: "What time is it? — It's half past nine." },
            { spanish: "La clase es a las diez.", english: "The class is at ten.", note: "'a las' for when something happens." },
            { spanish: "Los lunes trabajo desde casa.", english: "On Mondays I work from home.", realWorld: true },
          ],
          exercises: [
            {
              title: "What time is it?",
              kind: "translate",
              prompt: "Answer in Spanish.",
              section: "test",
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "It's one o'clock.",
                  correctAnswer: "Es la una.",
                  explanation: "One o'clock is the only singular hour.",
                  options: [
                    { text: "Es la una." },
                    { text: "Son la una.", feedback: "Una is singular, so the verb is 'es'." },
                    { text: "Son las una.", feedback: "Both parts must be singular." },
                  ],
                },
                {
                  kind: "translate",
                  prompt: "It's half past seven.",
                  correctAnswer: "Son las siete y media",
                  explanation: "y media = half past.",
                },
                {
                  kind: "fill_blank",
                  prompt: "La reunión es ___ las cuatro.",
                  correctAnswer: "a",
                  explanation: "Use 'a las' for the time something happens.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a1-questions",
      title: "Basic Questions",
      description: "Ask for information, directions and help.",
      theme: "Questions",
      icon: "HelpCircle",
      lessons: [
        {
          slug: "a1-questions-words",
          title: "Question words",
          objective: "Ask questions with qué, dónde, cuándo, cómo, quién, cuánto and por qué.",
          estimatedMinutes: 15,
          explanation:
            "Spanish question words all carry a written accent, which is what distinguishes them from their non-question twins (*qué* vs *que*, *dónde* vs *donde*).\n\n**qué** what · **quién** who · **dónde** where · **cuándo** when · **cómo** how · **cuánto** how much · **por qué** why · **cuál** which\n\nTwo things to internalise. There is **no 'do'**: *¿Dónde vives?* is 'Where do you live?'. And the subject, if present, goes **after** the verb: *¿Dónde vive tu hermano?*\n\nWatch the pair *por qué* (why, two words with an accent) and *porque* (because, one word, no accent).",
          review:
            "Accents mark question words. No auxiliary 'do'. Subject follows the verb. por qué asks, porque answers.",
          prerequisites: ["a1-present-irregular"],
          vocabulary: ["porque", "pero", "también"],
          grammar: ["questions-and-negation"],
          examples: [
            { spanish: "¿Dónde está el baño?", english: "Where is the bathroom?", realWorld: true },
            { spanish: "¿Cuánto cuesta?", english: "How much does it cost?", realWorld: true },
            { spanish: "¿Cómo se dice 'window' en español?", english: "How do you say 'window' in Spanish?", note: "The single most useful sentence for a learner.", realWorld: true },
            { spanish: "¿Por qué no vienes? — Porque trabajo.", english: "Why aren't you coming? — Because I'm working.", note: "por qué asks, porque answers." },
          ],
          speaking: [
            {
              slug: "a1-speak-questions",
              title: "Ask three questions",
              levelCode: "A1",
              instruction: "Ask where the bathroom is, how much something costs, and what someone's name is.",
              mode: "respond",
            },
          ],
          exercises: [
            {
              title: "Question words",
              kind: "fill_blank",
              prompt: "Complete the question.",
              section: "practice",
              grammarSlug: "questions-and-negation",
              questions: [
                { kind: "fill_blank", prompt: "¿___ está el baño?", correctAnswer: "Dónde", acceptedAnswers: ["dónde", "donde"], explanation: "dónde = where." },
                { kind: "fill_blank", prompt: "¿___ cuesta el billete?", correctAnswer: "Cuánto", acceptedAnswers: ["cuánto", "cuanto"], explanation: "cuánto = how much." },
                {
                  kind: "multiple_choice",
                  prompt: "Which is correct?",
                  correctAnswer: "¿Dónde trabajas?",
                  explanation: "There is no 'do' auxiliary in Spanish.",
                  options: [
                    { text: "¿Dónde trabajas?" },
                    { text: "¿Dónde haces trabajar?", feedback: "Spanish has no 'do' auxiliary for questions." },
                  ],
                },
                {
                  kind: "multiple_choice",
                  prompt: "No voy ___ estoy enfermo.",
                  correctAnswer: "porque",
                  explanation: "porque (one word, no accent) gives a reason.",
                  options: [
                    { text: "porque" },
                    { text: "por qué", feedback: "'Por qué' asks a question; 'porque' answers one." },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "a1-everyday",
      title: "Everyday Conversations",
      description: "Put it together: shops, directions and small talk.",
      theme: "Conversation",
      icon: "MessageSquare",
      lessons: [
        {
          slug: "a1-everyday-shop",
          title: "In a shop",
          objective: "Buy something, ask the price, and pay.",
          estimatedMinutes: 14,
          explanation:
            "A shop transaction is a small, predictable script, and learning it whole is more useful than learning its parts.\n\n*¿Cuánto cuesta?* — how much is it?\n*¿Tiene…?* — do you have…?\n*¿Puedo pagar con tarjeta?* — can I pay by card?\n*Solo estoy mirando, gracias.* — I'm just looking, thanks.\n\nOne pronunciation habit to build now: prices are said with **con** for the cents — *tres euros con cincuenta*.",
          review: "¿Cuánto cuesta? · ¿Tiene…? · ¿Puedo pagar con tarjeta? · Solo estoy mirando.",
          prerequisites: ["a1-questions-words", "a1-food-ordering"],
          vocabulary: ["la tienda", "el dinero", "poder", "necesitar", "barato", "caro"],
          grammar: ["questions-and-negation", "present-tense-regular"],
          examples: [
            { spanish: "¿Cuánto cuesta esta camiseta?", english: "How much is this T-shirt?", realWorld: true },
            { spanish: "¿Puedo pagar con tarjeta?", english: "Can I pay by card?", realWorld: true },
            { spanish: "Solo estoy mirando, gracias.", english: "I'm just looking, thanks.", realWorld: true },
          ],
          reading: [
            {
              slug: "a1-read-shop",
              title: "En la tienda",
              levelCode: "A1",
              genre: "dialogue",
              intro: "A short exchange in a clothes shop.",
              body: "—Buenos días. ¿Puedo ayudarle?\n—Sí, gracias. ¿Cuánto cuesta esta camiseta?\n—Cuesta doce euros.\n—¿Tiene una talla más grande?\n—Sí, un momento… Aquí tiene.\n—Perfecto. ¿Puedo pagar con tarjeta?\n—Claro. Son doce euros.\n—Muchas gracias.\n—A usted. ¡Hasta luego!",
              glossary: [
                { term: "camiseta", meaning: "T-shirt" },
                { term: "talla", meaning: "size (of clothing)" },
                { term: "Aquí tiene", meaning: "Here you are", note: "The standard phrase when handing something over." },
                { term: "A usted", meaning: "Thank *you*", note: "The shopkeeper's polite reply to 'gracias'." },
              ],
              questions: [
                {
                  kind: "multiple_choice",
                  prompt: "How much does the T-shirt cost?",
                  correctAnswer: "12 euros",
                  explanation: "'Cuesta doce euros.'",
                  options: [{ text: "12 euros" }, { text: "20 euros" }, { text: "2 euros" }],
                },
                {
                  kind: "multiple_choice",
                  prompt: "What does the customer ask for?",
                  correctAnswer: "A bigger size",
                  explanation: "'¿Tiene una talla más grande?'",
                  options: [{ text: "A bigger size" }, { text: "A different colour" }, { text: "A discount" }],
                },
              ],
            },
          ],
          exercises: [
            {
              title: "Shopping — final test",
              kind: "translate",
              prompt: "Translate into Spanish.",
              section: "test",
              questions: [
                { kind: "translate", prompt: "How much does it cost?", correctAnswer: "¿Cuánto cuesta?", acceptedAnswers: ["Cuánto cuesta"], explanation: "The standard way to ask a price." },
                { kind: "translate", prompt: "Can I pay by card?", correctAnswer: "¿Puedo pagar con tarjeta?", acceptedAnswers: ["Puedo pagar con tarjeta"], explanation: "poder + infinitive for permission." },
                { kind: "translate", prompt: "I don't have money.", correctAnswer: "No tengo dinero", explanation: "'No' goes directly before the verb." },
              ],
            },
          ],
        },
      ],
    },
  ],
};
