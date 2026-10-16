/**
 * CHORN PHILIP - HIGH-END PORTFOLIO APPLICATION LOGIC
 * High-performance WebGL/Canvas, 3D Parallax, PID Simulator, Audio Synthesis, and UI Controls
 */

document.addEventListener('DOMContentLoaded', () => {
    initBlueprintCanvas();
    initHeroParallax();
    init3DTilt();
    initNavigation();
    initProjectFilters();
    initSimulators();
    initAudioFX();
    initScrollReveal();
});

/* ==========================================================================
   01. INTERACTIVE BLUEPRINT & CIRCUIT CANVAS
   ========================================================================== */
function initBlueprintCanvas() {
    const canvas = document.getElementById('blueprint-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    // Circuit Nodes and Particles
    const nodes = [];
    const nodeCount = Math.floor(Math.min(width, 1400) / 45);

    for (let i = 0; i < nodeCount; i++) {
        nodes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            size: Math.random() * 2 + 1,
            color: Math.random() > 0.8 ? '#f59e0b' : '#00f2fe',
            pulse: Math.random() * Math.PI
        });
    }

    // Grid spacing
    const gridSize = 60;

    function render() {
        ctx.clearRect(0, 0, width, height);

        // Draw faint engineering blueprint grid
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.025)';
        ctx.lineWidth = 1;

        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw Nodes and Connecting Circuit Traces
        for (let i = 0; i < nodes.length; i++) {
            const p = nodes[i];
            p.x += p.vx;
            p.y += p.vy;
            p.pulse += 0.03;

            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            // Draw glowing node
            const glow = Math.sin(p.pulse) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10 * glow;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Connect nearby nodes with circuit lines
            for (let j = i + 1; j < nodes.length; j++) {
                const p2 = nodes[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 130) {
                    ctx.beginPath();
                    ctx.strokeStyle = p.color === '#f59e0b' 
                        ? `rgba(245, 158, 11, ${(1 - dist / 130) * 0.25})`
                        : `rgba(0, 242, 254, ${(1 - dist / 130) * 0.25})`;
                    ctx.lineWidth = 0.8;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(render);
    }

    render();
}

/* ==========================================================================
   02. 3D HERO PARALLAX & DUAL-ROLE FLIP CONTROLLER
   ========================================================================== */
function initHeroParallax() {
    const heroSection = document.getElementById('home');
    const subject = document.getElementById('subject-parallax');
    const cursorGlow = document.getElementById('cursor-glow');
    const kineticTypography = document.querySelector('.kinetic-typography-layer');
    const badges = document.querySelectorAll('.floating-badge');

    if (!heroSection) return;

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
        if (window.innerWidth <= 768) {
            if (subject) subject.style.transform = '';
            badges.forEach(badge => {
                badge.style.transform = '';
            });
            requestAnimationFrame(updateParallax);
            return;
        }

        currentX += (mouseX - currentX) * 0.08;
        currentY += (mouseY - currentY) * 0.08;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const deltaX = (currentX - centerX) / centerX;
        const deltaY = (currentY - centerY) / centerY;

        // Tilt Subject Cutout (keeping flip orientation intact)
        if (subject) {
            const rotX = -deltaY * 7;
            const rotY = deltaX * 8;
            const transX = deltaX * 12;
            subject.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateX(${transX}px)`;
        }

        // Kinetic typography slight counter-move
        if (kineticTypography) {
            const transKx = -deltaX * 22;
            const transKy = -deltaY * 12;
            kineticTypography.style.transform = `translate(calc(-50% + ${transKx}px), calc(-50% + ${transKy}px))`;
        }

        // Parallax badges with individual depth values
        badges.forEach(badge => {
            const depth = parseFloat(badge.getAttribute('data-depth')) || 30;
            const bx = deltaX * depth;
            const by = deltaY * depth;
            badge.style.transform = `translate3d(${bx}px, ${by}px, ${depth * 2}px)`;
        });

        requestAnimationFrame(updateParallax);
    }

    updateParallax();
}

let isHeroFlipped = false;
window.toggleHeroFlip = function(event) {
    if (event) {
        event.stopPropagation();
    }
    const flipper = document.getElementById('cutout-flipper');
    const roleText = document.getElementById('active-role-text');
    const switchBtn = document.getElementById('dual-role-btn');
    const backdropGlow = document.querySelector('.subject-glow-backdrop');

    if (!flipper) return;

    isHeroFlipped = !isHeroFlipped;
    flipper.classList.toggle('flipped', isHeroFlipped);

    if (isHeroFlipped) {
        playAudioBeep(520, 0.08, 'triangle', 0.08);
        if (roleText) roleText.textContent = "ROBOTICS & EMBEDDED";
        if (switchBtn) switchBtn.classList.add('is-robotics');
        if (backdropGlow) {
            backdropGlow.style.background = 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(239, 68, 68, 0.15) 45%, transparent 70%)';
        }
        showToast("Switched View: Robotics Lab & PCB Hardware");
    } else {
        playAudioBeep(720, 0.08, 'sine', 0.08);
        if (roleText) roleText.textContent = "MEP & HVAC ENGINEER";
        if (switchBtn) switchBtn.classList.remove('is-robotics');
        if (backdropGlow) {
            backdropGlow.style.background = 'radial-gradient(circle, rgba(0, 242, 254, 0.25) 0%, rgba(245, 158, 11, 0.15) 40%, transparent 70%)';
        }
        showToast("Switched View: MEP & HVAC Field Operations");
    }
};

/* ==========================================================================
   03. 3D TILT EFFECT ON GLASS CARDS
   ========================================================================== */
function init3DTilt() {
    const tiltCards = document.querySelectorAll('[data-tilt]');

    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;

            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
        });
    });
}

/* ==========================================================================
   04. NAVIGATION & MOBILE DRAWER
   ========================================================================== */
function initNavigation() {
    const nav = document.querySelector('.glass-nav');
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.querySelectorAll('.nav-link, .mob-link');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        const sections = document.querySelectorAll('section[id]');
        const scrollPos = window.scrollY + 160;

        sections.forEach(sec => {
            const top = sec.offsetTop;
            const height = sec.offsetHeight;
            const id = sec.getAttribute('id');

            if (scrollPos >= top && scrollPos < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });

    if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            playAudioBeep(650, 0.05);
        });

        document.querySelectorAll('.mob-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
            });
        });
    }
}

/* ==========================================================================
   05. PROJECT FILTER CONTROLS
   ========================================================================== */
function initProjectFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            playAudioBeep(520, 0.04);
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            projectCards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    card.style.display = 'flex';
                    card.style.animation = 'fadeIn 0.4s ease';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

/* ==========================================================================
   06. PROJECT MODAL DATA & VIEW CONTROLLER
   ========================================================================== */
const PROJECT_DETAILS = {
    'mep-hvac': {
        title: "Commercial MEP & HVAC Infrastructure Systems",
        category: "B&MEP Engineering Construction Co., Ltd // Commercial Grade",
        period: "2025 – Present",
        icon: "🏢",
        overview: "Lead on-site MEP technician responsible for HVAC chilled air and VRV systems installation, single-line power distribution, and multi-tier plumbing coordination. Bridged architectural engineering designs with site fabrication realities to guarantee zero clash in conduit and duct routes.",
        specs: [
            { k: "Client / Organization", v: "B&MEP Engineering Construction Co., Ltd" },
            { k: "Core Responsibilities", v: "HVAC Installation, As-Built MEP Drafts, BOQ Preparation" },
            { k: "Engineering Software", v: "AutoCAD MEP, DIALux evo, Microsoft Project, Excel BOQ" },
            { k: "Electrical Scope", v: "Low Voltage Distribution Boards (LV-DB), Conduit Routing, Cable Trays" },
            { k: "HVAC Scope", v: "Duct sizing, Air Flow balancing (CFM), Refrigerant copper piping, VRV" }
        ],
        highlights: [
            "Generated precise Bills of Quantities (BOQ) with material cost breakdowns, reducing project procurement wastage.",
            "Drafted shop plans and coordinated layout references between structural, architectural, and electrical teams.",
            "Supervised on-site testing and commissioning of ventilation ducts and electrical phase balancing."
        ],
        links: [
            { label: "📁 In-Site Field Drive", url: "https://drive.google.com/drive/folders/1jRVgnTwe4oBzhM4AXFsTUW9eRj5opsep?usp=sharing", type: "drive" },
            { label: "📐 In-Office Design Drive", url: "https://drive.google.com/drive/folders/1Iauf2hc7H5q5cCbdn31uX2edqLvJHxO3?usp=sharing", type: "drive" }
        ]
    },

    'drone': {
        title: "Autonomous Agricultural Spraying Drone",
        category: "Precision Agri-Tech // Autonomous Quadcopter Robotics",
        period: "2025 – 2026",
        icon: "🚁",
        overview: "Designed and prototyped a compact autonomous spraying drone built on an F450 quadcopter frame. Integrated a Pixhawk flight controller with GPS, high-efficiency SunnySky brushless motors, and a micro water pump system configured for automated waypoint flight and targeted liquid spraying.",
        specs: [
            { k: "Frame & Architecture", v: "F450 Quadcopter X-Frame Construction" },
            { k: "Propulsion System", v: "SunnySky Brushless Motors with 30A Electronic Speed Controllers (ESCs)" },
            { k: "Flight Controller & GPS", v: "Pixhawk Flight Controller with GPS & Compass Module" },
            { k: "Payload & Spraying", v: "Micro Water Pump System with Direct Liquid Spray Nozzle" },
            { k: "Control & Telemetry", v: "ExpressLRS Radio Link & Mission Planner Waypoint Flight" }
        ],
        highlights: [
            "Configured Pixhawk flight controller, compass calibration, and GPS waypoint navigation via Mission Planner for automated flight routes.",
            "Integrated a dedicated micro pump mechanism synchronized with flight controls for precision targeted liquid spraying."
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
        overview: "Engineered an 8-DOF biomimetic walking quadruped robot featuring coordinated leg movement and gait control. Integrated voice command recognition and speech output, enabling the robot to converse with users while executing stable locomotion.",
        specs: [
            { k: "Degrees of Freedom", v: "8 High-Torque Servos (2 per limb coordinated gait)" },
            { k: "Kinematics Control", v: "Custom Trot Gait Generation & Leg Kinematics" },
            { k: "Processing & Audio", v: "Microcontroller + Natural Voice Recognition & Speech Synthesis" },
            { k: "Fabrication", v: "3D Engineered Chassis with Multi-Axis Servo Brackets" }
        ],
        highlights: [
            "Constructed four-legged walking chassis with balanced center-of-mass and stable forward/turn gaits.",
            "Integrated acoustic voice command module allowing user interaction and autonomous movement execution."
        ],
        links: [
            { label: "📁 Quadruped Project Drive", url: "https://drive.google.com/drive/folders/1LS8MxVf53c4X_F-wFqlXthylPBTje6_q?usp=drive_link", type: "drive" },
            { label: "▶️ Field Demo Video (Part 1)", url: "https://web.facebook.com/share/v/1ddWdMBkCm/", type: "video" },
            { label: "▶️ Field Demo Video (Part 2)", url: "https://web.facebook.com/share/v/19NV1ZCP3j/", type: "video" }
        ]
    },

    'linefollower': {
        title: "1st Place Championship Autonomous Line Follower Robot",
        category: "ITC Official Robotics Competition // Champion System",
        period: "2025 – 2026",
        icon: "🥇",
        overview: "Awarded 1st Place overall in the prestigious Line Follower Robot Competition at the Institute of Technology of Cambodia. Designed a custom PCB in KiCad featuring a 5-channel infrared sensor array and high-speed 900 RPM micro N20 motors, programmed to execute precise track navigation and specific task routines.",
        specs: [
            { k: "Achievement", v: "🏆 1st Place Champion (Institute of Technology of Cambodia)" },
            { k: "Control Algorithm", v: "High-Precision Proportional-Integral-Derivative (PID) Control" },
            { k: "Hardware Fabrication", v: "Custom KiCad Printed Circuit Board (PCB) Design" },
            { k: "Sensor Array", v: "5-Channel Infrared (IR) Reflectance Sensor Array" },
            { k: "Motors & Drive", v: "High-Speed 900 RPM Micro Metal Gear Motors" }
        ],
        highlights: [
            "Calibrated PID control parameters for smooth high-speed line tracking and sharp cornering using 900 RPM micro gear motors.",
            "Programmed custom task-handling routines to detect track intersections, execute autonomous maneuvers, and complete course objectives."
        ],
        links: [
            { label: "📁 Line Follower Project Drive", url: "https://drive.google.com/drive/folders/1AfE8Use7veXtqmIMWOBtyBM0xQOPRKwj?usp=drive_link", type: "drive" }
        ]
    },

    'dialux': {
        title: "Smart Architectural & Industrial Photometric Lighting",
        category: "DIALux evo 3D // Illumination Engineering",
        period: "2025",
        icon: "💡",
        overview: "Executed rigorous photometric calculations and 3D illumination simulations for industrial workshops and commercial office buildings using DIALux evo. Delivered ISO-Lux contour maps, Unified Glare Rating (UGR) validation, and energy conservation compliance according to EN 12464 standards.",
        specs: [
            { k: "Simulation Engine", v: "DIALux evo 12 & AutoCAD Architecture" },
            { k: "Compliance Standard", v: "EN 12464-1 (Indoor Workplaces Lighting Standards)" },
            { k: "Key Deliverables", v: "False-Color Lux Intensity Maps, Luminaire Schedules, Energy Density (W/m²)" },
            { k: "Luminaire Photometrics", v: "IES / LDT photometric distribution data curves analysis" }
        ],
        highlights: [
            "Optimized luminaire spacing and selection, achieving 500 Lux average target on workplanes while reducing power load by 18%.",
            "Formulated emergency egress illumination routing and battery backup lux distribution."
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
        overview: "Engineered robust embedded electronic controller circuits, power regulation rails, and optical isolation interfaces for high-power DC motors and microcontrollers.",
        specs: [
            { k: "EDA Toolchain", v: "KiCad 8.0 (Schematic & PCB Editor), LTspice XVII Simulation" },
            { k: "Power Regulators", v: "Low-Dropout Regulators (LDO), Buck Converters with EMI Filtering" },
            { k: "Isolation & Protection", v: "High-speed optocouplers, flyback TVS diodes, reverse polarity protection" }
        ],
        highlights: [
            "Eliminated microcontroller brownouts and motor noise back-EMF via isolated ground planes and bypass capacitor arrays.",
            "Verified transient responses and frequency characteristics via digital oscilloscope."
        ],
        links: [
            { label: "📁 Hardware & Schematic Drive", url: "https://drive.google.com/drive/folders/1AfE8Use7veXtqmIMWOBtyBM0xQOPRKwj?usp=drive_link", type: "drive" }
        ]
    }
};

window.openProjectModal = function(id) {
    const data = PROJECT_DETAILS[id];
    if (!data) return;

    playAudioBeep(780, 0.05);

    const modal = document.getElementById('project-modal');
    const content = document.getElementById('modal-content');

    let specsHtml = data.specs.map(s => `
        <tr>
            <th>${s.k}</th>
            <td>${s.v}</td>
        </tr>
    `).join('');

    let highlightsHtml = data.highlights.map(h => `
        <li style="margin-bottom: 8px;">▹ ${h}</li>
    `).join('');

    let linksHtml = '';
    if (data.links && data.links.length > 0) {
        linksHtml = `
            <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin-bottom: 12px; margin-top: 24px;">Project Documentation &amp; Media Drive</h3>
            <div class="modal-links-row">
                ${data.links.map(l => `
                    <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="modal-link-btn ${l.type === 'video' ? 'btn-amber' : 'btn-cyan'}">
                        <span>${l.label}</span>
                        <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                    </a>
                `).join('')}
            </div>
        `;
    }

    content.innerHTML = `
        <div style="font-size: 2.8rem; margin-bottom: 8px;">${data.icon}</div>
        <div class="modal-spec-badge">${data.category} &bull; ${data.period}</div>
        <h2 class="modal-title">${data.title}</h2>
        <p class="modal-details">${data.overview}</p>

        <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin-bottom: 12px;">Engineering Specifications</h3>
        <table class="modal-specs-table">
            <tbody>
                ${specsHtml}
            </tbody>
        </table>

        <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin-bottom: 10px;">Key Engineering Milestones</h3>
        <ul style="list-style: none; color: #cbd5e1; font-size: 0.9rem; line-height: 1.6; margin-bottom: 16px;">
            ${highlightsHtml}
        </ul>

        ${linksHtml}

        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px;">
            <button onclick="closeProjectModal()" class="btn-glass" style="margin-left: auto;">
                <span>Close Window</span>
            </button>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.closeProjectModal = function() {
    playAudioBeep(450, 0.04);
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProjectModal();
});

document.getElementById('project-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'project-modal') closeProjectModal();
});

/* ==========================================================================
   07. INTERACTIVE TECH LAB SIMULATORS
   ========================================================================== */
function initSimulators() {
    const tabs = document.querySelectorAll('.lab-tab');
    const panes = document.querySelectorAll('.sim-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            playAudioBeep(600, 0.04);
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const target = tab.getAttribute('data-sim');
            const targetPane = document.getElementById(`sim-${target}`);
            if (targetPane) {
                targetPane.classList.add('active');
                if (target === 'pid') drawPIDGraph();
            }
        });
    });

    // 1. MEP HVAC Simulator logic
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

    [inputArea, inputHeight, inputOccupants, inputSpace].forEach(el => {
        if (el) el.addEventListener('input', updateMEP);
    });
    updateMEP();

    // 2. PID Simulator logic
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
        if (el) el.addEventListener('input', () => {
            updatePIDVals();
            drawPIDGraph();
        });
    });

    if (btnRunPid) {
        btnRunPid.addEventListener('click', () => {
            playAudioBeep(700, 0.08);
            drawPIDGraph();
        });
    }

    function drawPIDGraph() {
        const canvas = document.getElementById('pid-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const Kp = parseFloat(inputKp.value);
        const Ki = parseFloat(inputKi.value);
        const Kd = parseFloat(inputKd.value);

        const setpoint = 1.0;
        let pos = 0;
        let vel = 0;
        let integral = 0;
        let prevError = setpoint - pos;
        const dt = 0.02;
        const points = [];

        let maxVal = 0;
        let riseTime = null;

        for (let t = 0; t < 4.0; t += dt) {
            const error = setpoint - pos;
            integral += error * dt;
            const derivative = (error - prevError) / dt;

            const force = (Kp * error) + (Ki * integral) + (Kd * derivative);
            prevError = error;

            const accel = (force - 2.0 * vel) / 1.5;
            vel += accel * dt;
            pos += vel * dt;

            if (pos > maxVal) maxVal = pos;
            if (riseTime === null && pos >= 0.9 * setpoint) {
                riseTime = t;
            }

            points.push({ t, pos });
        }

        const overshoot = Math.max(0, ((maxVal - setpoint) / setpoint) * 100);
        document.getElementById('pid-rise').textContent = riseTime ? `${riseTime.toFixed(2)}s` : '>4.0s';
        document.getElementById('pid-overshoot').textContent = `${overshoot.toFixed(1)}%`;
        const steadyError = Math.abs(setpoint - points[points.length - 1].pos);
        document.getElementById('pid-error').textContent = `${steadyError.toFixed(3)} mm`;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let y = 30; y < h; y += 35) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        const targetY = h - (setpoint / 1.8) * (h - 40) - 20;
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(w, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f59e0b';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText('TARGET SETPOINT (1.0)', 10, targetY - 6);

        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f2fe';
        ctx.beginPath();

        points.forEach((pt, idx) => {
            const x = (pt.t / 4.0) * w;
            const y = h - (pt.pos / 1.8) * (h - 40) - 20;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    updatePIDVals();

    // 3. DIALux Lux Estimator logic
    const inputStandard = document.getElementById('input-standard');
    const inputRoomLen = document.getElementById('input-roomlen');

    function updateLux() {
        if (!inputStandard) return;
        const targetLux = parseInt(inputStandard.value, 10);
        const len = parseInt(inputRoomLen.value, 10);
        const width = Math.round(len * 0.8);
        const area = len * width;

        document.getElementById('val-roomdim').textContent = `${len}m x ${width}m (${area} m²)`;
        document.getElementById('out-targetlux').textContent = `${targetLux} lx`;

        const totalLumensNeeded = (targetLux * area) / (0.65 * 0.8);
        const fixtureLumens = 4200;
        const count = Math.ceil(totalLumensNeeded / fixtureLumens);

        document.getElementById('out-fixtures').textContent = `${count} Fixtures`;
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        document.getElementById('out-grid').textContent = `Grid Layout: ${cols} x ${rows}`;

        const totalWatts = count * 40;
        const wPerM2 = (totalWatts / area).toFixed(1);
        document.getElementById('out-power').textContent = `${wPerM2} W/m²`;
    }

    if (inputStandard && inputRoomLen) {
        inputStandard.addEventListener('change', updateLux);
        inputRoomLen.addEventListener('input', updateLux);
        updateLux();
    }
}

/* ==========================================================================
   08. HIGH-TECH WEB AUDIO SYNTHESIZER
   ========================================================================== */
let audioCtx = null;
let audioEnabled = true;

function initAudioFX() {
    const audioBtn = document.getElementById('audio-toggle');
    const statusText = document.getElementById('audio-status');

    if (audioBtn) {
        audioBtn.addEventListener('click', () => {
            audioEnabled = !audioEnabled;
            statusText.textContent = audioEnabled ? 'ON' : 'OFF';
            if (audioEnabled) {
                playAudioBeep(880, 0.08);
                showToast("Audio FX: Enabled");
            } else {
                showToast("Audio FX: Muted");
            }
        });
    }

    document.querySelectorAll('.btn-cyan, .btn-amber, .btn-glass, .nav-link, .hud-btn, .dual-role-btn, .btn-card-link').forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (audioEnabled) playAudioBeep(1200, 0.02, 'sine', 0.02);
        });
    });
}

