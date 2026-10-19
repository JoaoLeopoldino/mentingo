# Triagem de vulnerabilidades da candidata

Consulta real de 19/10/2026: `pnpm audit --prod --json`, sem modificar manifestos/lockfile. Resultado não-zero por vulnerabilidades; saída privada `.local/sprint/24-dependency-advisories.json`. 438 avisos distintos na resposta. Metadata do pnpm: **15 critical, 222 high, 223 moderate, 52 low**. Estes números são contagens do scanner e não equivalem a falhas exploráveis distintas do serviço publicado.

## Ocorrências críticas a triar antes de publicar

| Pacote | Versão encontrada | Intervalo corrigido comunicado | Caminho(s) | Fonte |
|---|---|---|---|---|
| form-data | 4.0.1 | >=4.0.4 | apps__api>axios>form-data | [aviso](https://github.com/advisories/GHSA-fjxv-7rqg-78g4) |
| basic-ftp | 5.0.5 | >=5.2.0 | apps__api>puppeteer>@puppeteer/browsers>proxy-agent>pac-proxy-agent>get-uri>basic-ftp | [aviso](https://github.com/advisories/GHSA-5rq4-664w-9x2c) |
| fast-xml-parser | 4.4.1, 4.5.0 | >=4.5.4 | apps__api>@aws-sdk/client-s3>@aws-sdk/core>fast-xml-parser<br>apps__api>@langchain/community>fast-xml-parser | [aviso](https://github.com/advisories/GHSA-m7jm-9gc2-mpf2) |
| next | 14.1.4 | >=14.2.25 | packages__email-templates>react-email>next | [aviso](https://github.com/advisories/GHSA-f82v-jwr5-mffw) |
| handlebars | 4.7.8 | >=4.7.9 | apps__api>handlebars | [aviso](https://github.com/advisories/GHSA-2w6w-674q-4c4q) |
| protobufjs | 7.5.4 | >=7.5.5 | apps__api>@langchain/community>langsmith>@opentelemetry/exporter-trace-otlp-proto>@opentelemetry/otlp-transformer>protobufjs | [aviso](https://github.com/advisories/GHSA-xq3m-2v4x-88gg) |
| tar | 6.2.1 | >=7.5.19 | apps__api>jsdom>canvas>@mapbox/node-pre-gyp>tar | [aviso](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) |
| next | 14.1.4 | >=15.5.24 | packages__email-templates>react-email>next | [aviso](https://github.com/advisories/GHSA-p293-qw3h-jr36) |
| next | 14.1.4 | >=15.5.24 | packages__email-templates>react-email>next | [aviso](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) |
| @remix-run/node | 2.15.0 | >=2.17.2 | apps__web>@remix-run/node | [aviso](https://github.com/advisories/GHSA-9583-h5hc-x8cw) |
| expr-eval | 2.0.2 | <0.0.0 | apps__api>@langchain/community>expr-eval | [aviso](https://github.com/advisories/GHSA-q9v2-7m5w-4693) |
| proxy-addr | 2.0.7 | >=2.0.8 | apps__api>@nestjs/platform-express>express>proxy-addr | [aviso](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) |
| handlebars | 4.7.8 | >=4.7.10 | apps__api>handlebars | [aviso](https://github.com/advisories/GHSA-8r5x-fm3f-whwj) |
| handlebars | 4.7.8 | >=4.7.10 | apps__api>handlebars | [aviso](https://github.com/advisories/GHSA-p8wg-vrv2-v86f) |

## Decisão e procedimento

**NO-GO externo até triagem e correcções necessárias.** O gate HTTP não corrige dependências vulneráveis. Não executar audit fix forçado nem upgrades major indiscriminados.

1. Relacionar cada caminho com `pnpm deploy --prod` da imagem API e com os assets estáticos finais do web. O Nginx serve SPA; não executa Next/Remix SSR. Não concluir que avisos Next/Remix estão exploráveis sem verificar o artefacto e a configuração; também não declarar que desapareceram sem SBOM final.
2. Priorizar XML/SCORM/S3, HTTP/proxy/axios, avaliações e template rendering conforme utilização real. Verificar pré-condições dos advisories nos links acima e se são aplicáveis à versão/plataforma/configuração.
3. Actualizar patches compatíveis ou substituir dependência sem patch, com lockfile revisto e testes correspondentes. Nenhuma dependência foi alterada nesta consulta. Para expr-eval, o scanner não anunciou intervalo corrigido: confirmar origem/transitividade e alternativa segura antes de decidir.
4. Reexecutar instalação Linux frozen-lockfile, audit, builds e regressões RLS/certificados/SCORM/offline. Produzir SBOM/advisories das imagens (incluindo pacotes do sistema), sem inferir resultado a partir da máquina macOS.
5. Registar riscos não aplicáveis com prova de caminho/artefacto e revisão responsável, e os residuais com aceitação explícita. Não converter automaticamente um aviso em excepção apenas porque a demonstração é privada.

Esta consulta actualiza o risco observado; os testes funcionais bem-sucedidos não são auditoria de segurança completa.
