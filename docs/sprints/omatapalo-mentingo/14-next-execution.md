# Execução seguinte — competências, pt-AO e recuperação offline

Estado de 18-10-2026: **implementação funcional local; 22/32 critérios = 68,75%; CONDITIONAL GO para continuar a validação, sem GO para produção**. Branch `sprint/omatapalo-resume-20261017`, worktree persistente `.local/worktrees/omatapalo-20261017`. Base desta execução `d8acd593`; trabalho anterior preservado, sem push, deployment, dados de clientes ou Git destrutivo.

## Implementado e demonstrado

| Entrega             | Código consolidado                 | Evidência e limite                                                                                                                                                                     |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Competências        | `ca797c72`, `067407d1`, `848677e0` | Seis tabelas com RLS, níveis, funções/unidades existentes, requisitos, atribuições, evidências e lacunas. UI real e avaliações explícitas; uma nota de quiz não certifica competência. |
| Recuperação offline | `94f14739`                         | Respostas e textos originais preservados; retry explícito, exportação, arquivo confirmado e nova tentativa após nova descarga. HTTP 401/409 reais no Chrome.                           |
| pt-AO               | `b414f7ba`                         | 6.099/6.099 chaves, 57 invariantes, zero omissões/erros detectados. Nove corpos essenciais e 19 assuntos de email; revisão humana não medida.                                          |
| SCORM/browser       | `906c9398`                         | TUS autenticado, conteúdo na mesma origem, importação, execução, checkpoint, retoma, ecrã inteiro e conclusão. Pacote sintético MIT, administrador no modo de formando nativo.         |
| Vídeo Auto          | `30ff88f2`                         | Removido o limite mínimo de 720p; quatro regressões passaram. Sem medição de adaptação efectiva, rebuffering ou tráfego.                                                               |

Não foram acrescentados outro backend, motor LMS, biblioteca de UI ou dependência. As migrações Drizzle 0223–0225 foram aplicadas apenas às bases locais conhecidas. A API e o cliente foram regenerados pelos scripts existentes após o contrato de competências.

## Testes executados

| Conjunto                                                                  |                  Resultado |                                                                                                Duração observada |
| ------------------------------------------------------------------------- | -------------------------: | ---------------------------------------------------------------------------------------------------------------: |
| Baseline inicial web de offline/idioma                                    |                21 passaram |                                                                                                           2,67 s |
| Competências API/PostgreSQL/RLS                                           | 6 passaram, execução final |                                                                                                         35,089 s |
| Cálculo de lacunas                                                        |                 8 passaram |                                                                                                          6,367 s |
| Avaliações offline API/PostgreSQL/RLS                                     |                 9 passaram |                                                                                                        149,410 s |
| Regressões web finais: fila, sessão, storage, texto, idioma, TUS e HLS    |                35 passaram |                                                                                                           7,63 s |
| JSON, duplicados, catálogo, placeholders, markup e plurais                |                10 passaram |                                                                     Ver saída Node local; sem extrapolar esforço |
| Emails essenciais e regressões de renderização                            |               254 passaram |                                                                                                         32,167 s |
| Chrome competências                                                       |     5 checkpoints passaram |                                                                                             9.146 ms do percurso |
| Chrome navegação/idioma                                                   |     7 checkpoints passaram |                                                                                    Sem cronómetro próprio retido |
| Chrome SCORM                                                              |     4 checkpoints passaram |                                                                                            11.194 ms do percurso |
| Chrome recuperação offline 401 e 409                                      | 6 + 6 checkpoints passaram | Último percurso 409: 10.662 ms; o ficheiro do percurso 401 foi substituído pelo seguinte, não se inventa duração |
| Typechecks API/web, lint dos ficheiros alterados, build API e cliente/SSR |                   Passaram |                                                                       Build web final: cliente 1m08s; SSR 53,84s |

Após reiniciar a API para carregar o pacote de emails actualizado, o percurso de competências voltou a passar 5/5 em 6.408 ms. Verificação final: frontend 200; API sem autenticação 401, como esperado. Não se adicionam os checkpoints repetidos ao total de 28.

