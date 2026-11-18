# ⚡ Chorn Philip - Engineering Portfolio v2.0
> **Electrical & MEP Engineer | Robotics & Automation Specialist**  
> *Institute of Technology of Cambodia (ITC) &bull; ECAM LaSalle International Program*

[![Live Portfolio](https://img.shields.io/badge/Portfolio-Live_v2.0-00f2fe?style=for-the-badge)](index.html)
[![Specialization](https://img.shields.io/badge/Specialization-MEP%20%7C%20Robotics-f59e0b?style=for-the-badge)](https://github.com/philip-djohnn-enz/portfolio_v_2.0)

---

## 🚀 Overview
An ultra-sleek, modern, high-end portfolio website design showcasing **Chorn Philip's** dual expertise in **Commercial MEP & HVAC Infrastructure Engineering** and **Robotics & Embedded Automation**.

Built with pure vanilla **HTML5**, modern **CSS3** (glassmorphism, 3D transforms, fluid typography), and **JavaScript** (WebGL/Canvas circuit particles, real-time PID & HVAC thermodynamic simulators, Web Audio synthesis).

---

## 🌟 Key Highlights & Innovations

- **3D Dual-Specialty Flip Hero**:
  - **Side A**: MEP & HVAC Specialist (Field inspection, AutoCAD drafts, single-line diagrams, BOQ).
  - **Side B**: Robotics Lab & PCB Firmware Specialist (Microcontroller firmware, PCB soldering, PID kinematics).
  - Smooth 3D $180^\circ$ flip animation with adaptive backlighting and audio feedback.
- **Massive Kinetic Typography**: Styled typography spelling `CHORN PHILIP` in layers behind the cutout with parallax depth and rotating HUD rings.
- **Real-World Engineering Projects & Direct Drive Verification**:
  - 🏢 **Commercial HVAC & MEP Deployment** (B&MEP Engineering Construction Co., Ltd) — [Site Drive](https://drive.google.com/drive/folders/1jRVgnTwe4oBzhM4AXFsTUW9eRj5opsep?usp=sharing) & [Office Drive](https://drive.google.com/drive/folders/1Iauf2hc7H5q5cCbdn31uX2edqLvJHxO3?usp=sharing)
  - 🚁 **Autonomous Agricultural Spraying Drone** (F450, Pixhawk GPS, SunnySky motors, automated pump) — [UAV Drive](https://drive.google.com/drive/folders/1SXOPA0mHIRif5qI7VDVZ5DIcDdlCe4ZN?usp=sharing)
  - 🤖 **Voice-Interactive 8-DOF Quadruped Walking Robot** (Trot gait, inverse kinematics, speech synthesis) — [Project Drive](https://drive.google.com/drive/folders/1LS8MxVf53c4X_F-wFqlXthylPBTje6_q?usp=drive_link) & [Demo Video 1](https://web.facebook.com/share/v/1ddWdMBkCm/) | [Demo Video 2](https://web.facebook.com/share/v/19NV1ZCP3j/)
  - 🥇 **Championship Autonomous Line Follower Robot** (**1st Place Champion**, 5-channel IR array, KiCad PCB, 900 RPM motors) — [Robot Drive](https://drive.google.com/drive/folders/1AfE8Use7veXtqmIMWOBtyBM0xQOPRKwj?usp=drive_link)
  - 💡 **Smart Architectural & Industrial DIALux evo Lighting** — [Lighting Drive](https://drive.google.com/drive/folders/1Iauf2hc7H5q5cCbdn31uX2edqLvJHxO3?usp=sharing)
  - ⚡ **Custom Sensor Integration & Motor Drivers (KiCad & LTspice)** — [Hardware Drive](https://drive.google.com/drive/folders/1AfE8Use7veXtqmIMWOBtyBM0xQOPRKwj?usp=drive_link)
- **Interactive Tech Lab Simulators**:
  - ⚡ *MEP HVAC Cooling Load & Airflow Calculator* (Area, occupancy, heat dissipation $\rightarrow$ BTU/h, CFM, duct size).
  - 🤖 *Live PID Control Loop Simulator* (Real-time dynamic step response canvas graph with $K_p$, $K_i$, $K_d$ tuning).
  - 💡 *DIALux Photometric Lux Density Estimator* (Lumen method fixture sizing and W/m² energy density).
- **Interactive Spec Modals & Sound FX**: Instant technical breakdown modal and Web Audio API synthesized futuristic sound effects with mute toggle.

---

## 📁 Repository Structure

```text
├── Asian male engineer.png    # High-resolution cutout of Chorn Philip (MEP Field Specialist)
├── ph robot.png              # High-resolution lab portrait (Robotics & PCB Hardware)
├── ph logo.png               # Brand logo mark
├── CHORN_PHILIP_CV_NEW.pdf   # Complete verified engineering Curriculum Vitae
├── CHORN_PHILIP_RESUME.pdf   # Official Engineering Resume
├── index.html                # Semantic HTML5 architecture and UI components
├── style.css                 # Glassmorphism design system & 3D CSS animations
├── script.js                 # Interactive canvas, 3D flip card, PID simulator & audio engine
├── i18n.js                   # English / Khmer / Chinese translations + language switcher
├── scenes.js                 # Animated backgrounds: MEP site, robotics cell, STEM physics lab
└── README.md                 # Project documentation
```

---

## 🎬 Animated Backgrounds

Clicking **MEP / Robotics / STEM** in the hero morphs the full-page background between three **3-D scenes** rendered with WebGL (`scenes3d.js`, using three.js r128 from cdnjs). The camera drifts slowly, follows the mouse and sweeps around the stage when the scene changes. Everything moves with simple real physics: the crane load swings like a pendulum, robot arms use inverse kinematics, drones bank with their acceleration. If WebGL or the CDN is unavailable, the 2-D canvas version in `scenes.js` is used instead (no images in either):

- **MEP** — a building rising floor by floor with ducts, airflow, water and power risers, an AHU fan and a tower crane lifting a duct section
- **Robotics** — two robot arms picking boxes off a conveyor, scanning drones, PCB traces with signal pulses
- **STEM** — floating physics formulas, a pendulum, projectile motion, an atom and wave interference

The background dims automatically while visitors read lower sections, pauses when the tab is hidden, and stays still for people who turn on "reduce motion".

---

## 🌐 Languages (English / ខ្មែរ / 中文)

- Visitors switch language with the **EN · ខ្មែរ · 中文** buttons in the top bar. Their choice is remembered.
- Share a link in a specific language with `?lang=km`, `?lang=zh` or `?lang=en` (e.g. `index.html?lang=km`).
- Link straight to a project pop-up with `#project-drone`, `#project-quadruped`, `#project-linefollower`, `#project-mep-hvac`, `#project-dialux` or `#project-pcb`.

**Editing text:** English is written directly in `index.html`. Any element with `data-i18n="some.key"` has its Khmer and Chinese version in `i18n.js` under the same key (`I18N.km` / `I18N.zh`). Project pop-up text is in `PROJECT_DETAILS` (English, `script.js`) and `PROJECTS` (Khmer/Chinese, `i18n.js`). If a translation is missing, the English text is shown instead.

---

## 🛠️ Tech Stack

- **Markup**: HTML5, SVG Icons
- **Styling**: CSS3 (Flexbox, CSS Grid, 3D Transforms, Backdrop-filter glassmorphism, CSS Variables)
- **Scripting**: Modern Vanilla JavaScript (ES6+, HTML5 Canvas 2D Context, Web Audio API, IntersectionObserver)
- **Zero Dependencies**: 100% standalone, no npm build step required — just open `index.html`!

---

## 👤 Contact & Coordinates

- **Engineer**: Chorn Philip
- **Email**: [Chornphilip8@gmail.com](mailto:Chornphilip8@gmail.com)
- **Phone**: 0968298504 / 0715115979 / 069779637
- **Location**: Toul Sangke, Phnom Penh, Cambodia
- **Institution**: Institute of Technology of Cambodia (ITC) &bull; ECAM LaSalle
