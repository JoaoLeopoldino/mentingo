import { Link } from "@remix-run/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useOfflineAttempts } from "~/api/queries/useOfflineAttempts";
import { useOfflineCourses } from "~/api/queries/useOfflineCourses";
import { queryClient } from "~/api/queryClient";
import { PdfPreviewViewer } from "~/components/RichText/extensions/pdfPreview/PdfPreviewViewer";
import Viewer from "~/components/RichText/Viever";
import { Button } from "~/components/ui/button";
import { useAuthStore } from "~/modules/Auth/authStore";
import { useCurrentUserStore } from "~/modules/common/store/useCurrentUserStore";

import { getOfflineOwner } from "./offline-session";
import { offlineStorage } from "./offline-storage";
import { OfflineQuiz } from "./OfflineQuiz";

import type { OfflinePdf } from "./offline.types";

function OfflinePdfViewer({ pdf }: { pdf: OfflinePdf }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const objectUrl = URL.createObjectURL(new Blob([pdf.bytes], { type: "application/pdf" }));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [pdf]);
  return (
    <section>
      <h4 className="my-3 font-semibold">{pdf.title}</h4>
      {url && <PdfPreviewViewer src={url} />}
    </section>
  );
}
export default function OfflinePage() {
  const { t } = useTranslation();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useCurrentUserStore((state) => state.currentUser);
  const owner = isLoggedIn && user && !user.isSupportMode ? getOfflineOwner() : undefined;
  const { data: courses = [], isError, isPending } = useOfflineCourses(owner);
  const { data: operations = [], isError: attemptsError } = useOfflineAttempts(owner);
  const [online, setOnline] = useState(true);
  const [failure, setFailure] = useState(false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6" data-testid="offline-reader">
      <h1 className="text-2xl font-semibold">{t("offline.title")}</h1>
      <p role="status">{t(online ? "offline.online" : "offline.disconnected")}</p>
      <p>{t("offline.scope")}</p>
      <Link to="/courses" className="underline">
        {t("offline.back")}
      </Link>
      {!owner && <p role="alert">{t("offline.error.session")}</p>}
      {owner && isPending && <p role="status">{t("offline.loading")}</p>}
      {(isError || attemptsError || failure) && <p role="alert">{t("offline.error.storage")}</p>}
      {owner && !isPending && courses.length === 0 && <p>{t("offline.empty")}</p>}
      {owner &&
        courses.map((course) => (
          <section
            key={`${course.courseId}:${course.language}`}
            className="space-y-4 rounded border p-4"
          >
            <h2 className="text-xl font-semibold">
              {course.payload?.title ?? t("offline.incomplete")}
            </h2>
            <p>
              {t(`offline.${course.state}`)} · {course.language} ·{" "}
              {new Intl.NumberFormat(course.language, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(course.bytes / 1024 / 1024)}{" "}
              MB
            </p>
            <Button
              variant="outline"
              data-testid="offline-remove"
              onClick={() => {
                void offlineStorage
                  .remove(owner, course.courseId, course.language)
                  .then(() => queryClient.invalidateQueries({ queryKey: ["offline-courses"] }))
                  .catch(() => setFailure(true));
              }}
            >
              {t("offline.remove")}
            </Button>
            {course.state === "ready" &&
              course.payload?.lessons.map((lesson) => (
                <section key={lesson.id} className="space-y-3 border-t pt-4">
                  <h3 className="text-lg font-semibold">{lesson.title}</h3>
                  <Viewer content={lesson.html} />
                  {lesson.pdfs.map((pdf) => (
                    <OfflinePdfViewer key={pdf.id} pdf={pdf} />
                  ))}
                </section>
              ))}
            {course.state === "ready" &&
              course.payload?.quizzes?.map((quiz) => (
                <OfflineQuiz
                  key={quiz.lessonId}
                  quiz={quiz}
                  operation={operations.find(
                    (item) =>
                      item.lessonId === quiz.lessonId && item.learningCycle === quiz.learningCycle,
                  )}
                />
              ))}
            {!!course.payload?.unavailable.length && (
              <details>
                <summary>{t("offline.unsupported")}</summary>
                <ul>
                  {course.payload.unavailable.map((item, index) => (
                    <li key={index}>{item.title}</li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        ))}
    </main>
  );
}
