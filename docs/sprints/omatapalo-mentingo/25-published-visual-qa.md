# QA visual do ambiente publicado — 20/10/2026

**Resultado: REPROVADO para demonstração comercial no estado observado.** Login e PDF têm saídas legíveis; a ligação pública à API falhou durante a navegação e impediu concluir os percursos. Este ensaio não modifica código, configuração, conteúdos ou certificados.

## Âmbito, versão e método

- URL efectiva: https://omatapalo.uturh.ao. Ambiente Railway `demo`, embora o runtime use configuração de produção. Sem dados de clientes.
- Chrome real via Playwright, sessões isoladas, gate HTTP e contas fictícias já existentes. Login pela interface, sem contornar permissões. Não foram executados seeds nem scripts de conclusão de cursos.
- Resoluções: 1440×1000 e 390×844; locale pt-AO, fuso Africa/Luanda. Viewport móvel não é validação Android físico.
- Ronda automatizada: **11:06:18.887–11:10:19.250 UTC**, **4 min 0,363 s**. Não representa tempo exclusivo de preparação/inspecção/triagem.
- Durante a preparação ocorreu implantação concorrente do commit `c8daef58`: Web `05239b31-afa0-4c84-9e19-b0734c00da08` SUCCESS às 11:04:13.819Z; API `a7e20792-da7a-4820-8a01-92b8a16a9d70` SUCCESS às 11:06:49.875Z. Não foi esta sessão que implantou ou reiniciou serviços.
- A falha inicial coincide com a transição; posteriores pedidos GET autenticados também excederam 15 s, com ambos os deployments já em SUCCESS. A indisponibilidade observada não é atribuída apenas ao rollout sem investigação adicional.
- Foram guardadas oito capturas do navegador e uma renderização de PDF. Relatório estruturado, textos e harness: `.local/qa/20261020-published/`, ignorado pelo Git. Credenciais temporárias estiveram separadas, modo 0600, sem inclusão em capturas ou neste relatório; o ficheiro de acesso foi removido no fecho do ensaio.

## Matriz efectivamente observada

| Percurso | Resultado | Evidência |
|---|---|---|
| Login em computador | Apresentado em pt-AO, aviso da demo, campos e botão legíveis; sem imagens quebradas ou overflow horizontal | [Captura](../../../.local/qa/20261020-published/screenshots/01-login-desktop.png) |
| Login em telemóvel | Formulário e aviso adaptam-se a 390 px; sem overflow horizontal global | [Captura](../../../.local/qa/20261020-published/screenshots/02-login-mobile.png) |
| Login do formando fictício | Autenticou e abriu `/dashboard`; widgets ficaram em carregamento na captura. Não classificado como painel funcional | [Painel](../../../.local/qa/20261020-published/screenshots/student-landing.png) |
| Formações | Erro 502 na obtenção das definições; ecrã de erro com stack técnico | [Falha](../../../.local/qa/20261020-published/screenshots/student-courses.png) |
| Competências do formando | Carregamento não concluiu; navegação excedeu 40 s | [Falha](../../../.local/qa/20261020-published/screenshots/student-failure.png) |
| Administrador | Página de login não estabilizou em 45 s; não se chegou a submeter credenciais neste perfil | [Captura](../../../.local/qa/20261020-published/screenshots/admin-failure.png) |
| Gestor operacional | Mesmo bloqueio antes do login; matriz/equipa não avaliadas | [Captura](../../../.local/qa/20261020-published/screenshots/group_manager-failure.png) |
| Gestor de formação | Mesmo bloqueio antes do login; ferramentas de administração não avaliadas | [Captura](../../../.local/qa/20261020-published/screenshots/content_creator-failure.png) |
| PDF já emitido no Railway | Recuperado do job anterior, SHA-256 conferido; 43.289 bytes, legível e marcado como demonstração. Não foi gerado outro | [PDF](../../../.local/qa/20261020-published/railway-certificate.pdf), [imagem](../../../.local/qa/20261020-published/screenshots/railway-certificate.png) |

## Achados e reprodução

### QA-01 — P0: percursos interrompidos pela ligação Web → API

Reprodução observada: entrar como formando fictício, abrir Formações e depois Competências. Resultado: painel com widgets pendentes, erro 502 em Formações e carregamento prolongado em Competências. Administrador/gestores ficaram bloqueados ainda na apresentação do login, antes da tentativa de autenticação.

