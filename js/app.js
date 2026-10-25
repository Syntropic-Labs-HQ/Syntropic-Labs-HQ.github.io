document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Mobile Navigation Toggle
  const navToggle = document.getElementById('nav-toggle');
  const mobileNav = document.getElementById('mobile-nav');

  function closeMobileNav() {
    if (!navToggle || !mobileNav) return;
    navToggle.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openMobileNav() {
    if (!navToggle || !mobileNav) return;
    navToggle.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('open');
    mobileNav.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) closeMobileNav();
      else openMobileNav();
    });

    mobileNav.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });

    mobileNav.addEventListener('click', (e) => {
      if (e.target === mobileNav) closeMobileNav();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        closeMobileNav();
        navToggle.focus();
      }
    });
  }

  // Live Studio UTC Time Ticker
  const timeTicker = document.getElementById('studio-time-ticker');
  function updateTime() {
    if (!timeTicker) return;
    const now = new Date();
    const utcHours = String(now.getUTCHours()).padStart(2, '0');
    const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
    const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
    timeTicker.textContent = `${utcHours}:${utcMinutes}:${utcSeconds} UTC`;
  }
  updateTime();
  setInterval(updateTime, 1000);

  // Navigation Active State on Scroll
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });

  // 3D Card Tilt on Selected Work
  const tiltCards = document.querySelectorAll('[data-tilt]');
  const isTouchDevice = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;

  if (!isTouchDevice) {
    tiltCards.forEach(card => {
      const inner = card.querySelector('.work-card-inner');
      if (!inner) return;

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -9;
        const rotateY = ((x - centerX) / centerX) * 9;

        inner.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
      });

      card.addEventListener('mouseleave', () => {
        inner.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      });
    });
  }

  // Procedural Canvas Animation for Work Cards
  const workCanvases = document.querySelectorAll('.work-preview-canvas');

  workCanvases.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    const type = canvas.getAttribute('data-type');

    function setCanvasResolution() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 1.5;
      canvas.height = rect.height * 1.5;
    }
    setCanvasResolution();
    window.addEventListener('resize', setCanvasResolution);

    let frame = 0;
    let isHovered = false;

    const parentCard = canvas.closest('.work-card');
    if (parentCard) {
      parentCard.addEventListener('mouseenter', () => { isHovered = true; });
      parentCard.addEventListener('mouseleave', () => { isHovered = false; });
    }

    function renderCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      frame += isHovered ? 0.045 : 0.015;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#181818';
      ctx.lineWidth = 1;
      const step = 28;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (type === 'crystalline') {
        const nodes = [
          { x: 0, y: -70, z: 0 },
          { x: 50, y: 0, z: 50 },
          { x: -50, y: 0, z: 50 },
          { x: -50, y: 0, z: -50 },
          { x: 50, y: 0, z: -50 },
          { x: 0, y: 70, z: 0 }
        ];

        const cosY = Math.cos(frame);
        const sinY = Math.sin(frame);
        const cosX = Math.cos(frame * 0.7);
        const sinX = Math.sin(frame * 0.7);

        const projected = nodes.map(n => {
          const x1 = n.x * cosY + n.z * sinY;
          const z1 = -n.x * sinY + n.z * cosY;
          const y2 = n.y * cosX - z1 * sinX;
          const z2 = n.y * sinX + z1 * cosX;

          const fov = 220;
          const scale = fov / (fov + z2);
          return {
            x: cx + x1 * scale * (isHovered ? 1.3 : 1.1),
            y: cy + y2 * scale * (isHovered ? 1.3 : 1.1)
          };
        });

        ctx.strokeStyle = isHovered ? '#d4f53c' : '#888884';
        ctx.lineWidth = isHovered ? 1.8 : 1.2;
        const edges = [
          [0, 1], [0, 2], [0, 3], [0, 4],
          [5, 1], [5, 2], [5, 3], [5, 4],
          [1, 2], [2, 3], [3, 4], [4, 1]
        ];

        edges.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(projected[a].x, projected[a].y);
          ctx.lineTo(projected[b].x, projected[b].y);
          ctx.stroke();
        });

        projected.forEach(p => {
          ctx.fillStyle = '#d4f53c';
          ctx.beginPath();
          ctx.arc(p.x, p.y, isHovered ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        });

      } else if (type === 'monolith') {
        ctx.strokeStyle = isHovered ? '#d4f53c' : '#333333';
        ctx.lineWidth = 1.2;
        const rows = 12;
        const cols = 18;

        for (let r = 0; r < rows; r++) {
          ctx.beginPath();
          for (let c = 0; c < cols; c++) {
            const px = (c / (cols - 1)) * (w * 0.75) + w * 0.125;
            const py = (r / (rows - 1)) * (h * 0.6) + h * 0.22 +
              Math.sin(c * 0.5 + frame + r * 0.3) * (isHovered ? 16 : 8);

            if (c === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

      } else if (type === 'entropy') {
        ctx.strokeStyle = isHovered ? '#d4f53c' : '#444444';
        ctx.lineWidth = 1;

        for (let rad = 25; rad <= 110; rad += 25) {
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.stroke();
        }

        const beamAngle = frame * 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(beamAngle) * 110, cy + Math.sin(beamAngle) * 110);
        ctx.strokeStyle = '#d4f53c';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#d4f53c';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(renderCanvas);
    }

    renderCanvas();
  });

  // Process Progression Reveal
  const processSection = document.getElementById('process');
  const processSteps = document.querySelectorAll('.process-step');

  if (processSection && processSteps.length) {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -15% 0px',
      threshold: 0.1,
    };

    const stepObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          const stepNum = entry.target.getAttribute('data-step');
          document.querySelectorAll('.step-link').forEach(link => {
            if (link.getAttribute('data-from') === stepNum || link.getAttribute('data-to') === stepNum) {
              link.classList.add('active');
            }
          });
        }
      });
    }, observerOptions);

    processSteps.forEach((step) => {
      stepObserver.observe(step);
    });
  }

  // Project Inquiry Form: Scope & Budget Pills & Submit
  const form = document.getElementById('project-inquiry-form');
  const feedback = document.getElementById('form-feedback');

  document.querySelectorAll('.scope-pills').forEach(group => {
    const buttons = group.querySelectorAll('.pill-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
      });
    });
  });

  const allPillGroups = document.querySelectorAll('.scope-pills');
  allPillGroups.forEach(group => {
    const prevLabel = group.previousElementSibling;
    if (prevLabel && prevLabel.tagName === 'LABEL' && prevLabel.textContent.includes('approximate budget')) {
      const buttons = group.querySelectorAll('.pill-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('client-name').value.trim();
      const email = document.getElementById('client-email').value.trim();

      const activeScopeBtns = form.querySelectorAll('.scope-pills .pill-btn.active');
      const activeScopes = Array.from(activeScopeBtns).map(btn => btn.dataset.scope).filter(s => s);
      const scopeDisplay = activeScopes.length > 0 ? activeScopes.join(', ') : 'not specified';

      const budgetBtn = form.querySelector('.budget-pills .pill-btn.active');
      const selectedBudget = budgetBtn ? budgetBtn.dataset.budget : 'not specified';

      if (!name || !email) {
        feedback.className = 'form-feedback-msg error';
        feedback.textContent = '[ERROR // REQUIRED FIELDS INCOMPLETE]';
        return;
      }

      feedback.className = 'form-feedback-msg success';
      feedback.textContent = `[DISPATCH TRANSMITTED] Thank you, ${name}. Our AI systems team has received your brief covering [${scopeDisplay}]. Budget range: [${selectedBudget}]. Response ETA: < 24 Hours.`;

      form.reset();
      form.querySelectorAll('.scope-pills .pill-btn')?.forEach(b => b.classList.remove('active'));
      form.querySelectorAll('.budget-pills .pill-btn')?.forEach(b => b.classList.remove('active'));
      form.querySelector('[data-scope="ai-chatbot"]')?.classList.add('active');

      setTimeout(() => {
        feedback.textContent = '';
        feedback.className = 'form-feedback-msg';
      }, 7000);
    });
  }

  // Project Case Study Modal
  const modalCase = document.getElementById('modal-case');

  window.addEventListener('click', (e) => {
    if (e.target === modalCase) {
      modalCase.classList.remove('open');
      modalCase.setAttribute('aria-hidden', 'true');
    }
  });
  const modalCaseTitle = document.getElementById('case-modal-title');
  const modalCaseBody = document.getElementById('case-modal-body');
  const btnCloseCase = document.getElementById('modal-case-close');

  const caseData = {
    '01': {
      title: 'MERIDIAN LEGAL // ENTERPRISE RAG KNOWLEDGE BASE',
      client: 'Meridian Legal Partners',
      timeline: '4 Weeks',
      stack: 'LangChain, Pinecone, OpenAI GPT-4, Node.js, React',
      overview: 'Private document Q&A system that indexes 50,000+ legal contracts and case files. Lawyers get instant, cited answers from their own knowledge base with zero data leakage and full source attribution.',
      metrics: '80% reduction in document review time; 95% answer accuracy on legal queries.'
    },
    '02': {
      title: 'NEXUS COMMERCE // AUTONOMOUS SALES AGENT',
      client: 'Nexus Commerce Inc.',
      timeline: '5 Weeks',
      stack: 'AutoGen, OpenAI API, Salesforce API, Slack, Node.js',
      overview: 'AI agent that qualifies inbound leads, books sales calls, and updates the CRM autonomously. Handled 3,000+ conversations in the first month with 94% accuracy and zero human handoff for qualified prospects.',
      metrics: '3,000+ conversations handled; 94% lead qualification accuracy; 40% increase in booked demos.'
    },
    '03': {
      title: 'VERTEX LOGISTICS // AI OPERATIONS DASHBOARD',
      client: 'Vertex Logistics Group',
      timeline: '6 Weeks',
      stack: 'React, Node.js, Python, LangChain, PostgreSQL, Web Sockets',
      overview: 'Web dashboard with AI-powered automation workflows connecting inventory, shipping, and vendor systems. Reduced manual operations work by 70% across 12 facilities with real-time exception alerting.',
      metrics: '70% reduction in manual ops work; 12 facilities connected; real-time alerts across supply chain.'
    }
  };

  if (btnCloseCase && modalCase) {
    btnCloseCase.addEventListener('click', () => {
      modalCase.classList.remove('open');
      modalCase.setAttribute('aria-hidden', 'true');
    });
  }

  tiltCards.forEach(card => {
    card.addEventListener('click', () => {
      const projId = card.getAttribute('data-project');
      const data = caseData[projId];
      if (!data || !modalCase) return;

      modalCaseTitle.innerHTML = `<span class="accent-square"></span><span>${data.title}</span>`;
      modalCaseBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px; background: #0e0e0e; border: 1px solid #2a2a2a; font-family: var(--font-mono); font-size: 11px;">
            <div><span style="color:#555552; display:block;">CLIENT</span><strong style="color:#f0f0ee;">${data.client}</strong></div>
            <div><span style="color:#555552; display:block;">TIMELINE</span><strong style="color:#d4f53c;">${data.timeline}</strong></div>
            <div><span style="color:#555552; display:block;">PERFORMANCE</span><strong style="color:#d4f53c;">60 FPS LOCKED</strong></div>
          </div>
          <div>
            <span style="font-family: var(--font-mono); font-size: 11px; color:#555552; display:block; margin-bottom: 6px;">TECH STACK</span>
            <p style="font-family: var(--font-mono); font-size: 13px; color:#d4f53c;">${data.stack}</p>
          </div>
          <div>
            <span style="font-family: var(--font-mono); font-size: 11px; color:#555552; display:block; margin-bottom: 6px;">PROJECT OVERVIEW</span>
            <p style="font-size: 14px; line-height: 1.6; color:#888884;">${data.overview}</p>
          </div>
          <div style="padding-top: 16px; border-top: 1px solid #2a2a2a;">
            <span style="font-family: var(--font-mono); font-size: 11px; color:#555552; display:block; margin-bottom: 6px;">MARKET IMPACT</span>
            <p style="font-size: 14px; color:#f0f0ee; font-weight:600;">${data.metrics}</p>
          </div>
          <div style="margin-top: 12px; display:flex; justify-content:flex-end;">
            <a href="#booking" class="btn btn-primary btn-sm" onclick="document.getElementById('modal-case').classList.remove('open')">INQUIRE ABOUT SIMILAR SCOPE</a>
          </div>
        </div>
      `;

      modalCase.classList.add('open');
      modalCase.setAttribute('aria-hidden', 'false');
    });
  });

  // FAQ Accordion Toggle
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      faqItems.forEach(other => {
        other.classList.remove('active');
        other.querySelector('.faq-trigger')?.setAttribute('aria-expanded', 'false');
      });

      if (!isActive) {
        item.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });
});
