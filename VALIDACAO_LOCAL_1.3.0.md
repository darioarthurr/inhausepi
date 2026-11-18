# Registro de validação local — Gestão de EPIs 1.3.0

## Aprovado localmente
- `app.js`: sintaxe validada com `node --check`.
- `Code.gs`: sintaxe JavaScript validada com `node --check` via stdin.
- `Code.gs` e `backend/Code.gs`: conteúdo idêntico.
- `index.html`: IDs únicos e referências estáticas `$()` encontradas no JavaScript presentes no HTML.
- PWA: versão do rodapé e cache do Service Worker atualizados para 1.3.0.
- Regra de alocação: teste local isolado confirmou consumo em ordem de prioridade (8 + 12 + 5 para retirada de 25) e bloqueio de retirada de 41 quando o saldo total é 40.

## Não executado neste ambiente
- Execução contra Google Sheets real.
- Publicação/implantação do Apps Script.
- Teste real de migração da planilha existente.
- Fluxos completos de login ADMIN/TST e autoatendimento em navegador.
- Teste de importação CSV por meio da interface conectada ao Apps Script.

A versão deve ser homologada em cópia da planilha antes de substituir a implantação de produção. Para base existente, executar `setupSistema()` uma vez após atualizar o backend. Não executar `recriarBaseLimpa()` em base com dados.
