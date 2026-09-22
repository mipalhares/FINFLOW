/* ==========================================================
   FinFlow — lógica principal
   ========================================================== */

let currentUser = null;
let pendingEntry = null; // lançamento aguardando confirmação (voz/OCR)

/* ---------------- AUTH ---------------- */

const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const authError = document.getElementById('auth-error');

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    authError.textContent = traduzErroAuth(err.code);
  }
});

document.getElementById('signup-btn').addEventListener('click', async () => {
  authError.textContent = '';
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if (!email || !password) {
    authError.textContent = 'Preencha e-mail e senha para criar a conta.';
    return;
  }
  try {
    await auth.createUserWithEmailAndPassword(email, password);
  } catch (err) {
    authError.textContent = traduzErroAuth(err.code);
  }
});

document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged((user) => {
  currentUser = user;
  if (user) {
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    iniciarListenersDeDados();
  } else {
    appScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
  }
});

function traduzErroAuth(code) {
  const mapa = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-not-found': 'Conta não encontrada. Toque em "Criar conta".',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
    'auth/weak-password': 'A senha precisa ter ao menos 6 caracteres.'
  };
  return mapa[code] || 'Algo deu errado. Tente novamente.';
}

/* ---------------- NAVEGAÇÃO ---------------- */

const views = ['inicio', 'lancar', 'planejar', 'dicas'];
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => mostrarView(btn.dataset.view));
});

function mostrarView(nome) {
  views.forEach((v) => {
    document.getElementById(`view-${v}`).classList.toggle('hidden', v !== nome);
  });
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === nome);
  });
}

/* ---------------- DADOS (Firestore) ---------------- */

function iniciarListenersDeDados() {
  db.collection('users').doc(currentUser.uid).collection('lancamentos')
    .orderBy('data', 'desc').limit(50)
    .onSnapshot(renderizarLedger);

  db.collection('users').doc(currentUser.uid).collection('planos')
    .orderBy('data', 'asc')
    .onSnapshot(renderizarPlanos);

  renderizarDicas();
}

function renderizarLedger(snapshot) {
  const lista = document.getElementById('ledger-list');
  const vazio = document.getElementById('ledger-empty');
  lista.innerHTML = '';

  let entradas = 0, saidas = 0;

  snapshot.forEach((doc) => {
    const d = doc.data();
    if (d.tipo === 'entrada') entradas += d.valor; else saidas += d.valor;

    const li = document.createElement('li');
    const dataFmt = d.data && d.data.toDate ? formatarData(d.data.toDate()) : '';
    li.innerHTML = `
      <span>
        <span class="ledger-desc">${escapeHtml(d.descricao)}</span>
        <span class="ledger-date">${dataFmt}</span>
      </span>
      <span class="ledger-value ${d.tipo}">${d.tipo === 'saida' ? '−' : '+'} ${formatarMoeda(d.valor)}</span>
    `;
    lista.appendChild(li);
  });

  vazio.classList.toggle('hidden', snapshot.size > 0);

  document.getElementById('hero-in').textContent = formatarMoeda(entradas);
  document.getElementById('hero-out').textContent = formatarMoeda(saidas);
  document.getElementById('hero-balance').textContent = formatarMoeda(entradas - saidas);
}

function renderizarPlanos(snapshot) {
  const lista = document.getElementById('plan-list');
  const vazio = document.getElementById('plan-empty');
  lista.innerHTML = '';

  snapshot.forEach((doc) => {
    const d = doc.data();
    const dataAlvo = d.data.toDate();
    const hoje = new Date();
    const diasRestantes = Math.max(1, Math.ceil((dataAlvo - hoje) / (1000 * 60 * 60 * 24)));
    const porDia = d.valor / diasRestantes;

    const li = document.createElement('li');
    li.innerHTML = `
      <div class="plan-item-top">
        <span>${escapeHtml(d.descricao)}</span>
        <span>${formatarMoeda(d.valor)}</span>
      </div>
      <div class="plan-item-detail">
        Até ${formatarData(dataAlvo)} (${diasRestantes} dias) · guarde ${formatarMoeda(porDia)}/dia
      </div>
    `;
    lista.appendChild(li);
  });

  vazio.classList.toggle('hidden', snapshot.size > 0);
}

async function salvarLancamento({ descricao, valor, tipo, data }) {
  await db.collection('users').doc(currentUser.uid).collection('lancamentos').add({
    descricao, valor, tipo,
    data: data ? firebase.firestore.Timestamp.fromDate(data) : firebase.firestore.Timestamp.now()
  });
}

async function salvarPlano({ descricao, valor, data }) {
  await db.collection('users').doc(currentUser.uid).collection('planos').add({
    descricao, valor,
    data: firebase.firestore.Timestamp.fromDate(data)
  });
}

