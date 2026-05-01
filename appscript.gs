// ═══════════════════════════════════════════════════════
//  STUDIO JULIE BARROSO — Google Apps Script
//  Cole este arquivo no Apps Script do projeto
//  Se existir um arquivo HTML chamado "index" no projeto, o Web App
//  também pode servir a interface pública. Se não existir, este arquivo
//  funciona normalmente como API para o HTML hospedado fora do Apps Script.
//  Planilha ID: 1SBHOuxAeRx47v28nTu3y3lApGHDI-jx0cG_cwryawZg
//
//  SETUP (fazer uma vez após colar):
//  1. Clique em "Executar" → escolha a função: criarTriggerKeepAlive
//  2. Autorize as permissões solicitadas
//  3. Implante como Web App (acesso: qualquer pessoa com o link)
//  Isso cria um trigger que chama o script a cada 5 minutos,
//  evitando o cold start (hibernação do GAS).
// ═══════════════════════════════════════════════════════

const SHEET_ID   = '1SBHOuxAeRx47v28nTu3y3lApGHDI-jx0cG_cwryawZg';

// URL pública do próprio script (preencha após implantar como Web App)
// Exemplo: 'https://script.google.com/macros/s/SEU_ID.../exec'
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzxXuqE0VEmkxK_jgri79zeGwcR7HNp2MLqcUw95HtBrZwaHD4nivtcWqks1AB-fjU/exec';

// ── KEEP ALIVE ────────────────────────────────────────
// Executar manualmente UMA VEZ para registrar o trigger automático.
// Depois ele roda sozinho a cada 5 min sem precisar fazer nada.
function criarTriggerKeepAlive() {
  // Remove triggers antigos do keepAlive para não duplicar
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'keepAlive')
    .forEach(t => ScriptApp.deleteTrigger(t));

  // Cria novo trigger: a cada 5 minutos
  ScriptApp.newTrigger('keepAlive')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('✓ Trigger keepAlive criado com sucesso (a cada 5 min).');
}

// Função chamada pelo trigger — faz um GET simples no próprio script
function keepAlive() {
  try {
    UrlFetchApp.fetch(SCRIPT_URL + '?ping=1', {
      method: 'get',
      muteHttpExceptions: true
    });
  } catch(e) {
    // Silencia erros — o objetivo é só acordar a instância
  }
}