Respostas 502 registadas pelo navegador em `/api/settings`, `/api/auth/current-user`, `/api/settings/global`, `/api/settings/platform-simple-logo` e `/api/settings/company-information`. As respostas 401 iniciais são registadas separadamente e não são automaticamente classificadas como defeitos, porque a descoberta da sessão anónima faz parte do arranque.

Logs reais do Web às 11:06:54–55 UTC: `connect() failed (111: Connection refused) while connecting to upstream` e `no live upstreams`. Pedidos GET posteriores, com gate autenticado: `/api/healthcheck` e `/api/settings/company-information` excederam o timeout de 15 s; `/healthz` respondeu 200 em 0,53 s. O health do Nginx não comprova disponibilidade da aplicação.

O template resolve o upstream em `deployment/railway/default.conf.template:18` e `:37`; o registo de deployment mostra o Web pronto antes da nova API. **Hipótese a investigar:** resolução/endereço do upstream após substituição da API, porta/listener e ordem do rollout. Não houve inspecção interna suficiente para declarar a causa final, nem restart para mascarar a falha.

Aceitação: com deployment estável, repetir login e navegação dos quatro perfis; API e widgets devem concluir; páginas devem recuperar também após recarregar. Ensaiar posteriormente uma substituição controlada da API para confirmar recuperação do proxy, dentro de autorização própria para operação.

### QA-02 — P1: erro técnico bruto exposto ao utilizador

Em Formações, a interface mostrou `Request failed with status code 502` e `AxiosError` com stack e caminhos de assets. Esperado: mensagem pt-AO clara, acção de recuperação e detalhe técnico apenas no registo de diagnóstico. Evidência visual em student-courses.png; encaminhamento de error.stack/message em `apps/web/app/root.tsx:102–108`. Não foram encontrados tokens no texto capturado; o problema verificado é exposição de detalhe técnico e experiência inadequada.

### QA-03 — P2: idioma declarado incorrecto no ecrã de erro

O documento passou de `lang=pt-AO` no login/painel para `lang=en` na falha de Formações, apesar de parte do texto continuar em português. A mensagem técnica ficou em inglês. Isto afecta a coerência linguística e potencialmente leitores de ecrã. Esperado: preservar idioma e textos localizados também nas falhas de arranque.

### QA-04 — P3: versão genérica visível

O login apresenta `v0.0.0`, que não identifica a distribuição implantada. Antes da apresentação, associar uma versão verificável à release. Não é um bloqueio funcional isoladamente.

## PDF: resultado da inspecção visual

Fonte: job Railway `df9563d5-266d-4462-af58-522bf8b4fd8f`, commit `61b15ad9`, executado antes desta ronda. Reconstrução pelas linhas numeradas, com sequência completa e SHA-256 igual ao anunciado. PDF original preservado, sem edição; renderização via Poppler.

Confirmados: uma página, aviso vermelho “DEMONSTRAÇÃO — SEM VALIDADE”, emissor “Utu Lab — DEMONSTRAÇÃO (sem validade)”, nome fictício, título da formação, acentuação e data 20.10.2026 legíveis. Não há assinatura oficial nem logótipo Omatapalo. Não se observaram cortes ou sobreposição de texto.

Limites: aparência básica, sem logótipo gráfico de marca; mantém linha vazia de assinatura. Não estão visíveis ID/QR/URL de verificação ou validade nesta amostra. Isto não demonstra ausência de verificação no domínio; apenas descreve o documento inspeccionado. Os cursos do job foram emitidos sem expiração; renovação/revogação não foram ensaiadas nesta ronda.

## Bloqueados e próximos passos

Bloqueados: QA completo de relatórios, funções administrativas, matriz/planos, lições, avaliações, SCORM, offline, certificado aberto pela UI pública e viewport móvel dos percursos autenticados. Não substituir esta ausência por resultados API ou QA local anteriores. Botões de recuperação/ligação por email foram apenas observados, sem enviar mensagens; documentação indica captura Mailhog, pelo que entrega externa não está demonstrada.

1. Corrigir e verificar a ligação pública Web → API, conciliando logs e implantação estável.
2. Retirar stacks técnicos do ecrã, preservar pt-AO e fornecer recuperação explícita.
3. Repetir QA dos quatro perfis no mesmo SHA/digests, com desktop/mobile e captura dos percursos completos.
4. Confirmar PDF/verificação pela interface publicada, expiração/revogação e fluxos de email conforme configuração real.

**NO-GO para demonstração comercial com o estado observado; produção não validada.** O checklist original de 32 critérios não foi alterado. Esta sessão não fez push, commit, deployment, restart, mudança de palavras-passe, alteração de configuração ou emissão de certificados.
