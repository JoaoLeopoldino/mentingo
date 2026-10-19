# Distribuição Utu Lab

Data: 19 de Outubro de 2026. Versão candidata: `utu-demo-2026.10.19-rc.1` (não publicada).

Origem: https://github.com/Selleo/mentingo. Base verificada: `7a23e967d88947238386c588663140c21a284294`, versão upstream 4.23.0. Remote `origin`: `git@github.com:JoaoLeopoldino/mentingo.git`; fork **público**, confirmado na API GitHub nesta execução. Remote `upstream` adicionado sem integrar alterações. Na consulta, `upstream/main` coincide com a base; a sprint contém 40 commits próprios antes desta preparação.

## Linhas de trabalho

- `main`: checkout original preservado em 7a23e967; não o usar como fonte automática da demo.
- `feat/omatapalo-enterprise-competencies-20261018`: sprint preservada em `77f6bae8`.
- `feat/utu-distribution-railway-demo-20261019`: preparação actual, descendente da sprint.
- `utu/integration`: nome proposto para integrar upstream por merge revisto, depois de aceitar esta candidata; não renomear branches partilhados.
- `utu/develop`: desenvolvimento Utu sobre a integração aceite; sem deploy automático para demonstração.
- `release/utu-demo-2026.10.19`: criar apenas depois de resolver os bloqueios da checklist; fixar SHA e imagens. **Ainda não existe release aprovada.**

Preservados: 38683c60, 276827c8, ba3290a3, 3a6dc5e8 e restantes antecessores da sprint; confirmar com `git merge-base --is-ancestor <SHA> HEAD` antes de publicar.

## Extensões e migrações

pt-AO; competências/frameworks/escalas/requisitos versionados/atribuições/planos; separação de evidências e avaliações; histórico de certificados; offline nativo; SCORM 1.2; HLS; adapter Primavera **sintético**; exportação analítica autorizada. Migração mais recente: `0237_certificate_branding_snapshot`, gerada pelo Drizzle, aditiva/nullable e sem reescrita histórica. As definições de identidade continuam no JSON existente.

## Integração

Executar `bash scripts/releases/upstream-summary.sh`; abrir branch de integração a partir da linha Utu, fazer merge do SHA upstream revisto, resolver conflitos mantendo invariantes e executar regressões de permissões/RLS, certificados, SCORM, offline, competências e traduções. Gerar cliente pelas ferramentas nativas. Abrir PR para revisão; nunca integrar automaticamente numa release implantada. Não rebasear commits publicados. Conflitos de segurança exigem evidência negativa de acesso; não aceitar simplesmente “ours/theirs”.

A licença MIT e os avisos de copyright permanecem. A Utu pode licenciar as suas contribuições respeitando MIT e licenças de terceiros; o copyright upstream não passa a ser propriedade da Utu. Inventário completo de licenças transitivas/SBOM continua pendente antes da distribuição externa.

Reversão: seguir [rollback](../deployment/rollback.md); código e dados têm ciclos de reversão distintos.
