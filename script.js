/**
 * CHORN PHILIP - PORTFOLIO APPLICATION LOGIC (v3)
 * Blueprint canvas, 3D parallax, specialty switcher, visitor quick-start, project pop-ups
 * with deep links, live engineering simulators, optional sound FX and a real mailto contact form.
 * All visible text produced here goes through window.I18n (see i18n.js) so it follows the
 * selected language (English / Khmer / Chinese).
 */

/* Small helpers ---------------------------------------------------------- */
const t = (key, vars) => (window.I18n ? window.I18n.ui(key, vars) : key);
const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('js-ready');
    initBlueprintCanvas();
    initHeroParallax();
    initRoleSwitcher();
    init3DTilt();
    initNavigation();
    initProjectFilters();
    initProjectCards();
    initSimulators();
    initAudioFX();
    initScrollReveal();
    initCounters();
    initIntentPicker();
    initContactForm();
    openProjectFromHash();

    if (window.I18n) {
        window.I18n.onChange(() => {
            refreshRoleLabel();
            refreshAudioLabel();
            refreshIntentPanel();
            refreshOpenModal();
            refreshSimulators();
        });
    }
});

/* ==========================================================================
   01. INTERACTIVE BLUEPRINT & CIRCUIT CANVAS
   ========================================================================== */
function initBlueprintCanvas() {
    // Animated MEP / Robotics / STEM backgrounds live in scenes.js
    if (window.BgScenes) window.BgScenes.init();
}

/* ==========================================================================
   02. 3D HERO PARALLAX
   ========================================================================== */
function initHeroParallax() {
    const heroSection = document.getElementById('home');
    const subject = document.getElementById('subject-parallax');
    const cursorGlow = document.getElementById('cursor-glow');
    const kineticTypography = document.querySelector('.kinetic-typography-layer');
    const badges = document.querySelectorAll('.floating-badge');

    if (!heroSection || prefersReducedMotion) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (cursorGlow) {
            cursorGlow.style.left = `${mouseX}px`;
            cursorGlow.style.top = `${mouseY}px`;
        }
    });

    function updateParallax() {
        // Skip when hero is off-screen or on small screens
        const heroBottom = heroSection.getBoundingClientRect().bottom;
        if (window.innerWidth <= 768 || heroBottom < 0) {
            if (window.innerWidth <= 768) {
                if (subject) subject.style.transform = '';
                badges.forEach(b => { b.style.transform = ''; });
            }
            requestAnimationFrame(updateParallax);
            return;
        }

        currentX += (mouseX - currentX) * 0.08;
        currentY += (mouseY - currentY) * 0.08;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const deltaX = (currentX - centerX) / centerX;
        const deltaY = (currentY - centerY) / centerY;

        if (subject) {
            subject.style.transform = `perspective(1000px) rotateX(${-deltaY * 7}deg) rotateY(${deltaX * 8}deg) translateX(${deltaX * 12}px)`;
        }
        if (kineticTypography) {
            kineticTypography.style.transform = `translate(calc(-50% + ${-deltaX * 22}px), calc(-50% + ${-deltaY * 12}px))`;
        }
        badges.forEach(badge => {
            const depth = parseFloat(badge.getAttribute('data-depth')) || 30;
            badge.style.transform = `translate3d(${deltaX * depth}px, ${deltaY * depth}px, ${depth * 2}px)`;
        });

        requestAnimationFrame(updateParallax);
    }

    updateParallax();
}

/* ==========================================================================
   03. SPECIALTY SWITCHER (MEP ⇄ ROBOTICS ⇄ STEM)
   ========================================================================== */
let heroFlipState = 0; // 0 = MEP, 1 = Robotics, 2 = STEM
const ROLE_KEYS = ['mep', 'robo', 'stem'];
const ROLE_GLOWS = [
    'radial-gradient(circle, rgba(0, 242, 254, 0.25) 0%, rgba(245, 158, 11, 0.15) 40%, transparent 70%)',
    'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(239, 68, 68, 0.15) 45%, transparent 70%)',
    'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(109, 40, 217, 0.15) 45%, transparent 70%)'
];

function setHeroRole(index, { silent = false } = {}) {
    const flipper = document.getElementById('cutout-flipper');
    const backdropGlow = document.querySelector('.subject-glow-backdrop');
    if (!flipper) return;

    heroFlipState = ((index % 3) + 3) % 3;
    flipper.classList.remove('flipped', 'flipped-stem');
    if (heroFlipState === 1) flipper.classList.add('flipped');
    if (heroFlipState === 2) flipper.classList.add('flipped-stem');
    if (backdropGlow) backdropGlow.style.background = ROLE_GLOWS[heroFlipState];

    document.querySelectorAll('.role-seg-btn').forEach(btn => {
        const on = Number(btn.dataset.role) === heroFlipState;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const seg = document.querySelector('.role-segment');
    if (seg) seg.dataset.active = String(heroFlipState);

    refreshRoleLabel();
    if (window.BgScenes) window.BgScenes.setScene(heroFlipState);
    if (!silent) {
        playAudioBeep([720, 520, 660][heroFlipState], 0.08, heroFlipState === 1 ? 'triangle' : 'sine', 0.08);
        showToast(t('toast.' + ROLE_KEYS[heroFlipState]));
    }
}

function refreshRoleLabel() {
    const roleText = document.getElementById('active-role-text');
    if (roleText) roleText.textContent = t('role.' + ROLE_KEYS[heroFlipState]);
    const sceneName = document.getElementById('scene-name');
    if (sceneName) sceneName.textContent = t('scene.' + ROLE_KEYS[heroFlipState]);
    const chip = document.getElementById('scene-chip');
    if (chip) chip.dataset.scene = String(heroFlipState);
}

window.toggleHeroFlip = function (event) {
    if (event) event.stopPropagation();
    setHeroRole(heroFlipState + 1);
};

function initRoleSwitcher() {
    document.getElementById('scene-chip')?.addEventListener('click', () => setHeroRole(heroFlipState + 1));
    document.querySelectorAll('.role-seg-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setHeroRole(Number(btn.dataset.role));
        });
    });
    refreshRoleLabel();
}

