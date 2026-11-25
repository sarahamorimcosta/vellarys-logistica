/* Vellarys Logística Internacional · script principal
   Empresa fictícia · projeto conceito por Sarah Amorim */
const WHATS = "5500000000000";      // WhatsApp comercial (só números, com DDI e DDD)
const TRACKING_URL = "#";           // link do sistema de rastreamento real

(function () {
  "use strict";
  const doc = document.documentElement;
  const EN = (doc.lang || "").toLowerCase().startsWith("en");
  const semMovimento = doc.classList.contains("sem-movimento");

  const T = EN ? {
    rastreioReal: "The tracking system link will be set up when the site goes live.",
    obrig: { nome: "Please enter your name.", empresa: "Please enter your company.", origem: "Please enter the cargo origin.",
      destino: "Please enter the destination.", modal: "Please choose a mode.", tipo: "Please choose the cargo type.",
      peso: "Enter the approximate weight using numbers only.", telefone: "Enter a phone number with area code.",
      cidade: "Please enter your city.", area: "Please choose an area.", experiencia: "Tell us briefly about your experience." },
    revise: n => `Please review ${n} field${n > 1 ? "s" : ""} marked in red.`,
    pronto: "Message ready. If WhatsApp did not open, ",
    abrirAqui: "tap here to open it.",
    cot: { titulo: "*Quote request · Vellarys website*", nome: "Name", empresa: "Company", origem: "Origin", destino: "Destination",
      modal: "Mode", tipo: "Cargo type", peso: "Approximate weight", obs: "Notes", pagina: "Sent from" },
    trab: { titulo: "*Job application · Vellarys website*", nome: "Name", telefone: "Phone", cidade: "City", area: "Area",
      cnh: "Licence", experiencia: "Experience" },
    fases: { madrugada: "before dawn", amanhecer: "sunrise", dia: "daytime", entardecer: "sunset", noite: "night" },
    erroVazio: "Enter a code to track.", erroCodigo: "Code not found. This is a demo: use DEMO-2026.",
  } : {
    rastreioReal: "O link do sistema de rastreamento será configurado na publicação do site.",
    obrig: { nome: "Informe seu nome.", empresa: "Informe a empresa.", origem: "Informe a origem da carga.",
      destino: "Informe o destino da carga.", modal: "Escolha o modal.", tipo: "Escolha o tipo de carga.",
      peso: "Informe o peso aproximado, só com números.", telefone: "Informe um telefone com DDD.",
      cidade: "Informe a cidade onde mora.", area: "Escolha uma área.", experiencia: "Conte um pouco da sua experiência." },
    revise: n => `Revise ${n > 1 ? "os " + n + " campos marcados" : "o campo marcado"} em vermelho.`,
    pronto: "Mensagem pronta. Se o WhatsApp não abriu, ",
    abrirAqui: "toque aqui para abrir.",
    cot: { titulo: "*Pedido de cotação · site Vellarys*", nome: "Nome", empresa: "Empresa", origem: "Origem", destino: "Destino",
      modal: "Modal", tipo: "Tipo de carga", peso: "Peso aproximado", obs: "Observações", pagina: "Enviado da página" },
    trab: { titulo: "*Cadastro · Trabalhe conosco · site Vellarys*", nome: "Nome", telefone: "Telefone", cidade: "Cidade", area: "Área",
      cnh: "CNH", experiencia: "Experiência" },
    fases: { madrugada: "madrugada", amanhecer: "amanhecer", dia: "dia", entardecer: "entardecer", noite: "noite" },
    erroVazio: "Digite um código para rastrear.", erroCodigo: "Código não encontrado. Esta é uma demonstração: use DEMO-2026.",
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const guardar = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } };
  const ler = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const linkWhats = msg => `https://wa.me/${WHATS}?text=${encodeURIComponent(msg)}`;

  /* ---------- aviso flutuante ---------- */
  const aviso = $("[data-aviso]");
  let avisoTimer;
  function avisar(txt) {
    if (!aviso) return;
    aviso.textContent = txt; aviso.hidden = false;
    clearTimeout(avisoTimer); avisoTimer = setTimeout(() => { aviso.hidden = true; }, 4200);
  }

  /* ---------- WhatsApp e rastreamento ---------- */
  $$("[data-whats]").forEach(a => {
    a.href = linkWhats(a.dataset.whats);
    a.target = "_blank"; a.rel = "noopener";
  });
  $$("[data-rastreio-real]").forEach(a => {
    if (TRACKING_URL && TRACKING_URL !== "#") {
      a.href = TRACKING_URL; a.target = "_blank"; a.rel = "noopener";
    } else {
      a.addEventListener("click", e => { e.preventDefault(); avisar(T.rastreioReal); });
    }
  });
  // páginas sem formulário: o botão de cotação leva ao formulário da página principal
  if (!document.getElementById("cotacao")) {
    $$('a[href="#cotacao"]').forEach(a => { a.href = "index.html#cotacao"; });
  }

  /* ---------- topo e menu ---------- */
  const topo = $(".topo");
  const aoRolar = () => topo && topo.classList.toggle("rolado", scrollY > 30);
  addEventListener("scroll", aoRolar, { passive: true }); aoRolar();

  const menu = $("#menu"), abrirMenu = $(".menu-abrir"), mega = $("#mega"), botaoMega = $(".menu-botao");
  function fecharMega() { if (mega) { mega.classList.remove("aberto"); botaoMega.setAttribute("aria-expanded", "false"); } }
  function fecharMenu() { if (menu) { menu.classList.remove("aberto"); abrirMenu.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; } }
  botaoMega && botaoMega.addEventListener("click", e => {
    e.stopPropagation();
    const abre = !mega.classList.contains("aberto");
    mega.classList.toggle("aberto", abre); botaoMega.setAttribute("aria-expanded", String(abre));
  });
  abrirMenu && abrirMenu.addEventListener("click", () => {
    const abre = !menu.classList.contains("aberto");
    menu.classList.toggle("aberto", abre); abrirMenu.setAttribute("aria-expanded", String(abre));
    document.body.style.overflow = abre ? "hidden" : "";
  });
  document.addEventListener("click", e => { if (mega && mega.classList.contains("aberto") && !e.target.closest(".menu-explorar")) fecharMega(); });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (mega && mega.classList.contains("aberto")) { fecharMega(); botaoMega.focus(); }
    else if (menu && menu.classList.contains("aberto")) { fecharMenu(); abrirMenu.focus(); }
  });
  menu && menu.addEventListener("click", e => { if (e.target.closest("a")) { fecharMega(); fecharMenu(); } });

  /* ---------- relógio de Vitória e fase do dia ---------- */
  const FASES = ["madrugada", "amanhecer", "dia", "entardecer", "noite"];
  const COR_FASE = { madrugada: "#7d97c9", amanhecer: "#ffb07a", dia: "#ffe7a8", entardecer: "#ff8a4c", noite: "#8fb7e8" };
  function horaVitoria() {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const h = +p.find(x => x.type === "hour").value, m = +p.find(x => x.type === "minute").value;
    return { h, m, dec: h + m / 60, txt: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
  }
  function faseDaHora(dec) {
    if (dec < 5) return "madrugada";
    if (dec < 7) return "amanhecer";
    if (dec < 17) return "dia";
    if (dec < 18.75) return "entardecer";
    return "noite";
  }
  const relogio = $("[data-relogio]");
  let faseManual = ler("vellarys-fase");
  if (!FASES.includes(faseManual)) faseManual = null;
  function faseAtual() { return faseManual || faseDaHora(horaVitoria().dec); }
  function atualizarRelogio(avisarMundo) {
    const hv = horaVitoria(), fase = faseAtual();
    if (relogio) {
      $("[data-relogio-hora]", relogio).textContent = hv.txt;
      $("[data-relogio-fase]", relogio).textContent = "· " + T.fases[fase];
      relogio.style.setProperty("--fase-cor", COR_FASE[fase]);
      relogio.classList.toggle("manual", !!faseManual);
    }
    doc.dataset.fase = fase;
    if (avisarMundo) dispatchEvent(new CustomEvent("vellarys:fase", { detail: { fase } }));
  }
  window.VELLARYS = { faseAtual, horaVitoria };
  let ultimaFase = faseAtual();
  atualizarRelogio(false);
  setInterval(() => { atualizarRelogio(false); const f = faseAtual(); if (f !== ultimaFase) { ultimaFase = f; dispatchEvent(new CustomEvent("vellarys:fase", { detail: { fase: f } })); } }, 20000);
  relogio && relogio.addEventListener("click", () => {
    const real = faseDaHora(horaVitoria().dec);
    const atual = faseAtual();
    let prox = FASES[(FASES.indexOf(atual) + 1) % FASES.length];
    faseManual = prox === real ? null : prox;
    guardar("vellarys-fase", faseManual);
    ultimaFase = faseAtual();
    atualizarRelogio(true);
  });

  /* ---------- cookies e movimento ---------- */
  const cookies = $("[data-cookies]");
  if (cookies && ler("vellarys-aviso-privacidade") !== "ok") {
    cookies.hidden = false;
    $("[data-cookies-ok]", cookies).addEventListener("click", () => { guardar("vellarys-aviso-privacidade", "ok"); cookies.hidden = true; });
  }
  const alternar = $("[data-alternar-movimento]");
  if (alternar) {
    alternar.textContent = semMovimento ? alternar.dataset.off : alternar.dataset.on;
    alternar.setAttribute("aria-pressed", String(!semMovimento));
    alternar.addEventListener("click", () => { guardar("vellarys-movimento", semMovimento ? "on" : "off"); location.reload(); });
  }

  /* ---------- revelar ao rolar ---------- */
  const alvos = $$(".card-servico, .card-segmento, .card-rota, .card-unidade, .grade-itens li, .linha-passos li, .card-rel, .doc-card, .pilares li, .frota, .texto-bloco, .ficha, .cabeca-secao, .cotacao-intro, .form");
  if ("IntersectionObserver" in window && !semMovimento) {
    alvos.forEach((el, i) => { el.classList.add("revelar"); el.style.transitionDelay = `${(i % 4) * 70}ms`; });
    const io = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add("visivel"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    alvos.forEach(el => io.observe(el));
  } else {
    alvos.forEach(el => el.classList.add("visivel"));
  }

  /* ---------- trilho do mergulho ---------- */
  const mergulho = $("#mergulho");
  if (mergulho) {
    const links = $$("[data-trilho]");
    const etapas = $$(".etapa", mergulho);
    const ativar = () => {
      const r = mergulho.getBoundingClientRect();
      doc.classList.toggle("no-mergulho", r.top < innerHeight * .5 && r.bottom > innerHeight * .5);
      let ativo = 0;
      etapas.forEach((et, i) => { if (et.getBoundingClientRect().top < innerHeight * .55) ativo = i; });
      links.forEach((l, i) => { l.classList.toggle("ativo", i === ativo); if (i === ativo) l.setAttribute("aria-current", "step"); else l.removeAttribute("aria-current"); });
    };
    addEventListener("scroll", ativar, { passive: true }); addEventListener("resize", ativar); ativar();
  }

  /* ---------- formulários ---------- */
  const PESO_OK = /^\s*(\d{1,3}(\.\d{3})+|\d+)([.,]\d+)?\s*$/;
  function validarCampo(el) {
    if (!el.required) return true;
    const v = el.value.trim();
    let ok = v.length > 0;
    if (ok && el.name === "peso") ok = PESO_OK.test(v) && parseFloat(v.replace(/\./g, "").replace(",", ".")) > 0;
    if (ok && el.name === "telefone") { const d = v.replace(/\D/g, ""); ok = d.length >= 10 && d.length <= 13; }
    if (ok && el.name === "nome") ok = v.length >= 2;
    const erro = document.getElementById(el.getAttribute("aria-describedby"));
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    if (erro) erro.textContent = ok ? "" : (T.obrig[el.name] || "");
    return ok;
  }
  function prepararForm(form, montar) {
    const campos = $$("input[required], select[required], textarea[required]", form);
    campos.forEach(el => {
      el.addEventListener("blur", () => { if (el.value.trim() || el.getAttribute("aria-invalid") === "true") validarCampo(el); });
      el.addEventListener("input", () => { if (el.getAttribute("aria-invalid") === "true") validarCampo(el); });
      el.addEventListener("change", () => { if (el.tagName === "SELECT") validarCampo(el); });
    });
    const status = $(".form-status", form);
    form.addEventListener("submit", e => {
      e.preventDefault();
      const invalidos = campos.filter(el => !validarCampo(el));
      if (invalidos.length) {
        status.textContent = T.revise(invalidos.length);
        invalidos[0].focus();
        return;
      }
      const url = linkWhats(montar(new FormData(form)));
      status.innerHTML = "";
      status.append(T.pronto);
      const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = T.abrirAqui;
      status.append(a);
      const w = window.open(url, "_blank");
      if (w) { try { w.opener = null; } catch (err) { /* ok */ } }
    });
  }
  const nomePagina = () => (document.querySelector("h1") || {}).textContent || document.title;
  $$('form[data-form="cotacao"]').forEach(f => prepararForm(f, d => {
    const c = T.cot, linhas = [c.titulo, ""];
    linhas.push(`${c.nome}: ${d.get("nome").trim()}`, `${c.empresa}: ${d.get("empresa").trim()}`,
      `${c.origem}: ${d.get("origem").trim()}`, `${c.destino}: ${d.get("destino").trim()}`,
      `${c.modal}: ${d.get("modal")}`, `${c.tipo}: ${d.get("tipo")}`, `${c.peso}: ${d.get("peso").trim()} ${d.get("unidade")}`);
    const obs = (d.get("obs") || "").trim();
    if (obs) linhas.push(`${c.obs}: ${obs}`);
    linhas.push("", `${c.pagina}: ${nomePagina().trim()}`);
    return linhas.join("\n");
  }));
  $$('form[data-form="trabalhe"]').forEach(f => prepararForm(f, d => {
    const c = T.trab, linhas = [c.titulo, ""];
    linhas.push(`${c.nome}: ${d.get("nome").trim()}`, `${c.telefone}: ${d.get("telefone").trim()}`, `${c.cidade}: ${d.get("cidade").trim()}`,
      `${c.area}: ${d.get("area")}`, `${c.cnh}: ${d.get("cnh")}`, `${c.experiencia}: ${d.get("experiencia").trim()}`);
    return linhas.join("\n");
  }));

  /* ---------- rastreio de demonstração ---------- */
  const formR = $('form[data-form="rastreio"]');
  if (formR) {
    const input = $("input", formR), erro = $(".erro", formR);
    const res = $("[data-rastreio-resultado]"), status = $("[data-rastreio-status]"), barra = $("[data-rastreio-barra]");
    const itens = $$(".rastreio-etapas li"), pausa = $("[data-rastreio-pausa]"), rever = $("[data-rastreio-rever]");
    let passo = -1, timer = null, pausado = false;
    const avisarMundo = p => dispatchEvent(new CustomEvent("vellarys:rastreio", { detail: { passo: p } }));
    function irPara(p) {
      passo = p;
      itens.forEach((li, i) => { li.classList.toggle("feito", i < p); li.classList.toggle("atual", i === p); });
      const li = itens[p];
      status.textContent = `${$(".passo-nome", li).textContent} · ${$(".passo-local", li).textContent}`;
      barra.parentElement.style.setProperty("--p", (p / (itens.length - 1)).toFixed(3));
      barra.style.setProperty("--p", (p / (itens.length - 1)).toFixed(3));
      avisarMundo(p);
    }
    function agendar() {
      clearTimeout(timer);
      if (pausado || passo >= itens.length - 1) { if (passo >= itens.length - 1) pausa.disabled = true; return; }
      timer = setTimeout(() => { irPara(passo + 1); agendar(); }, semMovimento ? 3800 : 3200);
    }
    function iniciar() {
      res.hidden = false; pausado = false; pausa.disabled = false; pausa.textContent = pausa.dataset.pausar;
      irPara(0); agendar();
    }
    formR.addEventListener("submit", e => {
      e.preventDefault();
      const v = input.value.trim().toUpperCase().replace(/\s+/g, "").replace(/^DEMO(\d)/, "DEMO-$1");
      if (!v) { erro.textContent = T.erroVazio; input.setAttribute("aria-invalid", "true"); input.focus(); return; }
      if (v !== "DEMO-2026") { erro.textContent = T.erroCodigo; input.setAttribute("aria-invalid", "true"); input.focus(); res.hidden = true; clearTimeout(timer); avisarMundo(-1); return; }
      erro.textContent = ""; input.setAttribute("aria-invalid", "false"); input.value = "DEMO-2026";
      iniciar();
    });
    input.addEventListener("input", () => { if (input.getAttribute("aria-invalid") === "true") { erro.textContent = ""; input.removeAttribute("aria-invalid"); } });
    itens.forEach((li, i) => $("button", li).addEventListener("click", () => { pausado = true; clearTimeout(timer); pausa.textContent = pausa.dataset.continuar; pausa.disabled = i >= itens.length - 1; irPara(i); }));
    pausa.addEventListener("click", () => {
      pausado = !pausado; pausa.textContent = pausado ? pausa.dataset.continuar : pausa.dataset.pausar;
      if (!pausado) agendar(); else clearTimeout(timer);
    });
    rever.addEventListener("click", iniciar);
  }

  /* ---------- rastro do cursor (como uma rota) ---------- */
  const tela = $(".rastro-cursor");
  const ponteiroFino = matchMedia("(pointer: fine)").matches;
  if (tela && ponteiroFino && !semMovimento) {
    const ctx = tela.getContext("2d");
    let pts = [], rodando = false, dpr = 1;
    const ajustar = () => { dpr = Math.min(devicePixelRatio || 1, 2); tela.width = innerWidth * dpr; tela.height = innerHeight * dpr; };
    ajustar(); addEventListener("resize", ajustar);
    addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      const ult = pts[pts.length - 1];
      if (!ult || Math.hypot(e.clientX - ult.x, e.clientY - ult.y) > 4) pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (!rodando) { rodando = true; requestAnimationFrame(desenhar); }
    }, { passive: true });
    const VIDA = 900;
    function desenhar(agora) {
      pts = pts.filter(p => agora - p.t < VIDA);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (pts.length > 1) {
        const claro = !!(document.elementFromPoint(pts[pts.length - 1].x, pts[pts.length - 1].y) || document.body).closest(".clara, .papel, .form");
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        let dist = 0;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const vida = 1 - (agora - b.t) / VIDA;
          ctx.strokeStyle = claro ? `rgba(176,65,15,${vida * .55})` : `rgba(255,106,43,${vida * .6})`;
          ctx.lineWidth = 1.6;
          ctx.setLineDash([5, 6]);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          dist += Math.hypot(b.x - a.x, b.y - a.y);
          if (dist > 90) {
            dist = 0;
            ctx.setLineDash([]);
            ctx.fillStyle = claro ? `rgba(4,32,43,${vida * .5})` : `rgba(191,227,224,${vida * .7})`;
            ctx.beginPath(); ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2); ctx.fill();
          }
        }
        const cab = pts[pts.length - 1];
        ctx.setLineDash([]);
        ctx.strokeStyle = claro ? "rgba(176,65,15,.5)" : "rgba(255,106,43,.55)";
        ctx.beginPath(); ctx.arc(cab.x, cab.y, 5, 0, Math.PI * 2); ctx.stroke();
      }
      if (pts.length) requestAnimationFrame(desenhar);
      else { rodando = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
  }
})();