As durações Jest incluem inicialização/fixtures; não são latências dos endpoints. As durações Chrome seguem os pontos de início dos guiões, não horas de implementação. Os testes anteriores de certificados/SCORM API permanecem evidência histórica e não foram todos repetidos nesta execução. A suite integral do monorepo, carga concorrente e restore não foram executados.

Os testes negativos cobrem gestor fora do âmbito, formando sobre outro colaborador, auto-aprovação, referências inválidas, tenants distintos, RLS efectiva sob papel sem bypass e evidências sem UPDATE/DELETE. Os nove testes offline cobrem tentativas duplicadas/concorrentes, ciclo/avaliação alterados, cliente não confiável e rollback. Uma nova asserção confirma que a avaliação offline não cria evidência profissional.

## Falhas encontradas e resolvidas

- Heap Node predefinido insuficiente: verificações pesadas com 4 GB, sem alterar produção. Persistem avisos de source maps, chunks e Sentry sem token, mas builds concluídos.
- Fixtures/tipos/ordem TypeBox e permissões do gestor corrigidos; esperas de reposição dos formulários e nomes acessíveis dos selectores corrigidos.
- Upload SCORM chegava ao frontend estático e recebia 404; agora resolve a API configurada e autentica apenas nessa origem. A proposta inicial de opção TUS não suportada foi rejeitada pelo typecheck e substituída pela API XHR suportada.
- Conteúdo SCORM recebia o HTML da SPA: proxy local GET/HEAD mantém a mesma origem exigida por `window.parent.API`. Pedido sem sessão devolveu 401.
- Guião SCORM esperava HTTP 200 onde a API devolve 201; corrigiu-se o teste, mantendo o contrato.
- Três testes HLS falharam antes da correcção e os quatro passaram depois.

Não há falha pendente nos conjuntos finais seleccionados. Isto não constitui ausência de erros no produto. Não se afirma resolução global de segurança: o RLS novo foi ensaiado; falta validação operacional e de segurança de toda a solução.

## Localização e limites

**A — estrutural:** 100%, 6.099/6.099. **B — tradução automática:** 6.042 valores distintos do inglês, mais 57 invariantes explicitamente listados; zero valores ingleses inesperados detectados. **C — revisão humana:** não medida. As traduções foram produzidas em lotes pelo modelo, reutilizando frases do próprio repositório; sem copiar catálogos externos.

Os testes conferem duplicação de chaves, placeholders, nomes de variáveis ICU, markup/ordem e plurais; não provam a qualidade semântica de todos os textos. Há etiquetas fixas de acessibilidade e títulos de separador herdados ainda ingleses. Faltam corpos de email, modelos personalizados, mensagens operacionais/API, PDFs completos e conteúdo gerado por IA. Os nove emails essenciais foram renderizados em teste; a entrega SMTP destas novas traduções não foi demonstrada. Campos fiscais NIP/KRS e moedas de cobrança não se tornam angolanos por tradução. [Detalhes](02-localization-pt-AO.md).

## Percurso demonstrável de competências

Abrir http://localhost:5173/competencies com a conta fictícia local. O catálogo contém `UTU_EPI`, três níveis e a função `UTU_OPERATOR`, exigindo nível 2. Os grupos existentes representam Luanda, Huíla e Benguela. No perfil de Luanda, avaliações explícitas sucessivas de nível 1 e 2 preservam o histórico. A matriz mostra requisito cumprido em Luanda e competência em falta nas outras duas unidades, com formação recomendada. A recomendação não concede inscrição/acesso automaticamente.

O guião é repetível, reutiliza os códigos fictícios e conserva deliberadamente a demonstração; novas execuções acrescentam evidências. Gestor/formando têm testes API de âmbito e permissões; falta ensaio visual dedicado desses papéis. A UI, contratos e dados são reais, sem adapter ou respostas simuladas para este fluxo. [Guia completo](06-competencies.md) e [galeria](15-next-visual-qa.md).

## Offline e integridade

O fecho/reabertura do Chrome conserva respostas. Retry e idempotência não duplicam a conclusão. Um 401 mantém respostas e exige recuperação explícita da sessão. Um 409 permite exportar/arquivar, bloqueia a cópia antiga e exige nova descarga antes de uma tentativa separada. As respostas não são silenciosamente descartadas. Os registos antigos sem o novo texto de revisão podem apresentar identificadores.