/* ==========================================================================
   04. 3D TILT EFFECT ON GLASS CARDS
   ========================================================================== */
function init3DTilt() {
    if (prefersReducedMotion || !window.matchMedia('(hover: hover)').matches) return;
    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -4;
            const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 4;
            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

/* ==========================================================================
   05. NAVIGATION, PROGRESS BAR & MOBILE DRAWER
   ========================================================================== */
function initNavigation() {
    const nav = document.querySelector('.glass-nav');
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.querySelectorAll('.nav-link, .mob-link');
    const progress = document.getElementById('scroll-progress');
    const dockTop = document.getElementById('dock-top');
    const sections = document.querySelectorAll('section[id]');

    let ticking = false;
    function onScroll() {
        const y = window.scrollY;
        if (nav) nav.classList.toggle('scrolled', y > 40);

        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
        if (dockTop) dockTop.classList.toggle('visible', y > window.innerHeight * 0.8);

        const scrollPos = y + 160;
        let currentId = null;
        sections.forEach(sec => {
            if (scrollPos >= sec.offsetTop && scrollPos < sec.offsetTop + sec.offsetHeight) currentId = sec.id;
        });
        if (currentId === 'intent') currentId = 'home';
        if (currentId) {
            navLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
            });
        }
        ticking = false;
    }
    window.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    function setMenu(open) {
        if (!mobileMenu || !mobileToggle) return;
        mobileMenu.classList.toggle('open', open);
        mobileToggle.classList.toggle('is-open', open);
        mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('menu-open', open);
    }

    if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', () => {
            setMenu(!mobileMenu.classList.contains('open'));
            playAudioBeep(650, 0.05);
        });
        document.querySelectorAll('.mob-link, .mobile-actions a').forEach(link => {
            link.addEventListener('click', () => setMenu(false));
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('open')) setMenu(false);
        });
    }
}

/* ==========================================================================
   06. PROJECT FILTERS (with counts)
   ========================================================================== */
function applyProjectFilter(filter) {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    filterBtns.forEach(b => {
        const on = b.getAttribute('data-filter') === filter;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    projectCards.forEach(card => {
        const show = filter === 'all' || card.getAttribute('data-category') === filter;
        card.style.display = show ? 'flex' : 'none';
        if (show && !prefersReducedMotion) card.style.animation = 'fadeIn 0.4s ease';
    });
}

function initProjectFilters() {
    const cards = Array.from(document.querySelectorAll('.project-card'));
    document.querySelectorAll('.filter-count').forEach(el => {
        const cat = el.getAttribute('data-count');
        el.textContent = cat === 'all' ? cards.length : cards.filter(c => c.dataset.category === cat).length;
    });
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            playAudioBeep(520, 0.04);
            applyProjectFilter(btn.getAttribute('data-filter'));
        });
    });
}

/* Whole card opens the pop-up (links and buttons inside still work normally) */
function initProjectCards() {
    document.querySelectorAll('.project-card').forEach(card => {
        const id = card.getAttribute('data-project-id');
        card.addEventListener('click', (e) => {
            if (e.target.closest('a, button')) return;
            openProjectModal(id);
        });
        card.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target === card) {
                e.preventDefault();
                openProjectModal(id);
            }
        });
    });
}

/* ==========================================================================
   07. PROJECT POP-UP DATA (English) — translations are in i18n.js
   ========================================================================== */
