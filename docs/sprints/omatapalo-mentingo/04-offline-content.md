# Etapa 3 — Conteúdos offline

Estado actual: **leitura funcional e actualização interrompida sem perder a cópia anterior; Android/quota real pendentes**. Commit inicial `7054413a`; branch actual `feat/omatapalo-enterprise-competencies-20261018`. [Validação actual](18-enterprise-validation.md). As secções seguintes preservam os checkpoints históricos.

## Alterações efectuadas

A formação inscrita disponibiliza «Descarregar texto e PDFs». A cópia fica em IndexedDB/Dexie, separada por origem, colaborador, formação e idioma. Apenas uma descarga completa fica ready. Uma falha, falta de espaço, remoção ou mudança de sessão impede a publicação de conteúdo parcial ou a reposição de uma descarga eliminada.

A página `/offline-learning` reutiliza os visualizadores existentes sem consultas globais de sessão/branding. Conserva texto seguro e PDFs privados; exclui vídeos, imagens, avaliações e SCORM. A interface identifica exclusões, permite remover a cópia e informa a validade de sete dias e o limite de 32 MB por formação.

Workbox guarda somente recursos estáticos compilados. O service worker é registado explicitamente e gerado novamente no fim do build Remix, depois da emissão do HTML e do manifesto de rotas. A verificação do build exige que os recursos referidos pelo HTML estejam presentes no precache. O worker PDF.js é local. O cache genérico anterior de imagens externas foi retirado.

A API de lições de texto devolve agora `lessonResources`, um campo já previsto no contrato. O respectivo teste de regressão foi recuperado. Downloads usam o cliente gerado e os endpoints autenticados existentes; não há outro backend.

## Evidências e testes

Antes do reinício foram observados: 26 testes web aprovados; 10 testes Node; sete testes de integração das lições; cinco checkpoints Chrome. A reabertura do navegador sem rede mostrou texto e PDF renderizado; a remoção persistiu após reload. O acesso anónimo ao PDF privado foi recusado. A intercepção de rede apenas induziu falha, sem simular respostas de sucesso.

O worktree temporário e os logs/capturas desapareceram. Estes resultados anteriores não aprovam a reconstrução. Ver [incidente e recuperação](09-recovery-checkpoint.md).

Na recuperação actual, **10 testes Node passaram em 270,949 ms**. Cobertura pt-AO: **2.029 / 6.006 (33,78%)**; 3.977 chaves com fallback inglês. Foram traduzidos mais cinco textos do PDF e corrigido o separador decimal no novo ecrã. **26 testes web passaram em 3,06s** e **sete testes de integração de lições passaram em 197,423s** (45 fora do filtro). Build API e lints passaram. Typecheck web, build web e Chrome estão nos checkpoints seguintes.

## Reprodução

A partir da raiz do worktree persistente, com os serviços locais activos:

```bash
source scripts/sprints/omatapalo/environment.sh
sprint_pnpm packages:build
sprint_pnpm --filter web test app/modules/Offline app/modules/Courses/CourseView/CourseOverview/CourseOverviewActions.test.tsx app/utils/language-localization.test.ts app/api/mutations/useEnrollCourse.test.tsx
bash scripts/sprints/omatapalo/test-api-e2e.sh --runTestsByPath src/lesson/__tests__/lesson.controller.e2e-spec.ts -t 'public lesson access'
NODE_OPTIONS=--max-old-space-size=4096 sprint_pnpm --filter web build
node scripts/sprints/omatapalo/verify-offline-build.mjs
node scripts/sprints/omatapalo/serve-preview.mjs
# Noutra shell, com API em localhost:3000 e sem builds em execução:
source scripts/sprints/omatapalo/environment.sh
sprint_pnpm --filter api exec tsx --tsconfig ../web/tsconfig.json ../../scripts/sprints/omatapalo/browser-offline.mts
```

O script Chrome cria e tenta remover entidades fictícias pelas factories existentes. O preview escuta somente em 127.0.0.1:5173. Perfis, logs, capturas e segredos ficam ignorados em `.local/` no caminho persistente. A API precisa de estar operacional e de acesso à base original sintética; não executar seed sobre base preenchida.

## Limitações

