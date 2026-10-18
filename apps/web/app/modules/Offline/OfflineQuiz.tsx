import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useEnqueueOfflineAttempt } from "~/api/mutations/useEnqueueOfflineAttempt";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { Button } from "~/components/ui/button";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

import type { OfflineOperation, OfflineQuizSnapshot } from "./offline.types";

type OfflineQuizProps = {
  quiz: OfflineQuizSnapshot;
  operation?: OfflineOperation;
  blockedByArchive?: boolean;
};
export function OfflineQuiz({ quiz, operation, blockedByArchive }: OfflineQuizProps) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { mutateAsync: enqueue, isPending, isError, error } = useEnqueueOfflineAttempt();
  const expired = Date.now() >= Date.parse(quiz.expiresAt);
  if (blockedByArchive)
    return (
      <section className="space-y-3 border-t pt-4">
        <h3 className="font-semibold">{quiz.title}</h3>
        <p role="alert">{t("offlineRecovery.downloadCurrent")}</p>
      </section>
    );
  return (
    <section className="space-y-4 border-t pt-4" data-testid="offline-quiz">
      <h3 className="text-lg font-semibold">{quiz.title}</h3>
      <p>{t("offlineQuiz.scope")}</p>
      {operation ? (
        <div role="status" data-testid="offline-attempt-status">
          <p>{t(`offlineQuiz.${operation.state}`)}</p>
          {operation.error && <p>{t(operation.error)}</p>}
          {operation.result && (
            <p>
              {t("offlineQuiz.score", {
                score: new Intl.NumberFormat(quiz.language, { maximumFractionDigits: 2 }).format(
                  operation.result.score,
                ),
              })}
            </p>
          )}
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void enqueue({
              quiz,
              answers: quiz.questions.map((question) => ({
                questionId: question.id,
                optionId: answers[question.id],
              })),
            }).catch(() => {});
          }}
        >
          {quiz.questions.map((question) => (
            <fieldset key={question.id} disabled={isPending || expired} className="space-y-2">
              <legend>{question.prompt || question.title}</legend>
              <RadioGroup
                required
                value={answers[question.id] ?? ""}
                onValueChange={(value) =>
                  setAnswers((current) => ({ ...current, [question.id]: value }))
                }
                aria-label={question.title}
              >
                {question.options.map((option) => (
                  <label
                    key={option.id}
                    htmlFor={`offline-${option.id}`}
                    className="flex items-center gap-2"
                  >
                    <RadioGroupItem id={`offline-${option.id}`} value={option.id} />
                    {option.label}
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
          ))}
          <Button
            type="submit"
            data-testid="offline-quiz-submit"
            disabled={
              isPending || expired || quiz.questions.some((question) => !answers[question.id])
            }
          >
            {t("offlineQuiz.submit")}
          </Button>
          {expired && <p role="alert">{t("offlineQuiz.error.expired")}</p>}
          {isError && (
            <p role="alert">{getTranslatedApiErrorMessage(error, t, t("offline.error.storage"))}</p>
          )}
        </form>
      )}
    </section>
  );
}