const PROJECT_ORDER = ['mep-hvac', 'drone', 'quadruped', 'linefollower', 'dialux', 'pcb'];
const PROJECT_DETAILS = {
    'mep-hvac': {
        title: "Commercial MEP & HVAC Infrastructure Systems",
        category: "B&MEP Engineering Construction Co., Ltd // Commercial Grade",
        period: "2025 – Present",
        icon: "🏢",
        overview: "On-site MEP technician responsible for HVAC chilled-air and VRV system installation, single-line power distribution and plumbing coordination. Connected design drawings with real site conditions so conduit and duct routes don't clash.",
        specs: [
            { k: "Company", v: "B&MEP Engineering Construction Co., Ltd" },
            { k: "Main Responsibilities", v: "HVAC Installation, As-Built MEP Drafts, BOQ Preparation" },
            { k: "Engineering Software", v: "AutoCAD MEP, DIALux evo, Microsoft Project, Excel BOQ" },
            { k: "Electrical Scope", v: "Low Voltage Distribution Boards (LV-DB), Conduit Routing, Cable Trays" },
            { k: "HVAC Scope", v: "Duct sizing, Air Flow balancing (CFM), Refrigerant copper piping, VRV" }
        ],
        highlights: [
            "Prepared precise Bills of Quantities (BOQ) with material cost breakdowns, reducing procurement waste.",
            "Drafted shop drawings and coordinated layouts between structural, architectural and electrical teams.",
            "Supervised on-site testing and commissioning of ventilation ducts and electrical phase balancing."
        ],
        links: [
            { label: "📁 On-Site Field Drive", url: "https://drive.google.com/drive/folders/1jRVgnTwe4oBzhM4AXFsTUW9eRj5opsep?usp=sharing", type: "drive" },
            { label: "📐 Office Design Drive", url: "https://drive.google.com/drive/folders/1Iauf2hc7H5q5cCbdn31uX2edqLvJHxO3?usp=sharing", type: "drive" }
        ]
    },
    'drone': {
        title: "Autonomous Agricultural Spraying Drone",
        category: "Precision Agri-Tech // Autonomous Quadcopter Robotics",
        period: "2025 – 2026",
        icon: "🚁",
        overview: "Designed and prototyped a compact autonomous spraying drone on an F450 quadcopter frame. Integrated a Pixhawk flight controller with GPS, efficient SunnySky brushless motors and a micro water pump for automatic waypoint flight and targeted spraying.",
        specs: [
            { k: "Frame", v: "F450 Quadcopter X-Frame" },
            { k: "Propulsion", v: "SunnySky Brushless Motors with 30A ESCs" },
            { k: "Flight Controller & GPS", v: "Pixhawk with GPS & Compass Module" },
            { k: "Payload & Spraying", v: "Micro Water Pump with Spray Nozzle" },
            { k: "Control & Telemetry", v: "ExpressLRS Radio Link & Mission Planner Waypoints" }
        ],
        highlights: [
            "Configured the Pixhawk, calibrated the compass and set up GPS waypoint navigation in Mission Planner.",
            "Integrated a micro pump synchronised with flight controls for precise targeted spraying."
        ],
        links: [
            { label: "📁 Quadcopter Project Drive", url: "https://drive.google.com/drive/folders/1SXOPA0mHIRif5qI7VDVZ5DIcDdlCe4ZN?usp=sharing", type: "drive" }
        ]
    },
    'quadruped': {
        title: "Voice-Interactive Quadruped (4-Legged) Walking Robot",
        category: "Biomimetic Robotics & Speech Processing",
        period: "2025 – 2026",
        icon: "🤖",
        overview: "Built an 8-DOF four-legged walking robot with coordinated leg movement and gait control. Added voice command recognition and speech output so the robot can talk with users while walking steadily.",
        specs: [
            { k: "Degrees of Freedom", v: "8 High-Torque Servos (2 per leg)" },
            { k: "Kinematics Control", v: "Custom Trot Gait Generation & Leg Kinematics" },
            { k: "Processing & Audio", v: "Microcontroller + Voice Recognition & Speech Synthesis" },
            { k: "Fabrication", v: "3D-Designed Chassis with Multi-Axis Servo Brackets" }
        ],
        highlights: [
            "Built a four-legged chassis with a balanced centre of mass and stable forward/turning gaits.",
            "Integrated a voice command module so users can control the robot and it moves on its own."
        ],
        links: [
            { label: "📁 Quadruped Project Drive", url: "https://drive.google.com/drive/folders/1LS8MxVf53c4X_F-wFqlXthylPBTje6_q?usp=drive_link", type: "drive" },
            { label: "▶️ Demo Video (Part 1)", url: "https://web.facebook.com/share/v/1ddWdMBkCm/", type: "video" },
            { label: "▶️ Demo Video (Part 2)", url: "https://web.facebook.com/share/v/19NV1ZCP3j/", type: "video" }
        ]
    },
    'linefollower': {
        title: "1st Place Championship Line Follower Robot",
        category: "ITC Official Robotics Competition // Champion",
        period: "2025 – 2026",
        icon: "🥇",
        overview: "Won 1st Place overall in the Line Follower Robot Competition at the Institute of Technology of Cambodia. Designed a custom KiCad PCB with a 5-channel infrared sensor array and fast 900 RPM N20 micro motors, programmed for precise track navigation and set tasks.",
        specs: [
            { k: "Achievement", v: "🏆 1st Place Champion (Institute of Technology of Cambodia)" },
            { k: "Control Algorithm", v: "High-Precision PID (Proportional-Integral-Derivative) Control" },
            { k: "Hardware", v: "Custom KiCad Printed Circuit Board (PCB)" },
            { k: "Sensor Array", v: "5-Channel Infrared (IR) Reflectance Sensors" },
            { k: "Motors", v: "900 RPM Micro Metal Gear Motors" }
        ],
        highlights: [
            "Tuned PID parameters for smooth high-speed line tracking and sharp cornering with 900 RPM motors.",
            "Programmed routines to detect intersections, make autonomous moves and complete course objectives."
        ],
        links: [
            { label: "📁 Line Follower Project Drive", url: "https://drive.google.com/drive/folders/1AfE8Use7veXtqmIMWOBtyBM0xQOPRKwj?usp=drive_link", type: "drive" }
        ]
    },
    'dialux': {
        title: "Architectural & Industrial Lighting Design",
        category: "DIALux evo 3D // Lighting Engineering",
        period: "2025",
        icon: "💡",
        overview: "Photometric calculations and 3D lighting simulations for industrial workshops and office buildings in DIALux evo. Delivered iso-lux maps, Unified Glare Rating (UGR) checks and energy compliance to EN 12464.",
        specs: [
            { k: "Simulation Software", v: "DIALux evo 12 & AutoCAD Architecture" },
            { k: "Standard", v: "EN 12464-1 (Indoor Workplace Lighting)" },
            { k: "Key Deliverables", v: "False-Colour Lux Maps, Luminaire Schedules, Power Density (W/m²)" },
            { k: "Luminaire Data", v: "IES / LDT photometric curve analysis" }
        ],
        highlights: [
            "Optimised luminaire spacing and selection to reach a 500 lux average while cutting power load by 18%.",
            "Planned emergency exit lighting routes and battery-backup lux distribution."
        ],
        links: [
            { label: "📁 Lighting Simulation Drive", url: "https://drive.google.com/drive/folders/1Iauf2hc7H5q5cCbdn31uX2edqLvJHxO3?usp=sharing", type: "drive" }
        ]
    },
    'pcb': {
        title: "Custom Sensor Integration & Motor Driver Modules",
        category: "KiCad EDA & LTspice // Analog & Digital Hardware",
        period: "2024 – 2026",
        icon: "⚡",
        overview: "Designed robust embedded controller circuits, power regulation and optical isolation interfaces for high-power DC motors and microcontrollers.",
        specs: [
            { k: "EDA Tools", v: "KiCad 8.0 (Schematic & PCB Editor), LTspice XVII" },
            { k: "Power Regulation", v: "Low-Dropout Regulators (LDO), Buck Converters with EMI Filtering" },
            { k: "Isolation & Protection", v: "High-speed optocouplers, flyback TVS diodes, reverse polarity protection" }
        ],
        highlights: [
            "Eliminated microcontroller brownouts and motor back-EMF noise with isolated ground planes and bypass capacitors.",
            "Verified transient and frequency responses with a digital oscilloscope."
        ],
        links: [
            { label: "📁 Hardware & Schematic Drive", url: "https://drive.google.com/drive/folders/1AfE8Use7veXtqmIMWOBtyBM0xQOPRKwj?usp=drive_link", type: "drive" }
        ]
    }
};