// ── ROTA PRINCIPAL ────────────────────────────────────
function doGet(e) {
  const params = (e && e.parameter) || {};

  // Resposta rápida ao ping do keepAlive
  if (params.ping) {
    return ContentService
      .createTextOutput('ok')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const isApiRequest = Boolean(params.callback || params.action || params.aba || params.api);

  if (!isApiRequest) {
    try {
      return HtmlService
        .createHtmlOutputFromFile('index')
        .setTitle('Studio Julie Barroso')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (_) {
      return ContentService
        .createTextOutput('Studio Julie Barroso API online')
        .setMimeType(ContentService.MimeType.TEXT);
    }
  }

  const result = handleRequest_(params);
  if (params.callback) {
    return jsonpResponse_(params.callback, result);
  }
  return jsonResponse_(result);
}

function doPost(e) {
  let params = {};
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
    params = raw ? JSON.parse(raw) : ((e && e.parameter) || {});
  } catch (_) {
    params = (e && e.parameter) || {};
  }

  return jsonResponse_(handleRequest_(params));
}

function handleRequest_(params) {
  try {
    const action = params.action || '';
    const aba    = params.aba    || '';

    if (action === 'setAbas') return setAbas(JSON.parse(params.dados));
    if (action === 'setProcs') return setProcs(JSON.parse(params.dados));
    if (action === 'addProc') return addProc(JSON.parse(params.dado));
    if (action === 'updateProc') return updateProc(JSON.parse(params.dado));
    if (action === 'deleteProc') return deleteProc(params.id);
    if (action === 'renameProcAba') return renameProcAba(params.oldName, params.newName);
    if (action === 'deleteAbaProcs') return deleteAbaProcs(params.abaNome);
    if (action === 'setVideo') return setVideo(params.url);
    if (action === 'setFoto') return setFoto(params.url);
    if (action === 'setFotoConfig') return setFotoConfig(params.posY, params.altura);
    if (action === 'setMidiaConfig') return setMidiaConfig(params.tipoMidia);
    if (aba === 'ABAS') return getAbas();
    if (aba === 'PROCEDIMENTOS') return getProcs();
    if (aba === 'VIDEO') return getVideo();
    if (aba === 'FOTO') return getFoto();
    if (aba === 'FOTO_CONFIG') return getFotoConfig();
    if (aba === 'MIDIA_CONFIG') return getMidiaConfig();

    return { ok: true, msg: 'Studio Julie Barroso API — online' };
  } catch (err) {
    return { error: err.message };
  }
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse_(callback, data) {
  const safeCallback = String(callback || 'callback').replace(/[^\w$.]/g, '');
  return ContentService
    .createTextOutput(`${safeCallback}(${JSON.stringify(data)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ── HELPERS ───────────────────────────────────────────
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function makeProcId_() {
  return 'proc_' + Utilities.getUuid().replace(/-/g, '').slice(0, 18);
}

function normalizeProcRow_(row) {
  const out = Array.isArray(row) ? row.slice(0, 14) : [];
  while (out.length < 14) out.push('');
  out[8]  = String(out[8]  || '50').trim();
  out[9]  = String(out[9]  || '145').trim();
  out[10] = String(out[10] || 'false').trim();
  out[13] = String(out[13] || makeProcId_()).trim();
  return out;
}

function getProcDataWithIds_(sheet) {
  const data = sheet.getDataRange().getValues();
  if (!data.length) return [];

  const normalized = data.map(normalizeProcRow_);
  let changed = data.length !== normalized.length;

  normalized.forEach((row, i) => {
    const original = data[i] || [];
    if (
      original.length < 14 ||
      String(original[8]  || '').trim() !== row[8] ||
      String(original[9]  || '').trim() !== row[9] ||
      String(original[10] || '').trim() !== row[10] ||
      String(original[13] || '').trim() !== row[13]
    ) {
      changed = true;
    }
  });

  if (changed) {
    sheet.clearContents();
    sheet.getRange(1, 1, normalized.length, 14).setValues(normalized);
  }

  return normalized;
}

// ── ABAS ─────────────────────────────────────────────
function getAbas() {
  const sheet = getOrCreateSheet('ABAS');
  const data = sheet.getDataRange().getValues();
  return data
    .filter(row => row[0] && String(row[0]).trim())
    .map(row => ({
      col1: String(row[0] || '').trim(),
      col2: String(row[1] || '').trim(),
      col3: String(row[2] || '').trim()
    }));
}

function setAbas(linhas) {
  const sheet = getOrCreateSheet('ABAS');
  sheet.clearContents();
  if (linhas && linhas.length) {
    sheet.getRange(1, 1, linhas.length, 3).setValues(linhas);
  }
  return { ok: true, rows: linhas ? linhas.length : 0 };
}

// ── PROCEDIMENTOS ─────────────────────────────────────
function getProcs() {
  const sheet = getOrCreateSheet('PROCEDIMENTOS');
  const data = getProcDataWithIds_(sheet);
  return data
    .filter(row => row[1] && String(row[1]).trim())
    .map((row, i) => ({
      rowId:  String(i + 1),
      col1:   String(row[0]  || '').trim(),       // aba
      col2:   String(row[1]  || '').trim(),       // nome
      col3:   String(row[2]  || '').trim(),       // descricao
      col4:   String(row[3]  || '').trim(),       // valor
      col5:   String(row[4]  || '').trim(),       // duracao
      col6:   String(row[5]  || '').trim(),       // fixacao
      col7:   String(row[6]  || '').trim(),       // indicado
      col8:   String(row[7]  || '').trim(),       // imagem
      col9:   String(row[8]  || '50').trim(),     // imgPosY
      col10:  String(row[9]  || '145').trim(),    // imgAltura
      col11:  String(row[10] || 'false').trim(),  // temManut
      col12:  String(row[11] || '').trim(),       // manutPrazo
      col13:  String(row[12] || '').trim(),       // manutValor
      col14:  String(row[13] || '').trim()        // id
    }));
}

function setProcs(linhas) {
  const sheet = getOrCreateSheet('PROCEDIMENTOS');
  sheet.clearContents();
  if (linhas && linhas.length) {
    const normalized = linhas.map(normalizeProcRow_);
    sheet.getRange(1, 1, normalized.length, 14).setValues(normalized);
  }
  return { ok: true, rows: linhas ? linhas.length : 0 };
}

function addProc(proc) {
  const sheet = getOrCreateSheet('PROCEDIMENTOS');
  const row = normalizeProcRow_([
    proc.aba,
    proc.nome,
    proc.descricao,
    proc.valor,
    proc.duracao,
    proc.fixacao,
    proc.indicado,
    proc.imagem,
    proc.imgPosY,
    proc.imgAltura,
    proc.temManut,
    proc.manutPrazo,
    proc.manutValor,
    proc.id
  ]);
  sheet.appendRow(row);
  return { ok: true, id: row[13] };
}

function updateProc(proc) {
  const sheet = getOrCreateSheet('PROCEDIMENTOS');
  const data = getProcDataWithIds_(sheet);
  const procId = String(proc.id || '').trim() || makeProcId_();
  const row = normalizeProcRow_([
    proc.aba,
    proc.nome,
    proc.descricao,
    proc.valor,
    proc.duracao,
    proc.fixacao,
    proc.indicado,
    proc.imagem,
    proc.imgPosY,
    proc.imgAltura,
    proc.temManut,
    proc.manutPrazo,
    proc.manutValor,
    procId
  ]);
  const idx = data.findIndex(r => String(r[13] || '').trim() === procId);

  if (idx === -1) {
    sheet.appendRow(row);
    return { ok: true, id: procId, inserted: true };
  }

  sheet.getRange(idx + 1, 1, 1, 14).setValues([row]);
  return { ok: true, id: procId, updated: true };
}

function deleteProc(procId) {
  const sheet = getOrCreateSheet('PROCEDIMENTOS');
  const data = getProcDataWithIds_(sheet);
  const wanted = String(procId || '').trim();
  if (!wanted) return { ok: false, removed: 0 };

  const filtered = data.filter(row => String(row[13] || '').trim() !== wanted);
  if (filtered.length === data.length) return { ok: true, removed: 0 };

  sheet.clearContents();
  if (filtered.length) {
    sheet.getRange(1, 1, filtered.length, 14).setValues(filtered);
  }
  return { ok: true, removed: data.length - filtered.length };
}

function renameProcAba(oldName, newName) {
  const sheet = getOrCreateSheet('PROCEDIMENTOS');
  const data = getProcDataWithIds_(sheet);
  const from = String(oldName || '').trim();
  const to   = String(newName || '').trim();
  if (!from || !to) return { ok: false, updated: 0 };

  let updated = 0;
  data.forEach(row => {
    if (String(row[0] || '').trim() === from) {
      row[0] = to;
      updated++;
    }
  });

  if (updated) {
    sheet.clearContents();
    sheet.getRange(1, 1, data.length, 14).setValues(data);
  }
  return { ok: true, updated };
}

function deleteAbaProcs(abaNome) {
  const sheet = getOrCreateSheet('PROCEDIMENTOS');
  const data = getProcDataWithIds_(sheet);
  const aba = String(abaNome || '').trim();
  if (!aba) return { ok: false, removed: 0 };

  const filtered = data.filter(row => String(row[0] || '').trim() !== aba);
  if (filtered.length === data.length) return { ok: true, removed: 0 };

  sheet.clearContents();
  if (filtered.length) {
    sheet.getRange(1, 1, filtered.length, 14).setValues(filtered);
  }
  return { ok: true, removed: data.length - filtered.length };
}

// ── VÍDEO ────────────────────────────────────────────
function getVideo() {
  const sheet = getOrCreateSheet('VIDEO');
  const data = sheet.getDataRange().getValues();
  if (!data || !data[0] || !data[0][0]) return [{ col1: '' }];
  return [{ col1: String(data[0][0]).trim() }];
}

function setVideo(url) {
  const sheet = getOrCreateSheet('VIDEO');
  sheet.clearContents();
  if (url) sheet.getRange(1, 1).setValue(url);
  return { ok: true, url };
}

function getFoto() {
  const sheet = getOrCreateSheet('FOTO');
  const data  = sheet.getDataRange().getValues();
  if (!data || !data[0] || !data[0][0]) return [{ col1: '' }];
  return [{ col1: String(data[0][0]).trim() }];
}

function setFoto(url) {
  const sheet = getOrCreateSheet('FOTO');
  sheet.clearContents();
  if (url) sheet.getRange(1, 1).setValue(url);
  return { ok: true, url };
}

function getFotoConfig() {
  const sheet = getOrCreateSheet('FOTO_CONFIG');
  const data  = sheet.getDataRange().getValues();
  if (!data || !data[0]) return [{ col1: '50', col2: '420' }];
  return [{ col1: String(data[0][0]||'50').trim(), col2: String(data[0][1]||'420').trim() }];
}

function setFotoConfig(posY, altura) {
  const sheet = getOrCreateSheet('FOTO_CONFIG');
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 2).setValues([[posY, altura]]);
  return { ok: true, posY, altura };
}

function getMidiaConfig() {
  const sheet = getOrCreateSheet('MIDIA_CONFIG');
  const data  = sheet.getDataRange().getValues();
  if (!data || !data[0] || !data[0][0]) return [{ col1: 'video' }];
  return [{ col1: String(data[0][0]).trim() }];
}

function setMidiaConfig(tipo) {
  const sheet = getOrCreateSheet('MIDIA_CONFIG');
  sheet.clearContents();
  if (tipo) sheet.getRange(1, 1).setValue(tipo);
  return { ok: true, tipo };
}
