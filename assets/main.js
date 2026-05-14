/* ── AOS Init ── */
AOS.init({ duration: 700, once: true, offset: 80 });

/* ── Custom Cursor ── */
const dot = document.getElementById('cursor');
const outline = document.getElementById('cursor-outline');
if (window.matchMedia('(hover: hover)').matches) {
  document.addEventListener('mousemove', e => {
    dot.style.left = e.clientX + 'px';
    dot.style.top = e.clientY + 'px';
    outline.style.left = e.clientX + 'px';
    outline.style.top = e.clientY + 'px';
  });
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => {
      dot.style.transform = 'translate(-50%,-50%) scale(2)';
      outline.style.transform = 'translate(-50%,-50%) scale(1.4)';
      outline.style.borderColor = 'rgba(212,168,67,.7)';
    });
    el.addEventListener('mouseleave', () => {
      dot.style.transform = 'translate(-50%,-50%) scale(1)';
      outline.style.transform = 'translate(-50%,-50%) scale(1)';
      outline.style.borderColor = 'rgba(212,168,67,.4)';
    });
  });
}

/* ── Navbar scroll ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ── Mobile Menu ── */
const toggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
toggle.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  toggle.classList.toggle('open', isOpen);
});
document.querySelectorAll('.mobile-nav-link, .mobile-menu .btn-primary').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    toggle.classList.remove('open');
  });
});

/* ── Counter animation ── */
function animateCounter(el) {
  const target = +el.dataset.target;
  const duration = 1800;
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + '+';
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));

/* ── Portfolio Filter ── */
const filterBtns = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    portfolioItems.forEach(item => {
      const show = filter === 'all' || item.dataset.category === filter;

      // Fade out first
      item.style.transition = 'opacity .2s, transform .2s';
      item.style.opacity = '0';
      item.style.transform = 'translateY(10px)';

      setTimeout(() => {
        // showcase items are grid rows — use grid, not block
        item.style.display = show ? 'grid' : 'none';
        if (show) {
          requestAnimationFrame(() => {
            item.style.transition = 'opacity .35s, transform .35s';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
          });
        }
      }, 200);
    });
  });
});

/* ── Contact Form ── */
document.getElementById('contact-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const btn = this.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Enviando...';

  setTimeout(() => {
    this.innerHTML = `
      <div class="form-success">
        <svg class="w-10 h-10 mx-auto mb-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h3 class="font-display font-bold text-lg mb-1 text-white">Mensagem enviada!</h3>
        <p class="text-gray-400 text-sm">Retornaremos em até 2 horas pelo WhatsApp ou e-mail informado.</p>
      </div>`;
  }, 1400);
});

