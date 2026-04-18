function doGet(e) {
  const abaSolicitada = e.parameter.aba;
  const callback = e.parameter.callback;
  let dados;

  if (abaSolicitada && abaSolicitada !== "TODOS_CABOS") {
    dados = buscarDadosPorAba(abaSolicitada);
  } else {
    dados = buscarTodosOsCabos();
  }

  const resultado = callback + "(" + JSON.stringify(dados) + ")";
  return ContentService.createTextOutput(resultado).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function buscarTodosOsCabos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let todos = [];
  sheets.forEach(s => {
    if (s.getName().toUpperCase().indexOf("CABOS-") === 0) {
      todos = todos.concat(buscarDadosPorAba(s.getName()));
    }
  });
  return todos;
}

function buscarDadosPorAba(nomeAba) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(nomeAba);
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
    values.shift(); 
    const nomeUpper = nomeAba.toUpperCase();

    // ADICIONADO: Para aba OPERADOR
    if (nomeUpper === "OPERADOR") {
      return values.map(linha => ({
        col1: String(linha[0]||"").trim(),
        col2: String(linha[1]||"").trim(),
        tipo: "OPERADOR"
      })).filter(item => item.col1 !== "");
    }

    if (nomeUpper.indexOf("CABOS-") === 0) {
      return values.map(linha => ({
        col1: String(linha[0]||"").trim(), col2: String(linha[1]||"").trim(),
        col3: String(linha[2]||"").trim(), col4: String(linha[3]||"").trim(),
        col5: String(linha[4]||"").trim(), tipo: "CABO"
      })).filter(item => item.col1 !== "");
    }

    return values.map(linha => ({
      col1: String(linha[0]||"").trim(), col2: String(linha[1]||"").trim(),
      col3: String(linha[2]||"").trim(), col4: String(linha[3]||"").trim(),
      col5: String(linha[4]||"").trim(), tipo: "REDE"
    })).filter(item => item.col1 !== "");
  } catch (e) { return []; }
}