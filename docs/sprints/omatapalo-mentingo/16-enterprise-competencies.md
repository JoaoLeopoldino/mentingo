# Evolução empresarial das competências — execução de 18/10/2026

## Estado e referência

Branch isolado: `feat/omatapalo-enterprise-competencies-20261018`, a partir de `4e187000`. Checkout original preservado. Início medido: 11:11:17 UTC (12:11:17 em Luanda). Este relatório será actualizado por etapa; tempo decorrido não equivale a horas de engenharia exclusiva.

## Fase 1 — evidências, avaliações e revogação

Implementada a separação das três decisões. A revisão de uma evidência não atribui nem retira proficiência. Uma avaliação formal posterior substitui a anterior mesmo com nível inferior. Revogação/suspensão exige fundamentação e responsável. Histórico só de acrescentamento, idempotência durável e controlo de concorrência por colaborador/competência.

Migrações Drizzle: 0226 e 0227 (estrutura), 0228 (RLS e conversão dos registos antigos). Na base local fictícia, antes/depois: oito evidências, oito aprovações, hash dos campos originais `28bfcf558a5ae684e62e55fd3b3866e5`; oito avaliações criadas a partir dessas aprovações. Nenhuma evidência original alterada. Script reprodutível: `verify-competency-migration.mjs` (captura antes e verificação depois da migração; apenas localhost/guidebook).

### Testes executados

- Baseline de domínio: 8/8, 12,794 s.
- Regressão primeiro reproduzida: 1 falha/7 sucessos, 14,213 s; a evidência recusada removia a aprovação anterior.
- Domínio após separação: 12/12, última execução 8,480 s.
- API/PostgreSQL/RLS: 7/7, última execução 46,599 s. Inclui recusa mantendo avaliação, avaliação concorrente (201/409), repetição idempotente, comando incompatível, revogação, âmbito do gestor e isolamento/imutabilidade das três novas tabelas.
- TypeScript API e web: sem erros nas verificações executadas.
- Compilação API: concluída; servidor local reiniciado. Cliente regenerado a partir de Swagger pela ferramenta existente.
- Compilação web e Chrome: em validação; não declarados concluídos neste ponto.

### Problemas encontrados e resolvidos

A primeira geração omitiu a coluna de tipo de evidência antes do backfill: o teste falhou por coluna inexistente. A transacção não foi aplicada. O rascunho custom ainda não aplicado foi removido pela ferramenta Drizzle, preservado em ficheiros locais ignorados, e regenerado na ordem correcta: estrutura antes de dados. As migrações aplicadas não foram reescritas.

### Limitações e trabalho seguinte

Continuam a faltar frameworks/escalas reutilizáveis, requisitos versionados, planos individuais, múltiplas funções, gestão explícita de avaliadores e validação Chrome dos três perfis. O novo modelo ainda não foi ensaiado com 500 colaboradores reais de teste nem significa paridade com Totara.

Comandos: `source scripts/sprints/omatapalo/environment.sh`; `sprint_pnpm --filter api exec jest competency-gaps.spec.ts --runInBand`; `NODE_OPTIONS=--max-old-space-size=4096 bash scripts/sprints/omatapalo/test-api-e2e.sh competencies.e2e-spec.ts` (guard de base local). Logs/evidências brutas em `.local/sprint/enterprise-*`, ignorados pelo Git.
