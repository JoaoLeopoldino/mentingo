# Checklist de release — candidata Utu Lab

Data: 19/10/2026. Base preservada `77f6bae8`; commits de implementação `e19ed3fd` e `251a8b48`; versão proposta `utu-demo-2026.10.19-rc.1`. **Não há release congelada/aprovada nem deploy externo.** O denominador técnico da sprint permanece 32, com 27 critérios anteriormente demonstrados; branding/deploy não acrescentam artificialmente critérios.

## Evidência desta preparação

- [x] Checkout original preservado; sprint limpa inicialmente; novo branch isolado.
- [x] Upstream remoto obtido, sem merge; base comum 7a23e967; 40 commits Utu preservados à entrada.
- [x] Fork público confirmado; ficheiros de ambiente excluídos do contexto Docker; sem push.
- [x] Fallbacks Utu, favicon, título/layout/PWA e emissores configuráveis parcialmente implementados.
- [x] Aviso de demonstração no browser e em render servidor de PDF/imagem; email marcado no serviço.
- [x] API local 3002 arrancou sem maintenance; typecheck API com heap 4GB e web passaram. Primeira tentativa tsc sem heap ampliado terminou em OOM; não era um erro de tipos.
- [x] Build API e build SPA locais passaram; o frontend tem 514 entradas / 14.799,48 KiB de precache sem compressão, relevante para rede fraca.
- [x] Testes de arranque/settings (20), de render (3), configuração/arranque/render (11, com sobreposição) e email (8); não somar execuções sobrepostas como casos distintos.
- [x] Validador de ambiente: 9 testes node:test passaram; shell/JS syntax dos scripts de release verificados.
- [x] QA Chrome local: PDF real, captura desktop/mobile, verificação pública; formando PATCH de emissor 403. PDF renderizado e inspeccionado visualmente.
- [x] Regressões PostgreSQL/RLS de definições e certificados de percurso: 62/62 passaram (300,129 s), incluindo alteração de branding e URL inválido.
- [x] Web: 77 regressões passaram (5,48 s); mais o ensaio focado de preview, 2/2. Falhas iniciais por dependência QueryClient indevida no render foram corrigidas mantendo CertificateContent apresentacional e passando o emissor por props.
- [x] Proxy em Docker: arranque sem credenciais recusado; caminhos privados anónimos 401; SPA e API autorizadas 200; source map 404. Erro inicial 500 corrigido atribuindo o ficheiro htpasswd ao worker nginx.
- [x] Email final: 10/10 unitários, incluindo nome de remetente sem alteração de endereço SMTP.
- [x] pt-AO: 6.236/6.236 chaves, zero chaves/variáveis em falta; 5 testes do validador passaram. Sem certificação de revisão humana.
- [ ] Proxy completo Railway, WebSocket upgrade, TUS/SCORM e cookies Secure sobre HTTPS público: não demonstrados.
- [ ] Build completo das imagens API/web no mesmo SHA: pendente; disco local reduzido. Não confundir build Nest/Vite com imagem construída.

## Bloqueios antes de convite externo

- [x] Snapshot transaccional de emissor/assets/modo demo para novas emissões/renovações; 0237 aditiva, 7/7 testes PostgreSQL/RLS e PDF. Legado nulo sem reescrita; preview privado e retenção S3 continuam pendentes.
- [ ] Consumir/configurar campos pendentes e rever consentimentos, formato nativo, emails, relatórios, metadata e preview de certificados; revisão humana pt-AO.
- [ ] Inventário de licenças/SBOM/vulnerabilidades do lockfile e imagens, análise do código publicado e ausência de material confidencial. MIT intacta não equivale a auditoria de dependências concluída.
- [ ] Criar projecto exclusivo: workspace confirmado, orçamento autorizado US$50/mês. Tentativa recusada pelo Railway: trial expirado. Utilizador vai activar plano e avisar. Nenhum recurso criado.
- [ ] Prova local control/app concluída em cópia restaurada: DDL/schema migrations recusados, RLS e login/PDF/competências passaram, owner ausente do runtime. Repetir no Railway e inicializar permissões/automações da instalação nova.
- [ ] Tenant fictício novo, por convite, sem credenciais de laboratório, dados reais ou inscrições públicas. Gate adicional forte; retirar acesso depois da demo.
- [ ] Bucket privado persistente, backup/restauro no ambiente de destino e retenção dos assets de certificados; testar objectos/URLs assinadas/Range.
- [ ] SMTP autorizado/captura privada, login/logout e emails; AI/pagamentos externos desactivados e UX honesta.
- [ ] Configurar domínio com CNAME/TXT reais; HTTPS/redirects/CORS/WS/SCORM/PWA/links sob o mesmo hostname.
- [ ] Congelar SHA e digests, registar migration 0237; desactivar autodeploy; executar smoke tests do deployment ID final em SUCCESS.

## Decisão

**GO para continuação local. NO-GO para demonstração externa nesta candidata; NO-GO produção.** Uma página acessível, um PDF marcado e um proxy a responder não resolvem os bloqueios de publicação e operação. Quando os gates acima passarem, a decisão pode evoluir para demonstração restrita, sem declarar todos os requisitos a–j certificados para produção. Android físico continua pendente e offline SCORM não está demonstrado.


## Actualização 20/10/2026 — evidência no destino (Railway)

