(() => {
"use strict";
const $ = id => document.getElementById(id);
const state = {token:null,user:null,products:[],stock:[],employees:[],moves:[],tstUsers:[],dashboard:null};
const APP_VERSION="1.1.8";
let pendingImport=null;
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
function brl(n){return Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function date(v){return v?new Date(v).toLocaleDateString("pt-BR"):"—"}
async function loadAll(){
  busy(true);
  try {const d=await api("bootstrap");state.products=d.products||[];state.stock=d.stock||[];state.employees=d.employees||[];state.moves=d.moves||[];state.tstUsers=d.tstUsers||[];state.dashboard=d.dashboard||{};renderAll();renderTstUsers();}
  finally {busy(false)}
}
function renderAll(){renderSelects();renderDashboard();renderStock();renderGroupAnalysis();renderHistory();renderCollaborators();$("lastUpdate").textContent="Atualizado em "+new Date().toLocaleString("pt-BR")}
function productLabel(p){return `${p.categoria||"Sem grupo"} • ${p.descricao}${p.variante?" / "+p.variante:""}`}
function renderSelects(){
  ["entryProduct","exitProduct","adjustProduct"].forEach(id=>{const s=$(id);if(!s)return;s.innerHTML='<option value="">Selecione...</option>';state.products.filter(p=>p.ativo).forEach(p=>{const o=document.createElement("option");o.value=p.sku;o.textContent=productLabel(p);s.appendChild(o)})});
  $("employeeOptions").innerHTML=state.employees.filter(e=>e.ativo).map(e=>`<option value="${escapeHtml(e.matricula)}">${escapeHtml(e.nome)}</option>`).join("");
  const itemFilter=$("dashboardItemFilter"),currentItem=itemFilter.value;
  itemFilter.innerHTML='<option value="">Todos os itens</option>'+state.stock.map(x=>`<option value="${escapeHtml(x.sku)}">${escapeHtml(x.label)}</option>`).join("");
  itemFilter.value=currentItem;
  const groupFilter=$("groupFilter"),currentGroup=groupFilter.value;
  const groups=[...new Set(state.stock.map(x=>x.categoria||"Sem grupo"))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  groupFilter.innerHTML='<option value="">Todos os grupos</option>'+groups.map(g=>`<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");groupFilter.value=currentGroup;
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function kpi(label,value,detail,icon){return `<div class="kpi"><div class="kpi-top"><span class="kpi-icon">${icon}</span><span class="kpi-label">${label}</span></div><strong>${money(value)}</strong><small>${detail||""}</small></div>`}
function barChart(elId,items,currency=false){const el=$(elId);if(!items.length){el.innerHTML='<div class="empty">Sem dados suficientes para o gráfico.</div>';return;}const max=Math.max(1,...items.map(x=>Number(x.value)||0));el.innerHTML=items.map(x=>`<div class="bar-row"><div class="bar-label"><span>${escapeHtml(x.label)}</span><b>${currency?brl(x.value):money(x.value)}</b></div><div class="bar-track"><div class="bar-fill ${x.className||""}" style="width:${Math.max(x.value>0?2:0,(Number(x.value)||0)/max*100)}%"></div></div></div>`).join("")}
function renderDashboard(){
  const base=state.dashboard||{},selected=$("dashboardItemFilter")?.value||"";
  let d={...base};
  if(selected){
    const item=(base.itemMetrics||[]).find(x=>String(x.sku)===String(selected));
    const product=state.stock.find(x=>String(x.sku)===String(selected));
    if(item&&product){
      const caCounts={validos:0,vencidos:0,suspensos:0,cancelados:0,naoConsultados:0,semCA:0};
      const caMap={"VALIDO":"validos","VENCIDO":"vencidos","SUSPENSO":"suspensos","CANCELADO":"cancelados","NAO CONSULTADO":"naoConsultados","SEM CA":"semCA"};
      caCounts[caMap[product.caSituacao]||"naoConsultados"]=1;
      d={...base,skus:1,units:item.saldo,below:item.saldo<item.minimo?1:0,zero:item.saldo<=0?1:0,entries30:item.entries30,exits30:item.exits30,caCounts,priorities:[item.priority],consumption:item.exits90?[{label:item.label,qty:item.exits90}]:[]};
    }
  }
  const c=d.caCounts||{};
  const cards=[kpi("EPIs ativos",d.skus||0,selected?"Item selecionado":"Produtos cadastrados","▦"),kpi("Saldo total",d.units||0,"Unidades disponíveis","◫"),kpi("Abaixo do mínimo",d.below||0,"Itens que exigem atenção","!"),kpi("Estoque zerado",d.zero||0,"Itens sem saldo","×"),kpi("Funcionários ativos",base.activeEmployees||0,"Indicador geral da base","♙")];
  $("kpis").innerHTML=cards.join("");
  barChart("movementChart",[{label:"Entradas",value:d.entries30||0,className:"entry-fill"},{label:"Saídas",value:d.exits30||0,className:"exit-fill"}]);
  barChart("stockChart",[{label:"Dentro do mínimo",value:Math.max(0,(d.skus||0)-(d.below||0)),className:"entry-fill"},{label:"Abaixo do mínimo",value:Math.max(0,(d.below||0)-(d.zero||0)),className:"warn-fill"},{label:"Zerados",value:d.zero||0,className:"exit-fill"}]);
  barChart("caChart",[{label:"Válidos",value:c.validos||0,className:"entry-fill"},{label:"Vencidos",value:c.vencidos||0,className:"exit-fill"},{label:"Suspensos / cancelados",value:(c.suspensos||0)+(c.cancelados||0),className:"exit-fill"},{label:"Não consultados",value:c.naoConsultados||0,className:"warn-fill"},{label:"Sem CA",value:c.semCA||0,className:"neutral-fill"}]);
  barChart("consumptionChart",(d.consumption||[]).slice(0,6).map(x=>({label:x.label,value:x.qty,className:"blue-fill"})));
  const monthly=(selected?(base.costByItem||[]).filter(x=>String(x.idEpi)===String(selected)):(base.costMonthly||[])).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);
  barChart("costChart",monthly.flatMap(x=>[{label:x.month+" • Entradas",value:x.entry,className:"entry-fill"},{label:x.month+" • Saídas",value:x.exit,className:"exit-fill"}]),true);
  const rows=(d.priorities||[]).filter(x=>x.saldo<x.minimo||x.saldo<=0).map(x=>`<tr><td>${escapeHtml(x.label)}</td><td>${money(x.saldo)}</td><td>${money(x.minimo)}</td><td>${x.cobertura==null?"Sem histórico":x.cobertura+" dias"}</td><td>${money(x.sugerido)}</td><td><span class="status ${x.saldo<=0?"critical":"attention"}">${x.saldo<=0?"ZERADO":"ABAIXO DO MÍNIMO"}</span></td></tr>`).join("");
  $("alerts").innerHTML=rows?`<table><thead><tr><th>Produto</th><th>Saldo</th><th>Mínimo</th><th>Cobertura</th><th>Compra sugerida</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Nenhum item abaixo do mínimo no momento.</div>';
}
function renderGroupAnalysis(){
  const selected=$("groupFilter")?.value||"",query=($("groupSearch")?.value||"").toLowerCase();
  const filtered=state.stock.filter(x=>(!selected||(x.categoria||"Sem grupo")===selected)&&(`${x.label} ${x.sku} ${x.categoria}`).toLowerCase().includes(query));
  const groups={};filtered.forEach(x=>{const g=x.categoria||"Sem grupo";(groups[g]||(groups[g]=[])).push(x)});
  const names=Object.keys(groups).sort((a,b)=>a.localeCompare(b,"pt-BR"));
  if(!names.length){$("groupAnalysis").innerHTML='<div class="panel empty">Nenhum material encontrado para os filtros selecionados.</div>';return;}
  $("groupAnalysis").innerHTML=names.map(g=>{const items=groups[g].sort((a,b)=>a.label.localeCompare(b.label,"pt-BR"));const total=items.reduce((n,x)=>n+Number(x.saldo||0),0);const zero=items.filter(x=>x.saldo<=0).length;const below=items.filter(x=>x.saldo<x.minimo).length;const rows=items.map(x=>`<tr><td><strong>${escapeHtml(x.descricao||x.label)}</strong><small class="subline">${escapeHtml(x.variante||x.sku)}</small></td><td>${money(x.saldo)} ${escapeHtml(x.unidade)}</td><td>${money(x.minimo)}</td><td><span class="status ${x.saldo<=0?"critical":x.saldo<x.minimo?"attention":"ok"}">${x.saldo<=0?"ZERADO":x.saldo<x.minimo?"ABAIXO DO MÍNIMO":"DISPONÍVEL"}</span></td></tr>`).join("");return `<section class="panel group-card"><div class="group-heading"><div><span class="eyebrow">GRUPO DE MATERIAIS</span><h2>${escapeHtml(g)}</h2></div><div class="group-stats"><span><strong>${money(items.length)}</strong> modelos</span><span><strong>${money(total)}</strong> unidades</span><span><strong>${money(zero)}</strong> zerados</span><span><strong>${money(below)}</strong> abaixo do mínimo</span></div></div><div class="table-wrap"><table><thead><tr><th>Subgrupo / material</th><th>Saldo atual</th><th>Estoque mínimo</th><th>Situação</th></tr></thead><tbody>${rows}</tbody></table></div></section>`}).join("");
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
$("productForm").onsubmit=async e=>{e.preventDefault();try{await api("product",{epi:$("pName").value.trim(),subgrupo:$("pVariant").value.trim(),unidade:$("pUnit").value,grupo:$("pCategory").value,ca:$("pCa").value,caValidade:$("pCaExpiry").value,caSituacao:$("pCaStatus").value,minimo:Number($("pMin").value),estoqueSeguranca:Number($("pSafety").value),precoUnitario:$("pPrice").value===""?"":Number($("pPrice").value)});e.target.reset();await loadAll();toast("Produto cadastrado.")}catch(err){toast(err.message)}};
$("collaboratorForm").onsubmit=async e=>{e.preventDefault();try{await api("collaborator",{matricula:$("cMatricula").value.trim(),nome:$("cNome").value.trim(),cr:$("cCR").value.trim(),ativo:$("cAtivo").checked});e.target.reset();$("cMatricula").readOnly=false;$("employeeFormTitle").textContent="Cadastrar funcionário";await loadAll();toast("Funcionário salvo.")}catch(err){toast(err.message)}};
$("employeeClear").onclick=()=>{$("collaboratorForm").reset();$("cMatricula").readOnly=false;$("cAtivo").checked=true;$("employeeFormTitle").textContent="Cadastrar funcionário"};
$("collaboratorTable").addEventListener("click",e=>{const b=e.target.closest("[data-edit-employee]");if(!b)return;const x=state.employees.find(v=>v.matricula===b.dataset.editEmployee);if(!x)return;$("cMatricula").value=x.matricula;$("cMatricula").readOnly=true;$("cNome").value=x.nome;$("cCR").value=x.cr||"";$("cAtivo").checked=x.ativo;$("employeeFormTitle").textContent="Atualizar funcionário";$("cNome").focus();window.scrollTo({top:0,behavior:"smooth"})});
$("adjustForm").onsubmit=async e=>{e.preventDefault();try{await api("movement",{tipo:"AJUSTE",sku:$("adjustProduct").value,quantidade:Number($("adjustQty").value),observacao:$("adjustReason").value});e.target.reset();await loadAll();toast("Ajuste auditado registrado.")}catch(err){toast(err.message)}};
$("stockSearch").oninput=renderStock;$("historySearch").oninput=renderHistory;
$("dashboardItemFilter").addEventListener("change",renderDashboard);
$("groupFilter").addEventListener("change",renderGroupAnalysis);$("groupSearch").addEventListener("input",renderGroupAnalysis);
$("tstForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("tstUser",{matricula:$("tstMatricula").value.trim(),nome:$("tstNome").value.trim(),senha:$("tstSenha").value,ativo:$("tstAtivo").checked});e.target.reset();$("tstAtivo").checked=true;$("tstMatricula").readOnly=false;await loadAll();toast("Usuário TST salvo.")}catch(err){toast(err.message)}});
$("tstTable").addEventListener("click",e=>{const b=e.target.closest("[data-edit-tst]");if(!b)return;const u=state.tstUsers.find(x=>x.matricula===b.dataset.editTst);if(!u)return;$("tstMatricula").value=u.matricula;$("tstMatricula").readOnly=true;$("tstNome").value=u.nome;$("tstSenha").value="";$("tstAtivo").checked=u.ativo;$("tstNome").focus()});
$("tstClear").addEventListener("click",()=>{$("tstForm").reset();$("tstMatricula").readOnly=false;$("tstAtivo").checked=true});
$("passwordForm").addEventListener("submit",async e=>{e.preventDefault();const nova=$("newPassword").value;if(nova!==$("confirmPassword").value)return toast("A confirmação da nova senha não confere.");try{await api("changePassword",{senhaAtual:$("currentPassword").value,novaSenha:nova});e.target.reset();toast("Senha alterada com sucesso.")}catch(err){toast(err.message)}});

const importSchemas={
  PRODUTOS:{headers:["EPI","GRUPO","SUBGRUPO","UNIDADE","CA","CA_VALIDADE","CA_SITUACAO","MINIMO","ESTOQUE_SEGURANCA_QTD","PRECO_UNITARIO"],sample:["Bota PVC","Bota","PVC 41","PAR","12345","2027-12-31","NAO CONSULTADO","10","2","85.50"]},
  COLABORADORES:{headers:["MATRICULA","NOME","CR","SETOR","CENTRO_CUSTO","ATIVO"],sample:["123456","Maria da Silva","CR-001","Manutenção","CC-100","TRUE"]},
  ESTOQUE:{headers:["EPI","GRUPO","SUBGRUPO","SALDO_INICIAL","LOCAL"],sample:["Bota PVC","Bota","PVC 41","10","Almoxarifado"]}
};
function csvEscape(v){const x=String(v??"");return /[;"\n\r]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x}
function downloadImportTemplate(){const schema=importSchemas[$("importType").value],csv="\uFEFF"+schema.headers.join(";")+"\r\n"+schema.sample.map(csvEscape).join(";")+"\r\n",blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="modelo_"+$("importType").value.toLowerCase()+".csv";a.click();URL.revokeObjectURL(url)}
function parseCSV(text){text=text.replace(/^\uFEFF/,"");const first=text.split(/\r?\n/,1)[0]||"",delimiter=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?";":",";const rows=[];let row=[],cell="",quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===delimiter&&!quoted){row.push(cell);cell=""}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);row=[];cell=""}else cell+=c}row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);if(rows.length<2)throw new Error("O arquivo precisa conter cabeçalho e pelo menos uma linha.");const headers=rows.shift().map(x=>x.trim().toUpperCase());return rows.map(values=>{const obj={};headers.forEach((h,i)=>obj[h]=(values[i]||"").trim());return obj})}
function updateImportHelp(){pendingImport=null;$("importFile").value="";$("confirmImport").disabled=true;$("importPreview").innerHTML='<div class="empty">Selecione um arquivo para visualizar os registros antes da importação.</div>';const type=$("importType").value;const notes={PRODUTOS:"Colunas obrigatórias: EPI e GRUPO. ID_EPI é gerado pelo sistema.",COLABORADORES:"Colunas obrigatórias: MATRICULA e NOME. Funcionários já cadastrados serão ignorados.",ESTOQUE:"Colunas obrigatórias: EPI, GRUPO e SALDO_INICIAL. Importe os produtos antes do saldo."};$("importHelp").textContent=notes[type]+" Baixe o modelo e salve como CSV UTF-8."}
$("importType").addEventListener("change",updateImportHelp);$("downloadTemplate").addEventListener("click",downloadImportTemplate);
$("importFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const text=await file.text(),rows=parseCSV(text),type=$("importType").value,required=type==="PRODUTOS"?["EPI","GRUPO"]:type==="COLABORADORES"?["MATRICULA","NOME"]:["EPI","GRUPO","SALDO_INICIAL"],missing=required.filter(h=>!Object.prototype.hasOwnProperty.call(rows[0],h));if(missing.length)throw new Error("Cabeçalhos ausentes: "+missing.join(", "));if(rows.length>1000)throw new Error("Limite de 1.000 linhas por arquivo.");pendingImport={type,rows};$("importPreview").innerHTML=`<div class="status ok">${rows.length} registros lidos. Prévia das primeiras 8 linhas:</div><div class="table-wrap"><table><thead><tr>${Object.keys(rows[0]).map(h=>`<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.slice(0,8).map(r=>`<tr>${Object.keys(rows[0]).map(h=>`<td>${escapeHtml(r[h])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;$("confirmImport").disabled=false}catch(err){pendingImport=null;$("confirmImport").disabled=true;$("importPreview").innerHTML=`<div class="status critical">${escapeHtml(err.message)}</div>`}});
$("confirmImport").addEventListener("click",async()=>{if(!pendingImport)return;const payload=pendingImport;if(!confirm(`Confirma a importação de ${payload.rows.length} registros? Duplicidades serão ignoradas.`))return;try{busy(true);const result=await api("importData",{tipo:payload.type,rows:payload.rows});const errors=result.erros||[];$("importPreview").innerHTML=`<div class="status ok">Importados: ${result.importados} • Ignorados: ${result.ignorados} • Erros: ${errors.length}</div>${errors.length?`<ul>${errors.slice(0,30).map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`:""}`;pendingImport=null;$("confirmImport").disabled=true;await loadAll();toast("Importação processada.")}catch(err){toast(err.message)}finally{busy(false)}});

let swRegistration=null;
async function checkAppUpdate(){if(!("serviceWorker" in navigator))return toast("Atualização automática não suportada neste navegador.");try{swRegistration=swRegistration||await navigator.serviceWorker.getRegistration()||await navigator.serviceWorker.register("./sw.js");await swRegistration.update();const activate=()=>{if(swRegistration&&swRegistration.waiting){swRegistration.waiting.postMessage({type:"SKIP_WAITING"});return true}return false};if(activate())return;const installing=swRegistration.installing;if(installing){installing.addEventListener("statechange",()=>{if(installing.state==="installed"){if(!activate())toast("Nova versão preparada. Recarregue o aplicativo para concluir.")}});return toast("Nova versão encontrada. Baixando atualização...")}toast("Aplicativo verificado. Você já está na versão mais recente.")}catch(err){toast("Não foi possível verificar atualização: "+err.message)}}
$("updateApp").addEventListener("click",checkAppUpdate);
if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js").then(reg=>{swRegistration=reg;reg.update().catch(()=>{});if(reg.waiting)$("updateApp").classList.add("attention")}).catch(()=>{});navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!window.__appReloading){window.__appReloading=true;window.location.reload()}})}
})();
