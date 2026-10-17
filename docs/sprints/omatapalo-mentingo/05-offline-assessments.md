# Etapa 4 — Avaliações e sincronização offline

Estado: **por implementar**. Base de continuidade: `52ddc41a`; branch de recuperação `sprint/omatapalo-resume-20261017`.

A etapa 3 contém apenas leitura de texto/PDF. Nenhuma avaliação offline, fila de escrita ou sincronização de progresso foi entregue. Os dados locais não atribuem notas ou certificados.

A próxima fatia deve reutilizar `QuizRuntimeService.submitQuiz`, `QuizAttemptService` e `StudentLessonProgressService`, mantendo transacções, ciclos, permissões e outbox existentes. A inspecção confirmou que `LessonService.evaluationQuiz` abre uma transacção própria; será necessário permitir a composição transaccional para não persistir a avaliação e o recibo de idempotência em transacções independentes.

Critérios ainda sem execução: UUID imutável, fila IndexedDB durável, pending/synced/failed, retry, idempotência no servidor, recusa de payload diferente com a mesma chave, versão do curso/ciclo, timestamps do dispositivo apenas informativos, fecho/reabertura, interrupção de sincronização e conflito após alteração de conteúdo. Não utilizar o resultado calculado no dispositivo como nota confiável.

Tempo de implementação: zero comprovado nesta etapa. Houve apenas descoberta do ponto de integração; não há estimativa empírica de conclusão. Continuar após consolidar a recuperação e a prova da etapa 3. Offline SCORM continua fora do âmbito inicial.
