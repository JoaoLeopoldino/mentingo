# QA visual e guião comercial — 18/10/2026

Estado: percursos locais reais de quatro papéis, formando até certificado e SCORM independente demonstrados. Base `656f4a9c`, checkpoint `9c0a6700` e commits posteriores neste branch. Não é uma simulação de respostas HTTP nem um ambiente de produção. Capturas em `.local/sprint/screenshots/`, intencionalmente ignoradas pelo Git; os links abaixo são locais a este worktree e não estarão disponíveis num clone sem executar os guiões.

## Acesso e percurso

Aplicação neste computador: http://localhost:5173. API: http://localhost:3000. Usar sessões/perfis separados ou terminar sessão antes de trocar de papel. Todos os nomes/emails são fictícios e as palavras-passe abaixo são exclusivas da demonstração local; não reutilizar noutras instalações.

| Papel | Conta fictícia | Palavra-passe local | Percurso |
|---|---|---|---|
| Administrador | admin+localhost@example.com | password | `/reports`, `/competencies`, administração e histórico autorizado |
| Gestor de formação | enterprise-manager-8168519c@example.com | Password123@ | Formação própria; papel nativo de criador de conteúdos |
| Gestor operacional | enterprise-manager-9d2793a8@example.com | Password123@ | `/competencies`, equipa autorizada e plano existente |
| Formando | enterprise-employee-9d2793a8@example.com | Password123@ | Formação, avaliação, histórico próprio e competências |

Formação comercial: http://localhost:5173/course/9b80dc67-3636-4c11-a966-0234039c1d60. O formando já concluiu texto e avaliação com nota 100, recebendo um certificado activo. Reabrir não cria outra tentativa nem outro certificado. Para demonstrar a submissão do início, preparar uma nova fixture com o guião, preservando o curso anterior; não repor progresso nem apagar tentativas manualmente.

1. Administrador abre o painel executivo e confirma indicadores carregados, filtros e exportação. A população inclui as fixtures anteriores, não apenas o curso de segurança.
2. Gestor de formação abre o curso próprio «Segurança no Trabalho». Conteúdo fictício refere Luanda, Huíla e Benguela; tem texto e questionário, sem vídeo ou presenças simuladas.
3. Gestor operacional abre matriz e perfil autorizado: competência de EPI, nível exigido/demonstrado, histórico e plano individual previamente construídos. A conclusão do questionário não substitui a avaliação profissional.
4. Formando abre a formação concluída e o seu histórico: ciclo 1, certificado válido e nota localizada. Pode abrir a credencial pública sem sessão.
5. Separadamente, mostrar o curso Rustici independente e o histórico de dois ciclos; segundo certificado revogado, tentativas conservadas e URL pública antiga inválida. Não apresentar um revogado como activo.
6. «Descargas offline» e guiões dos relatórios 04/05 mostram a fatia nativa. Assinalar claramente que Android físico e SCORM offline estão por validar.
7. Executar o adapter `synthetic-primavera-mock` e apresentar `applied:false`. Mostrar CSV importáveis no Power BI, sem afirmar ligação ao ERP ou ao serviço BI.

## Capturas revistas

### Formando e curso

![Formando — curso real local](../../../.local/sprint/screenshots/18-commercial-learner.png)

Percurso aberto com a conta do formando; título, navegação e conteúdos da formação fictícia. A imagem não comprova por si só a submissão; esta foi executada pelo guião e conciliada com histórico nativo.

### Gestor operacional

![Matriz autorizada do gestor](../../../.local/sprint/screenshots/18-commercial-manager.png)

Filtros, matriz e requisito cumprido observados na sessão do gestor. Não se apresenta toda a organização como a sua equipa.

### Gestor de formação

![Gestor de formação — autoria própria](../../../.local/sprint/screenshots/18-commercial-training-manager.png)

