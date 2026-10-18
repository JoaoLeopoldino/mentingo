import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { getOfflineOwner } from "~/modules/Offline/offline-session";
import { OFFLINE_MAX_BYTES, offlineStorage } from "~/modules/Offline/offline-storage";
import { prepareOfflineText } from "~/modules/Offline/offline-text";

import { ApiClient } from "../api-client";
import { queryClient } from "../queryClient";

import type { SupportedLanguages } from "@repo/shared";
import type { OfflinePayload } from "~/modules/Offline/offline.types";

export const OFFLINE_COURSES_QUERY_KEY = ["offline-courses"];
export function useDownloadOfflineCourse() {
  return useMutation({
    retry: false,
    mutationFn: async ({
      courseId,
      language,
    }: {
      courseId: string;
      language: SupportedLanguages;
    }) => {
      const owner = getOfflineOwner();
      if (!owner) throw new Error("offline.error.session");
      await offlineStorage.download(owner, courseId, language, async () => {
        const {
          data: { data: course },
        } = await ApiClient.api.courseControllerGetCourse({ id: courseId, language });
        if (!course.availableLocales.includes(language)) throw new Error("offline.error.language");
        const payload: OfflinePayload = {
          title: course.title,
          lessons: [],
          quizzes: [],
          unavailable: [],
        };
        let totalBytes = 0;
        for (const chapter of course.chapters)
          for (const item of chapter.lessons) {
            if (getOfflineOwner() !== owner) throw new Error("offline.error.cancelled");
            if (item.type === "quiz" && item.status !== "blocked") {
              try {
                const response = await ApiClient.api.offlineAssessmentControllerGetOfflineAssessmentSnapshot(item.id, {
                  language,
                });
                payload.quizzes!.push(response.data.data);
              } catch (error) {
                if (!isAxiosError(error) || error.response?.status !== 409) throw error;
                payload.unavailable.push({ title: item.title, type: item.type });
              }
              continue;
            }
            if (item.type !== "content" || item.status === "blocked") {
              payload.unavailable.push({ title: item.title, type: item.type });
              continue;
            }
            const {
              data: { data: lesson },
            } = await ApiClient.api.lessonControllerGetLessonById(item.id, { language });
            const text = prepareOfflineText(lesson.description ?? "");
            const entry = {
              id: lesson.id,
              title: lesson.title,
              html: text.html,
              pdfs: [] as OfflinePayload["lessons"][number]["pdfs"],
            };
            if (text.hadUnsupported || lesson.fileUrl)
              payload.unavailable.push({ title: item.title, type: "embedded_media_or_formatting" });
            for (const resource of lesson.lessonResources ?? []) {
              if (resource.contentType !== "application/pdf") {
                payload.unavailable.push({
                  title: resource.title ?? item.title,
                  type: resource.contentType,
                });
                continue;
              }
              const response = await ApiClient.api.lessonControllerGetLessonResource(
                resource.id,
                undefined,
                { format: "blob" },
              );
              const blob = response.data as unknown as Blob;
              totalBytes += blob.size;
              if (totalBytes > OFFLINE_MAX_BYTES) throw new Error("offline.error.quota");
              const bytes = new Uint8Array(await blob.arrayBuffer());
              if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
                throw new Error("offline.error.pdf");
              entry.pdfs.push({
                id: resource.id,
                title: resource.title ?? resource.fileName ?? item.title,
                bytes,
              });
            }
            if (entry.html.trim() || entry.pdfs.length) payload.lessons.push(entry);
          }
        if (!payload.lessons.length && !payload.quizzes?.length)
          throw new Error("offline.error.empty");
        if (getOfflineOwner() !== owner) throw new Error("offline.error.cancelled");
        return payload;
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: OFFLINE_COURSES_QUERY_KEY }),
  });
}