/* ── Smooth active nav link on scroll ── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = link.getAttribute('href') === '#' + entry.target.id ? '#fff' : '';
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));

/* ── Lightbox ── */
(function () {
  const lb         = document.getElementById('lightbox');
  const overlay    = document.getElementById('lb-overlay');
  const img        = document.getElementById('lb-img');
  const imgWrap    = img.parentElement;
  const titleEl    = document.getElementById('lb-title');
  const descEl     = document.getElementById('lb-desc');
  const tagEl      = document.getElementById('lb-tag');
  const counter    = document.getElementById('lb-counter');
  const filmstrip  = document.getElementById('lb-filmstrip');
  const btnClose   = document.getElementById('lb-close');
  const btnPrev    = document.getElementById('lb-prev');
  const btnNext    = document.getElementById('lb-next');
  const btnZoom    = document.getElementById('lb-zoom');
  const zoomIn     = document.getElementById('lb-zoom-in-icon');
  const zoomOut    = document.getElementById('lb-zoom-out-icon');

  let items = [];
  let current = 0;
  let zoomed = false;

  function collect() {
    items = Array.from(document.querySelectorAll('.portfolio-clickable'));
  }

  /* Constrói a tira de thumbnails para o grupo atual */
  function buildFilmstrip() {
    filmstrip.innerHTML = '';
    if (items.length <= 1) return;

    items.forEach((card, i) => {
      const src = card.dataset.lightbox;
      if (!src) return;
      const thumb = document.createElement('div');
      thumb.className = 'lb-thumb' + (i === current ? ' lb-thumb-active' : '');
      const tImg = document.createElement('img');
      tImg.src = src;
      tImg.alt = card.dataset.title || '';
      tImg.loading = 'lazy';
      thumb.appendChild(tImg);
      thumb.addEventListener('click', (e) => { e.stopPropagation(); show(i); });
      filmstrip.appendChild(thumb);
    });
  }

  /* Atualiza destaque no filmstrip e rola para o thumb ativo */
  function updateFilmstrip() {
    const thumbs = filmstrip.querySelectorAll('.lb-thumb');
    thumbs.forEach((t, i) => t.classList.toggle('lb-thumb-active', i === current));
    if (thumbs[current]) {
      thumbs[current].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  function show(index) {
    if (!items.length) return;
    current = (index + items.length) % items.length;
    const card = items[current];
    setZoom(false);

    img.src = card.dataset.lightbox;
    img.alt = card.dataset.title || '';
    titleEl.textContent = card.dataset.title || '';
    descEl.textContent  = card.dataset.desc  || '';
    tagEl.textContent   = card.dataset.tag   || 'Portfólio';

    counter.textContent = items.length > 1 ? (current + 1) + ' / ' + items.length : '';
    btnPrev.style.display = items.length > 1 ? 'flex' : 'none';
    btnNext.style.display = items.length > 1 ? 'flex' : 'none';

    updateFilmstrip();
  }

  function open(index) {
    collect();
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    buildFilmstrip();
    show(index);
  }

  function close() {
    lb.style.display = 'none';
    document.body.style.overflow = '';
    img.src = '';
    filmstrip.innerHTML = '';
  }

  function setZoom(state) {
    zoomed = state;
    img.classList.toggle('zoomed', zoomed);
    imgWrap.classList.toggle('zoomed', zoomed);
    zoomIn.classList.toggle('hidden', zoomed);
    zoomOut.classList.toggle('hidden', !zoomed);
  }

  document.querySelectorAll('.portfolio-clickable').forEach((card) => {
    card.addEventListener('click', () => { collect(); open(items.indexOf(card)); });
  });

  btnClose.addEventListener('click', close);
  overlay.addEventListener('click', close);
  btnPrev.addEventListener('click', (e) => { e.stopPropagation(); show(current - 1); });
  btnNext.addEventListener('click', (e) => { e.stopPropagation(); show(current + 1); });
  btnZoom.addEventListener('click', (e) => { e.stopPropagation(); setZoom(!zoomed); });

  document.addEventListener('keydown', e => {
    if (lb.style.display === 'none') return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
})();

/* ── Particles (lightweight canvas) ── */
(function() {
  const canvas = document.createElement('canvas');
  const container = document.getElementById('particles-js');
  if (!container) return;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W, H, particles = [];

  function resize() {
    W = canvas.width = container.offsetWidth;
    H = canvas.height = container.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.r = Math.random() * 1.5 + 0.5;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.3;
      this.alpha = Math.random() * 0.4 + 0.05;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,168,67,${this.alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 60; i++) particles.push(new Particle());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }
  loop();
})();

/* ── Portfolio Video Players ── */
document.querySelectorAll('.pf-video').forEach(video => {
  const moldura  = video.closest('.pf-moldura');
  if (!moldura) return;
  const overlay  = moldura.querySelector('.pf-play-overlay');
  const playBtn  = moldura.querySelector('.pf-play-btn');
  const pauseBtn = moldura.querySelector('.pf-pause-btn');
  if (!overlay || !playBtn || !pauseBtn) return;

  function startPlay() {
    overlay.style.display  = 'none';
    pauseBtn.style.display = 'flex';
    video.play();
  }
  function stopPlay() {
    video.pause();
    overlay.style.display  = 'flex';
    pauseBtn.style.display = 'none';
  }

  playBtn.addEventListener('click',  (e) => { e.stopPropagation(); startPlay(); });
  pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); stopPlay(); });
  video.addEventListener('ended', stopPlay);
  video.addEventListener('click', () => { if (!video.paused) stopPlay(); });
});

/* ── Design Gallery — crossfade a cada 2.5s + lightbox ── */
(function () {
  const gallery = document.getElementById('pf-design-gallery');
  if (!gallery) return;

  const imgs    = Array.from(gallery.querySelectorAll('.pf-fade-img'));
  if (!imgs.length) return;

  let current = 0;
  let paused  = false;

  /* Avança para a próxima imagem com crossfade */
  function next() {
    if (paused) return;
    imgs[current].classList.remove('pf-fade-active');
    current = (current + 1) % imgs.length;
    imgs[current].classList.add('pf-fade-active');
  }

  /* Intervalo de 2.5 segundos (900ms fade + 1600ms visível) */
  setInterval(next, 2500);

  /* Pausa ao passar o mouse */
  gallery.addEventListener('mouseenter', () => { paused = true; });
  gallery.addEventListener('mouseleave', () => { paused = false; });

  /* Clique → abre lightbox na imagem que está visível agora */
  gallery.addEventListener('click', () => {
    const anchors = gallery.parentElement.querySelectorAll('.pf-lb-anchors .portfolio-clickable');
    if (anchors[current]) anchors[current].click();
  });
}());