O armazenamento continua local e sem cifragem de aplicação; não protege contra quem controla o perfil do navegador. A retenção entre contas é particionada, não uma garantia contra o administrador do dispositivo. É necessária política de dispositivos/retenção antes de produção. A limpeza pelo sistema operativo ou utilizador continua a poder apagar dados locais. Não há offline SCORM/vídeo nem prova em Android. O [guião físico](13-android-physical-validation.md) está preparado e **não executado**.

## Gates críticos

| Gate                      | Estado verificável                           | Próxima condição                                                                              |
| ------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Offline fiável            | Parcial: Chrome real, recovery e API/RLS     | Android físico, quotas, sessão e rede intermitente no dispositivo                             |
| Competências              | MVP local funcional                          | Paginação, volume/índices, gestor na UI e governação dos requisitos/avaliadores               |
| Interoperabilidade        | SCORM 1.2 API e Chrome sintético             | Pacote independente, Android e delimitação formal de SCORM 2004/xAPI                          |
| Histórico de certificados | Ciclos/testes anteriores preservados         | Matriz de verificação pública/revogação e histórico na UI                                     |
| Segurança de tenants      | Novas tabelas e submissões offline ensaiadas | Revisão global, exportações, ficheiros e operações                                            |
| pt-AO                     | Catálogo estrutural completo                 | Revisão humana, textos fixos e canais restantes                                               |
| ERP real                  | Aberto, sem conector real ou mock entregue   | Versão/API Primavera e contrato autorizado; construir primeiro adapter sintético identificado |
| Operação de produção      | Aberto                                       | 20/50/100 sessões, restore, RPO/RTO, observabilidade, SLAs e rede fraca                       |

## Medições e esforço restante

Primeiro relógio desta execução: **03:46:27 UTC**. Checkpoint medido: **10:23:10 UTC** de 18-10-2026; intervalo **6 h 36 min 43 s**, incluindo geração/revisão, aprovações, builds, testes, esperas e documentação. Entre 03:46:27 e 07:17:55 decorreram 3 h 31 min 28 s até aos primeiros commits de competências/recovery; os trabalhos posteriores incluem tradução integral, emails, SCORM e vídeo. Não há cronómetro exclusivo por funcionalidade nem folha de horas facturáveis. Não se usa multiplicador de produtividade de IA.

O microbenchmark do domínio produziu 10.000 linhas para 500 colaboradores, 20 competências e 30.000 evidências: mediana **9,90 ms**, mínimo 8,24, máximo 18,66. É CPU em memória com dados sintéticos, não HTTP/PostgreSQL ou 500 sessões. O workspace ainda carrega histórico sem paginação: risco de payload/consulta por resolver.

As estimativas abaixo são **dias-pessoa de trabalho restante**, para um engenheiro experiente assistido por Codex, incluindo implementação, testes, documentação e operação da fatia. São hipóteses revistas após construir os MVPs, não conversão do relógio acima. Excluem espera por terceiros e não prometem paridade Totara integral.

| Trabalho restante                           | Optimista | Provável | Conservador | Incerteza principal                                 |
| ------------------------------------------- | --------: | -------: | ----------: | --------------------------------------------------- |
| Competências: paginação, gestor, governação |         3 |        6 |          12 | Volume, regras RH e históricos de requisitos        |
| pt-AO: revisão/canais essenciais restantes  |         2 |        5 |          10 | Disponibilidade de revisor e modelos personalizados |
| Offline: dispositivo e hardening            |         3 |        7 |          15 | Android, quotas, recuperação e uso partilhado       |
| SCORM independente e matriz certificados    |         3 |        7 |          15 | Pacotes reais, estados públicos e revogação         |
| Adapter Primavera sintético                 |         1 |        2 |           4 | Contrato/reconciliação                              |
| Dataset Power BI autorizado                 |         1 |        3 |           6 | Modelo e âmbito de dados                            |
| HLS: distribuição de teste/medições         |         1 |        3 |           6 | Native player, CDN e tráfego                        |
| Adapter Primavera real após acesso          |         2 |        6 |          15 | Versão/API, módulos e autenticação                  |
| Carga, restore, segurança e operação        |         5 |       10 |          20 | Infra-estrutura e critérios de serviço              |
| **Soma sem esperas**                        |    **21** |   **49** |     **103** | Não é compromisso comercial                         |

