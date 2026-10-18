import { DEFAULT_TUS_CHUNK_SIZE } from "@repo/shared";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import * as tus from "tus-js-client";

import { ApiClient } from "~/api/api-client";
import { useToast } from "~/components/ui/use-toast";

import { resolveTusEndpoint } from "./tus-endpoint";

import type { StoredTusUpload, TusUploadArgs, TusUploadSession } from "./useTusUpload.types";

export const normalizeTusHeaders = (headers: object): Record<string, string> =>
  Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, String(value)]));

export const buildFileFingerprint = (file: File) =>
  `${file.name}:${file.size}:${file.lastModified}`;

export const useTusUpload = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async <TSession extends TusUploadSession>({
      file,
      session,
      fingerprintNamespace,
      metadata,
      resumeAdapter,
      uploadingToastKey,
      uploadedToastKey,
      onUploadingStart,
      onProgress,
      onUploaded,
      onError,
    }: TusUploadArgs<TSession>) => {
      if (!session.tusEndpoint || !session.tusHeaders) {
        throw new Error(t("common.toast.somethingWentWrong"));
      }

      const connection = resolveTusEndpoint(
        session.tusEndpoint,
        ApiClient.instance.defaults.baseURL,
        window.location.origin,
      );
      const existingUpload = resumeAdapter?.getUploadForFile(file);
      const tusHeaders = normalizeTusHeaders(session.tusHeaders ?? {});
      const tusFingerprint = `${fingerprintNamespace}:${session.uploadId}:${buildFileFingerprint(file)}`;

      if (!existingUpload) {
        resumeAdapter?.saveUpload({
          ...session,
          uploadId: session.uploadId,
          tusEndpoint: connection.endpoint,
          tusHeaders,
          expiresAt: session.expiresAt,
          filename: file.name,
          sizeBytes: file.size,
          lastModified: file.lastModified,
        } as StoredTusUpload & TSession);
      }

      setIsUploading(true);

      try {
        await new Promise<void>((resolve, reject) => {
          if (uploadingToastKey) {
            toast({
              description: t(uploadingToastKey),
              duration: Number.POSITIVE_INFINITY,
              variant: "loading",
            });
          }

          onUploadingStart?.();

          const upload = new tus.Upload(file, {
            endpoint: connection.endpoint,
            onBeforeRequest: (request) => {
              // tus-js-client 4 configures browser credentials on its underlying XHR.
              (request.getUnderlyingObject() as XMLHttpRequest).withCredentials =
                connection.withCredentials;
            },
            headers: tusHeaders,
            chunkSize: session.partSize ?? DEFAULT_TUS_CHUNK_SIZE,
            metadata: {
              filename: file.name,
              filetype: file.type,
              uploadId: session.uploadId,
              ...metadata,
            },
            retryDelays: [0, 1000, 3000, 5000, 10000],
            fingerprint: async () => tusFingerprint,
            removeFingerprintOnSuccess: true,
            onProgress: (bytesUploaded, bytesTotal) => {
              if (bytesTotal === 0) return;
              const progress = Math.round((bytesUploaded / bytesTotal) * 100);
              onProgress?.(progress);
            },
            onError: (error) => {
              resumeAdapter?.clearUpload(session.uploadId);
              onError?.(error);
              reject(error);
            },
            onSuccess: () => {
              resumeAdapter?.clearUpload(session.uploadId);

              if (uploadedToastKey) {
                toast({
                  description: t(uploadedToastKey),
                  duration: Number.POSITIVE_INFINITY,
                  variant: "success",
                });
              }

              onUploaded?.();
              resolve();
            },
          });

          upload.findPreviousUploads().then((previousUploads) => {
            if (previousUploads.length > 0) {
              upload.resumeFromPreviousUpload(previousUploads[0]);
            }
            upload.start();
          });
        });
      } finally {
        setIsUploading(false);
      }
    },
    [t, toast],
  );

  return {
    uploadFile,
    isUploading,
  };
};
