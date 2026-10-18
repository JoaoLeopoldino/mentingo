# Relatório de progresso da sprint — 18-10-2026

Estado: **50% dos critérios do checklist de validação demonstrados: 16 de 32**. Decisão: **CONDITIONAL GO para continuar a validação; sem GO para produção**.

Código funcional de referência: API `38683c60`, UI/fila `276827c8`, validação/build `ba3290a3`; checkpoint `3a6dc5e8`. Nesta execução recuperou-se o checkout original, ampliaram-se os scripts de QA e recolheram-se novas evidências visuais. A aplicação ensaiada é o build local do sprint; não foi substituída por uma demonstração simulada.

## Como interpretar a percentagem

Este modelo foi definido neste relatório para tornar o acompanhamento verificável. Há quatro critérios por etapa, com peso igual e resultado binário: demonstrado vale 1; incompleto, não executado ou bloqueado vale 0. **16 ÷ 32 × 100 = 50%**. Os critérios completos estão abaixo; os pesos não representam esforço, custo, duração ou importância comercial iguais.

Não significa que falte metade do tempo de engenharia, que o produto esteja 50% pronto para produção ou que todos os requisitos de Omatapalo tenham metade da solução. Competências e integrações ainda não foram implementadas. Gates críticos, como Android físico e operação empresarial, prevalecem sobre qualquer média. O modelo de adequação comercial ponderado da auditoria não foi convertido numa pontuação de prontidão sem provas suficientes.

| Etapa | Demonstrados | Progresso do checklist | Situação |
|---|---:|---:|---|
| 0 — ambiente e baseline | 4/4 | **100%** | Ambiente de desenvolvimento isolado e fluxos básicos operacionais |
| 1 — pt-AO funcional | 3/4 | **75%** | Registo, fallback, preferência e formatação; experiência integral incompleta |
| 2 — SCORM e certificados | 2/4 | **50%** | API, testes de ciclos/histórico e segurança; player/publicação de credenciais por concluir |
| 3 — conteúdos offline | 3/4 | **75%** | Texto/PDF, descarga privada e reabertura sem rede; Android real pendente |
| 4 — avaliações offline | 3/4 | **75%** | Fila, sincronização validada e Chrome; recuperação assistida de conflitos pendente |
| 5 — competências | 0/4 | **0%** | Ainda não implementadas |
| 6 — integrações e vídeo | 0/4 | **0%** | Ainda não implementados/medidos |
| 7 — benchmark e decisão final | 1/4 | **25%** | Evidências e decisão provisória; comparação/carga/operação por concluir |
| **Total** | **16/32** | **50%** | **Sprint incompleto** |

A recuperação dos ficheiros é uma tarefa de saneamento adicional concluída; não se acrescentaram pontos ao denominador para aumentar o progresso.

## Localização: percentagem distinta

A cobertura de tradução é **2.050/6.027 chaves = 34,01%**, com **3.977 chaves em fallback inglês**. Esta medida conta chaves traduzidas, não critérios de funcionalidade. Por isso é possível ter 75% dos quatro critérios técnicos de idioma e apenas 34,01% do catálogo traduzido. A tradução integral e os canais email/PDF/API continuam pendentes.

O QA actual confirmou login, selector persistido e HTML `lang=pt-AO`. Encontrou o botão “Download Report” ainda em inglês. Os cursos fictícios em inglês não são traduções em falta da interface: conteúdos de formação requerem autoria/localização própria.

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
- [ ] Experiência linguística integral nos percursos exigidos, administração e canais complementares. Cobertura de chaves 34,01%; texto inglês observado no painel.

### Etapa 2 — 2/4

- [x] SCORM 1.2: ZIP/manifest, lançamento API, score, suspend_data, retoma, conclusão, permissões, exportação e reimportação ensaiados separadamente. Relatório 03: 9 testes/S3 passaram, um excluído.
- [x] Certificados: autorização negativa, emissão/renovação concorrente, ciclos e histórico preservados em integração. Relatório 03: 41 testes de certificados e quatro de relatórios passaram.
- [ ] Player SCORM no navegador/Android e pacotes independentes adequadamente licenciados demonstrados. Não apresentar teste API como execução visual do player.
- [ ] Matriz completa de verificação pública, revogação e certificados de percursos de aprendizagem demonstrada. Não há ecrã de histórico entregue.

### Etapa 3 — 3/4

- [x] Descarga autenticada/atómica de texto/PDF, propriedade por conta/origem e regras locais de armazenamento. Relatório 04.
- [x] Arranque após fecho/reabertura sem rede, visualização de texto/PDF e remoção persistente. QA Chrome actual.
- [x] Transferência interrompida, retry, quotas/expiração/limpeza em testes e upgrade de storage preservando conteúdos. Relatórios 04–05.
- [ ] Android físico, quotas reais e comportamento em armazenamento/ligação limitados validados. Viewport de 390 px não substitui um dispositivo Android.

### Etapa 4 — 3/4

- [x] Tentativa local com UUID imutável, respostas persistidas, estados e timestamps separados. Relatório 05.
- [x] Validação/correcção pelo motor nativo, recibo idempotente, retry/lease, RLS e rollback conjunto demonstrados. Nove testes API e seis de fila.
- [x] Responder sem rede, fechar/reabrir, restabelecer ligação e confirmar conclusão nativa no Chrome. QA actual.
- [ ] Recuperação assistida de tentativa recusada, sessão expirada ou avaliação alterada, com UX operacional. Actualmente o conflito é preservado/recusado, sem um fluxo completo de resolução.

### Etapa 5 — 0/4

- [ ] Catálogo de competências e níveis.
- [ ] Requisitos por função/unidade e associação a colaboradores.
- [ ] Evidências, estado, lacunas e cursos recomendados, sem certificar competência por nota de quiz.
- [ ] Permissões administrador/gestor/formando, testes de domínio/acesso e demo completa.

### Etapa 6 — 0/4

- [ ] Adapter Primavera sintético identificado, contrato, reconciliação e tratamento de erros; integração real depende da API do cliente.
- [ ] Dataset Power BI consistente e autorizado para inscrições, conclusões, progresso, certificados e competências.
- [ ] Comportamento Auto HLS corrigido/testado para permitir resoluções baixas.
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

Implementar a fatia de competências, começando pela modelação repo-native e testes de tenant/permissões, em paralelo com a preparação do ensaio Android físico e da recuperação assistida de conflitos. Concluir localização administrativa essencial antes de uma apresentação comercial. Corrigir a identificação de versão no processo de build de demonstração.

O total de horas exclusivas de desenvolvimento não foi medido. O relatório 00 regista intervalos de execução reais, incluindo instalações/builds/esperas; estes intervalos não são uma folha de horas nem um multiplicador de produtividade da IA.
