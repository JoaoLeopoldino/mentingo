# Competências — MVP funcional local

**Nota histórica:** o estado empresarial actual, incluindo decisões separadas, frameworks, planos, funções simultâneas, 500 colaboradores e QA dos três papéis, encontra-se no [relatório 16](16-enterprise-competencies.md). As secções seguintes preservam a entrega inicial.

Estado em 18-10-2026: **implementado e ensaiado na API e no Chrome**. Base anterior `d8acd593`, branch `sprint/omatapalo-resume-20261017`. Commit desta entrega: consultar o commit que contém este relatório.

## Alterações

Seis tabelas: catálogo, níveis, funções, requisitos, atribuições e evidências. Reutilizam-se tenants, utilizadores, grupos/unidades, cursos, percursos e RBAC existentes. Uma função principal por colaborador. Origem, fundamentação, autor, avaliador, data, validade e revisão ficam registados. Evidências são acrescentadas; o papel da aplicação não as altera nem elimina.

A página `/competencies` contém catálogo administrativo, funções/requisitos, matriz da equipa e perfil/histórico. As permissões próprias distinguem administração, avaliação de grupos geridos e consulta/apresentação de evidência própria. Uma nota de questionário não atribui competência automaticamente.

Migrações Drizzle: `0223_enterprise_competencies`, `0224_competency_tenant_policies`, `0225_competency_evidence_constraints`. A 0224 foi criada por Drizzle `--custom` e preenchida por `generate-competency-policies.mjs`, sem alteração manual das migrações normais. As FKs de nível incluem tenant/competência/proficiência. Aplicadas apenas às bases locais conhecidas. A versão de Drizzle não materializou o check de estado inicialmente proposto; retirou-se essa declaração sem fingir que existia na base. O enum/estado é validado na API.

## Testes e resultados

- **6/6 testes API/RLS passaram**, 14,147 s: fluxo completo, âmbito de gestor, recusa de auto-certificação/acesso alheio, níveis/referências inválidos, desactivação e RLS/imutabilidade de evidências.
- **4/4 checkpoints Chrome passaram**: catálogo/níveis, requisitos e atribuições nas três províncias, avaliações sucessivas e histórico, matriz com requisito cumprido vs competência em falta.
- Build API passou; typecheck web passou com contrato gerado. Builds web com configuração de sprint passaram. Resultados finais adicionais ficam no relatório de execução seguinte.
- Falhas intermédias corrigidas: imports/tipo de cookie da fixture, ordem de argumentos dos decorators TypeBox, idioma no contrato, papel do gestor na fixture, nomes acessíveis dos selectores e espera pela reposição do formulário entre submissões.

## Demonstração reproduzível

1. Iniciar sessão na conta fictícia local e abrir http://localhost:5173/competencies . Sessões emitidas antes das novas permissões podem exigir novo início de sessão.
2. Catálogo: `UTU_EPI`, “Utilização segura de EPI — demonstração fictícia”, níveis Iniciado/Autónomo/Formador.
3. Função `UTU_OPERATOR`, requisito de nível 2 e formação existente recomendada.
4. Atribuições aos colaboradores fictícios de Luanda, Huíla e Benguela, nos grupos `Utu Demo — …`.
5. Perfil de Luanda: decisões explícitas de nível 1 e depois 2. O histórico mantém ambas; a matriz apresenta requisito cumprido. Huíla e Benguela mantêm a competência em falta.
6. O script é repetível e reutiliza códigos/emails fictícios. Mantém deliberadamente os registos de demonstração locais; não os elimina no fim. Cada nova execução pode acrescentar novas evidências.

```sh
source scripts/sprints/omatapalo/environment.sh
NODE_OPTIONS=--max-old-space-size=4096 bash scripts/sprints/omatapalo/test-api-e2e.sh competencies.e2e-spec.ts
sprint_pnpm --filter api exec tsx --tsconfig ../web/tsconfig.json ../../scripts/sprints/omatapalo/browser-competencies.mts
```

Capturas locais: `.local/sprint/screenshots/08-competency-{matrix,evidence,mobile}.png`; manifesto de demonstração `.local/sprint/competency-demo.json`. Especificação: [gestão de competências](../../specs/competency-management-business-spec.md).

## Limitações e trabalho restante

Validar matriz e avaliação com um gestor na interface, expiração/revisão em relógio controlado e volume realista. Não existem múltiplas funções, anexos binários, paginação, histórico de versões de requisitos ou governação formal de avaliadores. O perfil pode apresentar UUID do avaliador quando este não está na lista de colaboradores visível. A recomendação não substitui a inscrição/acesso à formação.

Tempo: primeiro relógio desta execução **03:46:27 UTC**. Os registos de build/testes dão durações dos processos; não há folha de horas exclusiva por módulo. O intervalo final, incluindo permissões, esperas e restantes funcionalidades, ficará registado no checkpoint da execução. Não tratar esse intervalo como horas de engenharia facturáveis.

## Validação adicional de domínio e medição

O cálculo de lacunas foi extraído para um módulo puro e passou **8 testes**: seis estados, precedência de decisões/evidências pendentes e vigência/desactivação. A suite API/RLS voltou a passar **6/6 em 35,089 s**, incluindo inicialização/compilação do processo.

Um microbenchmark sintético de CPU com 500 colaboradores, 20 competências e 30.000 registos de evidência produziu 10.000 linhas: 10 execuções após 3 aquecimentos, mediana **9,90 ms**, mínimo **8,24 ms**, máximo **18,66 ms** nesta máquina. Não mede HTTP, PostgreSQL, concorrência, payloads completos ou capacidade para 500 sessões. A consulta de histórico ainda não tem paginação empresarial; esse limite mantém-se aberto. Script: `benchmark-competency-gaps.mts`.

## Checkpoint final desta execução

Commits `ca797c72`, `067407d1`, `848677e0`, com catálogo integral/validação de formulários em `b414f7ba`. No build actualizado passaram **5/5 checkpoints Chrome em 9.146 ms**, incluindo validação nativa pt-AO. A captura da matriz e os pormenores do histórico estão na [galeria final](15-next-visual-qa.md). Os seis testes API/RLS e oito de domínio mantêm os resultados acima. O gestor foi exercitado pela API; não se declara demonstração visual dedicada do gestor/formando. Tempo global e trabalho restante: [relatório 14](14-next-execution.md).