let openProjectId = null;
let lastFocusedBeforeModal = null;

function getProjectData(id) {
    const base = PROJECT_DETAILS[id];
    if (!base) return null;
    const tr = window.I18n ? window.I18n.project(id) : null;
    if (!tr) return base;
    const present = document.querySelector('[data-i18n="common.present"]')?.textContent || 'Present';
    return {
        ...base,
        title: tr.title || base.title,
        category: tr.category || base.category,
        period: base.period.replace('Present', present),
        overview: tr.overview || base.overview,
        specs: tr.specs || base.specs,
        highlights: tr.highlights || base.highlights,
        links: base.links.map((l, i) => ({ ...l, label: (tr.links && tr.links[i]) || l.label }))
    };
}

function renderProjectModal(id) {
    const data = getProjectData(id);
    if (!data) return;
    const content = document.getElementById('modal-content');
    const idx = PROJECT_ORDER.indexOf(id);
    const prevId = PROJECT_ORDER[(idx - 1 + PROJECT_ORDER.length) % PROJECT_ORDER.length];
    const nextId = PROJECT_ORDER[(idx + 1) % PROJECT_ORDER.length];

    const specsHtml = data.specs.map(s => `<tr><th>${s.k}</th><td>${s.v}</td></tr>`).join('');
    const highlightsHtml = data.highlights.map(h => `<li>▹ ${h}</li>`).join('');
    const linksHtml = data.links && data.links.length ? `
        <h3 class="modal-h3">${t('modal.links')}</h3>
        <div class="modal-links-row">
            ${data.links.map(l => `
                <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="modal-link-btn ${l.type === 'video' ? 'btn-amber' : 'btn-cyan'}">
                    <span>${l.label}</span>
                    <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                </a>`).join('')}
        </div>` : '';

    content.innerHTML = `
        <div class="modal-topline">
            <span class="modal-counter">${t('modal.count', { i: idx + 1, n: PROJECT_ORDER.length })}</span>
            <button type="button" class="modal-share" data-share="${id}">🔗 ${t('modal.share')}</button>
        </div>
        <div class="modal-icon">${data.icon}</div>
        <div class="modal-spec-badge">${data.category} &bull; ${data.period}</div>
        <h2 class="modal-title" id="modal-title">${data.title}</h2>
        <p class="modal-details">${data.overview}</p>

        <h3 class="modal-h3">${t('modal.specs')}</h3>
        <table class="modal-specs-table"><tbody>${specsHtml}</tbody></table>

        <h3 class="modal-h3">${t('modal.highlights')}</h3>
        <ul class="modal-highlights">${highlightsHtml}</ul>

        ${linksHtml}

        <div class="modal-nav-row">
            <button type="button" class="btn-glass modal-step" data-goto="${prevId}">← ${t('modal.prev')}</button>
            <button type="button" class="btn-glass modal-step" data-goto="${nextId}">${t('modal.next')} →</button>
            <button type="button" onclick="closeProjectModal()" class="btn-cyan modal-close-btn">${t('modal.close')}</button>
        </div>
    `;

    content.querySelectorAll('.modal-step').forEach(btn => {
        btn.addEventListener('click', () => openProjectModal(btn.dataset.goto));
    });
    content.querySelector('.modal-share')?.addEventListener('click', () => {
        const url = `${location.origin}${location.pathname}${location.search}#project-${id}`;
        copyText(url).then(() => showToast(t('modal.linkCopied'))).catch(() => showToast(url));
    });
}