/* ---------------- LANÇAMENTO MANUAL ---------------- */

document.getElementById('manual-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const descricao = document.getElementById('manual-desc').value.trim();
  const valor = parseFloat(document.getElementById('manual-value').value);
  const tipo = document.getElementById('manual-type').value;
  if (!descricao || isNaN(valor)) return;
  await salvarLancamento({ descricao, valor, tipo });
  e.target.reset();
  mostrarView('inicio');
});

/* ---------------- PLANEJAMENTO ---------------- */

document.getElementById('plan-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const descricao = document.getElementById('plan-desc').value.trim();
  const valor = parseFloat(document.getElementById('plan-value').value);
  const dataStr = document.getElementById('plan-date').value;
  if (!descricao || isNaN(valor) || !dataStr) return;
  await salvarPlano({ descricao, valor, data: new Date(dataStr + 'T12:00:00') });
  e.target.reset();
});

/* ---------------- COMANDO DE VOZ ---------------- */

const voiceBtn = document.getElementById('voice-btn');
const voiceStatus = document.getElementById('voice-status');
const voiceTranscript = document.getElementById('voice-transcript');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    voiceBtn.classList.add('listening');
    voiceStatus.textContent = 'Ouvindo...';
  };

  recognition.onerror = () => {
    voiceBtn.classList.remove('listening');
    voiceStatus.textContent = 'Não entendi. Toque no microfone e tente de novo.';
  };

  recognition.onend = () => {
    voiceBtn.classList.remove('listening');
  };

  recognition.onresult = (event) => {
    const texto = event.results[0][0].transcript;
    voiceTranscript.textContent = `"${texto}"`;
    processarComandoDeVoz(texto);
  };

  voiceBtn.addEventListener('click', () => recognition.start());
} else {
  voiceStatus.textContent = 'Seu navegador não suporta comando de voz. Use o lançamento manual abaixo.';
  voiceBtn.disabled = true;
}

function processarComandoDeVoz(texto) {
  const resultado = interpretarTexto(texto);
  if (!resultado) {
    voiceStatus.textContent = 'Não consegui identificar um valor. Tente: "gastei 50 reais no mercado".';
    return;
  }
  voiceStatus.textContent = 'Confira e salve abaixo:';
  mostrarConfirmacao(resultado);
}

// Interpreta frases como:
// "gastei 50 reais na farmácia" -> saída
// "paguei 120 reais de internet" -> saída
// "recebi 300 reais" -> entrada
// "terei um gasto de 200 reais no dia 15 com o carro" -> plano futuro
function interpretarTexto(textoOriginal) {
  const texto = textoOriginal.toLowerCase();
  const valorMatch = texto.match(/(\d+(?:[.,]\d{1,2})?)\s*reais?/);
  if (!valorMatch) return null;
  const valor = parseFloat(valorMatch[1].replace(',', '.'));

  const ehFuturo = /terei|vou (ter|gastar|pagar)|programad[oa]|no futuro/.test(texto);

  // tenta achar "dia X" ou "dia X/Y"
  const diaMatch = texto.match(/dia\s+(\d{1,2})(?:\/(\d{1,2}))?/);

  // descrição: pega o que vem depois de "em/na/no/com/de", removendo o trecho do valor
  let descricao = texto
    .replace(/gastei|paguei|recebi|ganhei|terei um gasto de|vou gastar|vou pagar|anote|anota/g, '')
    .replace(valorMatch[0], '')
    .replace(/dia\s+\d{1,2}(?:\/\d{1,2})?/, '')
    .replace(/^\s*(em|na|no|com|de)\s+/, '')
    .trim();
  descricao = descricao.replace(/^(em|na|no|com|de)\s+/, '').trim();
  if (!descricao) descricao = ehFuturo ? 'Gasto programado' : 'Lançamento por voz';

  if (ehFuturo) {
    let data = new Date();
    if (diaMatch) {
      const dia = parseInt(diaMatch[1], 10);
      const mes = diaMatch[2] ? parseInt(diaMatch[2], 10) - 1 : data.getMonth();
      data = new Date(data.getFullYear(), mes, dia, 12, 0, 0);
      if (data < new Date()) data.setFullYear(data.getFullYear() + (diaMatch[2] ? 1 : 0));
    } else {
      data.setDate(data.getDate() + 30);
    }
    return { modo: 'plano', descricao: capitalize(descricao), valor, data };
  }

  const tipo = /recebi|ganhei|entrou|caiu/.test(texto) ? 'entrada' : 'saida';
  return { modo: 'lancamento', descricao: capitalize(descricao), valor, tipo };
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------------- CONFIRMAÇÃO (voz e OCR) ---------------- */

const confirmBox = document.getElementById('confirm-box');
const confirmText = document.getElementById('confirm-text');

function mostrarConfirmacao(resultado) {
  pendingEntry = resultado;
  if (resultado.modo === 'plano') {
    confirmText.textContent = `Programar "${resultado.descricao}" de ${formatarMoeda(resultado.valor)} para ${formatarData(resultado.data)}?`;
  } else {
    const rotulo = resultado.tipo === 'entrada' ? 'entrada' : 'gasto';
    confirmText.textContent = `Salvar ${rotulo} de ${formatarMoeda(resultado.valor)} — "${resultado.descricao}"?`;
  }
  confirmBox.classList.remove('hidden');
}

document.getElementById('confirm-cancel').addEventListener('click', () => {
  pendingEntry = null;
  confirmBox.classList.add('hidden');
  voiceTranscript.textContent = '';
  voiceStatus.textContent = 'Toque e fale, por exemplo:\n"Gastei 50 reais na farmácia"';
});

document.getElementById('confirm-save').addEventListener('click', async () => {
  if (!pendingEntry) return;
  if (pendingEntry.modo === 'plano') {
    await salvarPlano(pendingEntry);
  } else {
    await salvarLancamento(pendingEntry);
  }
  pendingEntry = null;
  confirmBox.classList.add('hidden');
  voiceTranscript.textContent = '';
  voiceStatus.textContent = 'Lançamento salvo! Toque no microfone para adicionar outro.';
  mostrarView('inicio');
});

/* ---------------- CÂMERA + OCR (nota fiscal) ---------------- */

const cameraBtn = document.getElementById('camera-btn');
const cameraPreview = document.getElementById('camera-preview');
const cameraCanvas = document.getElementById('camera-canvas');
const cameraCaptureBtn = document.getElementById('camera-capture-btn');
const ocrStatus = document.getElementById('ocr-status');
let cameraStream = null;

cameraBtn.addEventListener('click', async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    cameraPreview.srcObject = cameraStream;
    cameraPreview.classList.remove('hidden');
    cameraCaptureBtn.classList.remove('hidden');
    cameraBtn.classList.add('hidden');
  } catch (err) {
    ocrStatus.classList.remove('hidden');
    ocrStatus.textContent = 'Não foi possível acessar a câmera. Verifique as permissões do navegador.';
  }
});

