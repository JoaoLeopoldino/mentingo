// One-shot job: synthetic enterprise-competency scenario through the application's own API.
// Admin sets up units/frameworks/roles/requirements; the operations manager records evidence and
// assesses a level below the requirement (a visible gap); the employee creates a development plan
// that the manager approves. Credentials come from the job environment and are never printed.
// Not idempotent: run once per fresh demonstration tenant.
import { randomUUID } from "node:crypto";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};
if (process.env.DEMONSTRATION_MODE !== "true") throw new Error("DEMONSTRATION_MODE must be true");

const api = required("SEED_API_URL").replace(/\/$/, "");
const origin = required("SEED_TENANT_ORIGIN");
const language = "pt-AO";

function session() {
  let cookies = "";
  async function call(method, path, body) {
    const response = await fetch(`${api}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Origin: origin, ...(cookies ? { Cookie: cookies } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${path.split("?")[0]} -> ${response.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : {};
  }
  async function login(email, password) {
    const response = await fetch(`${api}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error(`login ${email} -> ${response.status}`);
    cookies = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
  }
  return { call, login };
}

async function sessionWithPasswordChange(email, initialPassword, newPasswordVar) {
  const s = session();
  await s.login(email, initialPassword);
  const me = (await s.call("GET", "/api/auth/current-user")).data;
  if (me.requiresPasswordChange) {
    const newPassword = required(newPasswordVar);
    await s.call("PATCH", `/api/user/change-password?id=${me.id}`, {
      oldPassword: initialPassword,
      newPassword,
      confirmPassword: newPassword,
    });
    await s.login(email, newPassword);
  }
  return { s, id: me.id };
}

const admin = session();
await admin.login(required("SEED_ADMIN_EMAIL"), required("SEED_ADMIN_NEW_PASSWORD"));

const find = async (email) => {
  const users = (await admin.call("GET", `/api/user/all?keyword=${encodeURIComponent(email)}`)).data;
  const user = users.find((entry) => entry.email === email);
  if (!user) throw new Error(`User ${email} not found`);
  return user.id;
};
const employeeId = await find(required("SEED_LEARNER_EMAIL"));
const managerEmail = required("SEED_MANAGER_EMAIL");
const managerId = await find(managerEmail);
const trainerId = await find(required("SEED_TRAINER_EMAIL"));

// 1. Organisational units (provinces) and membership. Existing accounts only: creating users
//    would send real invitation emails to non-existent mailboxes.
const unit = {};
for (const name of ["Operações Luanda", "Operações Huíla", "Operações Benguela"]) {
  unit[name] = (await admin.call("POST", "/api/group", { name, language })).data.id;
}
await admin.call("POST", `/api/group/set?userId=${employeeId}`, [unit["Operações Luanda"]]);
await admin.call("POST", `/api/group/set?userId=${trainerId}`, [unit["Operações Huíla"]]);
await admin.call("PATCH", `/api/user/admin?id=${managerId}`, {
  managedGroupIds: [unit["Operações Luanda"], unit["Operações Huíla"], unit["Operações Benguela"]],
});

// 2. Framework, scale, competencies, job role and requirements.
const framework = (await admin.call("POST", "/api/competencies/frameworks", {
  code: "FQ-OPS",
  name: "Competências operacionais (demonstração)",
  description: "Quadro fictício de competências para operações em Luanda, Huíla e Benguela.",
  categories: ["Segurança", "Qualidade"],
})).data.id;
const scale = (await admin.call("POST", "/api/competencies/scales", {
  code: "ESC-4",
  name: "Escala de proficiência (4 níveis)",
  levels: [
    { rank: 1, label: "Iniciado" },
    { rank: 2, label: "Autónomo" },
    { rank: 3, label: "Avançado" },
    { rank: 4, label: "Referência" },
  ],
})).data.id;
const levels = [
  { rank: 1, label: "Iniciado" },
  { rank: 2, label: "Autónomo" },
  { rank: 3, label: "Avançado" },
  { rank: 4, label: "Referência" },
];
const safety = (await admin.call("POST", "/api/competencies/catalog", {
  code: "SEG-TRAB",
  name: "Segurança no trabalho",
  description: "Aplica o equipamento de protecção e os procedimentos de segurança.",
  category: "Segurança",
  frameworkId: framework,
  scaleId: scale,
  levels,
})).data.id;
const quality = (await admin.call("POST", "/api/competencies/catalog", {
  code: "QUAL-OP",
  name: "Qualidade operacional",
  description: "Regista inspecções e cumpre os procedimentos de qualidade.",
  category: "Qualidade",
  frameworkId: framework,
  scaleId: scale,
  levels,
})).data.id;
const role = (await admin.call("POST", "/api/competencies/roles", {
  code: "TEC-OPER",
  name: "Técnico de operações",
})).data.id;

const titleOf = async (title) => {
  const list = (await admin.call("GET", `/api/course/all?title=${encodeURIComponent(title)}&language=${language}&perPage=100`)).data;
  return list.find((course) => course.title === title)?.id ?? null;
};
const safetyCourse = await titleOf("Segurança no Trabalho — operações fictícias");
const qualityCourse = await titleOf("Procedimentos operacionais e qualidade — demonstração");
const scormCourse = await titleOf("SCORM 1.2 — pacote independente (demonstração)");

for (const [competencyId, minimumLevel, courseId] of [
  [safety, 3, safetyCourse],
  [quality, 2, qualityCourse],
]) {
  await admin.call("PUT", "/api/competencies/requirements", {
    jobRoleId: role,
    competencyId,
    minimumLevel,
    mandatory: true,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    courseId,
    learningPathId: null,
  });
}
await admin.call("PUT", "/api/competencies/assignments", {
  userId: employeeId,
  jobRoleId: role,
  organizationalUnitId: unit["Operações Luanda"],
});

// 3. The operations manager (after the forced password change) records evidence and assesses.
const manager = await sessionWithPasswordChange(managerEmail, required("DEMO_PW_CHEFE"), "SEED_MANAGER_NEW_PASSWORD");
const evidenceFor = (competencyId, level, text) => ({
  userId: employeeId,
  competencyId,
  level,
  status: "approved",
  evidenceType: "observation",
  source: "Observação presencial (fictícia)",
  evidence: text,
  expiresAt: null,
  reviewAt: null,
});
for (const [competencyId, level, text, rationale] of [
  [safety, 2, "Verificação fictícia do uso de EPI em Luanda: aplica o capacete e as luvas sem supervisão.", "Autónomo na verificação do EPI; falta aplicar os procedimentos avançados."],
  [quality, 2, "Registo fictício de inspecção em Luanda com local, data e responsável.", "Cumpre o procedimento de registo de inspecções."],
]) {
  const ev = (await manager.s.call("POST", "/api/competencies/evidence", evidenceFor(competencyId, level, text))).data.id;
  await manager.s.call("POST", "/api/competencies/assessments", {
    id: randomUUID(),
    userId: employeeId,
    competencyId,
    level,
    expectedAssessmentId: null,
    sourceEvidenceId: ev,
    rationale,
    expiresAt: null,
    reviewAt: null,
  });
}

// 4. The employee creates a development plan; the manager approves it.
const employee = session();
await employee.login(required("SEED_LEARNER_EMAIL"), required("SEED_LEARNER_NEW_PASSWORD"));
const planId = randomUUID();
const activities = [{ title: "Observação prática com o chefe de operação", courseId: null, learningPathId: null }];
if (scormCourse) activities.unshift({ title: "Concluir o curso SCORM 1.2 de demonstração", courseId: scormCourse, learningPathId: null });
await employee.call("POST", "/api/competencies/development-plans", {
  id: planId,
  userId: employeeId,
  competencyId: safety,
  targetLevel: 3,
  title: "Plano: segurança no trabalho — nível Avançado",
  deadline: "2027-03-31T00:00:00.000Z",
  activities,
});
const decide = (s, action, expectedVersion) =>
  s.call("POST", `/api/competencies/development-plans/${planId}/decisions`, {
    id: randomUUID(),
    action,
    expectedVersion,
    rationale: "Decisão fictícia para demonstração.",
    activityId: null,
  });
await decide(employee, "request_approval", 1);
await decide(manager.s, "approve", 2);

const gap = (await manager.s.call("GET", `/api/competencies/workspace?userId=${employeeId}`)).data.matrix
  .map((row) => `${row.competencyId === safety ? "SEG-TRAB" : "QUAL-OP"}: ${row.status} (nível actual ${row.currentLevel})`);
console.log(`Competências criadas. Matriz do colaborador: ${gap.join("; ")}. Plano aprovado: ${planId}. Curso SCORM ligado: ${Boolean(scormCourse)}`);