window.openProjectModal = function (id) {
    if (!PROJECT_DETAILS[id]) return;
    const modal = document.getElementById('project-modal');
    const wasOpen = modal.classList.contains('active');
    if (!wasOpen) lastFocusedBeforeModal = document.activeElement;

    playAudioBeep(780, 0.05);
    openProjectId = id;
    renderProjectModal(id);

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-container').scrollTop = 0;
    try { history.replaceState(null, '', `#project-${id}`); } catch (e) {}
    modal.querySelector('.modal-close')?.focus({ preventScroll: true });
};

window.closeProjectModal = function () {
    const modal = document.getElementById('project-modal');
    if (!modal || !modal.classList.contains('active')) return;
    playAudioBeep(450, 0.04);
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    openProjectId = null;
    try {
        if (location.hash.indexOf('#project-') === 0) history.replaceState(null, '', location.pathname + location.search + '#projects');
    } catch (e) {}
    if (lastFocusedBeforeModal && lastFocusedBeforeModal.focus) lastFocusedBeforeModal.focus({ preventScroll: true });
};

function refreshOpenModal() {
    if (openProjectId) renderProjectModal(openProjectId);
}

function openProjectFromHash() {
    const m = location.hash.match(/^#project-([\w-]+)$/);
    if (m && PROJECT_DETAILS[m[1]]) {
        document.getElementById('projects')?.scrollIntoView();
        setTimeout(() => openProjectModal(m[1]), 300);
    }
}

window.addEventListener('keydown', (e) => {
    if (!openProjectId) return;
    if (e.key === 'Escape') closeProjectModal();
    const idx = PROJECT_ORDER.indexOf(openProjectId);
    if (e.key === 'ArrowRight') openProjectModal(PROJECT_ORDER[(idx + 1) % PROJECT_ORDER.length]);
    if (e.key === 'ArrowLeft') openProjectModal(PROJECT_ORDER[(idx - 1 + PROJECT_ORDER.length) % PROJECT_ORDER.length]);
});

document.getElementById('project-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'project-modal') closeProjectModal();
});

/* ==========================================================================
   08. INTERACTIVE TECH LAB SIMULATORS
   ========================================================================== */
let refreshSimulators = () => {};