Não inclui migração real, produção de cursos, Microsoft Teams real, LRS/xAPI ou SCORM 2004. Esses itens exigem protótipos/contratos próprios antes de estimativas firmes. As fatias iniciais foram concluídas mais depressa do que estimativas convencionais poderiam sugerir; os casos ainda sem protótipo mantêm maior incerteza. A velocidade do MVP não elimina QA físico ou dependências externas.

## Comparação documental e operação

Não se instalou Moodle/IOMAD nem se executou o mesmo guião nesses produtos. A comparação seguinte é documental, não um benchmark experimental ou prova sobre uma configuração específica de Omatapalo.

- **Offline:** Moodle App documenta conteúdos e actividades com sincronização, incluindo restrições de configuração e compatibilidade para quizzes/SCORM. Mentingo demonstrou apenas texto/PDF e quiz nativo no Chrome; Android continua aberto. [Moodle 5.1 — offline](https://docs.moodle.org/501/en/Moodle_app_offline_features).
- **Competências:** Moodle documenta frameworks, avaliação, evidências e planos individuais/coortes. Mentingo tem agora a fatia empresarial por função/unidade, mas sem toda essa governação e maturidade comprovada. [Competências](https://docs.moodle.org/501/en/Competencies), [planos](https://docs.moodle.org/501/en/Learning_plans).
- **Tenants:** IOMAD documenta empresas logicamente separadas e permissões próprias; isso não substitui ensaios de isolamento no ambiente escolhido. Mentingo passou RLS nas novas fatias, sem validação global de produção. [IOMAD — multitenancy](https://www.iomad.org/multi-tenancy/).

Para os três, usar os mesmos gates: dispositivo offline, recuperação/conflitos, competências com evidência, pacote SCORM independente, histórico de certificações, limites por gestor/tenant, canais pt-AO e restore/carga. A documentação dos concorrentes não recebe o rótulo «runtime verificado» e o código Mentingo não recebe maturidade apenas por ser moderno.

Não se mediram custos operacionais recorrentes. Dimensionar separadamente aplicação, PostgreSQL, Redis, armazenamento/CDN/vídeo, IA/voz, backups/monitorização e pessoal. 500 contas não são 500 sessões concorrentes. O perfil inicial a ensaiar é aplicação com 2 vCPU/4 GB, base de dados com recursos reservados e Redis separado; são hipóteses para teste, não capacidade certificada nem cotação.

Para 12/24/36 meses, manter a mesma fórmula: implementação inicial + meses × (infra-estrutura + manutenção + licenças) + tráfego de vídeo + IA + migração/serviço. Mentingo tem incerteza de manutenção do fork; Moodle/IOMAD exigem orçamento de configuração/plugins; Totara exige cotação do parceiro/licença e inventário da instalação. Sem preços/cotações e esforço equivalentes, um TCO monetário ou uma alegação de poupança seria inventado. O critério TCO/comparação integral permanece aberto.

## Próxima execução reproduzível

1. Executar o guião Android físico com recolha de evidências, sem o substituir por viewport móvel.
2. Exercitar gestor/formando na UI e paginar o workspace preservando RLS e histórico.
3. Validar pacote SCORM independente e matriz pública/revogação; não expor histórico sem autorização.
4. Construir o adapter Primavera explicitamente sintético e o dataset analítico autorizado, depois medir HLS.
5. Executar carga 20/50/100, restore e revisão dos canais pt-AO antes de proposta de produção.

A aplicação permanece em http://localhost:5173 . Os comandos por módulo, os testes e as limitações estão nos relatórios 02/03/05/06/07; a [galeria revista](15-next-visual-qa.md) e o [checklist sem alteração do denominador](11-sprint-progress.md) permitem verificar a entrega.