- Sem avaliações, progresso, conclusão, vídeo ou SCORM offline; ainda não é formação offline de ponta a ponta.
- Sem retoma parcial de ficheiros. O tamanho é verificado após receber cada PDF, sem limitar antecipadamente todo o tráfego. Uma transferência interrompida exige nova descarga.
- A consulta nativa de preparação pode marcar a lição como iniciada, mas não a conclui. PDFs aparecem depois do texto; posições e toda a formatação não são preservadas.
- O relógio local determina a validade. O sistema operativo pode remover IndexedDB. Não existe licença criptográfica nem apagamento remoto garantido: definir política de dispositivos privados antes de produção.
- Alterações posteriores do curso não actualizam a cópia automaticamente. Uma repetição substitui a cópia anterior; se falhar, o estado fica failed.
- O ensaio anterior observou aproximadamente 14 MB de precache. Módulos globais tentaram carregar fontes, SDK YouTube e o manifesto público sem rede; as falhas não impediram a leitura. Remover estas dependências residuais e medir rede fraca antes de produção.
- Sem validação Android real ou instalação PWA em HTTPS. O preview estático de teste não é uma configuração de alojamento de produção.
- Dexie 4.4.6 e fake-indexeddb 6.2.6 usam Apache-2.0; workbox-window 7.4.1 usa MIT. O worker PDF.js mantém o aviso Apache-2.0; MIT upstream preservada. Auditoria transitiva completa ainda por fazer.

## Android real — por executar

Servir o build numa origem HTTPS de desenvolvimento isolada, com proxy correcto para a API. Entrar com conta fictícia inscrita, descarregar texto/PDF e esperar pela disponibilidade. Activar modo de avião, fechar/reabrir, ler todas as páginas do PDF, remover e recarregar. Repetir com transferência interrompida, pouco espaço, reinício e troca de conta. Registar modelo, Android, navegador, bytes e tempos. Não expor os segredos desta instalação local.

## Tempo efectivo

Primeira implementação: aproximadamente 17:41–18:08 UTC, incluindo testes, downloads e várias correcções reais da integração Remix/Workbox. A retoma após reinício começou cerca de 22:20 UTC e é medida separadamente; o intervalo sem execução não conta como engenharia. A instalação e a reconstrução não são uma segunda funcionalidade entregue.

## Validação final da recuperação — 23:03 UTC

Build e typecheck web passaram. O worker final inclui 510 recursos / 14.430,29 KiB; os 63 recursos referidos pelo HTML foram confirmados no cache. **Os cinco checkpoints Chrome passaram novamente**, incluindo PDF efectivamente renderizado em canvas, fecho/reabertura sem rede, «Página 1 de 1», tamanho com vírgula decimal, HTML lang pt-AO e remoção persistente. A captura foi revista visualmente. Não houve resposta de sucesso simulada. Logs: `.local/sprint/browser-offline-recovery.log`, `build-web-recovery.log`, `verify-offline-build.log`, `web-tests-recovery.log` e `api-tests-recovery.log`.

A retoma durou aproximadamente 43 minutos decorridos, incluindo reconstrução, instalação e esperas; não corresponde a uma segunda implementação independente. As limitações Android, dependências globais e ausência de avaliações mantêm-se.

## Robustez empresarial — execução de 18/10/2026

A actualização conserva a última cópia completa, incluindo metadados e datas, enquanto reclama a transferência com outro token. Só substitui o conteúdo após sucesso. Erros de rede, excesso de tamanho e `QuotaExceededError` conservam a cópia anterior. Quatro regressões falharam antes e passaram depois; o conjunto offline actual tem 25 testes. O conjunto web final com idioma e as duas suites HLS passou 40/40 em 10,34 s.

Chrome exerceu sete checkpoints positivos e um probe bloqueado, incluindo actualização com falha real de rede, leitura PDF/texto após reabertura offline e remoção persistente. CDP declarou quota 1, mas `navigator.storage.estimate()` continuou a expor outra quota e a descarga coube: **não foi validado armazenamento efectivamente cheio**. Não se força uma asserção de sucesso nem se substitui o teste Android físico. [Guião físico](13-android-physical-validation.md).

Há também avaliações nativas com sincronização desde a etapa 4; a frase histórica «ausência de avaliações» acima deixou de descrever o estado actual. SCORM e vídeo permanecem fora do offline entregue. Tempos exclusivos desta correcção não medidos; intervalo e evidências no relatório 18.