cameraCaptureBtn.addEventListener('click', async () => {
  const ctx = cameraCanvas.getContext('2d');
  cameraCanvas.width = cameraPreview.videoWidth;
  cameraCanvas.height = cameraPreview.videoHeight;
  ctx.drawImage(cameraPreview, 0, 0);

  pararCamera();

  ocrStatus.classList.remove('hidden');
  ocrStatus.textContent = 'Lendo a nota fiscal...';

  const { data: { text } } = await Tesseract.recognize(cameraCanvas, 'por');
  ocrStatus.textContent = 'Confira o valor identificado (ajuste se precisar):';

  // procura o maior valor no formato XX,XX ou XX.XX no texto extraído
  const valores = [...text.matchAll(/(\d{1,4}[.,]\d{2})/g)].map((m) => parseFloat(m[1].replace(',', '.')));
  const valor = valores.length ? Math.max(...valores) : null;

  if (valor) {
    mostrarConfirmacao({ modo: 'lancamento', descricao: 'Nota fiscal (câmera)', valor, tipo: 'saida' });
  } else {
    ocrStatus.textContent = 'Não consegui identificar o valor automaticamente. Lance manualmente abaixo.';
  }
});

function pararCamera() {
  if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
  cameraPreview.classList.add('hidden');
  cameraCaptureBtn.classList.add('hidden');
  cameraBtn.classList.remove('hidden');
}

/* ---------------- DICAS ---------------- */

const DICAS = [
  'Separe sua reserva de emergência antes de qualquer investimento — o ideal é ter de 3 a 6 meses de despesas guardados.',
  'Liste suas dívidas da taxa de juros mais alta para a mais baixa e priorize quitar essa primeiro.',
  'Antes de comprar parcelado, pergunte-se: eu compraria isso à vista, hoje?',
  'Automatize uma transferência pequena e fixa para a poupança logo no dia em que o salário cai — o que não passa pela mão, não se gasta.',
  'Revise assinaturas e serviços recorrentes a cada 3 meses; é comum pagar por coisas que já não usa.'
];

function renderizarDicas() {
  const lista = document.getElementById('tips-list');
  lista.innerHTML = '';
  DICAS.forEach((texto) => {
    const li = document.createElement('li');
    li.textContent = texto;
    lista.appendChild(li);
  });
}

/* ---------------- HELPERS ---------------- */

function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- PWA: registra service worker ---------------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