- [x] Projecto exclusivo `utu-mentingo-demo` (ambiente demo), sem PR deploys; serviços fixados ao commit, sem autodeploy por push.
- [x] Migrations 0000–0237 aplicadas pelo Migrator dedicado (238); roles `lms_app_user` (sem BYPASSRLS) e `utu_control` sem DDL/CREATE, donas de zero tabelas; RLS em 139 de 149 tabelas.
- [x] `omatapalo.uturh.ao`: DNS propagado, certificado Let's Encrypt válido, HTTP -> HTTPS 301; sem credenciais `/`, `/api`, `/socket.io` respondem 401; só `/healthz` e `/robots.txt` 200; noindex.
- [x] Login administrador e colaborador 201, palavra-passe errada 401; cookies HttpOnly+Secure+SameSite=Strict; CORS limitado ao hostname; `current-user` 200 com cookie e 401 sem.
- [x] Conteúdo fictício pt-AO (2 cursos, 3 quizzes), colaborador conclui, 2 certificados emitidos; PDF obtido no destino, SHA-256 conferido e inspeccionado: banner "DEMONSTRAÇÃO — SEM VALIDADE", emissor Utu Lab, sem activos do cliente.
- [ ] Não demonstrado no destino: upload TUS, WebSocket, SCORM 1.2 e quiz offline, competências/plano, relatórios e exportação BI, página pública de verificação, entrega de email, rate limiting, isolamento entre tenants.
- [ ] Inventário de licenças, revisão humana pt-AO, confirmação de que o bucket `kulonga` é só desta demo (sem prefixo; token com acesso ao bucket inteiro), congelamento do SHA com todos os serviços no mesmo commit, e remoção do domínio de teste `web-demo-2102.up.railway.app`.

- [x] SMTP real (Resend, `demo@uturh.ao`, porta 2465): autenticação OK, envio aceite (250) e email recebido pelo responsável do projecto. O Railway bloqueia as portas SMTP 25/465/587.

## QA visual do login em produção (20/10/2026, release rc.3 = 26575bd8; API, Web e Migrator no mesmo commit)

- [x] Chrome limpo (sem extensão, sem service worker, sem armazenamento) em desktop 1440, mobile 390 e locale en-US/pt-AO: formulário visível, **zero erros de hidratação**, título `Utu LMS · Ambiente de Demonstração - Utu Lab - Entrar`, banner "Ambiente de Demonstração · Utu Lab · Dados fictícios" (ou equivalente em inglês), logótipo Utu Lab carregado do R2. Tempo até ao formulário visível numa carga fria: cerca de 5,3 a 5,8 s (bundle grande; relevante para redes lentas).
- [x] Manifest: nome "Utu LMS · Ambiente de Demonstração", ícones WebP 192 e 512 gerados a partir do ícone carregado; logótipo e ícone servidos pela API a partir do R2 (upload e download provados).
- Nota: num separador Chrome com a extensão de automação apareceram erros React #418/#423; não se reproduzem num Chrome limpo e atribuem-se à injecção da extensão no DOM. Correcção preventiva aplicada na mesma altura: o banner usa na primeira renderização o mesmo texto do HTML pré-renderizado e só depois o idioma activo.
- Limitações visuais: o logótipo tem fundo não transparente (aparece como bloco bege); o HTML estático não tem `<title>` até a app carregar; `/favicon.ico` devolve HTML.

## Evidência no destino — conteúdo, SCORM, competências, WebSocket (20/10/2026, commit 673af199)

- [x] **SCORM 1.2** importado no Railway pelo fluxo nativo (init, TUS, complete) com o pacote público Rustici (CC BY 3.0 US), descarregado em execução e verificado por SHA-256 (b778566f…), armazenado no R2; curso publicado com certificado; colaborador inscrito. Upload TUS e extracção validados no destino (via endereço privado da API).
- [x] **Teste público (https://omatapalo.uturh.ao), 10/10:** login 201; cookies HttpOnly+Secure+SameSite; lançamento SCORM; conteúdo na mesma origem; página de entrada servida do armazenamento (11.780 bytes); 401 sem sessão; Range 206; commit de tentativa `incomplete`; upgrade `wss` com pacote de abertura Engine.IO.
- [x] **Competências (cenário fictício):** 3 unidades (Luanda, Huíla, Benguela), framework e escala de 4 níveis, competências SEG-TRAB e QUAL-OP, perfil TEC-OPER, requisitos ligados a cursos; avaliação pelo chefe de operação: SEG-TRAB `insufficient` (nível 2 de 3), QUAL-OP `met`; plano de desenvolvimento aprovado ligado ao curso SCORM.
- [x] **Defeito corrigido:** o Socket.IO está em `/api/ws` (só transporte websocket) e o nginx não tinha os cabeçalhos de upgrade nesse caminho, o que deixaria o tempo real sem funcionar; o bloco `/api/ws/` foi corrigido e provado (101) em Docker e no destino.
- Limitações do conteúdo: BI (biblioteca + script local, sem UI/endpoint) e Primavera sintético (mock de reconciliação em relatório, sem UI) não são demonstráveis na aplicação; Benguela sem membros (criar utilizadores enviaria convites reais para caixas inexistentes); quiz offline por testar em browser real com service worker e num telemóvel físico.
