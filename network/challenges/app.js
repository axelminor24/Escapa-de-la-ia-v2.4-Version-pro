'use strict';
const $=s=>document.querySelector(s), app=$('#app'), KEY='escape-ia-three-computers-v1';
const titles=['El archivo corrupto','Reconstruyan el servidor','Programen al humano','Código binario'];
const areas=['Lógica','Hardware','Programación','Matemática'];
const digits=[1,6,3,5];
const hints=['Observa el numero de atras','Observer los diferentes componentes en el salon','Son unicamente 5 pasos, y el primero es derecha','Van a encontrar la codificacion en todo el salon.'];
const autoHints={sequence:'Observa el numero de atras',board:'Observa el numero de atras',hardware:'Observer los diferentes componentes en el salon',foot:'Observer los diferentes componentes en el salon',robot:'Un giro cambia hacia dónde mira el robot, pero no lo mueve. Sigan su orientación después de cada instrucción y separen las acciones con comas.',secondary:'Busquen el tablero secundario del salón. Ingresen únicamente el número encontrado allí, no la secuencia del robot.',binary:'Comparen cada respuesta con el número de su tarjeta. No intercambien las casillas y conserven todas las cifras, incluidos los ceros.',lock:'Ingresen los cuatro dígitos en el orden de los puestos, sin separadores.'};

