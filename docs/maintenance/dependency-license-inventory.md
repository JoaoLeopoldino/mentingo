# Inventário local de licenças — candidata demo

19/10/2026. Executado sem rede, sem instalação e sem executar código de dependências:

```sh
node scripts/releases/dependency-license-inventory.mjs .local/sprint/24-installed-license-inventory.json
```

O comando pnpm licenses list falhou por índice de pacote local em falta. O scanner alternativo percorreu os dependencies/optionalDependencies instalados das duas aplicações: **2379 pacotes nome@versão**, incluindo ferramentas que o manifesto coloca nessa árvore. Não é SBOM das imagens, comparação do lockfile, auditoria de vulnerabilidades ou parecer jurídico. Web inclui dependências de build que não serão necessariamente servidas ao browser.

**150 dependências não resolvidas:** 149 opcionais (incluindo binários de outras plataformas), e `faker` declarado na API. Confirmar a instalação Linux limpa e as referências antes de classificar esta ausência como falha de runtime. A compilação local passou, o que não substitui a instalação da imagem.

| Pacote com revisão sinalizada | Licença declarada no manifesto |
|---|---|
| @img/sharp-libvips-darwin-arm64 | LGPL-3.0-or-later |
| @repo/email-templates | UNKNOWN |
| @repo/scorm-export-generator | UNKNOWN |
| @repo/scorm-export-runtime | UNKNOWN |
| @repo/shared | UNKNOWN |
| api | UNLICENSED |
| combine-errors | UNKNOWN |
| eslint-config-turbo | MPL-2.0 |
| eslint-plugin-turbo | MPL-2.0 |
| exif-parser | UNKNOWN |
| fast-shallow-equal | UNKNOWN |
| jszip | (MIT OR GPL-3.0-or-later) |
| pause | UNKNOWN |
| posthog-js | SEE LICENSE IN LICENSE |
| react-universal-interface | UNKNOWN |
| thirty-two | UNKNOWN |
| web | UNKNOWN |

A expressão alternativa de jszip permite escolher MIT, sujeita à preservação dos avisos; a presença de GPL numa expressão OR não torna automaticamente a distribuição GPL. LGPL/libvips e MPL exigem rever obrigações aplicáveis ao artefacto realmente distribuído. Repetir no Linux: o binário darwin listado não é o da imagem Railway. UNKNOWN/UNLICENSED nos workspaces exigem relacionar com a licença MIT raiz; não substituí nem removi LICENSE. Nos pacotes externos sem campo license, inspeccionar os ficheiros LICENSE/COPYING e repositórios originais antes de concluir.

Revisão restante: avisos de terceiros, fontes/assets e pacotes do sistema (Chromium, FFmpeg, LibreOffice e bases Alpine/Nginx), SBOM e advisories das imagens finais. Esta triagem não fecha o gate jurídico/segurança. O JSON detalhado permanece privado/ignorado em .local/sprint e pode ser anexado ao pacote de release após revisão.
