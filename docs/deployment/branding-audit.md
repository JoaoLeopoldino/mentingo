# Auditoria e implementação de branding

Estado: **parcial funcional**, 19/10/2026. Origem da preparação: sprint `77f6bae8`. Não foram usados logótipos ou assinaturas oficiais da Omatapalo.

| Classe | Decisão/evidência |
|---|---|
| A — atribuição legal | LICENSE/copyright MIT intactos; não remover Selleo de avisos legais/licenças. |
| B — identificadores técnicos | Manter package names, imports, migrações, IDs SCORM, `MentingoHlsQualityControl`, MCP marker e formatos nativos. Não fazer substituição global. |
| C — configurável existente | Company name/short name, logos full/simple, login background, cores primary/contrast, certificate background e assinatura por curso/percurso já usam definições e uploads. |
| D — hardcoded corrigido | Fallback visual/logo textual Utu Lab, título/layout/generator, favicon U próprio sem marca de cliente, fallback PWA, render de emissor e avisos de demonstração no PDF/imagem pública/browser/email. |

## Modelo incremental

Reutilizado `settings.settings.companyInformation`, com campos opcionais validados: `applicationName`, `certificateIssuer`, `emailSenderName`, `legalFooter`, `defaultLocale`, `publicVerificationBaseUrl`. Não há tabelas paralelas para definições; a migração aditiva 0237 acrescenta snapshots apenas aos certificados; PATCH existente exige SETTINGS_MANAGE, utiliza DB sob RLS e regista alteração nas definições. Cliente OpenAPI regenerado pelo fluxo normal.

**Consumo implementado:** applicationName no layout/logo/PWA; certificateIssuer no PDF e imagem de verificação (fallback companyName/Utu); emailSenderName no envio com logo, preservando endereço SMTP. Logos/assets e cores reutilizam endpoints existentes.

**Ainda pendente:** editor administrativo específico dos novos campos; consumo de legalFooter/defaultLocale/publicVerificationBaseUrl (armazenamento validado não equivale a comportamento); favicon independente do logo simples; distinção de cor secundária além de contrast; branding configurado de todos os PDFs/relatórios e revisão total dos templates. Os links de verificação continuam a usar o host do tenant para evitar anunciar URLs arbitrárias como se estivessem validadas.

`DEMONSTRATION_MODE=true` é uma decisão do servidor, não um campo controlado pelo formando. Aplica “DEMONSTRAÇÃO — SEM VALIDADE” a PDF e imagem pública de curso/percurso; emails recebem prefixo no assunto e aviso no corpo. `VITE_DEMONSTRATION_MODE=true` identifica interface/previews e adiciona noindex. O gate de acesso é independente destes avisos.

## História e limites

IDs, datas, tentativas e revogações existentes não foram reescritos. A migração Drizzle 0237 adiciona duas colunas JSONB nullable. Novas emissões de curso/percurso e renovações capturam emissor/assets/cores/modo demo na transacção nativa, com RLS. PDF e imagem pública usam o snapshot; o marcador demo persistido não desaparece com alteração posterior do ambiente. Cache v3 distingue demo/standard e não reutiliza imagens antigas sem aviso. Sete testes PostgreSQL/RLS, incluindo PDF HTTP real e cache S3, passaram.

Registos antigos permanecem com snapshot nulo e fallback actual: não é possível reconstruir a identidade passada sem evidência externa. Não se alega imutabilidade retroactiva. O preview privado React ainda usa definições actuais. Manter objectos antigos/versionamento S3: uma chave guardada sem retenção do objecto também não preserva a aparência. A migração local foi precedida de backup e conciliou hashes de certificados e tentativas, sem alterações ao histórico.

Restantes referências: pt-AO contém nomes Mentingo em consentimento MCP e import/export do formato nativo; templates/valores demonstrativos, assets SVG originais e docs upstream mantidos. Algumas são técnicas legítimas; outras requerem tradução parametrizada/revisão antes da demonstração comercial completa. O fallback de email Mentingo.com foi alterado para Utu Lab; o valor de exemplo do registry continua referência de desenvolvimento, não identidade do tenant.

## QA efectivamente realizado

PDF real obtido pela API local actualizada, não desenhado à mão: `.local/sprint/24-demo-certificate.pdf`. Texto extraído e PNG inspeccionado: aviso visível, Utu Lab, nome fictício, curso e data legíveis, sem assinatura oficial. Capturas desktop/mobile e verificação pública em `.local/sprint/screenshots/24-demo-*`; viewport móvel **não é Android físico**. Primeiro ensaio falhou por caminho relativo do harness; corrigido e repetido com sucesso. A captura móvel inicial mostrou um aviso duplicado durante a apresentação; o harness foi endurecido para aguardar estabilidade e exigir um único aviso antes da captura final.

O formando tentou PATCH do emissor e recebeu 403. Testes de escaping, marcador, preservação de conteúdo email e configuração de ambiente estão registados na checklist. Ainda não há PDF gerado pelo serviço Railway nem entrega externa de email demonstrada.

O aviso foi acrescentado aos oito locales, preservando 100% de cobertura estrutural pt-AO (6.236/6.236). A primeira integração de query no render de certificado quebrou testes sem provider; o render voltou a ser apresentacional e o preview passa o emissor como prop. Regressões web/preview passaram depois da correcção.

## Inventário residual reproduzível

Pesquisa case-insensitive `mentingo|selleo`, excluindo cliente gerado, testes e migrações: 31 ficheiros em `apps/web/app`, zero em `apps/web/public`, 1 em `packages/email-templates/src`, 2 em `packages/shared/src`, 2 em `apps/api/src/certificates`, zero em learning-path/settings. Contagem de ficheiros com ocorrências, **não** contagem de fugas visuais: inclui traduções de formatos/consentimento e identificadores técnicos. Complementar com pesquisa de URLs, inspecção dos assets antigos e cada canal antes de afirmar white-label completo.
