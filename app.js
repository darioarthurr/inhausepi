(() => {
"use strict";
const $ = id => document.getElementById(id);
const state = {token:null,user:null,products:[],stock:[],employees:[],moves:[],tstUsers:[],dashboard:null};
const APP_VERSION="1.1.6";
const apiUrl = () => window.APP_CONFIG?.API_URL || "";
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3600)}
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
  $("userInfo").textContent=`${state.user.nome} • Matrícula ${state.user.matricula} • ${state.user.perfil}`;
  const isAdmin=String(state.user.perfil||"").toUpperCase()==="ADMIN";
  document.querySelectorAll(".admin-only:not(.tab-page)").forEach(el=>el.classList.toggle("hidden",!isAdmin));
  // Nunca reexibir automaticamente uma aba administrativa ao trocar de sessão.
  document.querySelectorAll(".tab-page.admin-only").forEach(el=>{if(!isAdmin)el.classList.add("hidden")});
  $("priceField").classList.toggle("hidden",!isAdmin);
  // Cada autenticação começa no painel, evitando resíduo visual da sessão anterior.
  switchTab("dashboard");
}
function showLogin(){$("app").classList.add("hidden");$("login").classList.remove("hidden")}
function money(n){return Number(n||0).toLocaleString("pt-BR",{maximumFractionDigits:0})}
function date(v){return v?new Date(v).toLocaleDateString("pt-BR"):"—"}
async function loadAll(){
  busy(true);
  try {const d=await api("bootstrap");state.products=d.products||[];state.stock=d.stock||[];state.employees=d.employees||[];state.moves=d.moves||[];state.tstUsers=d.tstUsers||[];state.dashboard=d.dashboard||{};renderAll();renderTstUsers();}
  finally {busy(false)}
}
function renderAll(){renderSelects();renderDashboard();renderStock();renderHistory();renderCollaborators();$("lastUpdate").textContent="Atualizado em "+new Date().toLocaleString("pt-BR")}
function productLabel(p){return `${p.sku} • ${p.descricao}${p.variante?" / "+p.variante:""}`}
function renderSelects(){
  ["entryProduct","exitProduct","adjustProduct"].forEach(id=>{const s=$(id);if(!s)return;s.innerHTML='<option value="">Selecione...</option>';state.products.filter(p=>p.ativo).forEach(p=>{const o=document.createElement("option");o.value=p.sku;o.textContent=productLabel(p);s.appendChild(o)})});
  $("employeeOptions").innerHTML=state.employees.filter(e=>e.ativo).map(e=>`<option value="${escapeHtml(e.matricula)}">${escapeHtml(e.nome)}</option>`).join("");
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function kpi(label,value,detail,icon){return `<div class="kpi"><div class="kpi-top"><span class="kpi-icon">${icon}</span><span class="kpi-label">${label}</span></div><strong>${money(value)}</strong><small>${detail||""}</small></div>`}
function barChart(elId,items){const el=$(elId);if(!items.length){el.innerHTML='<div class="empty">Sem dados suficientes para o gráfico.</div>';return;}const max=Math.max(1,...items.map(x=>Number(x.value)||0));el.innerHTML=items.map(x=>`<div class="bar-row"><div class="bar-label"><span>${escapeHtml(x.label)}</span><b>${money(x.value)}</b></div><div class="bar-track"><div class="bar-fill ${x.className||""}" style="width:${Math.max(x.value>0?2:0,(Number(x.value)||0)/max*100)}%"></div></div></div>`).join("")}
function renderDashboard(){
  const d=state.dashboard||{},c=d.caCounts||{};
  const cards=[kpi("SKUs ativos",d.skus||0,"Produtos cadastrados","▦"),kpi("Saldo total",d.units||0,"Unidades disponíveis","◫"),kpi("Abaixo do mínimo",d.below||0,"Itens que exigem atenção","!"),kpi("Estoque zerado",d.zero||0,"Itens sem saldo","×"),kpi("Funcionários ativos",d.activeEmployees||0,"Base habilitada para entregas","♙")];
  $("kpis").innerHTML=cards.join("");
  $("movementChart").innerHTML=`<div class="chart-summary"><div><span class="legend-dot entry-dot"></span>Entradas<strong>${money(d.entries30||0)}</strong></div><div><span class="legend-dot exit-dot"></span>Saídas<strong>${money(d.exits30||0)}</strong></div></div>`;
  barChart("movementChart",[{label:"Entradas",value:d.entries30||0,className:"entry-fill"},{label:"Saídas",value:d.exits30||0,className:"exit-fill"}]);
  barChart("stockChart",[{label:"Dentro do mínimo",value:Math.max(0,(d.skus||0)-(d.below||0)),className:"entry-fill"},{label:"Abaixo do mínimo",value:Math.max(0,(d.below||0)-(d.zero||0)),className:"warn-fill"},{label:"Zerados",value:d.zero||0,className:"exit-fill"}]);
  barChart("caChart",[{label:"Válidos",value:c.validos||0,className:"entry-fill"},{label:"Vencidos",value:c.vencidos||0,className:"exit-fill"},{label:"Suspensos / cancelados",value:(c.suspensos||0)+(c.cancelados||0),className:"exit-fill"},{label:"Não consultados",value:c.naoConsultados||0,className:"warn-fill"},{label:"Sem CA",value:c.semCA||0,className:"neutral-fill"}]);
  barChart("consumptionChart",(d.consumption||[]).slice(0,6).map(x=>({label:x.label,value:x.qty,className:"blue-fill"})));
  const rows=(d.priorities||[]).filter(x=>x.saldo<x.minimo||x.saldo<=0).map(x=>`<tr><td>${escapeHtml(x.label)}</td><td>${money(x.saldo)}</td><td>${money(x.minimo)}</td><td>${x.cobertura==null?"Sem histórico":x.cobertura+" dias"}</td><td>${money(x.sugerido)}</td><td><span class="status ${x.saldo<=0?"critical":"attention"}">${x.saldo<=0?"ZERADO":"ABAIXO DO MÍNIMO"}</span></td></tr>`).join("");
  $("alerts").innerHTML=rows?`<table><thead><tr><th>Produto</th><th>Saldo</th><th>Mínimo</th><th>Cobertura</th><th>Compra sugerida</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Nenhum item abaixo do mínimo no momento.</div>';
}
function renderStock(){const q=$("stockSearch").value.toLowerCase();const rows=state.stock.filter(x=>(x.label+" "+x.ca+" "+x.caSituacao).toLowerCase().includes(q)).map(x=>`<tr><td>${escapeHtml(x.label)}</td><td><strong>${money(x.saldo)}</strong> ${escapeHtml(x.unidade)}</td><td>${money(x.minimo)}</td><td>${escapeHtml(x.ca||"—")}</td><td>${date(x.caValidade)}</td><td><span class="status ${["VENCIDO","SUSPENSO","CANCELADO"].includes(x.caSituacao)?"critical":x.caSituacao==="VALIDO"?"ok":"attention"}">${escapeHtml(x.caSituacao||"NÃO CONSULTADO")}</span></td></tr>`).join("");$("stockTable").innerHTML=rows?`<table><thead><tr><th>Produto / variante</th><th>Saldo</th><th>Mínimo</th><th>CA</th><th>Validade CA</th><th>Situação CA</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Nenhum produto encontrado.</div>'}
function renderCollaborators(){const el=$("collaboratorTable");if(!el)return;const rows=state.employees.map(e=>`<tr><td>${escapeHtml(e.matricula)}</td><td>${escapeHtml(e.nome)}</td><td>${escapeHtml(e.cr||"—")}</td><td><span class="status ${e.ativo?"ok":"attention"}">${e.ativo?"ATIVO":"INATIVO"}</span></td><td><button class="btn table-btn" type="button" data-edit-employee="${escapeHtml(e.matricula)}">Editar</button></td></tr>`).join("");el.innerHTML=rows?`<table><thead><tr><th>Matrícula</th><th>Nome</th><th>CR</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows}</tbody></table>`:"<div class=empty>Nenhum funcionário cadastrado.</div>";$("employeeCount").textContent=`${state.employees.length} registros (${state.employees.filter(e=>e.ativo).length} ativos)`}
function renderTstUsers(){const el=$("tstTable");if(!el)return;const rows=state.tstUsers.map(u=>`<tr><td>${escapeHtml(u.matricula)}</td><td>${escapeHtml(u.nome)}</td><td><span class="status ${u.ativo?"ok":"attention"}">${u.ativo?"ATIVO":"INATIVO"}</span></td><td><button class="btn table-btn" type="button" data-edit-tst="${escapeHtml(u.matricula)}">Editar</button></td></tr>`).join("");el.innerHTML=rows?`<table><thead><tr><th>Matrícula</th><th>Nome</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows}</tbody></table>`:"<div class=empty>Nenhum TST cadastrado.</div>"}
function renderHistory(){const q=$("historySearch").value.toLowerCase();const rows=state.moves.filter(x=>(x.label+" "+x.matricula+" "+x.colaborador+" "+x.tipo).toLowerCase().includes(q)).slice(0,300).map(x=>`<tr><td>${date(x.data)}</td><td>${escapeHtml(x.tipo)}</td><td>${escapeHtml(x.label)}</td><td>${money(x.quantidade)}</td><td>${escapeHtml(x.matricula||"—")}</td><td>${escapeHtml(x.colaborador||"—")}</td><td>${escapeHtml(x.usuario||"")}</td></tr>`).join("");$("historyTable").innerHTML=rows?`<table><thead><tr><th>Data</th><th>Movimento</th><th>Produto</th><th>Qtd.</th><th>Matrícula</th><th>Funcionário</th><th>Registrado por</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Nenhuma movimentação.</div>'}
function switchTab(tab){const target=$("tab-"+tab);if(!target||(target.classList.contains("admin-only")&&state.user.perfil!=="ADMIN"))return;document.querySelectorAll(".tab-page").forEach(x=>x.classList.add("hidden"));target.classList.remove("hidden");document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));window.scrollTo({top:0,behavior:"smooth"})}
$("nav").addEventListener("click",e=>{const b=e.target.closest("button[data-tab]");if(b)switchTab(b.dataset.tab)});
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();busy(true);try{const d=await api("login",{matricula:$("loginMatricula").value.trim(),senha:$("loginSenha").value});state.token=d.token;state.user=d.user;showApp();await loadAll()}catch(err){toast(err.message)}finally{busy(false)}});
$("logout").onclick=async()=>{try{await api("logout")}catch(e){}state.token=null;state.user=null;showLogin()};
$("refresh").onclick=()=>loadAll().catch(e=>toast(e.message));
$("entryForm").onsubmit=async e=>{e.preventDefault();try{await api("movement",{tipo:"ENTRADA",sku:$("entryProduct").value,quantidade:Number($("entryQty").value),observacao:$("entryObs").value});e.target.reset();await loadAll();toast("Entrada registrada com sucesso.")}catch(err){toast(err.message)}};
$("employeeMat").addEventListener("input",()=>{const m=$("employeeMat").value.trim();const e=state.employees.find(x=>x.matricula===m&&x.ativo);$("employeePreview").textContent=e?`${e.nome} • ${e.setor||"Setor não informado"} • matrícula ${e.matricula}`:"Matrícula não localizada ou funcionário inativo."});
$("exitForm").onsubmit=async e=>{e.preventDefault();try{await api("movement",{tipo:"SAIDA",sku:$("exitProduct").value,quantidade:Number($("exitQty").value),matricula:$("employeeMat").value.trim(),motivo:$("exitReason").value,observacao:$("exitObs").value});e.target.reset();$("employeePreview").textContent="Informe a matrícula para localizar o funcionário.";await loadAll();toast("Entrega registrada com sucesso.")}catch(err){toast(err.message)}};
$("productForm").onsubmit=async e=>{e.preventDefault();try{await api("product",{sku:$("pSku").value.trim(),descricao:$("pName").value.trim(),variante:$("pVariant").value.trim(),unidade:$("pUnit").value,categoria:$("pCategory").value,fabricante:$("pMaker").value,ca:$("pCa").value,caValidade:$("pCaExpiry").value,caSituacao:$("pCaStatus").value,minimo:Number($("pMin").value),estoqueSeguranca:Number($("pSafety").value),multiplo:Number($("pPack").value),precoUnitario:$("pPrice").value===""?"":Number($("pPrice").value)});e.target.reset();await loadAll();toast("Produto cadastrado.")}catch(err){toast(err.message)}};
$("collaboratorForm").onsubmit=async e=>{e.preventDefault();try{await api("collaborator",{matricula:$("cMatricula").value.trim(),nome:$("cNome").value.trim(),cr:$("cCR").value.trim(),ativo:$("cAtivo").checked});e.target.reset();$("cMatricula").readOnly=false;$("employeeFormTitle").textContent="Cadastrar funcionário";await loadAll();toast("Funcionário salvo.")}catch(err){toast(err.message)}};
$("employeeClear").onclick=()=>{$("collaboratorForm").reset();$("cMatricula").readOnly=false;$("cAtivo").checked=true;$("employeeFormTitle").textContent="Cadastrar funcionário"};
$("collaboratorTable").addEventListener("click",e=>{const b=e.target.closest("[data-edit-employee]");if(!b)return;const x=state.employees.find(v=>v.matricula===b.dataset.editEmployee);if(!x)return;$("cMatricula").value=x.matricula;$("cMatricula").readOnly=true;$("cNome").value=x.nome;$("cCR").value=x.cr||"";$("cAtivo").checked=x.ativo;$("employeeFormTitle").textContent="Atualizar funcionário";$("cNome").focus();window.scrollTo({top:0,behavior:"smooth"})});
$("adjustForm").onsubmit=async e=>{e.preventDefault();try{await api("movement",{tipo:"AJUSTE",sku:$("adjustProduct").value,quantidade:Number($("adjustQty").value),observacao:$("adjustReason").value});e.target.reset();await loadAll();toast("Ajuste auditado registrado.")}catch(err){toast(err.message)}};
$("stockSearch").oninput=renderStock;$("historySearch").oninput=renderHistory;
$("tstForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("tstUser",{matricula:$("tstMatricula").value.trim(),nome:$("tstNome").value.trim(),senha:$("tstSenha").value,ativo:$("tstAtivo").checked});e.target.reset();$("tstAtivo").checked=true;$("tstMatricula").readOnly=false;await loadAll();toast("Usuário TST salvo.")}catch(err){toast(err.message)}});
$("tstTable").addEventListener("click",e=>{const b=e.target.closest("[data-edit-tst]");if(!b)return;const u=state.tstUsers.find(x=>x.matricula===b.dataset.editTst);if(!u)return;$("tstMatricula").value=u.matricula;$("tstMatricula").readOnly=true;$("tstNome").value=u.nome;$("tstSenha").value="";$("tstAtivo").checked=u.ativo;$("tstNome").focus()});
$("tstClear").addEventListener("click",()=>{$("tstForm").reset();$("tstMatricula").readOnly=false;$("tstAtivo").checked=true});
$("passwordForm").addEventListener("submit",async e=>{e.preventDefault();const nova=$("newPassword").value;if(nova!==$("confirmPassword").value)return toast("A confirmação da nova senha não confere.");try{await api("changePassword",{senhaAtual:$("currentPassword").value,novaSenha:nova});e.target.reset();toast("Senha alterada com sucesso.")}catch(err){toast(err.message)}});
let swRegistration=null;
async function checkAppUpdate(){if(!("serviceWorker" in navigator))return toast("Atualização automática não suportada neste navegador.");try{swRegistration=swRegistration||await navigator.serviceWorker.getRegistration()||await navigator.serviceWorker.register("./sw.js");await swRegistration.update();const activate=()=>{if(swRegistration&&swRegistration.waiting){swRegistration.waiting.postMessage({type:"SKIP_WAITING"});return true}return false};if(activate())return;const installing=swRegistration.installing;if(installing){installing.addEventListener("statechange",()=>{if(installing.state==="installed"){if(!activate())toast("Nova versão preparada. Recarregue o aplicativo para concluir.")}});return toast("Nova versão encontrada. Baixando atualização...")}toast("Aplicativo verificado. Você já está na versão mais recente.")}catch(err){toast("Não foi possível verificar atualização: "+err.message)}}
$("updateApp").addEventListener("click",checkAppUpdate);
if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js").then(reg=>{swRegistration=reg;reg.update().catch(()=>{});if(reg.waiting)$("updateApp").classList.add("attention")}).catch(()=>{});navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!window.__appReloading){window.__appReloading=true;window.location.reload()}})}
})();