function initSimulators() {
    const tabs = document.querySelectorAll('.lab-tab');
    const panes = document.querySelectorAll('.sim-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            playAudioBeep(600, 0.04);
            tabs.forEach(tb => { tb.classList.remove('active'); tb.setAttribute('aria-selected', 'false'); });
            panes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const target = tab.getAttribute('data-sim');
            const targetPane = document.getElementById(`sim-${target}`);
            if (targetPane) {
                targetPane.classList.add('active');
                if (target === 'pid') drawPIDGraph();
            }
        });
    });

    // 1. HVAC cooling load
    const inputArea = document.getElementById('input-area');
    const inputHeight = document.getElementById('input-height');
    const inputOccupants = document.getElementById('input-occupants');
    const inputSpace = document.getElementById('input-spacetype');

    function updateMEP() {
        if (!inputArea) return;
        const area = parseFloat(inputArea.value);
        const height = parseFloat(inputHeight.value);
        const occupants = parseInt(inputOccupants.value, 10);
        const space = inputSpace.value;

        document.getElementById('val-area').textContent = area;
        document.getElementById('val-height').textContent = height.toFixed(1);
        document.getElementById('val-occupants').textContent = occupants;

        const volume = area * height;
        let baseBTUPerM2 = 550;
        if (space === 'server') baseBTUPerM2 = 1100;
        if (space === 'residential') baseBTUPerM2 = 450;

        const totalBTU = (area * baseBTUPerM2) + (occupants * 450);
        const tons = totalBTU / 12000;
        const kw = tons * 3.517;
        const cfm = totalBTU / 21.6;
        const m3h = cfm * 1.699;
        const ductAreaSqFt = cfm / 850;
        const ductDiaMm = Math.round(Math.sqrt((4 * ductAreaSqFt) / Math.PI) * 304.8);

        document.getElementById('out-volume').textContent = `${volume.toFixed(1)} m³`;
        document.getElementById('out-btu').textContent = `${Math.round(totalBTU).toLocaleString()} BTU/h`;
        document.getElementById('out-tons').textContent = `(${tons.toFixed(2)} Tons / ${kw.toFixed(2)} kW)`;
        document.getElementById('out-cfm').textContent = `${Math.round(cfm).toLocaleString()} CFM`;
        document.getElementById('out-m3h').textContent = `(${Math.round(m3h).toLocaleString()} m³/h)`;
        document.getElementById('out-duct').textContent = `Ø ${ductDiaMm} mm (${Math.round(ductDiaMm / 25.4)} in)`;
    }
    [inputArea, inputHeight, inputOccupants, inputSpace].forEach(el => { if (el) el.addEventListener('input', updateMEP); });
    updateMEP();

    // 2. PID
    const inputKp = document.getElementById('input-kp');
    const inputKi = document.getElementById('input-ki');
    const inputKd = document.getElementById('input-kd');
    const btnRunPid = document.getElementById('btn-run-pid');

    function updatePIDVals() {
        if (!inputKp) return;
        document.getElementById('val-kp').textContent = parseFloat(inputKp.value).toFixed(1);
        document.getElementById('val-ki').textContent = parseFloat(inputKi.value).toFixed(2);
        document.getElementById('val-kd').textContent = parseFloat(inputKd.value).toFixed(1);
    }
    [inputKp, inputKi, inputKd].forEach(el => {
        if (el) el.addEventListener('input', () => { updatePIDVals(); drawPIDGraph(); });
    });
    if (btnRunPid) btnRunPid.addEventListener('click', () => { playAudioBeep(700, 0.08); drawPIDGraph(true); });

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            inputKp.value = btn.dataset.kp;
            inputKi.value = btn.dataset.ki;
            inputKd.value = btn.dataset.kd;
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', b === btn));
            updatePIDVals();
            drawPIDGraph(true);
            playAudioBeep(640, 0.05);
        });
    });

    let pidAnim = null;
    function drawPIDGraph(animate = false) {
        const canvas = document.getElementById('pid-canvas');
        if (!canvas || !inputKp) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        const Kp = parseFloat(inputKp.value);
        const Ki = parseFloat(inputKi.value);
        const Kd = parseFloat(inputKd.value);

        const setpoint = 1.0;
        let pos = 0, vel = 0, integral = 0;
        let prevError = setpoint - pos;
        const dt = 0.02;
        const points = [];
        let maxVal = 0;
        let riseTime = null;

        for (let tm = 0; tm < 4.0; tm += dt) {
            const error = setpoint - pos;
            integral += error * dt;
            const derivative = (error - prevError) / dt;
            const force = (Kp * error) + (Ki * integral) + (Kd * derivative);
            prevError = error;
            const accel = (force - 2.0 * vel) / 1.5;
            vel += accel * dt;
            pos += vel * dt;
            if (pos > maxVal) maxVal = pos;
            if (riseTime === null && pos >= 0.9 * setpoint) riseTime = tm;
            points.push({ t: tm, pos });
        }

        const overshoot = Math.max(0, ((maxVal - setpoint) / setpoint) * 100);
        document.getElementById('pid-rise').textContent = riseTime ? `${riseTime.toFixed(2)}s` : '>4.0s';
        document.getElementById('pid-overshoot').textContent = `${overshoot.toFixed(1)}%`;
        document.getElementById('pid-error').textContent = `${Math.abs(setpoint - points[points.length - 1].pos).toFixed(3)} mm`;

        const yOf = (v) => h - (Math.max(-0.2, Math.min(1.8, v)) / 1.8) * (h - 40) - 20;

        function frame(upto) {
            ctx.clearRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            for (let y = 30; y < h; y += 35) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

            const targetY = yOf(setpoint);
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(0, targetY); ctx.lineTo(w, targetY); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#f59e0b';
            ctx.font = '10px JetBrains Mono';
            ctx.fillText('SETPOINT 1.0', 10, targetY - 6);

            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00f2fe';
            ctx.beginPath();
            for (let i = 0; i < upto; i++) {
                const x = (points[i].t / 4.0) * w;
                const y = yOf(points[i].pos);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        if (pidAnim) cancelAnimationFrame(pidAnim);
        if (!animate || prefersReducedMotion) { frame(points.length); return; }
        let n = 1;
        const step = () => {
            n = Math.min(points.length, n + 4);
            frame(n);
            if (n < points.length) pidAnim = requestAnimationFrame(step);
        };
        step();
    }
    updatePIDVals();
    drawPIDGraph();

    // 3. Lighting
    const inputStandard = document.getElementById('input-standard');
    const inputRoomLen = document.getElementById('input-roomlen');

    function updateLux() {
        if (!inputStandard) return;
        const targetLux = parseInt(inputStandard.value, 10);
        const len = parseInt(inputRoomLen.value, 10);
        const width = Math.round(len * 0.8);
        const area = len * width;

        document.getElementById('val-roomdim').textContent = t('lab.dim', { l: len, w: width, a: area });
        document.getElementById('out-targetlux').textContent = `${targetLux} lx`;

        const totalLumensNeeded = (targetLux * area) / (0.65 * 0.8);
        const count = Math.ceil(totalLumensNeeded / 4200);
        document.getElementById('out-fixtures').textContent = t('lab.fixtures', { n: count });
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        document.getElementById('out-grid').textContent = t('lab.grid', { c: cols, r: rows });
        document.getElementById('out-power').textContent = `${((count * 40) / area).toFixed(1)} W/m²`;
    }
    if (inputStandard && inputRoomLen) {
        inputStandard.addEventListener('change', updateLux);
        inputRoomLen.addEventListener('input', updateLux);
        updateLux();
    }

    refreshSimulators = () => { updateLux(); };
}

/* ==========================================================================
   09. SOUND EFFECTS (off by default, remembered per visitor)
   ========================================================================== */
let audioCtx = null;
let audioEnabled = false;

function refreshAudioLabel() {
    const statusText = document.getElementById('audio-status');
    const icon = document.getElementById('audio-icon');
    const btn = document.getElementById('audio-toggle');
    if (statusText) statusText.textContent = t(audioEnabled ? 'sfx.on' : 'sfx.off');
    if (icon) icon.textContent = audioEnabled ? '🔊' : '🔇';
    if (btn) btn.setAttribute('aria-pressed', audioEnabled ? 'true' : 'false');
}

function initAudioFX() {
    try { audioEnabled = localStorage.getItem('portfolio-sfx') === 'on'; } catch (e) {}
    refreshAudioLabel();

    const audioBtn = document.getElementById('audio-toggle');
    if (audioBtn) {
        audioBtn.addEventListener('click', () => {
            audioEnabled = !audioEnabled;
            try { localStorage.setItem('portfolio-sfx', audioEnabled ? 'on' : 'off'); } catch (e) {}
            refreshAudioLabel();
            if (audioEnabled) playAudioBeep(880, 0.08);
            showToast(t(audioEnabled ? 'toast.sfxOn' : 'toast.sfxOff'));
        });
    }

    document.querySelectorAll('.btn-cyan, .btn-amber, .btn-glass, .nav-link, .hud-btn, .role-seg-btn, .btn-card-link, .intent-btn').forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (audioEnabled) playAudioBeep(1200, 0.02, 'sine', 0.02);
        });
    });
}

