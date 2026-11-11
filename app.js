(() => {
"use strict";
const $ = id => document.getElementById(id);
const state = {token:null,user:null,products:[],stock:[],employees:[],moves:[],tstUsers:[],dashboard:null,caBase:null};
const APP_VERSION="1.1.4";
const apiUrl = () => window.APP_CONFIG?.API_URL || "";
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3500)}
function busy(on){$("loading").classList.toggle("hidden",!on)}
async function api(action,data={}) {
  if(!apiUrl() || apiUrl().includes("COLE_A_URL")) throw new Error("Configure a URL do Apps Script em config.js.");
  const body = new URLSearchParams({action, payload:JSON.stringify({...data,token:state.token||""})});
  const response = await fetch(apiUrl(),{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body});
  const result = await response.json();
  if(!result.ok) throw new Error(result.error || "Falha na operação.");
  return result.data;
}
function showApp(){
  $("login").classList.add("hidden");$("app").classList.remove("hidden");
  $("userInfo").textContent=`${state.user.nome} • ${state.user.matricula} • ${state.user.perfil}`;
  document.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",state.user.perfil!=="ADMIN"));
  $("priceField").classList.toggle("hidden",state.user.perfil!=="ADMIN");
  document.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",state.user.perfil!=="ADMIN"));
  
}
function showLogin(){$("app").classList.add("hidden");$("login").classList.remove("hidden")}
function money(n){return Number(n||0).toLocaleString("pt-BR",{maximumFractionDigits:0})}
function date(v){return v?new Date(v).toLocaleDateString("pt-BR"):"—"}
async function loadAll(){
  busy(true);
  try {
    const d=await api("bootstrap");
    state.products=d.products||[];state.stock=d.stock||[];state.employees=d.employees||[];state.moves=d.moves||[];state.tstUsers=d.tstUsers||[];state.dashboard=d.dashboard||{};state.caBase="";
    renderAll();renderTstUsers();
  } finally {busy(false)}
}
function renderAll(){renderSelects();renderDashboard();renderStock();renderHistory();renderCollaborators();$("lastUpdate").textContent="Atualizado em "+new Date().toLocaleString("pt-BR")}
function productLabel(p){return `${p.sku} • ${p.descricao}${p.variante?" / "+p.variante:""}`}
function renderSelects(){
  ["entryProduct","exitProduct","adjustProduct"].forEach(id=>{const s=$(id);if(!s)return;s.innerHTML='<option value="">Selecione...</option>';state.products.filter(p=>p.ativo).forEach(p=>{const o=document.createElement("option");o.value=p.sku;o.textContent=productLabel(p);s.appendChild(o)})});
  $("employeeOptions").innerHTML=state.employees.filter(e=>e.ativo).map(e=>`<option value="${escapeHtml(e.matricula)}">${escapeHtml(e.nome)}</option>`).join("");
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderDashboard(){
  const d=state.dashboard||{};
  const cards=[["SKUs ativos",d.skus||0],["Saldo total (unidades)",d.units||0],["Itens abaixo do mínimo",d.below||0],["Itens zerados",d.zero||0],["Colaboradores ativos",d.activeEmployees||0]];
  const mk=[["Entradas (un.)",d.entries30||0],["Saídas (un.)",d.exits30||0]];$("movementKpis").innerHTML=mk.map(x=>`<div class="kpi"><strong>${money(x[1])}</strong><span>${x[0]}</span></div>`).join("");
  $("kpis").innerHTML=cards.map(x=>`<div class="kpi"><strong>${money(x[1])}</strong><span>${x[0]}</span></div>`).join("");
  const rows=(d.priorities||[]).map(x=>`<tr><td>${escapeHtml(x.label)}</td><td>${money(x.saldo)}</td><td>${money(x.minimo)}</td><td>${x.cobertura==null?"Sem histórico":x.cobertura+" dias"}</td><td>${money(x.sugerido)}</td><td><span class="status ${x.saldo<=0?"critical":x.saldo<x.minimo?"attention":"ok"}">${x.saldo<=0?"ZERADO":x.saldo<x.minimo?"ABAIXO DO MÍNIMO":"OK"}</span></td></tr>`).join("");
  $("alerts").innerHTML=rows?`<table><thead><tr><th>Produto</th><th>Saldo</th><th>Mínimo</th><th>Cobertura</th><th>Compra sugerida</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Sem dados de estoque para avaliar.</div>';
  const c=d.caCounts||{};
  $("caBaseInfo").textContent="Controle manual: os dados exibidos refletem o que foi informado no cadastro e não são validados automaticamente pelo MTE.";
  const caRows=[["Válidos (informado manualmente)",c.validos||0,"ok"],["Vencidos (pela data informada)",c.vencidos||0,"critical"],["Suspensos (informado manualmente)",c.suspensos||0,"critical"],["Cancelados (informado manualmente)",c.cancelados||0,"critical"],["Não consultados",c.naoConsultados||0,"attention"],["Sem CA",c.semCA||0,"attention"]];
  $("caAlerts").innerHTML=`<div class="kpis">${caRows.map(x=>`<div class="kpi"><strong>${money(x[1])}</strong><span>${x[0]}</span></div>`).join("")}</div>`;
  const cons=(d.consumption||[]).map(x=>`<tr><td>${escapeHtml(x.label)}</td><td>${money(x.qty)}</td><td>${x.daily.toFixed(2).replace(".",",")}</td></tr>`).join("");
  $("consumption").innerHTML=cons?`<table><thead><tr><th>Produto</th><th>Saídas em 90 dias</th><th>Média diária</th></tr></thead><tbody>${cons}</tbody></table>`:'<div class="empty">Sem saídas no período.</div>';
}
function renderStock(){
 const q=$("stockSearch").value.toLowerCase();
 const rows=state.stock.filter(x=>(x.label+" "+x.ca+" "+x.caSituacao).toLowerCase().includes(q)).map(x=>`<tr><td>${escapeHtml(x.label)}</td><td>${money(x.saldo)} ${escapeHtml(x.unidade)}</td><td>${money(x.minimo)}</td><td>${escapeHtml(x.ca||"—")}</td><td>${date(x.caValidade)}</td><td><span class="status ${["VENCIDO","SUSPENSO","CANCELADO"].includes(x.caSituacao)?"critical":x.caSituacao==="VALIDO"?"ok":"attention"}">${escapeHtml(x.caSituacao||"NÃO CONSULTADO")}</span></td></tr>`).join("");
 $("stockTable").innerHTML=rows?`<table><thead><tr><th>Produto / variante</th><th>Saldo</th><th>Mínimo</th><th>CA</th><th>Validade CA</th><th>Situação CA</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Nenhum produto encontrado.</div>';
}
function renderCollaborators(){const el=$("collaboratorTable");if(!el)return;const rows=state.employees.map(e=>`<tr><td>${escapeHtml(e.matricula)}</td><td>${escapeHtml(e.nome)}</td><td>${escapeHtml(e.cr||"—")}</td></tr>`).join("");el.innerHTML=rows?`<table><thead><tr><th>Matrícula</th><th>Nome</th><th>CR</th></tr></thead><tbody>${rows}</tbody></table>`:"<div class=empty>Nenhum colaborador cadastrado.</div>"}
function renderTstUsers(){const el=$("tstTable");if(!el)return;const rows=state.tstUsers.map(u=>`<tr><td>${escapeHtml(u.matricula)}</td><td>${escapeHtml(u.nome)}</td><td><span class="status ${u.ativo?"ok":"attention"}">${u.ativo?"ATIVO":"INATIVO"}</span></td><td><button class="btn outline" type="button" data-edit-tst="${escapeHtml(u.matricula)}">Editar</button></td></tr>`).join("");el.innerHTML=rows?`<table><thead><tr><th>Matrícula</th><th>Nome</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows}</tbody></table>`:"<div class=empty>Nenhum TST cadastrado.</div>";}
function renderHistory(){
 const q=$("historySearch").value.toLowerCase();
 const rows=state.moves.filter(x=>(x.label+" "+x.matricula+" "+x.colaborador+" "+x.tipo).toLowerCase().includes(q)).slice(0,300).map(x=>`<tr><td>${date(x.data)}</td><td>${escapeHtml(x.tipo)}</td><td>${escapeHtml(x.label)}</td><td>${money(x.quantidade)}</td><td>${escapeHtml(x.matricula||"—")}</td><td>${escapeHtml(x.colaborador||"—")}</td><td>${escapeHtml(x.usuario||"")}</td></tr>`).join("");
 $("historyTable").innerHTML=rows?`<table><thead><tr><th>Data</th><th>Movimento</th><th>Produto</th><th>Qtd.</th><th>Matrícula</th><th>Colaborador</th><th>Registrado por</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Nenhuma movimentação.</div>';
}
function switchTab(tab){document.querySelectorAll(".tab-page").forEach(x=>x.classList.add("hidden"));$("tab-"+tab).classList.remove("hidden");document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab))}
$("nav").addEventListener("click",e=>{const b=e.target.closest("button[data-tab]");if(b)switchTab(b.dataset.tab)});
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();busy(true);try{const d=await api("login",{matricula:$("loginMatricula").value.trim(),senha:$("loginSenha").value});state.token=d.token;state.user=d.user;showApp();await loadAll();}catch(err){toast(err.message)}finally{busy(false)}});
$("logout").onclick=async()=>{try{await api("logout")}catch(e){}state.token=null;state.user=null;showLogin()};
$("refresh").onclick=()=>loadAll().catch(e=>toast(e.message));
$("entryForm").onsubmit=async e=>{e.preventDefault();try{await api("movement",{tipo:"ENTRADA",sku:$("entryProduct").value,quantidade:Number($("entryQty").value),fornecedor:$("entrySupplier").value,observacao:$("entryObs").value});e.target.reset();await loadAll();toast("Entrada registrada.")}catch(err){toast(err.message)}};
$("employeeMat").addEventListener("change",()=>lookupEmployee());
$("employeeMat").addEventListener("input",()=>{const m=$("employeeMat").value.trim();const e=state.employees.find(x=>x.matricula===m&&x.ativo);$("employeePreview").textContent=e?`${e.nome} • ${e.setor||"Setor não informado"} • matrícula ${e.matricula}`:"Matrícula não localizada ou colaborador inativo."});
function lookupEmployee(){ $("employeeMat").dispatchEvent(new Event("input")); }
$("exitForm").onsubmit=async e=>{e.preventDefault();try{await api("movement",{tipo:"SAIDA",sku:$("exitProduct").value,quantidade:Number($("exitQty").value),matricula:$("employeeMat").value.trim(),motivo:$("exitReason").value,observacao:$("exitObs").value});e.target.reset();$("employeePreview").textContent="Informe a matrícula para localizar o colaborador.";await loadAll();toast("Entrega registrada.")}catch(err){toast(err.message)}};
$("productForm").onsubmit=async e=>{e.preventDefault();try{await api("product",{sku:$("pSku").value.trim(),descricao:$("pName").value.trim(),variante:$("pVariant").value.trim(),unidade:$("pUnit").value,categoria:$("pCategory").value,fabricante:$("pMaker").value,ca:$("pCa").value,caValidade:$("pCaExpiry").value,caSituacao:$("pCaStatus").value,minimo:Number($("pMin").value),estoqueSeguranca:Number($("pSafety").value),multiplo:Number($("pPack").value),precoUnitario:$("pPrice").value===""?"":Number($("pPrice").value)});e.target.reset();await loadAll();toast("Produto cadastrado.")}catch(err){toast(err.message)}};
$("collaboratorForm").onsubmit=async e=>{e.preventDefault();try{await api("collaborator",{matricula:$("cMatricula").value.trim(),nome:$("cNome").value.trim(),cr:$("cCR").value.trim()});e.target.reset();await loadAll();toast("Colaborador salvo.")}catch(err){toast(err.message)}};
$("adjustForm").onsubmit=async e=>{e.preventDefault();try{await api("movement",{tipo:"AJUSTE",sku:$("adjustProduct").value,quantidade:Number($("adjustQty").value),observacao:$("adjustReason").value});e.target.reset();await loadAll();toast("Ajuste auditado registrado.")}catch(err){toast(err.message)}};
$("stockSearch").oninput=renderStock;
$("historySearch").oninput=renderHistory;
$("tstForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("tstUser",{matricula:$("tstMatricula").value.trim(),nome:$("tstNome").value.trim(),senha:$("tstSenha").value,ativo:$("tstAtivo").checked});e.target.reset();$("tstAtivo").checked=true;$("tstMatricula").readOnly=false;await loadAll();toast("Usuário TST salvo.")}catch(err){toast(err.message)}});
$("tstTable").addEventListener("click",e=>{const b=e.target.closest("[data-edit-tst]");if(!b)return;const u=state.tstUsers.find(x=>x.matricula===b.dataset.editTst);if(!u)return;$("tstMatricula").value=u.matricula;$("tstMatricula").readOnly=true;$("tstNome").value=u.nome;$("tstSenha").value="";$("tstAtivo").checked=u.ativo;$("tstNome").focus();});
$("tstClear").addEventListener("click",()=>{$("tstForm").reset();$("tstMatricula").readOnly=false;$("tstAtivo").checked=true;});
let swRegistration=null;
async function checkAppUpdate(){
  if(!("serviceWorker" in navigator))return toast("Atualização automática não suportada neste navegador.");
  try{
    swRegistration=swRegistration||await navigator.serviceWorker.getRegistration()||await navigator.serviceWorker.register("./sw.js");
    await swRegistration.update();
    const activate=()=>{if(swRegistration&&swRegistration.waiting){swRegistration.waiting.postMessage({type:"SKIP_WAITING"});return true;}return false;};
    if(activate())return;
    const installing=swRegistration.installing;
    if(installing){installing.addEventListener("statechange",()=>{if(installing.state==="installed"){if(!activate())toast("Nova versão preparada. Recarregue o aplicativo para concluir.");}});return toast("Nova versão encontrada. Baixando atualização...");}
    toast("Aplicativo verificado. Você já está na versão mais recente.");
  }catch(err){toast("Não foi possível verificar atualização: "+err.message)}
}
$("updateApp").addEventListener("click",checkAppUpdate);
if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js").then(reg=>{swRegistration=reg;reg.update().catch(()=>{});if(reg.waiting)$("updateApp").classList.add("attention");}).catch(()=>{});navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!window.__appReloading){window.__appReloading=true;window.location.reload()}})}
})();