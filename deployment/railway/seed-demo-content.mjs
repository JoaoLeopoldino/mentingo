// One-shot job: creates synthetic pt-AO demonstration courses through the application's own API.
// It authenticates with credentials from the job environment (never printed) against the private
// API address. Not idempotent: run once per fresh demonstration tenant.
const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};
if (process.env.DEMONSTRATION_MODE !== "true") throw new Error("DEMONSTRATION_MODE must be true");

const api = required("SEED_API_URL").replace(/\/$/, "");
const origin = required("SEED_TENANT_ORIGIN");
const learnerEmail = required("SEED_LEARNER_EMAIL");
const language = "pt-AO";
let cookies = "";

async function call(method, path, body) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 300)}`);
  return { response, json: text ? JSON.parse(text) : {} };
}

async function login(email, password) {
  const { response } = await call("POST", "/api/auth/login", { email, password });
  cookies = response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  if (!cookies) throw new Error("Login returned no session cookies");
}

const quiz = (title, questions) => ({
  title,
  type: "quiz",
  thresholdScore: 60,
  attemptsLimit: null,
  quizCooldownInHours: null,
  questions: questions.map(([text, options], index) => ({
    type: "single_choice",
    title: text,
    language,
    displayOrder: index + 1,
    options: options.map(([optionText, isCorrect], optionIndex) => ({
      optionText,
      isCorrect,
      displayOrder: optionIndex + 1,
      language,
    })),
  })),
});

const COURSES = [
  {
    title: "Segurança no Trabalho — operações fictícias",
    description:
      "Formação fictícia para demonstração técnica com operações em Luanda, Huíla e Benguela. Sem dados reais; não substitui procedimentos de segurança aprovados.",
    chapters: [
      {
        title: "Prevenção de acidentes",
        lessons: [
          {
            title: "Equipamento de protecção individual",
            html: "<h2>Luanda, Huíla e Benguela</h2><p>Em cada obra, o colaborador verifica o capacete, as luvas e o calçado antes de iniciar a tarefa.</p><p>Esta é uma situação fictícia criada para a demonstração.</p>",
          },
          quiz("Avaliação: equipamento", [
            [
              "Que equipamento protege a cabeça numa obra?",
              [
                ["Capacete de protecção", true],
                ["Telemóvel", false],
              ],
            ],
            [
              "Quando se verifica o equipamento?",
              [
                ["Antes de iniciar a tarefa", true],
                ["Apenas no fim do dia", false],
              ],
            ],
          ]),
        ],
      },
      {
        title: "Resposta a incidentes",
        lessons: [
          {
            title: "Comunicar uma situação de risco",
            html: "<h2>Comunicação ao gestor operacional</h2><p>Qualquer situação de risco é comunicada de imediato ao chefe de operação da província respectiva.</p>",
          },
          quiz("Avaliação: comunicação de riscos", [
            [
              "A quem se comunica uma situação de risco?",
              [
                ["Ao chefe de operação", true],
                ["Apenas aos colegas de outra província", false],
              ],
            ],
          ]),
        ],
      },
    ],
  },
  {
    title: "Procedimentos operacionais e qualidade — demonstração",
    description:
      "Curso fictício curto sobre registo de inspecções e qualidade, com exemplos de equipas em Luanda, Huíla e Benguela.",
    chapters: [
      {
        title: "Registo de inspecções",
        lessons: [
          {
            title: "Como registar uma inspecção",
            html: "<p>O registo identifica o local, a data e o responsável. Os exemplos desta formação são fictícios.</p>",
          },
          quiz("Avaliação: registo", [
            [
              "O que identifica um registo de inspecção?",
              [
                ["Local, data e responsável", true],
                ["Apenas a cor do equipamento", false],
              ],
            ],
          ]),
        ],
      },
    ],
  },
];

await login(required("SEED_ADMIN_EMAIL"), required("SEED_ADMIN_PASSWORD"));

const learner = (await call("GET", `/api/user/all?keyword=${encodeURIComponent(learnerEmail)}`)).json;
const learnerId = learner?.data?.find?.((user) => user.email === learnerEmail)?.id;
if (!learnerId) throw new Error("Learner account not found; refusing to continue silently");

const category = await call("POST", "/api/category", {
  title: "Operações e Segurança (fictício)",
  language,
});
const categoryId = category.json.data.id;

const summary = [];
for (const course of COURSES) {
  const created = await call("POST", "/api/course", {
    title: course.title,
    description: course.description,
    categoryId,
    language,
    status: "draft",
    hasCertificate: true,
  });
  const courseId = created.json.data.id;

  for (const chapter of course.chapters) {
    const createdChapter = await call("POST", "/api/chapter/beta-create-chapter", {
      title: chapter.title,
      courseId,
    });
    const chapterId = createdChapter.json.data.id;
    for (const lesson of chapter.lessons) {
      if (lesson.type === "quiz") {
        await call("POST", "/api/lesson/beta-create-lesson/quiz", { ...lesson, chapterId });
      } else {
        await call("POST", "/api/lesson/beta-create-lesson", {
          title: lesson.title,
          chapterId,
          type: "content",
          description: lesson.html,
        });
      }
    }
  }

  await call("PATCH", `/api/course/update-has-certificate/${courseId}`, { hasCertificate: true });
  await call("PATCH", `/api/course/${courseId}`, { status: "published", language });
  await call("POST", `/api/course/${courseId}/enroll-courses`, { studentIds: [learnerId] });
  summary.push({ courseId, title: course.title });
}

console.log(`Created ${summary.length} synthetic courses, published and enrolled one learner.`);
console.log(JSON.stringify(summary));
