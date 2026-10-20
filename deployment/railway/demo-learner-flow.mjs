// One-shot verification job: a synthetic learner completes the demonstration courses through the
// application's own API, then the issued certificate is downloaded and emitted as base64 between
// markers so it can be rendered and inspected. Credentials come from the job environment and are
// never printed. Run once per fresh demonstration tenant.
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
  async function call(method, path, body, { raw = false } = {}) {
    const response = await fetch(`${api}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        ...(cookies ? { Cookie: cookies } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${method} ${path.split("?")[0]} -> ${response.status} ${text.slice(0, 300)}`);
    }
    if (raw) return response;
    const text = await response.text();
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
  return { call, login };
}

const admin = session();
await admin.login(required("SEED_ADMIN_EMAIL"), required("SEED_ADMIN_NEW_PASSWORD"));

const learner = session();
const learnerEmail = required("SEED_LEARNER_EMAIL");
await learner.login(learnerEmail, required("DEMO_PW_COLABORADOR"));
const me = (await learner.call("GET", "/api/auth/current-user")).json.data;
if (me.requiresPasswordChange) {
  const newPassword = required("SEED_LEARNER_NEW_PASSWORD");
  await learner.call("PATCH", `/api/user/change-password?id=${me.id}`, {
    oldPassword: required("DEMO_PW_COLABORADOR"),
    newPassword,
    confirmPassword: newPassword,
  });
  await learner.login(learnerEmail, newPassword);
}

const report = [];
for (const courseId of required("SEED_COURSE_IDS").split(",")) {
  const course = (
    await admin.call("GET", `/api/course/beta-course-by-id?id=${courseId}&language=${language}`)
  ).json.data;

  for (const chapter of course.chapters) {
    for (const lesson of chapter.lessons ?? []) {
      if (lesson.type === "quiz") {
        const detail = (await admin.call("GET", `/api/lesson/${lesson.id}?language=${language}`))
          .json.data;
        const questionsAnswers = detail.quizDetails.questions.map((question) => ({
          questionId: question.id,
          // The lesson view hides correctness; seed-demo-content.mjs always lists the correct
          // option first (displayOrder 1).
          answers: question.options
            .filter((option) => option.displayOrder === 1)
            .map((option) => ({ answerId: option.id })),
        }));
        const result = (
          await learner.call("POST", "/api/lesson/evaluation-quiz", {
            lessonId: lesson.id,
            questionsAnswers,
            language,
          })
        ).json.data.data;
        report.push(`${course.title}: quiz "${lesson.title}" score ${result.score}`);
      } else {
        await learner.call("POST", `/api/studentLessonProgress?id=${lesson.id}&language=${language}`);
      }
    }
  }
  report.push(`${course.title}: lessons completed`);
}
console.log(report.join("\n"));

// Certificates are issued after completion; poll briefly for each course.
const courseIds = required("SEED_COURSE_IDS").split(",");
const certificates = [];
for (const courseId of courseIds) {
  let found = null;
  for (let attempt = 0; attempt < 30 && !found; attempt += 1) {
    try {
      found = (
        await learner.call(
          "GET",
          `/api/certificates/certificate?courseId=${courseId}&userId=${me.id}&language=${language}`,
        )
      ).json;
    } catch (error) {
      if (!String(error.message).includes("-> 404")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  if (!found?.id) throw new Error(`No certificate was issued for course ${courseId}`);
  certificates.push(found);
  console.log(`Certificate issued for "${found.courseTitle}" (expires: ${found.expiresAt ?? "never"})`);
}

const certificate = certificates[0];
const download = await learner.call(
  "POST",
  "/api/certificates/download",
  { certificateId: certificate.id, language },
  { raw: true },
);
const pdf = Buffer.from(await download.arrayBuffer());
console.log(
  `PDF: ${pdf.length} bytes, content-type ${download.headers.get("content-type")}, header ${pdf.subarray(0, 5).toString()}`,
);
if (pdf.subarray(0, 4).toString() !== "%PDF") throw new Error("Downloaded certificate is not a PDF");

const encoded = pdf.toString("base64");
console.log("PDFB64-BEGIN");
for (let offset = 0; offset < encoded.length; offset += 200) {
  console.log(encoded.slice(offset, offset + 200));
  if ((offset / 200) % 50 === 49) await new Promise((resolve) => setTimeout(resolve, 150));
}
console.log("PDFB64-END");
