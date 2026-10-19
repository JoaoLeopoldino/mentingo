# Divergências conhecidas e compatibilidade

Consulta de 19/10/2026; upstream main 7a23e967, sem commits novos relativamente à base. Não foi feito merge nem cherry-pick. A consulta de issues foi limitada às 100 entradas recentes e PRs abertos; não constitui auditoria integral de segurança.

| Prioridade | Tema upstream | Impacto na distribuição e decisão |
|---|---|---|
| P0 | [2016 — isolamento de uploads/certificados/conversão](https://github.com/Selleo/mentingo/pull/2016), fechado **sem merge** | Confirmado na API GitHub: merged=false, sem merge commit. Não assumir que a base contém este PR. Comparar o diff e relacionar com as correcções locais; regressões negativas obrigatórias antes da release. |
| P0 | [1986 — segurança da plataforma](https://github.com/Selleo/mentingo/issues/1986), aberto | Não tratar issue como vulnerabilidade comprovada; triar comentários/commits antes da publicação. |
| P1 | [2041 — métodos de autenticação por organização](https://github.com/Selleo/mentingo/pull/2041), aberto | Conflito potencial com convites, OAuth desactivado e demo restrita; avaliar num branch separado. |
| P1 | [2005 — desactivar inscrição por omissão](https://github.com/Selleo/mentingo/pull/2005), fechado | Verificar as definições efectivas do tenant, não apenas os defaults. |
| P1 | [2026 — automações/email](https://github.com/Selleo/mentingo/pull/2026), fechado | Rever emissores, templates, arranque e backfills quando actualizar. |
| P1 | [2022 — idioma guardado/browser](https://github.com/Selleo/mentingo/pull/2022), aberto | A Utu já tem normalização pt-AO; não substituir silenciosamente a resolução local. |
| P2 | [2043 — percursos](https://github.com/Selleo/mentingo/pull/2043), aberto | Revalidar certificados e ciclos de recertificação ao integrar. |
| P2 | [1981 — workflow de segurança por IA](https://github.com/Selleo/mentingo/issues/1981), aberto | Ferramenta complementar; não substitui testes ou revisão humana. |

Não identifiquei uma correcção upstream nova de SCORM/offline/storage/branding/infraestrutura nos resultados consultados que possa ser aplicada sem análise adicional. Isto não prova ausência de issues noutras páginas.

Hotspots Utu: schema/migrations, permissões partilhadas, tenant runner, certificados de curso/percurso, i18n, settings, filas, service worker, player e cliente gerado. `git diff --stat upstream/main...HEAD` e o script de resumo produzem o inventário exacto, sem reescrever a história.

Divergências desta preparação: logótipo por omissão Utu, metadados, marca de demonstração, campos opcionais de branding no JSON existente, controlo da manutenção no arranque, ligação de controlo separada, Docker/proxy e validadores. A migração 0237 captura branding em novas emissões/renovações, com PDF e imagem pública baseados no snapshot. Legado mantém snapshot nulo e preview privado ainda usa definições actuais.
