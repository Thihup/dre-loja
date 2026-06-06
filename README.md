# dre-loja

Aplicação web simples para montar o DRE mensal de uma empresa com:

- campos opcionais e exemplos para quem está começando;
- tooltips orientativos nos principais botões e entradas;
- cálculo com estrutura técnica de DRE por competência;
- upload de extrato bancário em CSV para consulta rápida;
- validação assistida por IA (opcional) e validação local de consistência.

## Como usar

1. Abra o arquivo `index.html` no navegador.
2. Preencha os valores do mês de referência (campos podem ficar em branco).
3. (Opcional) Faça upload de um extrato em CSV para apoio na conferência.
4. Clique em **Calcular DRE** para ver os resultados.
5. Use **Validar com IA** para validar os números:
   - com endpoint/API key, envia o resumo para a IA;
   - sem configuração, executa validação local com regras básicas.

## Estrutura técnica aplicada

O cálculo usa uma estrutura padrão de DRE:

- Receita Bruta
- (-) Deduções da Receita (impostos sobre vendas)
- = Receita Líquida
- (-) Custos (CMV/CPV/CSP)
- = Lucro Bruto
- (-) Despesas Operacionais
- = Lucro Operacional (EBIT)
- (-/+) Resultado Financeiro
- = Lucro Antes de IR/CSLL
- (-) IRPJ/CSLL (quando informado)
- = Lucro Líquido

Também há apoio para competência de impostos em **X+1** (ex.: imposto pago no mês seguinte).