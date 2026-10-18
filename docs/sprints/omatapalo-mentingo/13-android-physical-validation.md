# Ensaio em Android físico — guião executável

Estado: **preparado; NÃO EXECUTADO num dispositivo físico**. Não contar este documento como validação Android. Usar apenas dados fictícios e um telefone de ensaio autorizado.

## Preparação e identificação

Registar data/hora UTC, modelo, versão Android, versão Chrome, espaço livre e política de poupança de bateria. Abrir a aplicação no computador e confirmar API/preview locais. Com Android Platform Tools instalado, seleccionar explicitamente o dispositivo USB; não usar um emulador para preencher este gate.

```sh
adb devices -l
# Substituir SERIAL pelo identificador conferido do telefone de ensaio.
adb -s SERIAL shell getprop ro.product.model
adb -s SERIAL shell getprop ro.build.version.release
adb -s SERIAL shell dumpsys package com.android.chrome | rg versionName
adb -s SERIAL reverse tcp:5173 tcp:5173
adb -s SERIAL reverse tcp:3000 tcp:3000
adb -s SERIAL reverse tcp:59100 tcp:59100
```

No Chrome Android abrir `http://localhost:5173`. O encaminhamento USB mantém localhost como origem segura para service worker. Não substituir por um IP HTTP na LAN e assumir que o PWA continuará elegível. Instalar o atalho apenas depois de confirmar registo/controlo do service worker.

Usar `chrome://inspect/#devices` no computador para inspeccionar o Chrome do telefone. Na consola, registar apenas informação agregada, sem tokens:

```js
({
  language: document.documentElement.lang,
  online: navigator.onLine,
  controlled: !!navigator.serviceWorker.controller,
});
await navigator.storage.estimate();
```

O USB não mede tráfego do operador móvel. A simulação de rede fraca abaixo é uma condição controlada aplicada ao navegador num telefone real, não uma medição de 3G/4G de uma província.

## Percursos e critérios

| Caso                             | Acção/condição                                                                         | Resultado esperado e evidência                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — preparação                   | Iniciar sessão fictícia, descarregar texto/PDF e quiz de escolha única                 | Estado pronto apenas após transferência completa; PDF renderizado; conteúdo e idioma correctos                                                           |
| B — sem ligação real ao servidor | Activar modo de avião e remover os três encaminhamentos USB abaixo                     | Não depender inadvertidamente de rede USB; app previamente preparada continua a abrir                                                                    |
| C — reinício                     | Sem rede, responder e guardar; forçar fecho do Chrome pela interface Android e reabrir | Respostas e UUID mantidos; estado pendente; nenhuma nota local apresentada como definitiva                                                               |
| D — reconexão                    | Repor encaminhamentos e ligação                                                        | Uma tentativa aceite, nota do servidor e conclusão nativa; repetir envio não duplica                                                                     |
| E — perda de sessão              | Invalidar sessão fictícia/retirar cookies no DevTools; tentar sincronizar              | HTTP 401; respostas preservadas; início de sessão na mesma conta e repetição explícita recuperam o envio                                                 |
| F — versão alterada              | Editar título/conteúdo da avaliação no administrador depois da descarga                | HTTP 409; exportação preserva respostas/texto original; arquivo exige confirmação; versão antiga bloqueada; nova descarga permite tentativa independente |
| G — isolamento                   | Consultar noutra conta/tenant fictício; regressar à conta original                     | A outra conta não recebe nem apresenta as tentativas anteriores; servidor recusa submissão de outro sujeito/tenant                                       |
| H — interrupção                  | Interromper rede durante descarga e durante envio                                      | Descarga não fica pronta parcialmente; fila conserva UUID/payload e retoma sem duplicar recibo                                                           |
| I — armazenamento                | Registar quota/uso; descarregar recurso fictício acima do limite de 32 MB              | Erro explícito, sem apagar respostas anteriores. Não encher artificialmente o disco do telefone                                                          |
| J — expiração                    | Usar fixture de ensaio com snapshot expirado/curso preparado há mais de sete dias      | Nova preparação exigida; tentativa e respostas continuam disponíveis para revisão/exportação                                                             |

Para o caso B, manter a depuração USB mas remover o acesso à aplicação e aos serviços:

```sh
adb -s SERIAL reverse --remove tcp:5173
adb -s SERIAL reverse --remove tcp:3000
adb -s SERIAL reverse --remove tcp:59100
```

Restabelecer com os comandos `reverse` da preparação. Não limpar dados do Chrome, IndexedDB ou service worker entre os casos C/D: isso apagaria justamente a persistência em teste. A eliminação externa dos dados pelo utilizador/sistema operativo não pode ser impedida pelo LMS.

## Rede e espaço a registar

Ensaiar pelo menos: ligação sem throttling; 150 kbit/s e 400 ms de latência no DevTools; offline; oscilações offline/online durante envio. Guardar tempo até abrir a lição/PDF, tempo até recibo, erros, bytes da transferência e contagem de tentativas. Não atribuir estes valores ao operador móvel nem confundir tráfego USB com consumo celular.

Registar `navigator.storage.estimate()` antes/depois e repetir num dispositivo modesto com espaço limitado. O limite de 32 MB é por formação, não garantia de capacidade/evicção do Android. Testar políticas de bateria/fecho e versão do Chrome. Não executar comandos de root, alterar relógios do sistema ou consumir o armazenamento de outras aplicações.

## Evidências

Guardar em `.local/sprint/android/`, ignorada pelo Git: ficha do dispositivo, resultados por caso, screenshots e UUIDs/recibos fictícios. Exemplo de captura:

```sh
mkdir -p .local/sprint/android
adb -s SERIAL exec-out screencap -p > .local/sprint/android/screenshot.png
```

Não versionar HARs brutos, cookies, palavras-passe, links de convite ou tokens de snapshots. Publicar apenas métricas e imagens revistas sem dados sensíveis. Concluir cada caso com PASS/FAIL/BLOCKED e observação; assinar o gate apenas após execução física. Um único modelo Android não demonstra compatibilidade com todo o parque de telemóveis.

## Gate de armazenamento — actualização de 18/10/2026

Estado continua **BLOCKED: não executado num dispositivo físico**. O ambiente não disponibilizou dispositivo Android/adb. O probe Chrome CDP `Storage.overrideQuotaForOrigin` declarou quota 1, mas o valor observado em `navigator.storage.estimate()` não acompanhou o override; a descarga continuou a caber. Esse probe não fecha a aceitação de pouco espaço. Repetir fisicamente sem apagar dados de outras aplicações: limite de curso, falha de nova descarga e falha de actualização preservando a cópia completa anterior e todas as respostas pendentes. Guardar estimativas antes/depois, versão de Chrome, espaço livre e resultado PASS/FAIL/BLOCKED. O teste unitário injecta `QuotaExceededError`; não equivale a armazenamento Android cheio.

## Disponibilidade confirmada — execução 21, 18/10/2026

O utilizador respondeu **«Não está disponível nesta sessão»** à disponibilidade de Android físico por USB. Estado **BLOCKED**, sem execução física, métricas de telemóvel ou capturas Android. O guião mantém-se preparado; não se altera o checklist por haver Chrome/CDP. Nenhuma nova validação física é alegada no relatório 21.
