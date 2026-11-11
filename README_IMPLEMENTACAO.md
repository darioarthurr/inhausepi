# Gestão de EPIs — Grupo GPS

**Pacote final 1.1.2 — 11/11/2026**

Esta edição remove a integração automática com a base CAEPI do MTE. O número do CA, a situação e a data de validade são registrados manualmente após consulta ao portal oficial. O cadastro não depende de download, importação ou validação externa. O cache do PWA foi versionado para forçar a atualização da interface.

Projeto inicial funcional para GitHub Pages + Google Apps Script + Google Sheets. A matrícula é a identificação principal do colaborador nas entregas.

## 1. Estrutura entregue

- `index.html`, `styles.css`, `app.js`: interface responsiva.
- `config.js`: URL do Web App do Apps Script.
- `sw.js`, `manifest.webmanifest`: instalação PWA; o cache é apenas da interface. Movimentações exigem internet.
- `backend/Code.gs`: API, autenticação, regras de acesso, movimentações e indicadores.

## 2. Criar a planilha

1. Crie uma planilha Google chamada `Gestão de EPIs - Grupo GPS`.
2. Abra **Extensões > Apps Script**.
3. Cole todo o conteúdo de `backend/Code.gs` no arquivo `Code.gs`.
4. Em **Configurações do projeto > Propriedades do script**, crie:
   - `ADMIN_MATRICULA` = matrícula do administrador inicial.
   - `ADMIN_SENHA` = senha temporária forte para o primeiro acesso.
5. Salve. Execute `setupSistema()` no editor e autorize as permissões.
6. A função cria as abas e cabeçalhos. Não execute novamente para “zerar” dados: ela preserva as linhas existentes.

Abas criadas: `PRODUTOS`, `ESTOQUE`, `MOVIMENTACOES`, `USUARIOS`, `COLABORADORES`, `AUDITORIA`, `INDICADORES`, `FINANCEIRO`, `CONFIGURACOES`. Se existir uma aba antiga `BASE_CAEPI`, ela não será usada nem apagada.

## 3. Carga inicial manual

### COLABORADORES
Preencha a partir da linha 2:
`MATRICULA | NOME | SETOR | CENTRO_CUSTO | ATIVO`

A matrícula deve ser única e armazenada como texto para preservar zeros à esquerda. Use `TRUE` para ativos e `FALSE` para inativos.

### PRODUTOS
Cadastre os produtos com SKU único por variante/tamanho. Exemplo:
- `LUVA-NITR-M` / Luva nitrílica / M
- `LUVA-NITR-G` / Luva nitrílica / G

Preencha o número do CA, mínimo, prazo de reposição, dias de segurança e múltiplo de compra. Ao cadastrar, informe o CA, a data de validade e a situação após consulta manual no portal oficial. O sistema não consulta o MTE, não valida o número do CA e não preenche dados automaticamente.

### ESTOQUE
Preencha:
`SKU | SALDO_INICIAL | LOCAL`

Uma linha por SKU. Esse é o saldo de abertura. Depois da implantação, não altere o saldo diretamente: registre entradas, saídas ou ajustes auditados na aplicação.

## 4. Cadastrar usuários

Na aba `USUARIOS`, colunas:
`MATRICULA | NOME | SENHA_SHA256 | PERFIL | ATIVO`

Para gerar hash de senha:
1. No Apps Script, execute `gerarHashSenha("SENHA_FORTE")`.
2. Abra **Executar > Registros** e copie o hash hexadecimal.
3. Cadastre matrícula, nome, hash, perfil (`ADMIN` ou `TST`) e `TRUE`.

O primeiro ADMIN é criado por `setupSistema()` usando as propriedades `ADMIN_MATRICULA` e `ADMIN_SENHA`. Para trocar a senha, gere novo hash e substitua `SENHA_SHA256` na linha do usuário. Não compartilhe a planilha com usuários TST como editores; eles acessam os dados pela aplicação.

## 5. Publicar o Apps Script

1. No Apps Script, clique em **Implantar > Nova implantação**.
2. Tipo: **Aplicativo da Web**.
3. Executar como: **Eu**.
4. Quem pode acessar: selecione a opção compatível com a política da sua organização. Para login próprio por matrícula/senha, normalmente será necessário acesso a usuários autenticados por link; confirme com TI/GPS antes de publicar.
5. Clique em Implantar e copie a URL terminada em `/exec`.

