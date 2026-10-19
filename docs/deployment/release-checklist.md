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