O papel reutiliza o criador de conteúdos existente, sem inventar uma política RH nova. Esta captura confirma acesso ao curso; a preparação do conteúdo usa factories/API nativas, não uma prova de cada gesto de autoria pela UI.

### Relatórios executivos carregados

![Relatórios com métricas reais](../../../.local/sprint/screenshots/18-commercial-executive-reports.png)

A primeira captura estava em carregamento e foi rejeitada na revisão visual. O guião agora espera por quatro indicadores nativos. A imagem revista mostra 13 formandos, 13 formações, 33% de conclusão e quatro activos no momento da consulta. Títulos ingleses de cursos pré-existentes são conteúdo de fixtures; a interface está em pt-AO. Os números podem mudar após novas fixtures.

### Histórico próprio e credencial pública

![Histórico do formando com certificado activo](../../../.local/sprint/screenshots/18-commercial-active-certificate.png)

![Certificado público em pt-AO](../../../.local/sprint/screenshots/18-commercial-public-certificate.png)

O botão inglês da página pública foi detectado no QA e corrigido para «Abrir a plataforma», assim como o título/metadados. Chrome DevTools MCP confirmou a página canónica e o rótulo traduzido. Não foi feito login no LinkedIn nem partilha numa conta externa. A imagem do certificado é pública por desenho; a API privada continua a verificar o actor.

### SCORM independente e histórico revogado

![Retoma no pacote Rustici](../../../.local/sprint/screenshots/18-independent-scorm-resume.png)

![Dois ciclos conservados, segundo certificado revogado](../../../.local/sprint/screenshots/18-revoked-certificate-history.png)

Pacote Rustici original, CC BY 3.0 US, SHA-256 registado no relatório 03; inglês do conteúdo original preservado. Navegação/retoma/conclusão foram executadas pelo próprio runtime do pacote. Não é prova de SCORM 2004/xAPI nem do parque Android.

## Execução e limites

`prepare-commercial-demo.mts`: preparação final 19,832 s. `complete-commercial-demo.mts`: primeira conclusão 16,651 s, sem tentativa prévia concluída. `review-commercial-demo.mts`: revisão final **6 checkpoints em 14,367 s**, incluindo quatro papéis, histórico e página pública; resultado em `.local/sprint/commercial-review.json`. Os intervalos são execução do guião, não horas de criação da funcionalidade.

As capturas foram obtidas com Chrome real/Playwright e serviços locais, complementadas por Chrome DevTools MCP. Desktop é desktop; viewport móvel não substitui teste num telemóvel. Foram revistas imagens do gestor, relatórios, histórico e credencial; isto não é auditoria completa de acessibilidade. Persistem revisão humana pt-AO, composição final da marca do cliente, assinatura de certificados, renovação de revogados, formação presencial e alertas comerciais a acordar. Sem promessas de emissão offline ou integração real.

## QA adicional — vídeo sob rede limitada

A execução 21 acrescenta capturas reais do leitor em 720p/360p/144p, da acção de recuperação e da reprodução retomada. O controlo final foi observado com 44 px de altura e texto de 14 px; preservou a posição após interrupção. [Galeria, métricas e limitações](21-video-network-and-certificate-integrity.md#qa-visual). As contas e o curso comercial deste relatório foram preservados. Não se executou Android físico.

## Demo integrada final — 19/10/2026

[Relatório 22](22-integrated-demo-and-contract-matrix.md): três perfis em cadeia, simulação identificada, curso ligado ao plano, competência formal decidida pelo gestor e CSV conciliados. Nove checkpoints integrados e três de recertificação passaram no Chrome. A galeria mostra título da formação no plano, dois ciclos e credencial de percurso renovada. [Relatório 23](23-performance-recovery-and-validation.md) contém também o PDF recuperado e revisto visualmente. Chrome DevTools MCP confirmou o título pt-AO da página pública canónica; a gravação de snapshot em ficheiro foi recusada pelo âmbito de caminhos do plugin, tendo sido usada leitura inline. Não se alegou ficheiro gravado nem ensaio Android.
