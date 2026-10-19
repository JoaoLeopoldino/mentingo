# Guião da demonstração Omatapalo

Apresentar apenas num ambiente autorizado, identificado como **Ambiente de Demonstração**, com Utu Lab como fornecedor tecnológico e dados fictícios. Não usar credenciais do laboratório numa URL pública. Nesta candidata a apresentação externa está bloqueada pela checklist; o guião é reproduzível localmente.

1. **Contexto (1 min):** operações fictícias Luanda/Huíla/Benguela; limites do piloto; Primavera é uma simulação explícita, Power BI é exportação autorizada, SCORM 1.2 é online. Mostrar aviso da demo e idioma pt-AO.
2. **Administrador (3 min):** apresentar importação sintética, função/unidade e requisito obrigatório de Segurança no Trabalho; catálogo/framework/escala; inscrição no curso. Confirmar que a formação é fictícia e a integração não consulta Primavera.
3. **Formando (4 min):** ver lacuna e plano individual, realizar conteúdo nativo/quiz e mostrar resultado. Conclusão de curso não atribui automaticamente competência profissional. Apresentar SCORM 1.2 no player real com pacote licenciado; não o chamar xAPI ou SCORM offline.
4. **Gestor autorizado (3 min):** matriz da equipa, evidência submetida, avaliação profissional fundamentada separada e decisão do plano. Mostrar que acesso a outra equipa/tenant é recusado pelos testes; não abrir contas reais para demonstrar.
5. **Certificado (2 min):** PDF e página de verificação com “DEMONSTRAÇÃO — SEM VALIDADE”; explicar expiração/revogação/ciclos e histórico preservado de tentativas. Branding histórico por emissão ainda é gate aberto nesta candidata; não demonstrar mudança de emissor como se já preservasse aparência antiga.
6. **Relatórios (2 min):** relatório executivo e exportação CSV autorizada, com reconciliação de inscrições/conclusões/progresso/certificados/competências. Não afirmar ligação ou refresh num serviço Power BI real.
7. **Offline (opcional, 3 min):** download de texto/PDF e quiz nativo, desligar rede, reabrir e sincronizar com idempotência. Preservar respostas em rejeição/expiração. Mostrar que é Chrome; Android físico está bloqueado por falta de dispositivo, não validado por viewport móvel. Não demonstrar SCORM offline.

## Execução local/evidências

Aplicação da sprint: `http://localhost:5173`; API de validação de branding: `http://localhost:3002` durante o ensaio. Ficheiros de contas fictícias e credenciais permanecem em `.local`, nunca no guião público. Usar os harnesses `browser-integrated-demo.mts`, `browser-path-recertification.mts`, `browser-independent-scorm.mts` e `branding-qa.mts` com as guardas locais; cada um tem requisitos próprios de frescura/fixtures, não executar indiscriminadamente sobre uma demo preparada.

Capturas desta execução: `.local/sprint/screenshots/24-demo-login.png`, `24-demo-login-mobile.png`, `24-demo-public-certificate.png`, `24-demo-certificate.png`. PDF: `.local/sprint/24-demo-certificate.pdf`. QA e tempos: `.local/sprint/24-branding-qa.json`. Não publicar dumps, manifests com contas ou logs de autenticação. Só partilhar capturas revistas e não sensíveis.