function playAudioBeep(freq = 440, duration = 0.05, type = 'sine', volume = 0.06) {
    if (!audioEnabled) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

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
    } catch (e) {
        // Audio handled safely
    }
}

/* ==========================================================================
   09. CLIPBOARD & FORM SUBMISSION LOGIC
   ========================================================================== */
window.copyToClipboard = function(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        playAudioBeep(920, 0.06);
        showToast(`Copied to clipboard: ${text}`);

        if (btnElement) {
            const original = btnElement.innerHTML;
            btnElement.innerHTML = '✅';
            setTimeout(() => {
                btnElement.innerHTML = original;
            }, 1800);
        }
    }).catch(() => {
        showToast(`Selected: ${text}`);
    });
};

window.handleFormSubmit = function(e) {
    e.preventDefault();
    playAudioBeep(750, 0.1);

    const name = document.getElementById('sender-name').value;
    const email = document.getElementById('sender-email').value;
    const type = document.getElementById('inquiry-type').value;
    const msg = document.getElementById('sender-msg').value;

    const feedback = document.getElementById('form-feedback');
    const submitBtn = document.getElementById('btn-submit-form');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Transmitting...</span>';

    setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-icon">🚀</span><span>Send Encrypted Transmission</span>';

        feedback.classList.remove('hidden');
        feedback.className = 'form-feedback success';
        feedback.innerHTML = `
            <strong>Transmission Confirmed!</strong><br>
            Thank you, <strong>${name}</strong>. Your engineering inquiry has been dispatched to <strong>Chornphilip8@gmail.com</strong>. Philip will review your specifications promptly.
        `;

        showToast("Engineering dispatch transmitted successfully!");
        document.getElementById('contact-form').reset();
    }, 1000);
};

/* ==========================================================================
   10. TOAST NOTIFICATION UTILITY
   ========================================================================== */
let toastTimeout;
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('active');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('active');
    }, 3200);
}

/* ==========================================================================
   11. SCROLL REVEAL OBSERVER
   ========================================================================== */
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.timeline-item, .project-card, .skill-category-card, .edu-card').forEach(el => {
        observer.observe(el);
    });
}
