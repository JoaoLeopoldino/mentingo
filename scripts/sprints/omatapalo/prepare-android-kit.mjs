/** Prepared execution kit only. No connected phone, ADB operation or device result is fabricated. */
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
const folder=new URL(`../../../.local/sprint/android-kit-${Date.now()}/`,import.meta.url);
await mkdir(folder,{mode:0o700});
const cases=[
 ["install-auth","Instalação e autenticação","Chrome/PWA abre em pt-AO, conta fictícia autenticada; registar isSecureContext e versões."],
 ["download","Descarga autenticada","Texto/PDF e avaliação descarregados por completo; registar bytes e quota antes/depois."],
 ["read-offline","Abertura sem rede","Texto/PDF disponíveis em modo de avião, sem usar conteúdo ainda em memória."],
 ["quiz-offline","Avaliação offline","Respostas e UUID persistem localmente; estado pending, sem nota final inventada."],
 ["restart","Fecho e reabertura","Fechar aplicação/processo, reabrir sem rede e recuperar conteúdos e respostas."],
 ["synchronize","Ligação e sincronização","Um recibo nativo; repetir sync/interromper/reabrir sem duplicar a tentativa."],
 ["session","Sessão expirada","Respostas conservadas; nova autenticação e retry explícito; sem perda silenciosa."],
 ["quota","Quotas e armazenamento","Falha de descarga/actualização mantém a cópia anterior e as respostas; não apagar dados de outras aplicações."],
 ["changed-content","Conteúdos alterados","Versão recusada é apresentada; arquivo/exportação e nova descarga sem atribuir as respostas antigas à nova avaliação."],
 ["weak-network","Rede fraca e intermitente","150/500 kbit/s, 400/200 ms, cortes; recolher tempos/bytes/erros e verificar recuperação. SCORM offline fora do âmbito."],
];
const template={preparedAt:new Date().toISOString(),overall:"BLOCKED",reason:"Android físico indisponível nesta sessão; requer execução manual real",
 device:{model:null,androidVersion:null,chromeVersion:null,serialRedacted:true,freeStorageBytes:null,storageEstimateBefore:null,storageEstimateAfter:null},
 cases:cases.map(([id,name,expected])=>({id,name,expected,status:"BLOCKED",observed:null,evidence:[],startedAt:null,endedAt:null})),
 scope:"Texto/PDF e escolha única nativos; não prova SCORM offline nem todos os dispositivos."};
await writeFile(new URL("results-template.json",folder),JSON.stringify(template,null,2));
await writeFile(new URL("physical-test-guide.md",folder),await readFile(new URL("../../../docs/sprints/omatapalo-mentingo/13-android-physical-validation.md",import.meta.url)));
await writeFile(new URL("README.md",folder),`# Ensaio Android — preparado, não executado\n\nUsar apenas contas fictícias locais. Seguir physical-test-guide.md e preencher results-template.json com PASS/FAIL/BLOCKED e provas. Não incluir cookies, HARs brutos ou palavras-passe nas capturas.\n\nApós autorizar USB no próprio dispositivo, seleccionar o SERIAL e executar manualmente:\n\n\`\`\`sh\nadb -s SERIAL reverse tcp:5173 tcp:5173\nadb -s SERIAL reverse tcp:3000 tcp:3000\n\`\`\`\n\nPara a fase offline, depois de confirmar a cache e concluir a descarga, remover apenas estes encaminhamentos de ensaio: \`adb -s SERIAL reverse --remove tcp:5173\` e \`adb -s SERIAL reverse --remove tcp:3000\`. O modo de avião não corta necessariamente o túnel USB: confirmar no DevTools que novos pedidos à API falham realmente. Manter a sessão de depuração para recolher provas. Para recuperar, repor os dois reverse, restabelecer a ligação e sincronizar. Não apagar armazenamento nem respostas.\n\nAbrir http://localhost:5173 no Chrome do telemóvel. Confirmar contexto seguro, API, service worker e armazenamento antes do modo de avião. O reverse USB não mede consumo de uma operadora. Não usar viewport móvel como substituto. Registar a configuração de throttling/DevTools remoto e a evidência do modo de avião.\n\nNão reutilizar um questionário já concluído para provar uma primeira submissão: preparar uma nova formação fictícia. A versão/template do kit deve acompanhar as provas do dispositivo.\n`);
const zip=new URL("../android-validation-kit.zip",folder);
execFileSync("python3",["-m","zipfile","-c",zip.pathname,new URL("README.md",folder).pathname,new URL("physical-test-guide.md",folder).pathname,new URL("results-template.json",folder).pathname]);
console.log(JSON.stringify({folder:folder.pathname,zip:zip.pathname,cases:cases.length,state:"BLOCKED",executedOnPhysicalDevice:false}));