function playAudioBeep(freq = 440, duration = 0.05, type = 'sine', volume = 0.06) {
    if (!audioEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) { /* audio unavailable */ }
}

/* ==========================================================================
   10. CLIPBOARD & CONTACT FORM (opens the visitor's email app — nothing is faked)
   ========================================================================== */
function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            ok ? resolve() : reject(new Error('copy failed'));
        } catch (err) { reject(err); }
    });
}

window.copyToClipboard = function (text, btnElement) {
    copyText(text).then(() => {
        playAudioBeep(920, 0.06);
        showToast(t('copied', { x: text }));
        if (btnElement) {
            const original = btnElement.innerHTML;
            btnElement.innerHTML = '✅';
            setTimeout(() => { btnElement.innerHTML = original; }, 1800);
        }
    }).catch(() => showToast(t('copyFail', { x: text })));
};

function initContactForm() {
    const msg = document.getElementById('sender-msg');
    const counter = document.getElementById('char-count');
    if (msg && counter) {
        const max = msg.getAttribute('maxlength') || 1500;
        const update = () => { counter.textContent = `${msg.value.length} / ${max}`; };
        msg.addEventListener('input', update);
        update();
    }
}

window.handleFormSubmit = function (e) {
    e.preventDefault();
    playAudioBeep(750, 0.1);

    const name = document.getElementById('sender-name').value.trim();
    const email = document.getElementById('sender-email').value.trim();
    const typeSel = document.getElementById('inquiry-type');
    const topic = typeSel.options[typeSel.selectedIndex].textContent.trim();
    const message = document.getElementById('sender-msg').value.trim();

    const feedback = document.getElementById('form-feedback');
    const submitBtn = document.getElementById('btn-submit-form');

    const subject = t('form.subject', { topic, name });
    const body = `${message}\n\n—\n${t('form.lblName')}: ${name}\n${t('form.lblEmail')}: ${email}\n${t('form.lblTopic')}: ${topic}`;
    const mailto = `mailto:Chornphilip8@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const originalBtn = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>${t('form.sending')}</span>`;

    window.location.href = mailto;

    setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtn;
        feedback.classList.remove('hidden');
        feedback.className = 'form-feedback success';
        feedback.innerHTML = `${t('form.ok')}<br><button type="button" class="btn-glass btn-sm form-copy-btn">📋 ${t('form.copyMsg')}</button>`;
        feedback.querySelector('.form-copy-btn').addEventListener('click', () => {
            copyText(`${subject}\n\n${body}`).then(() => showToast(t('copied', { x: '✉️' })));
        });
        showToast(t('form.toast'));
    }, 700);
};

/* ==========================================================================
   11. TOAST NOTIFICATIONS
   ========================================================================== */
let toastTimeout;
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('active');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('active'), 3200);
}
window.showToast = showToast;

/* ==========================================================================
   12. SCROLL REVEAL, SKILL BARS & NUMBER COUNTERS
   ========================================================================== */
