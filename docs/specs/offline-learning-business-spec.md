# Formação offline — conteúdos e avaliações nativas

## Business Overview

O colaborador prepara a formação com Internet, consulta texto e PDFs sem rede e guarda uma avaliação nativa compatível no dispositivo. A aplicação envia a tentativa quando a ligação regressa; o servidor valida as respostas e actualiza o progresso através do motor LMS existente.

## Who Uses It

- O formando inscrito descarrega conteúdos no idioma seleccionado e consulta-os sem rede.
- O formando responde a perguntas de escolha única compatíveis e acompanha a submissão pendente, validada ou recusada.
- O administrador valida a experiência no modo de aprendizagem existente; o modo de suporte não admite descargas privadas.

## Feature Functions

- Descarregar texto, PDFs e avaliações nativas suportadas de uma formação inscrita.
- Identificar conteúdos excluídos e distinguir uma descarga completa de uma transferência interrompida.
- Reabrir a aplicação sem rede e recuperar conteúdos e a tentativa guardada.
- Reenviar a mesma tentativa após falha de rede, sem duplicar uma avaliação já aceite pelo servidor.
- Apresentar a nota confirmada pelo servidor e conservar um conflito para revisão.
- Remover conteúdos e separar as cópias e tentativas por conta e origem.

## End-User Value

O colaborador consulta instruções e prepara uma avaliação em operações com conectividade limitada. O estado visível distingue respostas guardadas no telemóvel de resultados já reconhecidos na formação.

## How It Works

O colaborador descarrega previamente a formação. A página «Descargas offline» apresenta os conteúdos preparados e os questionários compatíveis. O limite inicial é 32 MB por formação e sete dias de validade. Vídeo e SCORM continuam a exigir ligação.

A avaliação admite uma submissão activa por lição/ciclo nesta primeira fatia, com escolha única e correcção automática, sem fotografias, cooldown ou limites de tentativas. Guardar a avaliação não atribui uma nota local: a aplicação conserva as respostas e o identificador da tentativa, mesmo após fecho. Ao reabrir com ligação e sessão válida, o servidor confirma ou recusa o envio. Alterações à avaliação, expiração ou mudança do ciclo exigem reconciliação e nova preparação. O formando pode exportar as respostas, arquivar explicitamente a tentativa recusada e descarregar novamente a avaliação. O arquivo conserva UUID, payload e, nas novas tentativas, texto original das perguntas/opções. A cópia antiga fica bloqueada para nova resposta. Não se copiam automaticamente respostas antigas para uma versão diferente.

A sessão expirada bloqueia o acesso aos conteúdos sem eliminar respostas pendentes. Terminar sessão ou mudar de conta remove as cópias de conteúdos; as tentativas permanecem separadas pela conta/origem e não são apresentadas a outra conta. Estas tentativas locais não são um cofre cifrado contra quem controla o perfil do navegador. O colaborador deve usar um dispositivo privado; não se garante apagamento remoto enquanto estiver desligado. A sincronização funciona com a aplicação aberta, sem promessa de execução em segundo plano pelo sistema operativo.

## Key Technical Context

IndexedDB/Dexie guarda conteúdos e operações, sem credenciais ou chaves de respostas. Workbox guarda recursos estáticos, sem respostas privadas da API. A rota offline evita consultas globais de sessão e reutiliza os visualizadores existentes. O texto não conserva URLs ou atributos executáveis; PDFs usam worker local.

O snapshot assinado vincula a avaliação ao tenant, utilizador, idioma, definição e ciclo. A API decide a autorização, corrige com o motor nativo e grava o recibo na mesma transacção da tentativa/progresso/outbox. A data do dispositivo é informativa. O histórico do servidor mantém-se quando a cópia local é removida.

## Test Evidence

A leitura offline foi demonstrada em Chrome, incluindo fecho/reabertura sem rede, canvas PDF, interrupção/retry e remoção persistente. Na etapa de avaliações, nove testes API passaram com correcção, rollback, concorrência, acesso de outro formando e recusa de outro tenant sob RLS. Nove testes da fila verificam persistência, confirmação perdida, lease interrompido, conflito, logout, recibo incorrecto, repetição explícita, arquivo e texto original. Quatro testes de sessão e testes do sincronizador de autenticação passaram. O percurso Chrome completo das avaliações também passou: descarga, resposta/reabertura sem rede, sincronização, recibo idempotente e conclusão nativa confirmada. Consultar `docs/sprints/omatapalo-mentingo/04-offline-content.md` e `05-offline-assessments.md` para resultados, falhas e comandos. Android físico e SCORM offline ainda não foram demonstrados.

Na execução de 18-10-2026, o Chrome recebeu HTTP 401 real após remoção controlada de cookies e recuperou após reposição da autenticação; não se esperou pela expiração natural de um JWT. Outro percurso editou realmente a avaliação pela API, recebeu 409, exportou/arquivou a tentativa, bloqueou a versão antiga e concluiu uma nova tentativa após nova descarga. A validação final confirmou o texto das opções originais no ficheiro exportado. Tentativas anteriores a esta implementação podem conter apenas identificadores; não se fabrica retrospectivamente o texto histórico. O guião Android físico está em `docs/sprints/omatapalo-mentingo/13-android-physical-validation.md`, ainda sem execução.
