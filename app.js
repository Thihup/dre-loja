const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const numberFromInput = (id) => {
  const raw = document.getElementById(id)?.value?.trim();
  if (!raw) return 0;
  const normalized = raw.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseAmount = (rawValue) => {
  const raw = String(rawValue || "").trim();
  if (!raw) return 0;

  const hasDot = raw.includes(".");
  const hasComma = raw.includes(",");

  let normalized = raw;
  if (hasDot && hasComma) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = raw.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const idsDespesasOperacionais = [
  "despesaLuz",
  "despesaAgua",
  "despesaTelefone",
  "despesaMarketing",
  "despesaEmprestimos",
  "despesaSalarios",
  "despesaContabilidade",
  "despesaINSS",
  "despesaImposto",
  "despesaFGTS",
];

const computeDre = () => {
  const receitaBruta = numberFromInput("receitaBruta");
  const deducoesReceita = numberFromInput("deducoesReceita");
  const custos = numberFromInput("custos");
  const receitasFinanceiras = numberFromInput("receitasFinanceiras");
  const despesasFinanceiras = numberFromInput("despesasFinanceiras");
  const ircsll = numberFromInput("ircsll");
  const impostoCompetenciaX1 = document.getElementById("impostoCompetenciaX1").checked;

  const despesasBase = idsDespesasOperacionais.reduce((acc, id) => acc + numberFromInput(id), 0);
  const despesaImpostoOperacional = numberFromInput("despesaImposto");
  const despesas = impostoCompetenciaX1
    ? despesasBase - despesaImpostoOperacional
    : despesasBase;
  const deducoesAjustadas = deducoesReceita;

  const receitaLiquida = receitaBruta - deducoesAjustadas;
  const lucroBruto = receitaLiquida - custos;
  const lucroOperacional = lucroBruto - despesas;
  const resultadoFinanceiro = receitasFinanceiras - despesasFinanceiras;
  const lucroAntesIrCsll = lucroOperacional + resultadoFinanceiro;
  const lucroLiquido = lucroAntesIrCsll - ircsll;

  return {
    receitaBruta,
    deducoesAjustadas,
    receitaLiquida,
    custos,
    lucroBruto,
    despesas,
    lucroOperacional,
    resultadoFinanceiro,
    lucroAntesIrCsll,
    ircsll,
    lucroLiquido,
    impostoCompetenciaX1,
    despesaImpostoOperacionalPostergada: impostoCompetenciaX1
      ? despesaImpostoOperacional
      : 0,
  };
};

const renderDre = (dre) => {
  const target = document.getElementById("resultadoDre");
  const linhas = [
    `Receita Bruta: ${formatCurrency(dre.receitaBruta)}`,
    `(-) Deduções da Receita: ${formatCurrency(dre.deducoesAjustadas)}`,
    `(=) Receita Líquida: ${formatCurrency(dre.receitaLiquida)}`,
    `(-) Custos: ${formatCurrency(dre.custos)}`,
    `(=) Lucro Bruto: ${formatCurrency(dre.lucroBruto)}`,
    `(-) Despesas Operacionais: ${formatCurrency(dre.despesas)}`,
    `(=) Lucro Operacional (EBIT): ${formatCurrency(dre.lucroOperacional)}`,
    `(+/-) Resultado Financeiro: ${formatCurrency(dre.resultadoFinanceiro)}`,
    `(=) Lucro Antes de IR/CSLL: ${formatCurrency(dre.lucroAntesIrCsll)}`,
    `(-) IRPJ/CSLL: ${formatCurrency(dre.ircsll)}`,
    `(=) Lucro Líquido: ${formatCurrency(dre.lucroLiquido)}`,
  ];
  if (dre.impostoCompetenciaX1 && dre.despesaImpostoOperacionalPostergada > 0) {
    linhas.push(
      `Obs.: imposto operacional postergado para X+1: ${formatCurrency(
        dre.despesaImpostoOperacionalPostergada
      )}`
    );
  }
  target.textContent = linhas.join("\n");
};

const inferCategoria = (descricao) => {
  const text = normalizeText(descricao);
  if (text.includes("luz") || text.includes("energia")) return "Luz";
  if (text.includes("agua")) return "Água";
  if (text.includes("telefone") || text.includes("internet")) return "Telefone";
  if (text.includes("marketing") || text.includes("anuncio")) return "Marketing";
  if (text.includes("emprestimo") || text.includes("juros")) return "Empréstimos antigos";
  if (text.includes("salario") || text.includes("folha")) return "Salários";
  if (text.includes("contabilidade") || text.includes("contador")) return "Contabilidade";
  if (text.includes("inss")) return "INSS";
  if (text.includes("fgts")) return "FGTS";
  if (text.includes("imposto") || text.includes("tributo")) return "Imposto";
  return "Não classificado";
};

const parseCsv = (text) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map((h) => normalizeText(h.trim()));
  const findIndex = (candidates) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(normalizeText(c))));
  const idxData = findIndex(["data", "date"]);
  const idxDescricao = findIndex(["descricao", "historico", "memo"]);
  const idxValor = findIndex(["valor", "amount"]);

  return lines.slice(1).map((line) => {
    const cols = line.split(delimiter).map((c) => c.trim());
    const valor = parseAmount(cols[idxValor]);
    const descricao = cols[idxDescricao] || "";
    return {
      data: cols[idxData] || "",
      descricao,
      valor: Number.isFinite(valor) ? valor : 0,
      categoria: inferCategoria(descricao),
    };
  });
};

