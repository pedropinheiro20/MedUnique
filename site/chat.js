// Assistente do site: tira dúvidas sobre a clínica e encaminha para uma atendente no WhatsApp.
// Sem JavaScript, o botão flutuante continua abrindo o WhatsApp direto.
(function () {
  var FONE = '5586994840219';
  var PADRAO = 'Olá! Vim pelo site e gostaria de falar com uma atendente.';
  var CHAVE = 'mu-chat';
  var zap = document.getElementById('whatsapp');
  if (!zap || !window.fetch) return;

  var link = function (texto) { return 'https://api.whatsapp.com/send/?phone=' + FONE + '&text=' + encodeURIComponent(texto || PADRAO); };
  var salvas = [];
  try { salvas = JSON.parse(sessionStorage.getItem(CHAVE) || '[]'); } catch (e) { salvas = []; }
  var msgs = Array.isArray(salvas) ? salvas : [];
  var ultimoZap = null;
  var ocupado = false;

  var painel = document.createElement('section');
  painel.className = 'chat';
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-label', 'Assistente da Med Unique');
  painel.hidden = true;
  painel.innerHTML =
    '<header class="chat__topo">' +
      '<img src="img/icone.png" alt="" width="34" height="34">' +
      '<div><strong>Assistente Med Unique</strong><span>Respostas automáticas · atendente pelo WhatsApp</span></div>' +
      '<button type="button" class="chat__fechar" aria-label="Fechar">×</button>' +
    '</header>' +
    '<div class="chat__lista" aria-live="polite"></div>' +
    '<div class="chat__sugestoes"></div>' +
    '<form class="chat__form">' +
      '<input type="text" maxlength="500" placeholder="Escreva sua dúvida" aria-label="Sua dúvida" autocomplete="off">' +
      '<button type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M4 12l16-8-6 16-2.5-6.5z"/></svg></button>' +
    '</form>' +
    '<a class="chat__zap" target="_blank" rel="noopener">Falar com uma atendente no WhatsApp</a>';
  document.body.appendChild(painel);

  var lista = painel.querySelector('.chat__lista');
  var sugestoes = painel.querySelector('.chat__sugestoes');
  var form = painel.querySelector('form');
  var campo = form.querySelector('input');
  var botaoZap = painel.querySelector('.chat__zap');

  function balao(texto, classe) {
    var p = document.createElement('p');
    p.className = 'chat__msg ' + classe;
    p.textContent = texto;
    lista.appendChild(p);
    return p;
  }
  function cartaoZap(texto) {
    var a = document.createElement('a');
    a.className = 'chat__encaminhar';
    a.href = link(texto);
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = '<strong>Continuar no WhatsApp</strong><span></span>';
    a.querySelector('span').textContent = texto;
    lista.appendChild(a);
  }
  function desenha() {
    lista.innerHTML = '';
    balao('Olá! Sou a assistente da Med Unique. Posso tirar dúvidas sobre tratamentos, especialidades e como funciona a clínica. Para agendar, te passo para uma atendente no WhatsApp.', 'chat__msg--ela');
    msgs.forEach(function (m) {
      balao(m.content, m.role === 'user' ? 'chat__msg--eu' : 'chat__msg--ela');
      if (m.whatsapp) cartaoZap(m.whatsapp);
    });
    sugestoes.hidden = msgs.length > 0;
    botaoZap.href = link(ultimoZap);
    lista.scrollTop = lista.scrollHeight;
  }
  function guarda() { try { sessionStorage.setItem(CHAVE, JSON.stringify(msgs.slice(-20))); } catch (e) {} }

  ['Quero agendar uma avaliação', 'Quais tratamentos para flacidez?', 'Onde fica a clínica?', 'Como funciona o Unique Care?'].forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = s;
    b.addEventListener('click', function () { envia(s); });
    sugestoes.appendChild(b);
  });

  function envia(texto) {
    texto = (texto || '').trim();
    if (!texto || ocupado) return;
    msgs.push({ role: 'user', content: texto });
    campo.value = '';
    desenha();
    ocupado = true;
    var pensando = balao('Digitando…', 'chat__msg--ela chat__msg--pensando');
    lista.scrollTop = lista.scrollHeight;
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'site', messages: msgs.map(function (m) { return { role: m.role, content: m.content }; }) })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.reply) {
          msgs.push({ role: 'assistant', content: (res.j && res.j.error) || 'Não consegui responder agora. Nossa equipe te atende pelo WhatsApp.', whatsapp: PADRAO });
        } else {
          msgs.push({ role: 'assistant', content: res.j.reply, whatsapp: res.j.whatsapp || null });
          if (res.j.whatsapp) ultimoZap = res.j.whatsapp;
        }
      })
      .catch(function () { msgs.push({ role: 'assistant', content: 'Sem conexão agora. Fale com a nossa equipe pelo WhatsApp.', whatsapp: PADRAO }); })
      .then(function () { ocupado = false; pensando.remove(); guarda(); desenha(); });
  }

  function abre() { painel.hidden = false; document.body.classList.add('chat-aberto'); desenha(); setTimeout(function () { campo.focus(); }, 50); }
  function fecha() { painel.hidden = true; document.body.classList.remove('chat-aberto'); zap.focus(); }

  zap.setAttribute('aria-label', 'Abrir o assistente da clínica');
  zap.setAttribute('aria-haspopup', 'dialog');
  var rotulo = zap.querySelector('.whatsapp__rotulo');
  if (rotulo) rotulo.textContent = 'Tire suas dúvidas';
  zap.addEventListener('click', function (e) { e.preventDefault(); if (painel.hidden) abre(); else fecha(); });
  painel.querySelector('.chat__fechar').addEventListener('click', fecha);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !painel.hidden) fecha(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); envia(campo.value); });
  msgs.forEach(function (m) { if (m.whatsapp) ultimoZap = m.whatsapp; });
})();
