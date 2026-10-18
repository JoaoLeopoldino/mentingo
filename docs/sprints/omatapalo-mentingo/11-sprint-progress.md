# Relatório de progresso da sprint — 18-10-2026

Estado: **68,75% dos critérios do checklist de validação demonstrados: 22 de 32**. Decisão: **CONDITIONAL GO para continuar a validação; sem GO para produção**.

Código funcional de referência: API `38683c60`, UI/fila `276827c8`, validação/build `ba3290a3`; checkpoint `3a6dc5e8`. A execução anterior recuperou o checkout original. A actual entrega acrescentou competências, recuperação offline, catálogo pt-AO integral, correcções SCORM/HLS e novas evidências visuais. A aplicação ensaiada é o build local do sprint; não foi substituída por uma demonstração simulada.

## Como interpretar a percentagem

Este modelo foi definido neste relatório para tornar o acompanhamento verificável. Há quatro critérios por etapa, com peso igual e resultado binário: demonstrado vale 1; incompleto, não executado ou bloqueado vale 0. **22 ÷ 32 × 100 = 68,75%**. Os critérios completos estão abaixo; os pesos não representam esforço, custo, duração ou importância comercial iguais.

Não significa que falte metade do tempo de engenharia, que o produto esteja 50% pronto para produção ou que todos os requisitos de Omatapalo tenham metade da solução. O MVP de competências foi implementado e ensaiado; integrações continuam pendentes. Gates críticos, como Android físico e operação empresarial, prevalecem sobre qualquer média. O modelo de adequação comercial ponderado da auditoria não foi convertido numa pontuação de prontidão sem provas suficientes.

| Etapa                         | Demonstrados | Progresso do checklist | Situação                                                                                   |
| ----------------------------- | -----------: | ---------------------: | ------------------------------------------------------------------------------------------ |
| 0 — ambiente e baseline       |          4/4 |               **100%** | Ambiente de desenvolvimento isolado e fluxos básicos operacionais                          |
| 1 — pt-AO funcional           |          3/4 |                **75%** | Registo, fallback, preferência e formatação; experiência integral incompleta               |
| 2 — SCORM e certificados      |          2/4 |                **50%** | API, testes de ciclos/histórico e segurança; player/publicação de credenciais por concluir |
| 3 — conteúdos offline         |          3/4 |                **75%** | Texto/PDF, descarga privada e reabertura sem rede; Android real pendente                   |
| 4 — avaliações offline        |          4/4 |  **100% do checklist** | Recuperação 401/409, arquivo, nova descarga e sincronização demonstrados em Chrome         |
| 5 — competências              |          4/4 |  **100% do checklist** | MVP local: catálogo, requisitos, evidências, lacunas, permissões e demo real               |
| 6 — integrações e vídeo       |          1/4 |                **25%** | Auto HLS corrigido/testado; integrações e medição de rede pendentes                        |
| 7 — benchmark e decisão final |          1/4 |                **25%** | Evidências e decisão provisória; comparação/carga/operação por concluir                    |
| **Total**                     |    **22/32** |             **68,75%** | **Sprint incompleto; gates de produção abertos**                                           |

A recuperação dos ficheiros é uma tarefa de saneamento adicional concluída; não se acrescentaram pontos ao denominador para aumentar o progresso.

## Localização: percentagem distinta

A cobertura estrutural actual é **6.099/6.099 = 100%**, com 6.042 valores distintos do inglês e 57 invariantes explícitos. Há zero chaves em fallback no catálogo actual. A tradução foi gerada e validada por lotes; revisão linguística humana não medida. Nove corpos essenciais e 19 assuntos de email têm tradução, com testes de renderização. A experiência integral de todos os canais continua aberta; não se altera o denominador nem se fecha esse critério apenas por preencher JSON.

O QA confirmou login, selector persistido e HTML `lang=pt-AO`. O botão “Download Report” foi traduzido e observado como “Descarregar relatório” no Chrome DevTools MCP. Os cursos fictícios em inglês não são traduções em falta da interface: conteúdos de formação requerem autoria/localização própria.

## Checklist completo e evidências

### Etapa 0 — 4/4

- [x] Node/pnpm compatíveis, dependências e worktree isolado; instruções e estado Git verificados. Relatórios 01 e 10.
- [x] PostgreSQL, Redis, armazenamento privado e email locais, dados fictícios e migrations isoladas. Relatório 01.
- [x] API/frontend, autenticação, navegação, catálogo e abertura de curso/lição observados. QA actual e relatório 12.
- [x] Builds, typechecks e testes relevantes executados, com bloqueios e tempos registados. Relatórios 01–05.

### Etapa 1 — 3/4

- [x] pt-AO registado, normalização BCP 47, detecção, fallback e placeholders testados. Relatório 02; 10 testes Node.
- [x] Selector visível, persistência na API/reabertura e HTML lang observados. QA actual.
- [x] Intl pt-AO, Africa/Luanda e AOA testados no runtime utilizado. Testes de formatação.
- [ ] Experiência linguística integral nos percursos exigidos, administração e canais complementares. Catálogo UI estruturalmente completo; revisão humana, textos fixos e restantes canais ainda incompletos.

### Etapa 2 — 2/4

- [x] SCORM 1.2: ZIP/manifest, lançamento API, score, suspend_data, retoma, conclusão, permissões, exportação e reimportação ensaiados separadamente. Relatório 03: 9 testes/S3 passaram, um excluído.
- [x] Certificados: autorização negativa, emissão/renovação concorrente, ciclos e histórico preservados em integração. Relatório 03: 41 testes de certificados e quatro de relatórios passaram.
- [ ] Player SCORM no navegador/Android e pacotes independentes adequadamente licenciados demonstrados. Chrome passou quatro checkpoints com pacote sintético MIT; Android e pacote independente continuam pendentes.
- [ ] Matriz completa de verificação pública, revogação e certificados de percursos de aprendizagem demonstrada. Não há ecrã de histórico entregue.