const renderExtrato = (rows) => {
  const resumo = document.getElementById("resumoExtrato");
  const tbody = document.querySelector("#tabelaExtrato tbody");
  tbody.innerHTML = "";
  if (!rows.length) {
    resumo.textContent = "Extrato vazio ou inválido.";
    return;
  }

  const total = rows.reduce((acc, r) => acc + r.valor, 0);
  resumo.textContent = `${rows.length} lançamentos carregados | Soma: ${formatCurrency(total)}`;

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const dataTd = document.createElement("td");
    dataTd.textContent = row.data;
    const descricaoTd = document.createElement("td");
    descricaoTd.textContent = row.descricao;
    const valorTd = document.createElement("td");
    valorTd.textContent = formatCurrency(row.valor);
    const categoriaTd = document.createElement("td");
    categoriaTd.textContent = row.categoria;
    tr.append(dataTd, descricaoTd, valorTd, categoriaTd);
    tbody.appendChild(tr);
  });
};

const localValidate = (dre) => {
  const mensagens = [];
  if (dre.receitaBruta <= 0) mensagens.push("Receita bruta não informada ou igual a zero.");
  if (dre.deducoesAjustadas < 0)
    mensagens.push(
      "Deduções da receita negativas. Se marcou 'Imposto reconhecido em X+1', confira se o imposto foi lançado no mês correto."
    );
  if (dre.receitaLiquida < 0) mensagens.push("Receita líquida negativa, revisar entradas.");
  if (dre.lucroLiquido < 0) mensagens.push("Lucro líquido negativo no mês (prejuízo).");
  if (!mensagens.length) mensagens.push("Validação local: estrutura coerente com entradas informadas.");
  return mensagens.join("\n");
};

const validateWithAI = async (dre) => {
  const endpoint = document.getElementById("aiEndpoint").value.trim();
  const model = document.getElementById("aiModel").value.trim();
  const apiKey = document.getElementById("aiApiKey").value.trim();
  const out = document.getElementById("validacaoIA");

  if (!endpoint || !model || !apiKey) {
    out.textContent =
      "IA não configurada. Executando validação local:\n\n" + localValidate(dre);
    return;
  }

  const prompt = `Valide tecnicamente este DRE mensal (Brasil, regime de competência) e indique inconsistências objetivas:\n${JSON.stringify(
    dre,
    null,
    2
  )}`;

  try {
    out.textContent = "Consultando IA...";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente contábil brasileiro. Responda de forma objetiva e com alertas práticos.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Falha na IA (${response.status})`);
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "Sem resposta da IA.";
    out.textContent = text;
  } catch (error) {
    out.textContent =
      `Erro ao consultar IA: ${error.message}\n\n` +
      "Validação local:\n" +
      localValidate(dre);
  }
};

document.getElementById("btnCalcular").addEventListener("click", () => {
  const dre = computeDre();
  renderDre(dre);
});

document.getElementById("btnValidarIA").addEventListener("click", async () => {
  const dre = computeDre();
  renderDre(dre);
  await validateWithAI(dre);
});

document.getElementById("arquivoExtrato").addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result || ""));
    renderExtrato(rows);
  };
  reader.readAsText(file, "utf-8");
});