const binaryAnswers=['10','13','1111','111','10010','17'];
const robotAnswer=['derecha','avanzar','derecha','avanzar','avanzar'];
const steps=['Encender la terminal','Esperar la pantalla de acceso','Ingresar la credencial del equipo','Abrir la carpeta de respaldos','Seleccionar el respaldo más reciente','Verificar la integridad del respaldo','Restaurar el archivo verificado','Cerrar la sesión segura','Borrar todos los respaldos','Publicar la contraseña'];
const empty=()=>({status:'ready',runId:'',team:'',solved:[],hints:[],failures:{},autoShown:{},view:0,names:{},lock:'',stationCode:'',boardSince:null,boardHint:false,footSince:null,footHint:false,robotText:'',robotCorrect:false,robotHint:false,binaryCards:Array(6).fill('')});
let state=empty(),feedback='',error=false,shared=null,connected=false,lastSeen=0,pending=false;
let savedDraft=null;
try{savedDraft=JSON.parse(localStorage.getItem(KEY));}catch{}
const statusBanner=document.createElement('div');
statusBanner.id='network-status';statusBanner.setAttribute('role','status');app.before(statusBanner);
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function seconds(){return shared?.remainingSec??0;}
function time(n){return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function active(){return connected&&!pending&&state.status==='playing'&&shared?.status==='RUNNING';}
function message(s,bad=false){if(bad){const k=stageKey();state.failures[k]=(state.failures[k]||0)+1;if(state.failures[k]>=3)state.autoShown[k]=true;save();}feedback=s;error=bad;render();}
function btn(label,action,extra='',cls=''){return `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;}
function render(){
if(state.status==='waiting'||state.status==='paused'){app.innerHTML=`<section class="end"><div class="eyebrow">PARTIDA COMPARTIDA</div><h1>${state.status==='paused'?'Partida<br>en pausa.':'Escuchen<br>al coordinador.'}</h1><p>${state.status==='paused'?'El coordinador reanudará la misión. Sus respuestas y avances están guardados.':'La explicación está en curso. Los desafíos se habilitarán al comenzar la cuenta regresiva.'}</p><p>El tiempo se muestra en la pantalla del cronómetro.</p></section>`;return;}
if(state.status==='ready'){app.innerHTML=`<section class="intro"><div><div class="eyebrow">PROTOCOLO DE EMERGENCIA / 001</div><h1>Escapando<br>de la <span>IA.</span></h1><p class="brief">El mundo exterior cayó. Ahora la IA tomó los servidores del instituto y bloqueó la salida del refugio. Su equipo es la última conexión con el exterior.</p><p>Resuelvan las pruebas en los puestos del salón e ingresen sus códigos para avanzar. En el servidor deberán escribir los nombres de los componentes encontrados en el salón.</p><div class="rules"><div><b>04</b><span>PUESTOS</span></div><div><b>01</b><span>PISTA POR DESAFÍO</span></div><div><b>3–5</b><span>INTEGRANTES</span></div></div></div><div class="terminal"><div class="eyebrow">PUESTO DE RESPUESTAS</div><p>Registren el nombre del equipo y esperen el inicio del coordinador. Avancen por el salón siguiendo el orden de los puestos.</p><label for="team">Nombre del equipo <span class="small">(opcional)</span></label><input id="team" maxlength="40" placeholder="Ej.: Resistencia 01" value="${esc(state.team)}" autocomplete="off">${btn('Registrar equipo','start','','primary')}<p class="small">El coordinador inicia la partida. El cronómetro está en la otra pantalla. Cada desafío tiene una pista que pueden solicitar una sola vez. Tras tres errores en una etapa, recibirán orientación adicional.</p></div></section><div class="eyebrow">RECORRIDO DE RECUPERACIÓN</div><section class="stations">${titles.map((t,i)=>`<div class="station"><div class="num">PUESTO / 0${i+1}</div><h3>${t}</h3><small>${areas[i]}</small></div>`).join('')}</section>`;return;}
if(state.status==='won'||state.status==='lost'){let won=state.status==='won';app.innerHTML=`<section class="end"><div class="eyebrow">${won?'CONEXIÓN HUMANA RESTABLECIDA':'PROTOCOLO DE CONTENCIÓN ACTIVADO'}</div><h1>${won?'Escaparon<br>de la <span class="solved">IA.</span>':'Misión<br>fallida.'}</h1><p>${won?'SISTEMA RESTAURADO · PUERTA DESBLOQUEADA. El refugio vuelve a estar bajo su control.':'SISTEMA COMPROMETIDO. Se agotó el tiempo. Revisen las soluciones y vuelvan a intentarlo.'}</p><p>El resultado también aparece en la pantalla del cronómetro.</p><p>${esc(state.team)} · ${state.solved.length}/4 puestos recuperados · ${state.hints.length}/4 pistas solicitadas</p><p>Esperen a que el coordinador prepare la siguiente partida.</p><details><summary>Revisar las soluciones con el coordinador</summary><div class="review"><div><b>1 · Archivo corrupto</b><p>${steps.slice(0,8).join(' → ')}. Se descartan las dos acciones inseguras. Código del puesto: 3-8-4-5-7-2-0-1. El fragmento del candado se descubre en el pizarrón.</p></div><div><b>2 · Servidor</b><p>Placa base, Memoria RAM y Fuente de alimentación, en cualquier orden. La ubicación del segundo dígito es debajo de la huella.</p></div><div><b>3 · Robot</b><p>El algoritmo debe conducir desde INICIO hasta META sin tocar obstáculos. Al completar el algoritmo, busquen el número del tablero secundario.</p></div><div><b>4 · Binario</b><p>Las seis respuestas deben coincidir con sus tarjetas, respetando el orden. Al completarlas, la aplicación revela el último código.</p></div></div></details></section>`;return;}
const i=state.view,solved=state.solved.includes(i);app.innerHTML=`<div class="bar"><div><div class="eyebrow">MISIÓN EN CURSO</div><div class="team">${esc(state.team)}</div></div><div class="small">Consulten el tiempo en<br>la pantalla del cronómetro.</div><div class="mono">${state.solved.length}/4 RECUPERADOS<br>${state.hints.length}/4 PISTAS SOLICITADAS</div></div><div class="layout"><aside><nav class="nav" aria-label="Puestos">${titles.map((t,j)=>btn(`<span>0${j+1}</span><span>${t}<small>${state.solved.includes(j)?'RECUPERADO':j===state.solved.length?'DISPONIBLE':'BLOQUEADO'}</small></span>`,'nav',`data-id="${j}" ${j>state.solved.length?'disabled':''}`,j===i?'active':'')).join('')}${btn('▣ Candado final','nav','data-id="4" '+(state.solved.length<4?'disabled':''),i===4?'active':'')}</nav><div class="eyebrow" style="margin-top:26px">FRAGMENTOS / ORDEN 1–4</div><div class="fragments">${digits.map((d,j)=>`<div class="fragment" aria-label="Puesto ${j+1}: ${state.solved.includes(j)?'identificado en el salón':'pendiente'}">${state.solved.includes(j)?'✓':'·'}</div>`).join('')}</div><p class="small">Esta pantalla comparte la partida con el coordinador y el cronómetro.</p></aside><section class="challenge"><div class="eyebrow">${i===4?'SALIDA DEL REFUGIO':`PUESTO 0${i+1} / ${areas[i].toUpperCase()}`}</div><h2>${i===4?'Desbloqueen la salida':titles[i]}</h2>${solved?`<div class="terminal"><div class="eyebrow">SECTOR RECUPERADO</div><div class="timer">✓</div><p>${i===3?'El codigo es 5.':'Recuerden el número que encontraron en el salón para el candado final.'}</p>${btn(i===3?'Ir al candado →':'Ir al siguiente puesto →','nav',`data-id="${i+1}"`,'primary')}</div>`:challenge(i)}${feedback?`<div role="status" class="feedback ${error?'error':''}">${esc(feedback)}</div>`:''}${i<4?hintPanel(i):autoPanel()}</section></div>`;}
const instructions={
0: `<p>En el puesto encontrarán diez tarjetas de un procedimiento de recuperación. La IA agregó dos acciones falsas.</p><ol class="instructions"><li>Lean las diez tarjetas y separen las dos acciones que pondrían en riesgo la información.</li><li>Ordenen las ocho tarjetas válidas: piensen qué debe ocurrir antes de entrar al sistema, recuperar un respaldo y cerrar la sesión.</li><li>Lean los dígitos de las ocho tarjetas en el orden que armaron e ingresen la secuencia completa. Pueden escribirla con o sin guiones.</li></ol>`,
2: `<p>Observen el tablero de <b>4 columnas × 3 filas</b> y sus cinco obstáculos. Comiencen en INICIO mirando hacia arriba (Norte). Lleguen a META sin pisar obstáculos ni salir del tablero.</p><p>Usen únicamente AVANZAR, GIRAR A LA IZQUIERDA y GIRAR A LA DERECHA. Cada giro cambia la orientación sin desplazarse.</p>`,
3: `<p>Resuelvan las seis tarjetas usando la codificación que encontrarán en el salón. Escriban la respuesta de cada tarjeta en su casilla correspondiente.</p><p>Respeten el orden de las tarjetas. Deben completar correctamente las seis para recuperar el último código.</p>`
};
function challenge(i){
if(i===3)return `${instructions[3]}<div class="binary-cards">${state.binaryCards.map((v,j)=>`<div class="card"><label for="binary${j}">Tarjeta ${j+1}<input id="binary${j}" data-field="binaryCards" data-id="${j}" type="text" inputmode="numeric" maxlength="12" autocomplete="off" value="${esc(v)}" placeholder="Escriban el número"></label></div>`).join('')}</div><div class="actions">${btn('Comprobar las seis tarjetas','checkbinary','','primary')}</div>`;

if(i===2&&!state.robotCorrect)return `${instructions[2]}<div class="robot-board" role="group" aria-label="Tablero de cuatro columnas y tres filas">${Array.from({length:12},(_,j)=>`<div class="robot-cell ${[2,4,6,8,11].includes(j)?'blocked':''}" aria-label="Fila ${Math.floor(j/4)+1}, columna ${j%4+1}: ${j===0?'Inicio, mirando al Norte':j===9?'Meta':[2,4,6,8,11].includes(j)?'Obstáculo':'Libre'}">${j===0?'↑ INICIO':j===9?'META':[2,4,6,8,11].includes(j)?'×':'·'}</div>`).join('')}</div><label for="robotText">Ordenen y escriban la secuencia de instrucciones</label><textarea id="robotText" data-field="robotText" rows="4" maxlength="300" placeholder="Separen con comas, punto y coma o saltos de línea. Pueden numerar cada paso." spellcheck="false">${esc(state.robotText)}</textarea><p class="small">Para los giros pueden escribir “derecha” o “izquierda”.</p><div class="actions">${btn('Comprobar secuencia','checkrobot','','primary')}</div>`;
if(i===2&&state.robotCorrect)return `<div class="eyebrow">ALGORITMO VALIDADO</div><p>Busquen el numero del tablero secundario</p><label for="stationCode">Número encontrado en el tablero secundario</label><input id="stationCode" data-field="stationCode" inputmode="numeric" type="password" maxlength="1" autocomplete="off" value="${esc(state.stationCode)}" placeholder="•"><div class="actions">${btn('Confirmar hallazgo y continuar →','validatecode','','primary')}</div>`;

if(i===0&&state.boardSince!==null)return `<div class="eyebrow">SECUENCIA VALIDADA / BÚSQUEDA EN EL SALÓN</div><p>Observer con atencion el hilo rojo, se encuentra su primer digito</p><p>No aparece en esta pantalla. Cuando lo encuentren, ingrésenlo para continuar.</p><label for="stationCode">Número encontrado en el pizarrón</label><input id="stationCode" data-field="stationCode" inputmode="numeric" type="password" maxlength="1" autocomplete="off" value="${esc(state.stationCode)}" placeholder="•"><div class="actions">${btn('Confirmar hallazgo y continuar →','validatecode','','primary')}</div>`;

if(i!==1&&i<4)return `${instructions[i]}<div class="codegate"><div class="eyebrow">CONTROL DE ACCESO</div><p class="small">Resuelvan el desafío en el puesto. Ingresen el código obtenido para habilitar el siguiente.</p><label for="stationCode">Código del puesto ${i+1}</label><input id="stationCode" data-field="stationCode" inputmode="numeric" type="${i===0?'text':'password'}" maxlength="${i===0?23:1}" autocomplete="off" value="${esc(state.stationCode)}" placeholder="${i===0?'8 dígitos en orden':'Ingresar código'}"><div class="actions">${btn('Validar código y continuar →','validatecode','','primary')}</div></div>`;
if(i===1&&state.footSince!==null)return `<div class="eyebrow">COMPONENTES CORRECTOS / BÚSQUEDA EN EL SALÓN</div><p>Miren por donde pisan</p><label for="stationCode">Número encontrado en el salón</label><input id="stationCode" type="password" inputmode="numeric" maxlength="1" data-field="stationCode" autocomplete="off" value="${esc(state.stationCode)}" placeholder="•"><div class="actions">${btn('Confirmar hallazgo y continuar →','validatecode','','primary')}</div>`;
if(i===1)return `<p>Los tres componentes internos de una PC están distribuidos por diferentes lugares del salón. Encuéntrenlos, identifíquenlos y escriban sus nombres aquí.</p><p><b>Un componente por campo. El orden no importa.</b></p>${[0,1,2].map(j=>`<label for="name${j}">Componente ${j+1}</label><input id="name${j}" data-field="names" data-id="${j}" maxlength="60" value="${esc(state.names[j]||'')}" placeholder="Nombre del componente" autocomplete="off">`).join('')}<div class="actions">${btn('Verificar componentes','check','','primary')}</div>`;
return `<p>Ingresen los cuatro números recuperados, en orden del puesto 1 al 4. El reloj sigue corriendo hasta abrir el candado.</p><label for="lock">Clave de cuatro dígitos</label><input id="lock" class="lockinput" inputmode="numeric" maxlength="4" autocomplete="off" data-field="lock" value="${esc(state.lock)}" placeholder="····"><div class="actions">${btn('Abrir candado','unlock','','primary')}</div>`;}
function stageKey(){if(state.view===0)return state.boardSince===null?'sequence':'board';if(state.view===1)return state.footSince===null?'hardware':'foot';if(state.view===2)return state.robotCorrect?'secondary':'robot';return state.view===3?'binary':'lock';}
function autoPanel(){const k=stageKey();return state.autoShown[k]?`<div class="hint"><b>Orientación tras varios intentos</b><br>${autoHints[k]}</div>`:'';}
function canHint(){return state.status==='playing'&&state.view<4&&!state.solved.includes(state.view)&&!state.hints.includes(state.view);}
function hintPanel(i){const used=state.hints.includes(i);return `<div class="hintbox">${state.solved.includes(i)?'':btn(used?'Pista solicitada':'Pedir la pista de este desafío','hint',canHint()?'':'disabled')}<p class="small">Una pista a pedido por desafío. La orientación por errores no consume esta pista.</p>${used?`<div class="hint"><b>Pista del desafío</b><br>${hints[i]}</div>`:''}${state.solved.includes(i)?'':autoPanel()}</div>`;}


function connectivity(ok){
  const changed=connected!==ok;connected=ok;app.inert=!ok||pending;
  if(changed||!statusBanner.textContent)statusBanner.textContent=ok?'PC 3 · Desafíos conectados a la partida':'Conexión interrumpida. Esperando a la computadora del coordinador…';
  statusBanner.classList.toggle('offline',!ok);
}
function applySnapshot(next,force=false){
  if(!next||!next.board)return;
  if(shared&&next.serverVersion!==undefined&&shared.serverVersion!==undefined&&(next.serverVersion<shared.serverVersion||next.serverVersion===shared.serverVersion&&next.serverNow<shared.serverNow))return;
  if(shared?.runId===next.runId&&next.revision<shared.revision)return;
  const previous=shared,newRun=!previous||previous.runId!==next.runId;
  const changed=newRun||previous.revision!==next.revision||previous.status!==next.status||force;
  shared=next;lastSeen=Date.now();connectivity(true);
  if(!changed)return;
  const prior=state;
  const mapped={IDLE:'ready',INTRO:'waiting',RUNNING:'playing',PAUSED:'paused',VICTORY:'won',GAMEOVER:'lost'};
  state={...empty(),...next.board,runId:next.runId,status:mapped[next.status]};
  if(newRun){feedback='';error=false;statusBanner.textContent=previous?'Nueva partida preparada. Registren el equipo para comenzar.':'PC 3 · Desafíos conectados a la partida';}
  const draft=newRun?savedDraft:prior;
  if(!force&&draft?.runId===next.runId&&JSON.stringify(draft.solved)===JSON.stringify(state.solved)&&draft.view<=state.solved.length){
    const currentView=state.view;state.view=draft.view;const newStage=stageKey();state.view=currentView;
    const savedState=state;state=draft;const oldStage=stageKey();state=savedState;
    if(newStage===oldStage){for(const key of ['names','binaryCards','robotText','stationCode','lock','view'])state[key]=draft[key];}
  }
  savedDraft=null;save();render();
}
async function send(action){
  if(!connected||pending||!shared)return;
  const runId=shared.runId;
  const fields={team:$('#team')?.value??state.team,names:state.names,binaryCards:state.binaryCards,robotText:state.robotText,stationCode:state.stationCode,lock:state.lock};
  pending=true;app.inert=true;
  const body={action:action==='start'?'TEAM':action,fields,runId,view:state.view,stage:stageKey(),requestId:Date.now()+'-'+Math.random().toString(36).slice(2)};
  try{
    const response=await fetch('/api/player',{method:'POST',headers:{'Content-Type':'application/json','X-Escape-Request':'1'},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
    const result=await response.json();
    if(shared.runId!==runId)return;
    if(result.snapshot)applySnapshot(result.snapshot,true);
    feedback=response.ok?(result.message||''):(result.error||'No se pudo enviar la respuesta.');error=!response.ok||Boolean(result.bad);
    if(state.status==='ready')statusBanner.textContent=feedback||'Equipo preparado. Esperen al coordinador.';
    render();
  }catch{
    feedback='No se pudo confirmar el envío. Esperen la reconexión antes de volver a intentar.';error=true;connectivity(false);render();
  }finally{pending=false;app.inert=!connected;}
}
app.addEventListener('input',e=>{
  const f=e.target.dataset.field;if(!f||!active())return;
  if(['names','binaryCards'].includes(f))state[f][Number(e.target.dataset.id)]=e.target.value;
  else if(['lock','stationCode','robotText'].includes(f))state[f]=e.target.value;save();
});
app.addEventListener('click',e=>{
  const el=e.target.closest('button[data-action]');if(!el||el.disabled||pending||!connected)return;
  const action=el.dataset.action,n=Number(el.dataset.id);
  if(action==='start'){send(action);return;}
  if(!active())return;
  if(action==='nav'){if(n<=state.solved.length&&n>=0&&n<=4){state.view=n;state.stationCode='';feedback='';save();render();}return;}
  send(action);
});
render();connectivity(false);
async function connect(){
  try{
    const response=await fetch('/api/config');
    const config=response.ok?await response.json():{transport:'sse'};
    if(config.transport==='poll'){
      const access=await fetch('/api/player-access',{method:'POST',headers:{'Content-Type':'application/json','X-Escape-Request':'1'},body:'{}',signal:AbortSignal.timeout(5000)});
      if(!access.ok)throw new Error('No se pudo habilitar el acceso a los desafíos.');
      if(location.hash)history.replaceState(null,'',location.pathname);
      const client=Date.now()+'-'+Math.random().toString(36).slice(2);
      async function poll(){
        try{const res=await fetch('/api/state?role=challenges&client='+client,{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!res.ok)throw new Error();applySnapshot(await res.json());}
        catch{connectivity(false);}
        finally{setTimeout(poll,600);}
      }
      poll();
    }else{
      const stream=new EventSource('/api/events?role=challenges');
      stream.onmessage=e=>{try{applySnapshot(JSON.parse(e.data));}catch{connectivity(false);}};
      stream.onerror=()=>connectivity(false);
    }
  }catch{connectivity(false);setTimeout(connect,2000);}
}
connect();
// This only checks the connection. This screen never advances a game clock.
setInterval(()=>{if(Date.now()-lastSeen>3000)connectivity(false);},1000);