A API usa POST `application/x-www-form-urlencoded`. Teste a URL abrindo-a no navegador: deve retornar `API Gestão de EPIs ativa`.

## 6. Publicar o frontend no GitHub Pages

1. Crie um repositório GitHub, por exemplo `gestao-epi-gps`.
2. Envie os arquivos da raiz deste pacote (`index.html`, `styles.css`, `app.js`, `config.js`, `sw.js`, `manifest.webmanifest`) para a raiz do repositório.
3. Abra `config.js` e substitua `COLE_A_URL_DO_GOOGLE_APPS_SCRIPT_AQUI` pela URL `/exec` copiada.
4. Em **Settings > Pages**, selecione `Deploy from a branch`, branch `main`, pasta `/ (root)`.
5. Aguarde a publicação e abra o endereço do Pages. No celular, use “Adicionar à tela inicial” ou “Instalar app”.

## 7. Consulta manual do CA

- Não existe integração automática, download de CSV, importação, sincronização ou validação de CA junto ao MTE nesta versão.
- Para conferir um CA, utilize o [portal oficial CAEPI do MTE](https://caepi.trabalho.gov.br/internet/ConsultaCAInternet.aspx).
- Após a consulta, registre no cadastro do produto o número do CA, a situação e a data de validade exibida no portal.
- Ao migrar da versão 1.1, confira manualmente os campos `CA_VALIDADE` e `CA_SITUACAO` já existentes: eles podem conter dados trazidos da antiga importação e não são atualizados nem confirmados nesta versão.
- O painel classifica como vencido o CA cuja data de validade informada já passou. As situações válido, suspenso e cancelado dependem do preenchimento manual e não representam confirmação automática do MTE.
- A validade do CA não é a validade física do EPI. Verifique também lote, armazenamento e prazo de validade indicado pelo fabricante/importador.

## 8. Regras operacionais

- Saída exige matrícula existente e colaborador ativo; o backend consulta `COLABORADORES` e grava matrícula, nome e setor na movimentação.
- O TST pode registrar entradas/saídas e consultar estoque/histórico. O ADMIN também cadastra produtos e faz ajustes.
- O backend valida permissões; ocultar botões na tela não é a única barreira.
- Não há fila offline de lançamentos. Sem internet, não registre movimentações.
- Ajustes exigem justificativa e são registrados em `AUDITORIA`.
- O saldo é calculado: saldo inicial + entradas - saídas + ajustes.
- A compra sugerida é `máx(0, consumo médio diário × (prazo de reposição + dias de segurança) − saldo atual)`, arredondada ao múltiplo de compra. Consumo médio usa os últimos 90 dias; sem histórico, cobertura fica indisponível e a previsão pode ser insuficiente.
- A validade e situação do CA são exibidas na posição de estoque com base nos dados informados manualmente. O sistema não consulta nem valida o CA no MTE. O CA deve estar válido na comercialização/aquisição; após adquirido, o fornecimento deve observar armazenamento e prazo de validade do EPI indicados pelo fabricante/importador. A validade do CA não é a validade física do EPI. A rotina não bloqueia entrega por situação do CA.

## 9. Testes obrigatórios antes do uso real

1. Login ADMIN e TST.
2. TST não consegue cadastrar produto nem ajustar estoque (o backend deve negar).
3. Saída com matrícula válida grava colaborador correto.
4. Saída com matrícula inexistente/inativa é recusada.
5. Saída maior que saldo é recusada.
6. Entrada, saída e ajuste alteram saldo conforme esperado.
7. Múltiplos SKUs para tamanhos diferentes mantêm saldos separados.
8. Verifique se política de acesso do Apps Script e da organização atende à LGPD e às regras internas.

## 10. Limitações desta entrega

- Sem importação de colaboradores/estoque por arquivo: carga inicial é manual na planilha, conforme combinado.
- A administração de usuários e colaboradores é feita diretamente nas abas da planilha nesta versão.
- Correção de movimentação por estorno/reversão e alertas automáticos por CA vencido são evoluções recomendadas antes de operação ampla.
- O código precisa ser implantado e validado no ambiente Google/GitHub da organização; não foi publicado em sua conta nem testado com sua planilha.


## Arquivo backend desta versão

O backend está em `backend/Code.gs`. Há também uma cópia na raiz (`Code.gs`); ambos têm o mesmo conteúdo. Use apenas um deles ao atualizar o Apps Script.
