# Localização pt-AO por lotes

O catálogo inglês define as chaves. `pt-AO-generated-batch.json` contém propostas geradas pelo modelo e reutilização de traduções já existentes neste projecto. Não foi usado um serviço externo pago nem copiada uma tradução de outro projecto. Mantém-se a licença MIT do repositório.

```sh
node scripts/localization/apply-pt-AO-batch.mjs
node scripts/localization/validate-pt-AO.mjs
node --test scripts/localization/translation-validation.test.mjs
# Gate integral: falha enquanto existirem chaves em falta.
node scripts/localization/validate-pt-AO.mjs --require-complete
```

A aplicação de um lote não substitui traduções existentes. O validador separa cobertura estrutural, valores iguais ao inglês e revisão humana; esta última não é inferida automaticamente. O parser rejeita chaves duplicadas, incluindo nomes escapados. Placeholders, markup, variáveis ICU e plurais são conferidos. Os testes de i18next no frontend validam resolução/fallback reais.

Glossário: formação; formando; formador; colaborador; acção de formação; inscrição; ficheiro; palavra-passe; equipa; telemóvel; competências; certificado de formação; descarregar; guardar. Preservar SCORM, xAPI, H5P, UUID, marcas, identificadores, nomes de ficheiros técnicos e placeholders.

Os lotes exigem revisão linguística contextual antes de publicação comercial. Chaves presentes não demonstram tradução de emails/PDFs/conteúdo de cursos, nem acessibilidade de todos os ecrãs.

Estado de 18-10-2026: 6.099/6.099 chaves estruturais, 6.042 valores distintos do inglês, 57 invariantes em `pt-AO-invariants.json`. A lista contém marcas, identificadores, unidades, símbolos e palavras também válidas em português; não representa revisão humana. O gate recusa novos valores iguais ao inglês não presentes nessa lista e verifica a ordem do markup. Revisão humana: não medida. Os testes de fallback usam uma chave de teste exclusiva do recurso inglês, sem remover traduções reais.