### Etapa 3 — 3/4

- [x] Descarga autenticada/atómica de texto/PDF, propriedade por conta/origem e regras locais de armazenamento. Relatório 04.
- [x] Arranque após fecho/reabertura sem rede, visualização de texto/PDF e remoção persistente. QA Chrome actual.
- [x] Transferência interrompida, retry, quotas/expiração/limpeza em testes e upgrade de storage preservando conteúdos. Relatórios 04–05.
- [ ] Android físico, quotas reais e comportamento em armazenamento/ligação limitados validados. Viewport de 390 px não substitui um dispositivo Android.

### Etapa 4 — 4/4

- [x] Tentativa local com UUID imutável, respostas persistidas, estados e timestamps separados. Relatório 05.
- [x] Validação/correcção pelo motor nativo, recibo idempotente, retry/lease, RLS e rollback conjunto demonstrados. Nove testes API e seis de fila.
- [x] Responder sem rede, fechar/reabrir, restabelecer ligação e confirmar conclusão nativa no Chrome. QA actual.
- [x] Recuperação assistida de tentativa recusada, sessão expirada ou avaliação alterada, com UX operacional. Chrome: 401 com repetição explícita e 409 com exportação/arquivo, bloqueio da cópia antiga, nova descarga e nova tentativa. Relatório 05.

### Etapa 5 — 4/4

- [x] Catálogo de competências e níveis.
- [x] Requisitos por função/unidade e associação a colaboradores.
- [x] Evidências, estado, lacunas e cursos recomendados, sem certificar competência por nota de quiz.
- [x] Permissões administrador/gestor/formando, testes de domínio/acesso e demo completa.

### Etapa 6 — 1/4

- [ ] Adapter Primavera sintético identificado, contrato, reconciliação e tratamento de erros; integração real depende da API do cliente.
- [ ] Dataset Power BI consistente e autorizado para inscrições, conclusões, progresso, certificados e competências.
- [x] Comportamento Auto HLS corrigido/testado para permitir resoluções baixas. Quatro regressões unitárias passaram; não equivale à medição de banda do critério seguinte.
- [ ] Arranque, rebuffering, resolução e tráfego medidos sob rede limitada.

### Etapa 7 — 1/4

- [x] Estado implementado/testado/bloqueado, incidentes e tempos efectivamente observados documentados; decisão provisória explícita.
- [ ] Perfis de carga 20/50/100 sessões, com vídeo/IA separados e resultados reproduzíveis.
- [ ] Validação operacional e de segurança completa, incluindo restore, RPO/RTO e regressões acordadas.
- [ ] Comparação Moodle/IOMAD pelos mesmos critérios, TCO 12/24/36 meses com hipóteses e estimativa revista do trabalho restante.

## O que foi executado nesta retoma

- Recuperação verificada: 3.194 ficheiros repostos, 21 snapshots reparados, 5.191 ficheiros conferidos e sete relatórios preservados; índice reconstruído. Relatório 10.
- QA em Chrome com API e armazenamento locais reais: login/painel/idioma/catálogo/lição, texto/PDF offline e avaliação offline. Capturas desktop e viewport móvel no relatório 12.
- Os testes de integração e unitários anteriores são evidência histórica registada, não foram todos repetidos nesta execução de QA. Não se somam execuções repetidas como funcionalidades adicionais.
- Sem produção, dados de clientes, push ou merge para `main`. O checkout original está recuperado na base; o sprint continua num branch/worktree separado.

## Próxima acção de engenharia

Rever linguisticamente o catálogo e fechar os canais restantes, executar o guião Android físico, fechar a matriz SCORM/certificados e ensaiar operação/carga. Competências precisam de hardening/paginação e validação com gestores reais antes de produção. Integrações específicas continuam por iniciar.

O total de horas exclusivas de desenvolvimento não foi medido. O relatório 00 regista intervalos de execução reais, incluindo instalações/builds/esperas; estes intervalos não são uma folha de horas nem um multiplicador de produtividade da IA.

## Actualização da execução seguinte

Sem alterar os **32 critérios**, foram demonstrados os quatro de competências, o de recuperação offline e a correcção/teste do Auto HLS. API de competências `ca797c72`, UI `067407d1`, cálculo de lacunas `848677e0`. Seis testes API/RLS, oito de domínio e cinco checkpoints Chrome de competências passaram. Dois percursos de recuperação offline passaram com seis checkpoints cada. O microbenchmark de domínio não fecha o gate de carga HTTP. O perfil do gestor foi testado pela API; a demonstração visual usou o administrador.

A percentagem mede os mesmos critérios do checklist, não esforço consumido nem prontidão para produção. Android físico continua por executar. O catálogo UI chegou a 100% estrutural; a qualidade linguística e todos os canais não são declarados completos.

## Evolução empresarial de competências — 18/10/2026

Mantêm-se os 32 critérios e 22 demonstrações (68,75%). Os quatro critérios de competências passam a ter frameworks/escalas, versões obrigatórias/opcionais, decisões profissionais independentes das evidências, planos aprovados, funções simultâneas e UI real dos três papéis. Onze cenários API/PostgreSQL/RLS, 21 de domínio e sete checkpoints Chrome; paginação real com 500 colaboradores. O critério de carga concorrente/restore/operação permanece aberto: cinco pedidos sequenciais não o satisfazem. Evidências, falhas e limites no relatório 16; referência Totara no 17.