function initScrollReveal() {
    const items = document.querySelectorAll('.timeline-item, .project-card, .skill-category-card, .edu-card, .honors-card, .references-container, .intent-card, .lab-widget, .contact-info-panel, .contact-form-panel');
    const fillBars = (root) => root.querySelectorAll('.meter-bar[data-width]').forEach(bar => { bar.style.width = bar.dataset.width; });

    if (!('IntersectionObserver' in window)) {
        items.forEach(el => { el.classList.add('revealed'); fillBars(el); });
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                fillBars(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => { el.classList.add('reveal-item'); observer.observe(el); });
}

function initCounters() {
    const counters = document.querySelectorAll('.count-up[data-target]');
    if (prefersReducedMotion || !('IntersectionObserver' in window)) return;
    const run = (el) => {
        const target = parseInt(el.dataset.target, 10);
        const start = performance.now();
        const dur = 900;
        const tick = (now) => {
            const p = Math.min(1, (now - start) / dur);
            el.textContent = Math.max(1, Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(en => { if (en.isIntersecting) { run(en.target); obs.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach(c => obs.observe(c));
}

/* ==========================================================================
   13. "WHAT BRINGS YOU HERE?" QUICK-START PICKER
   ========================================================================== */
let currentIntent = null;
const INTENT_CONFIG = {
    mep:      { role: 0, filter: 'mep', inquiry: 'mep',      ctas: ['projects', 'contact', 'cv'] },
    robotics: { role: 1, filter: 'all', inquiry: 'robotics', ctas: ['projects', 'lab', 'contact'] },
    teaching: { role: 2, filter: 'all', inquiry: 'tutoring', ctas: ['teach', 'teachDrive', 'contact'] },
    browse:   { role: null, filter: 'all', inquiry: 'other', ctas: ['projects', 'lab', 'cv'] }
};

function initIntentPicker() {
    document.querySelectorAll('.intent-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const intent = btn.dataset.intent;
            selectIntent(currentIntent === intent ? null : intent);
            playAudioBeep(820, 0.05);
        });
    });
    try {
        const saved = sessionStorage.getItem('portfolio-intent');
        if (saved && INTENT_CONFIG[saved]) selectIntent(saved, { silent: true });
    } catch (e) {}
}

function selectIntent(intent, { silent = false } = {}) {
    currentIntent = intent;
    try { intent ? sessionStorage.setItem('portfolio-intent', intent) : sessionStorage.removeItem('portfolio-intent'); } catch (e) {}

    document.querySelectorAll('.intent-btn').forEach(b => {
        const on = b.dataset.intent === intent;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    // Highlight matching cards across the page
    document.querySelectorAll('[data-intent-tags]').forEach(el => {
        const match = !!intent && intent !== 'browse' && el.dataset.intentTags.split(/\s+/).includes(intent);
        el.classList.toggle('intent-match', match);
        if (match) el.setAttribute('data-match-label', t('match')); else el.removeAttribute('data-match-label');
    });

    if (!intent) {
        const panel = document.getElementById('intent-result');
        if (panel) { panel.hidden = true; panel.innerHTML = ''; }
        return;
    }

    const cfg = INTENT_CONFIG[intent];
    applyProjectFilter(cfg.filter);
    if (cfg.role !== null) setHeroRole(cfg.role, { silent: true });
    const sel = document.getElementById('inquiry-type');
    if (sel) sel.value = cfg.inquiry;
    refreshIntentPanel();
    if (!silent) {
        const panel = document.getElementById('intent-result');
        panel && panel.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
}

function refreshIntentPanel() {
    const panel = document.getElementById('intent-result');
    if (!panel || !currentIntent) return;
    const cfg = INTENT_CONFIG[currentIntent];
    document.querySelectorAll('.intent-match').forEach(el => el.setAttribute('data-match-label', t('match')));
    const points = t(`intent.${currentIntent}.points`);
    const ctaDefs = {
        projects:   { href: '#projects', cls: 'btn-cyan', icon: '⚡' },
        contact:    { href: '#contact', cls: 'btn-amber', icon: '💬' },
        cv:         { href: 'CHORN_PHILIP_CV_NEW.pdf', cls: 'btn-glass', icon: '📄', ext: true },
        lab:        { href: '#lab', cls: 'btn-glass', icon: '🧪' },
        teach:      { href: '#experience', cls: 'btn-cyan', icon: '🎓' },
        teachDrive: { href: 'https://drive.google.com/drive/folders/1PMvxB5fOIIRcH2-5xplXWrcMC8-aZRNM?usp=drive_link', cls: 'btn-glass', icon: '📁', ext: true }
    };
    panel.innerHTML = `
        <h3 class="intent-result-title">${escapeHtml(t(`intent.${currentIntent}.h`))}</h3>
        <ul class="intent-points">${(Array.isArray(points) ? points : []).map(p => `<li><span class="bullet-arrow">▹</span><span>${escapeHtml(p)}</span></li>`).join('')}</ul>
        <div class="intent-ctas">
            ${cfg.ctas.map(key => {
                const d = ctaDefs[key];
                return `<a href="${d.href}" class="${d.cls}" ${d.ext ? 'target="_blank" rel="noopener noreferrer"' : ''} data-cta="${key}"><span class="btn-icon">${d.icon}</span><span>${escapeHtml(t('intent.cta.' + key))}</span></a>`;
            }).join('')}
        </div>`;
    panel.hidden = false;
    panel.querySelector('[data-cta="contact"]')?.addEventListener('click', () => {
        setTimeout(() => document.getElementById('sender-name')?.focus({ preventScroll: true }), 600);
    });
}
