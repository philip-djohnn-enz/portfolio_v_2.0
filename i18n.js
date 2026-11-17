/**
 * CHORN PHILIP PORTFOLIO — LANGUAGE ENGINE (English / ខ្មែរ / 中文)
 *
 * How it works
 *  - English text lives in index.html as normal. Elements that can be translated carry
 *    data-i18n="key" (inner HTML), data-i18n-ph (placeholder), data-i18n-title (tooltip)
 *    or data-i18n-aria (aria-label).
 *  - Khmer (km) and Chinese (zh) text lives below in I18N.km / I18N.zh under the same key.
 *    If a key is missing, the English from the HTML is shown, so nothing ever goes blank.
 *  - Text created by script.js (toasts, project pop-ups, form messages) lives in UI and PROJECTS.
 *
 * To edit a translation: find its key in index.html, then change it here.
 * To add a new translated element: give it data-i18n="my.key" in the HTML and add my.key below.
 */
(function () {
    'use strict';

    var SUPPORTED = ['en', 'km', 'zh'];
    var STORAGE_KEY = 'portfolio-lang';

    /* ======================================================================
       1. PAGE TEXT (keys match data-i18n attributes in index.html)
       ====================================================================== */
    var I18N = {
        km: {
            'a11y.skip': 'រំលងទៅមាតិកា',
            'brand.role': 'អគ្គិសនី &bull; MEP &bull; រ៉ូបូត',
            'hud.sfx': 'សំឡេង',
            'hud.sfxTitle': 'បើក/បិទសំឡេង',
            'hud.status': 'ទទួលការងារ និងសហការ',
            'dock.aria': 'ទំនាក់ទំនងរហ័ស',
            'dock.email': 'ផ្ញើអ៊ីមែល',
            'dock.emailShort': 'អ៊ីមែល',
            'dock.call': 'ទូរសព្ទមកខ្ញុំ',
            'dock.callShort': 'ទូរសព្ទ',
            'dock.cv': 'បើក CV របស់ខ្ញុំ',
            'dock.top': 'ត្រឡប់ទៅលើ',

            'nav.home': 'ទំព័រដើម',
            'nav.experience': 'បទពិសោធន៍',
            'nav.projects': 'គម្រោង',
            'nav.skills': 'ជំនាញ',
            'nav.lab': 'មន្ទីរពិសោធន៍',
            'nav.education': 'ការសិក្សា',
            'nav.contact': 'ទំនាក់ទំនង',
            'nav.cv': 'ទាញយក CV',
            'nav.mobCv': 'ទាញយក CV ផ្លូវការ (PDF)',
            'nav.mobResume': 'ទាញយក Resume (PDF)',

            'hero.flipTitle': 'ចុចដើម្បីប្ដូររវាងជំនាញទាំងបីរបស់ខ្ញុំ',
            'hero.roleMep': 'អ្នកជំនាញ MEP និង HVAC',
            'hero.roleRobo': 'រ៉ូបូត និង PCB Firmware',
            'hero.roleStem': 'គ្រូបង្រៀន STEM និងរូបវិទ្យា',
            'hero.segMep': 'MEP',
            'hero.segRobo': 'រ៉ូបូត',
            'hero.segStem': 'STEM',
            'hero.status': 'ទំនេរសម្រាប់ការងារ MEP រ៉ូបូត និងបង្រៀន',
            'hero.headline': 'វិស្វកម្ម <span class="text-glow-cyan">MEP</span> ច្បាស់លាស់<br>និង<span class="text-glow-amber">រ៉ូបូត</span>ទំនើប',
            'hero.bio': '<strong>ជន ភីលីព</strong> — និស្សិតវិស្វកម្មអគ្គិសនីឆ្នាំទី៤ នៅ<strong>វិទ្យាស្ថានបច្ចេកវិទ្យាកម្ពុជា (ITC)</strong> ក្នុង<strong>កម្មវិធីសញ្ញាបត្រពីរ ECAM LaSalle</strong>។ បច្ចេកទេស MEP នៅ<strong>ក្រុមហ៊ុន B&amp;MEP Engineering Construction</strong> ធ្វើការលើប្រព័ន្ធ HVAC ការចែកចាយអគ្គិសនី STM32 firmware និងរ៉ូបូតស្វ័យប្រវត្តិ។',
            'hero.ctaProjects': 'មើលគម្រោងរបស់ខ្ញុំ',
            'hero.ctaContact': 'ធ្វើការជាមួយខ្ញុំ',
            'hero.ctaCv': 'មើល CV',
            'hero.scroll': 'រំកិលចុះដើម្បីមើល',

            'badge.champ.t': 'ជើងឯកលេខ ១',
            'badge.champ.d': 'ប្រកួតរ៉ូបូតដើរតាមខ្សែ ២០២៦',
            'badge.mep.t': 'អ្នកជំនាញ MEP និង HVAC',
            'badge.quad.t': 'រ៉ូបូតជើងបួន និង Drone',
            'badge.quad.d': 'STM32 Firmware និងចលនាជើង',
            'badge.edu.d': 'ឆ្នាំទី៤ &bull; ភ្នំពេញ',
            'badge.stem.t': 'គ្រូបង្រៀន STEM',

            'metric.firstSuffix': '',
            'metric.first': 'ជើងឯកលេខ ១ ប្រកួតរ៉ូបូត',
            'metric.yearVal': 'ឆ្នាំទី ៤',
            'metric.year': 'សញ្ញាបត្រពីរ ECAM LaSalle / ITC',
            'metric.projects': 'គម្រោងវិស្វកម្មដែលបានធ្វើ',
            'metric.ielts': 'វិញ្ញាបនបត្រភាសាអង់គ្លេស',

            'intent.kicker': 'ចាប់ផ្ដើមរហ័ស',
            'intent.title': 'តើអ្នកមកទីនេះដើម្បីអ្វី?',
            'intent.sub': 'ជ្រើសរើសមួយ ខ្ញុំនឹងបង្ហាញការងារដែលទាក់ទងបំផុតជូនអ្នកមុនគេ។',
            'intent.mep.t': 'ខ្ញុំត្រូវការវិស្វករ MEP / អគ្គិសនី',
            'intent.mep.d': 'HVAC, ប្លង់ខ្សែតែមួយ (SLD), BOQ, AutoCAD, DIALux',
            'intent.robotics.t': 'ខ្ញុំកំពុងរកជំនាញរ៉ូបូត និង Embedded',
            'intent.robotics.d': 'STM32 firmware, PID, Drone, ការរចនា PCB',
            'intent.teaching.t': 'ខ្ញុំចង់បានគ្រូបង្រៀនរូបវិទ្យា / STEM',
            'intent.teaching.d': 'AP Physics, Cambridge IGCSE, គណិតវិទ្យា',
            'intent.browse.t': 'គ្រាន់តែចង់មើល',
            'intent.browse.d': 'បង្ហាញចំណុចសំខាន់ៗមកខ្ញុំ',

            'common.present': 'បច្ចុប្បន្ន',
            'common.pp': 'ភ្នំពេញ កម្ពុជា',
            'common.cambodia': 'កម្ពុជា',
            'common.keyResp': 'ភារកិច្ចសំខាន់ៗ',
            'common.details': 'ព័ត៌មានលម្អិត',

            'exp.tag': 'ការងារ និងការបង្រៀន',
            'exp.title': '<span class="text-glow-cyan">បទពិសោធន៍</span>ការងារ',
            'exp.sub': 'បទពិសោធន៍ជាក់ស្ដែងក្នុងវិស័យមេកានិច អគ្គិសនី និងទឹក (MEP) និងការបង្រៀន ស្របពេលសិក្សាកម្មវិធីសញ្ញាបត្រពីរអន្តរជាតិ។',
            'exp.badgeActive': 'តួនាទីបច្ចុប្បន្ន',
            'exp.badgeTeach': 'ការបង្រៀនបច្ចុប្បន្ន',
            'exp.badgeAcademic': 'ការបង្រៀន',
            'exp.badgeCommunity': 'សហគមន៍',
            'exp1.role': 'បច្ចេកទេស MEP – ការដំឡើង HVAC និងអគ្គិសនី',
            'exp1.desc': 'ធ្វើការផ្ទាល់លើប្រព័ន្ធមេកានិច អគ្គិសនី និងទឹក នៅការដ្ឋានសំណង់អគារពាណិជ្ជកម្ម។',
            'exp1.r1': '<strong>ប្រព័ន្ធ HVAC និង MEP៖</strong> ជួយដំឡើង ដោះស្រាយបញ្ហា និងតម្រឹមប្រព័ន្ធ HVAC បំពង់ខ្យល់ស្រស់ ប្រព័ន្ធទឹកត្រជាក់ និងតាប្លូចែកចាយតង់ស្យុងទាប។',
            'exp1.r2': '<strong>អានប្លង់៖</strong> បកស្រាយប្លង់ MEP ប្លង់ខ្សែតែមួយ (SLD) និងលក្ខណៈបច្ចេកទេស ដើម្បីណែនាំក្រុមដំឡើងនៅការដ្ឋាន។',
            'exp1.r3': '<strong>គូរប្លង់ការដ្ឋាន៖</strong> រៀបចំប្លង់ព្រាងសម្រាប់ផ្លូវ MEP ផ្លូវបំពង់ខ្សែ និងឯកសារយោងការដំឡើង ដើម្បីជៀសវាងការប៉ះទង្គិចគ្នា។',
            'exp1.r4': '<strong>BOQ និងរបាយការណ៍៖</strong> រៀបចំតារាងបរិមាណការងារ (BOQ) ការប៉ាន់ស្មានសម្ភារៈ និងរបាយការណ៍វឌ្ឍនភាពជូនអ្នកគ្រប់គ្រងគម្រោង។',
            'exp1.r5': '<strong>សម្របសម្រួលក្រុម៖</strong> ភ្ជាប់ទំនាក់ទំនងរវាងម្ចាស់ម៉ៅការ វិស្វករការដ្ឋាន ស្ថាបត្យករ និងអ្នកម៉ៅការបន្ត។',
            'exp4.role': 'គ្រូបង្រៀន STEM – AP Physics និងវិទ្យាសាស្ត្រ Cambridge',
            'exp4.desc': 'គ្រូបង្រៀនវិទ្យាសាស្ត្រ និងគណិតវិទ្យាក្រៅម៉ោង សម្រាប់សិស្សថ្នាក់ទី៩ ក្នុងកម្មវិធី AP Physics, Cambridge IGCSE និងកម្មវិធីអាមេរិក — ភ្ជាប់ទ្រឹស្ដីរូបវិទ្យាទៅនឹងវិស្វកម្មពិតប្រាកដ។',
            'exp4.r1': '<strong>AP Physics៖</strong> បង្រៀនចលនវិទ្យា ឌីណាមិច ថាមពល រលក និងអគ្គិសនីស្ថិត តាមកម្មវិធីសិក្សា College Board AP Physics។',
            'exp4.r2': '<strong>កម្មវិធី Cambridge និងអាមេរិក៖</strong> បង្រៀនវិទ្យាសាស្ត្រ និងគណិតវិទ្យាថ្នាក់ទី៩ តាមស្តង់ដារ Cambridge IGCSE និងអាមេរិក។',
            'exp4.r3': '<strong>ការបង្រៀនដែលទាក់ទាញ៖</strong> ប្រើការបង្ហាញជាក់ស្ដែង សិក្ខាសាលាដោះស្រាយលំហាត់ និងការណែនាំប្រឡង ដើម្បីបង្កើនទំនុកចិត្តសិស្ស។',
            'exp4.r4': '<strong>មជ្ឈមណ្ឌលពីរ៖</strong> បង្រៀននៅ Well-Edu Tutoring និង Edu STEM Academy នៅភ្នំពេញ។',
            'exp4.drive': 'មើលស្នាដៃបង្រៀន STEM',
            'exp2.role': 'គ្រូបង្រៀនកុំព្យូទ័រ',
            'exp2.desc': 'បង្រៀនសិស្សវិទ្យាល័យអំពីកុំព្យូទ័រ កម្មវិធីការិយាល័យ និងការរចនាក្រាហ្វិក។',
            'exp2.r1': 'បង្រៀន Microsoft Word, Excel (ការគណនា), PowerPoint, Adobe Illustrator និង Photoshop។',
            'exp2.r2': 'បំប្លែងការងារកុំព្យូទ័រស្មុគស្មាញ ឱ្យទៅជាមេរៀនងាយៗមួយជំហានម្ដងៗ សម្រាប់សិស្សគ្រប់កម្រិត។',
            'exp3.role': 'យុវទូត និងអ្នកស្ម័គ្រចិត្តមនុស្សធម៌',
            'exp3.org': 'កាកបាទក្រហមកម្ពុជា និង UYFN (United Youth for National Development)',
            'exp3.desc': 'ចូលរួមក្នុងសកម្មភាពសង្គមទូទាំងប្រទេស ការត្រៀមបង្ការគ្រោះមហន្តរាយ សុខុមាលភាពសហគមន៍ និងវគ្គបណ្ដុះបណ្ដាលភាពជាអ្នកដឹកនាំយុវជន។',
            'chip.comm': 'ការទំនាក់ទំនងបច្ចេកទេស',
            'chip.lead': 'ភាពជាអ្នកដឹកនាំ',
            'chip.community': 'ការចូលរួមសហគមន៍',
            'chip.crisis': 'ការគ្រប់គ្រងវិបត្តិ',

            'proj.tag': 'វិស្វកម្មជាក់ស្ដែង',
            'proj.title': '<span class="text-glow-amber">គម្រោង</span>សំខាន់ៗ',
            'proj.sub': 'ចាប់ពីការសាងសង់ប្រព័ន្ធ MEP រហូតដល់រ៉ូបូតជើងបួន Drone បាញ់ថ្នាំ និងរ៉ូបូតដើរតាមខ្សែដែលឈ្នះជើងឯក។ ចុចលើកាតណាមួយដើម្បីមើលលម្អិត។',
            'proj.fAll': 'ទាំងអស់',
            'proj.fMep': 'MEP និង HVAC',
            'proj.fRobo': 'រ៉ូបូត និង AI',
            'proj.fEmb': 'Drone និង Hardware',
            'proj.details': 'មើលលម្អិត',
            'link.site': 'Drive ការដ្ឋាន',
            'link.office': 'Drive ការិយាល័យ',
            'link.drive': 'Drive គម្រោង',
            'link.video1': 'វីដេអូ ១',
            'link.video2': 'វីដេអូ ២',

            'p1.badge': 'MEP នៅការដ្ឋាន',
            'p1.code': 'MEP ពាណិជ្ជកម្ម',
            'p1.name': 'ការដំឡើង HVAC និង MEP អគារពាណិជ្ជកម្ម',
            'p1.sum': 'វិស្វកម្មនៅការដ្ឋានសម្រាប់ប្រព័ន្ធមេកានិច អគ្គិសនី និងទឹក៖ ប្លង់ព្រាង ការចែកចាយខ្សែតែមួយ ការរៀបចំ BOQ និងការតម្រឹមបំពង់ខ្យល់។',
            'p1.s1': '<span class="spec-k">ការប្រើប្រាស់៖</span> អគារពាណិជ្ជកម្ម និងលំនៅដ្ឋានច្រើនជាន់',
            'p1.s2': '<span class="spec-k">ឧបករណ៍៖</span> AutoCAD, DIALux evo, Single Line Diagrams',
            'p1.s3': '<span class="spec-k">លទ្ធផល៖</span> BOQ, ប្លង់គ្មានការប៉ះទង្គិច, ប្លង់ As-Built',
            'p2.badge': 'បច្ចេកវិទ្យាកសិកម្ម',
            'p2.code': 'QUADCOPTER ស្វ័យប្រវត្តិ',
            'p2.name': 'Drone បាញ់ថ្នាំកសិកម្មស្វ័យប្រវត្តិ',
            'p2.sum': 'Drone F450 ស្វ័យប្រវត្តិសម្រាប់បាញ់ថ្នាំយ៉ាងជាក់លាក់ និងតាមដានដំណាំ ប្រើ Pixhawk autopilot ម៉ូទ័រ SunnySky និងម៉ាស៊ីនបូមបាញ់ស្វ័យប្រវត្តិ។',
            'p2.s1': '<span class="spec-k">បន្ទុក៖</span> ម៉ាស៊ីនបូមទឹកតូច និងក្បាលបាញ់',
            'p2.s2': '<span class="spec-k">ម៉ូទ័រ៖</span> SunnySky brushless + ESC 30A',
            'p2.s3': '<span class="spec-k">Autopilot៖</span> Pixhawk GPS និង ExpressLRS',
            'p3.badge': 'រ៉ូបូតដើរ 8-DOF',
            'p3.code': 'រ៉ូបូត និង AI',
            'p3.name': 'រ៉ូបូតជើងបួនបញ្ជាដោយសំឡេង',
            'p3.sum': 'រ៉ូបូតដើរ 8-DOF ដែលគ្រប់គ្រងចលនាជើងយ៉ាងសម្របសម្រួល និងមានប្រព័ន្ធស្គាល់សំឡេងដែលឆ្លើយតបភ្លាមៗ។',
            'p3.s1': '<span class="spec-k">ចលនា៖</span> Servo កម្លាំងខ្លាំង ៨ (២ ក្នុងមួយជើង)',
            'p3.s2': '<span class="spec-k">ដំណើរការ៖</span> Microcontroller + ម៉ូឌុលសំឡេង',
            'p3.s3': '<span class="spec-k">សមត្ថភាព៖</span> ដើរ Trot ដើរគ្រប់ទិស និងនិយាយ',
            'p4.badge': 'ជើងឯកលេខ ១',
            'p4.code': 'រ៉ូបូតស្វ័យប្រវត្តិ',
            'p4.name': 'រ៉ូបូតដើរតាមខ្សែ ជើងឯក',
            'p4.sum': 'ឈ្នះ<strong>ជើងឯកលេខ ១</strong> ក្នុងការប្រកួតរ៉ូបូតដើរតាមខ្សែនៅ ITC។ PCB រចនាដោយ KiCad មានឧបករណ៍ចាប់ IR ៥ ឆានែល និង PID ដែលកែតម្រូវសម្រាប់ម៉ូទ័រ 900 RPM។',
            'p4.s1': '<span class="spec-k">ពានរង្វាន់៖</span> 🏆 ជើងឯកលេខ ១ (ការប្រកួត ITC)',
            'p4.s2': '<span class="spec-k">ការបញ្ជា៖</span> PID កែតម្រូវ + តក្កវិជ្ជាផ្លូវបំបែក',
            'p4.s3': '<span class="spec-k">Hardware៖</span> PCB KiCad ផ្ទាល់ខ្លួន + ម៉ូទ័រ 900 RPM',
            'p5.badge': 'ការក្លែងធ្វើពន្លឺ',
            'p5.code': 'ពន្លឺអគ្គិសនី',
            'p5.name': 'ការរចនាពន្លឺសម្រាប់អគារ និងឧស្សាហកម្ម',
            'p5.sum': 'ការរចនាពន្លឺ និងការក្លែងធ្វើក្នុង DIALux evo៖ កម្រិតពន្លឺចាំង (UGR) កម្រិតពន្លឺមធ្យម (lux) និងប្រសិទ្ធភាពថាមពល តាមស្តង់ដារ EN 12464។',
            'p5.s1': '<span class="spec-k">កម្មវិធី៖</span> DIALux evo និង AutoCAD Architecture',
            'p5.s2': '<span class="spec-k">លទ្ធផល៖</span> ផែនទីពន្លឺ 3D និង BOQ ចង្កៀង',
            'p5.s3': '<span class="spec-k">ប្រសិទ្ធភាព៖</span> ដង់ស៊ីតេថាមពល (W/m²) ល្អបំផុតក្នុងមួយជាន់',
            'p6.badge': 'PCB និងការក្លែងធ្វើ',
            'p6.code': 'ការរចនា HARDWARE',
            'p6.name': 'បន្ទះសៀគ្វីឧបករណ៍ចាប់ និងបញ្ជាម៉ូទ័រ',
            'p6.sum': 'គូរ Schematic និង PCB ក្នុង KiCad និងក្លែងធ្វើសៀគ្វីក្នុង LTspice៖ ការការពារចរន្តលោត ការញែកអុបទិក និង H-bridge សម្រាប់រ៉ូបូត និងឧបករណ៍បញ្ជាឧស្សាហកម្ម។',
            'p6.s1': '<span class="spec-k">ឧបករណ៍៖</span> KiCad, LTspice, STM32CubeIDE',
            'p6.s2': '<span class="spec-k">សៀគ្វី៖</span> Gate driver ញែកអុបទិក, LDO regulator',
            'p6.s3': '<span class="spec-k">ការធ្វើតេស្ត៖</span> ផ្ទៀងផ្ទាត់ដោយ Oscilloscope និង Logic analyser',

            'skills.tag': 'អ្វីដែលខ្ញុំពូកែ',
            'skills.title': '<span class="text-glow-cyan">ជំនាញ</span>បច្ចេកទេស និងឧបករណ៍',
            'skills.sub': 'ប្រព័ន្ធអគ្គិសនីអគារ Embedded firmware និងកម្មវិធីវិស្វកម្ម — ទាំងអស់ក្នុងប្រអប់ឧបករណ៍តែមួយ។',
            'skills.mepT': 'វិស្វកម្ម MEP និងអគ្គិសនី',
            'skills.mepS': 'សេវាអគារ ការគណនាបន្ទុក និងការងារការដ្ឋាន',
            'skills.roboT': 'រ៉ូបូត និងប្រព័ន្ធ Embedded',
            'skills.roboS': 'Firmware, PID, សៀគ្វី និងឧបករណ៍ចាប់',
            'skills.swT': 'កម្មវិធី និងឧបករណ៍ CAD',
            'skills.swS': 'កម្មវិធីរចនា ក្លែងធ្វើ និងគ្រប់គ្រងគម្រោងស្តង់ដារឧស្សាហកម្ម',
            'sk.m1': 'ការដំឡើង HVAC និងមេកានិច',
            'sk.m2': 'គូរប្លង់ MEP',
            'sk.m3': 'ប្លង់ខ្សែតែមួយ (SLD) និងការចែកចាយ',
            'sk.m4': 'តារាងបរិមាណការងារ (BOQ)',
            'sk.m5': 'ការរចនាពន្លឺ (DIALux evo)',
            'sk.r1': 'ការបញ្ជា PID និងការកែតម្រូវ',
            'sk.r2': 'Firmware Microcontroller (STM32 / Arduino)',
            'sk.r3': 'ការរចនាសៀគ្វី (KiCad / LTspice)',
            'sk.r4': 'ការភ្ជាប់ឧបករណ៍ចាប់ និង Telemetry',
            'sk.r5': 'Kinematics រ៉ូបូត និងចលនាដើរ',
            'tool.autocad': 'គូរប្លង់ MEP និងស្ថាបត្យកម្ម',
            'tool.dialux': 'ក្លែងធ្វើពន្លឺ 3D',
            'tool.kicad': 'Schematic និង PCB ២ ស្រទាប់',
            'tool.ltspice': 'ក្លែងធ្វើសៀគ្វី',
            'tool.matlab': 'ប្រព័ន្ធបញ្ជា និងគណិតវិទ្យា',
            'tool.stm32': 'Firmware ARM Cortex-M',
            'tool.arduino': 'បង្កើតគំរូរហ័ស',
            'tool.msproject': 'កាលវិភាគ និងដំណាក់កាល',
            'tool.adobe': 'ក្រាហ្វិក និងដ្យាក្រាម',
            'tool.office': 'BOQ និងការវិភាគតម្លៃ',

            'lab.tag': 'សាកល្បងដោយខ្លួនឯង',
            'lab.title': '<span class="text-glow-cyan">មន្ទីរពិសោធន៍</span>អន្តរកម្ម',
            'lab.sub': 'រំកិលរបារ ដើម្បីដំណើរការការគណនាវិស្វកម្មពិតៗ ដែលខ្ញុំប្រើក្នុងការងារ និងរ៉ូបូត។',
            'lab.tab1': 'បន្ទុកត្រជាក់ HVAC',
            'lab.tab2': 'បញ្ជារ៉ូបូត PID',
            'lab.tab3': 'គណនាពន្លឺ',
            'lab.mep.h': 'ការកំណត់បន្ទប់ និង HVAC',
            'lab.mep.area': 'ផ្ទៃក្រឡា (m²)',
            'lab.mep.height': 'កម្ពស់ពិដាន (m)',
            'lab.mep.people': 'ចំនួនមនុស្ស',
            'lab.mep.space': 'ប្រភេទបន្ទប់៖',
            'lab.mep.office': 'ការិយាល័យ (កម្ដៅមធ្យម)',
            'lab.mep.server': 'បន្ទប់ Server / តាប្លូ (កម្ដៅខ្លាំង)',
            'lab.mep.home': 'ផ្ទះ / អាផាតមិន (កម្ដៅទាប–មធ្យម)',
            'lab.mep.res': 'លទ្ធផល',
            'lab.mep.vol': 'មាឌបន្ទប់',
            'lab.mep.load': 'បន្ទុកត្រជាក់',
            'lab.mep.air': 'លំហូរខ្យល់ដែលត្រូវការ',
            'lab.mep.duct': 'ទំហំបំពង់ខ្យល់ណែនាំ',
            'lab.mep.status': '⚡ ខ្យល់ត្រជាក់៖ កំពុងដំណើរការ',
            'lab.pid.h': 'មេគុណ PID',
            'lab.pid.p': 'សមាមាត្រ',
            'lab.pid.i': 'អាំងតេក្រាល',
            'lab.pid.d': 'ដេរីវេ',
            'lab.pid.try': 'សាកល្បងការកំណត់៖',
            'lab.pid.tuned': 'ល្អប្រសើរ',
            'lab.pid.wobbly': 'រង្គោះរង្គើ',
            'lab.pid.slow': 'យឺតពេក',
            'lab.pid.run': 'ដំណើរការការក្លែងធ្វើ',
            'lab.pid.graph': 'ចម្លើយតបជំហាន (Step Response)',
            'lab.pid.rise': 'ពេលឡើង',
            'lab.pid.over': 'លើសកម្រិត',
            'lab.pid.err': 'កំហុសស្ថិរភាព',
            'lab.lux.h': 'ការរៀបចំពន្លឺបន្ទប់',
            'lab.lux.use': 'ការប្រើប្រាស់បន្ទប់៖',
            'lab.lux.o1': 'ការិយាល័យ / គូរប្លង់ CAD (500 lux)',
            'lab.lux.o2': 'ថ្នាក់រៀន / រោងជាង (300 lux)',
            'lab.lux.o3': 'ដំឡើងអេឡិចត្រូនិក និង PCB (750 lux)',
            'lab.lux.o4': 'ច្រករបៀង / បន្ទប់ម៉ាស៊ីន (150 lux)',
            'lab.lux.size': 'ទំហំបន្ទប់ (បណ្ដោយ x ទទឹង)',
            'lab.lux.lamp': 'ចង្កៀង',
            'lab.lux.res': 'លទ្ធផល',
            'lab.lux.target': 'ពន្លឺគោលដៅ',
            'lab.lux.count': 'ចំនួនចង្កៀងត្រូវការ',
            'lab.lux.power': 'ដង់ស៊ីតេថាមពល',
            'lab.lux.eff': 'ប្រសិទ្ធភាពខ្ពស់ (A+)',
            'lab.lux.ugr': 'កម្រិតពន្លឺចាំង (UGR)',
            'lab.lux.ok': '&lt; 19 (ត្រូវស្តង់ដារ)',

            'edu.tag': 'ការសិក្សា និងអ្នកធានា',
            'edu.title': '<span class="text-glow-cyan">ការសិក្សា</span> និងអ្នកធានា',
            'edu.sub': 'កម្មវិធីវិស្វកម្មសញ្ញាបត្រពីរអន្តរជាតិ ព្រមទាំងការធានាពីសាស្ត្រាចារ្យនៅសាកលវិទ្យាល័យ។',
            'edu.e1.year': 'បច្ចុប្បន្ន &bull; ឆ្នាំទី៤',
            'edu.e1.deg': 'បរិញ្ញាបត្រវិស្វកម្មអគ្គិសនី',
            'edu.e1.det': 'ឯកទេស<strong>រ៉ូបូត និងស្វ័យប្រវត្តិកម្ម</strong>៖ firmware microcontroller ការរចនាអគ្គិសនីអគារ និងតង់ស្យុងខ្ពស់ PID ប្រព័ន្ធបញ្ជាឧស្សាហកម្ម និងម៉ាស៊ីនស្វ័យប្រវត្តិ។',
            'edu.e1.b1': 'សញ្ញាបត្រពីរ ECAM LaSalle',
            'edu.e1.b2': 'រ៉ូបូត និងស្វ័យប្រវត្តិកម្ម',
            'edu.e1.b3': 'និស្សិតអាហារូបករណ៍ ITC',
            'edu.e2.deg': 'កម្មវិធីភាសាអង់គ្លេសទូទៅ និងសញ្ញាបត្រការគិតច្នៃប្រឌិត និងការគិតពិចារណា',
            'edu.e2.det': 'ការវែកញែកវិភាគ ការជជែកដេញដោល ការដោះស្រាយបញ្ហា និងការទំនាក់ទំនងជាភាសាអង់គ្លេសសិក្សា។',
            'edu.e2.b2': 'ការគិតពិចារណា',
            'edu.e3.deg': 'សញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ (បាក់ឌុប)',
            'edu.e3.det': 'ការសិក្សាមធ្យមសិក្សាដោយផ្ដោតលើគណិតវិទ្យា រូបវិទ្យា និងវិទ្យាសាស្ត្រ — មូលដ្ឋានគ្រឹះសម្រាប់វិស្វកម្មនៅសាកលវិទ្យាល័យ។',
            'edu.awards': '🏆 ពានរង្វាន់ និងកិត្តិយស',
            'edu.aw1': 'ជើងឯកលេខ ១ ការប្រកួតរ៉ូបូតដើរតាមខ្សែ',
            'edu.aw1d': 'ទទួលស្គាល់ដោយសារល្បឿនលឿនបំផុត ការចាប់សញ្ញាច្បាស់ និង PID ផ្ទាល់ខ្លួនដែលមានស្ថិរភាព។',
            'edu.refs': '📋 អ្នកធានាផ្នែកសិក្សា',
            'edu.ref1': 'សាស្ត្រាចារ្យ ដេប៉ាតឺម៉ង់វិស្វកម្មអគ្គិសនី និងថាមពល',
            'edu.ref2': 'ប្រធានមន្ទីរពិសោធន៍ ដេប៉ាតឺម៉ង់វិស្វកម្មអគ្គិសនី និងថាមពល',

            'contact.tag': 'តោះនិយាយគ្នា',
            'contact.title': '<span class="text-glow-cyan">ទាក់ទង</span>មកខ្ញុំ',
            'contact.sub': 'ទំនេរសម្រាប់ការងារវិស្វកម្ម MEP គម្រោងសំណង់ ការអភិវឌ្ឍរ៉ូបូត និងការបង្រៀនរូបវិទ្យា។ ខ្ញុំអាចឆ្លើយតបជាភាសាខ្មែរ អង់គ្លេស ឬចិន។',
            'contact.direct': 'ព័ត៌មានទំនាក់ទំនង',
            'contact.directSub': 'វិធីលឿនបំផុតគឺតាមទូរសព្ទ ឬអ៊ីមែល។',
            'contact.email': 'អ៊ីមែល',
            'contact.phone': 'ទូរសព្ទ',
            'contact.alt': 'លេខបន្ថែម',
            'contact.loc': 'ទីតាំង',
            'contact.locVal': 'ទួលសង្កែ ភ្នំពេញ កម្ពុជា',
            'contact.copy': 'ចម្លង',
            'contact.docs': 'ទាញយកឯកសាររបស់ខ្ញុំ',
            'contact.cv': 'CV ពេញលេញ (PDF)',
            'contact.resume': 'Resume (PDF)',
            'form.title': 'ផ្ញើសារមកខ្ញុំ',
            'form.note': 'បើកក្នុងកម្មវិធីអ៊ីមែលរបស់អ្នក',
            'form.name': 'ឈ្មោះ / ក្រុមហ៊ុន *',
            'form.namePh': 'ឧ. សុខ សុភ័ក្ត្រ / B&MEP Construction',
            'form.email': 'អ៊ីមែលរបស់អ្នក *',
            'form.type': 'ទាក់ទងនឹងអ្វី?',
            'form.t1': 'ការងារ MEP និង HVAC ពាណិជ្ជកម្ម',
            'form.t2': 'រ៉ូបូត ស្វ័យប្រវត្តិកម្ម និង firmware',
            'form.t3': 'គូរប្លង់ AutoCAD / DIALux និង BOQ',
            'form.t4': 'ការផ្ដល់ការងារពេញម៉ោង',
            'form.t6': 'បង្រៀនរូបវិទ្យា / STEM',
            'form.t5': 'ផ្សេងៗ / សហការ',
            'form.msg': 'សាររបស់អ្នក *',
            'form.msgPh': 'ប្រាប់ខ្ញុំអំពីគម្រោង រយៈពេល ឬអ្វីដែលអ្នកត្រូវការ...',
            'form.send': 'ផ្ញើសារ',
            'footer.rights': 'រក្សាសិទ្ធិគ្រប់យ៉ាង។',
            'footer.top': 'លើ'
        },

        zh: {
            'a11y.skip': '跳到正文',
            'brand.role': '电气 &bull; 机电 &bull; 机器人',
            'hud.sfx': '音效',
            'hud.sfxTitle': '开启/关闭音效',
            'hud.status': '欢迎工作与合作邀约',
            'dock.aria': '快速联系',
            'dock.email': '给我发邮件',
            'dock.emailShort': '邮件',
            'dock.call': '给我打电话',
            'dock.callShort': '电话',
            'dock.cv': '打开我的简历',
            'dock.top': '返回顶部',

            'nav.home': '首页',
            'nav.experience': '经历',
            'nav.projects': '项目',
            'nav.skills': '技能',
            'nav.lab': '技术实验室',
            'nav.education': '教育',
            'nav.contact': '联系',
            'nav.cv': '下载简历',
            'nav.mobCv': '下载正式简历 (PDF)',
            'nav.mobResume': '下载简历摘要 (PDF)',

            'hero.flipTitle': '点击切换我的三个专业方向',
            'hero.roleMep': 'MEP 与暖通空调专家',
            'hero.roleRobo': '机器人与 PCB 固件',
            'hero.roleStem': 'STEM 物理讲师',
            'hero.segMep': 'MEP',
            'hero.segRobo': '机器人',
            'hero.segStem': 'STEM',
            'hero.status': '可承接 MEP、机器人及教学工作',
            'hero.headline': '精准的 <span class="text-glow-cyan">机电系统</span><br>与先进的 <span class="text-glow-amber">机器人技术</span>',
            'hero.bio': '<strong>Chorn Philip（钟·菲利普）</strong>— <strong>柬埔寨理工学院 (ITC)</strong> 电气工程专业大四学生，就读 <strong>ECAM LaSalle 国际双学位项目</strong>。现任 <strong>B&amp;MEP Engineering Construction 公司</strong> MEP 技术员，从事暖通空调、配电系统、STM32 固件及自主机器人开发。',
            'hero.ctaProjects': '查看我的项目',
            'hero.ctaContact': '与我合作',
            'hero.ctaCv': '查看简历',
            'hero.scroll': '向下滚动浏览',

            'badge.champ.t': '冠军（第一名）',
            'badge.champ.d': '2026 循迹机器人竞赛',
            'badge.mep.t': 'MEP 与暖通空调专家',
            'badge.quad.t': '四足机器人与无人机',
            'badge.quad.d': 'STM32 固件与步态运动学',
            'badge.edu.d': '大四 &bull; 金边',
            'badge.stem.t': 'STEM 讲师',

            'metric.firstSuffix': '',
            'metric.first': '机器人竞赛第一名',
            'metric.yearVal': '大四',
            'metric.year': 'ECAM LaSalle / ITC 双学位',
            'metric.projects': '已完成的工程项目',
            'metric.ielts': '英语能力认证',

            'intent.kicker': '快速开始',
            'intent.title': '您来这里是为了什么？',
            'intent.sub': '选择一项，我会优先为您展示最相关的作品。',
            'intent.mep.t': '我需要 MEP / 电气工程师',
            'intent.mep.d': '暖通空调、单线图、工程量清单、AutoCAD、DIALux',
            'intent.robotics.t': '我在寻找机器人与嵌入式人才',
            'intent.robotics.d': 'STM32 固件、PID 控制、无人机、PCB 设计',
            'intent.teaching.t': '我想找物理 / STEM 老师',
            'intent.teaching.d': 'AP 物理、剑桥 IGCSE、数学',
            'intent.browse.t': '随便看看',
            'intent.browse.d': '给我看重点内容',

            'common.present': '至今',
            'common.pp': '柬埔寨 金边',
            'common.cambodia': '柬埔寨',
            'common.keyResp': '主要职责',
            'common.details': '详情',

            'exp.tag': '工作与教学',
            'exp.title': '工程<span class="text-glow-cyan">经历</span>',
            'exp.sub': '在攻读国际双学位的同时，积累了机电（MEP）行业实践经验和教学经验。',
            'exp.badgeActive': '当前职位',
            'exp.badgeTeach': '当前教学职位',
            'exp.badgeAcademic': '教学',
            'exp.badgeCommunity': '社区',
            'exp1.role': 'MEP 技术员 – 暖通空调与电气安装',
            'exp1.desc': '在在建商业楼宇工地上参与机械、电气及给排水系统的实际施工。',
            'exp1.r1': '<strong>暖通与机电系统：</strong>协助商业暖通空调、新风管道、冷冻水回路及低压配电柜的安装、调试与平衡。',
            'exp1.r2': '<strong>识图：</strong>解读多层 MEP 图纸、单线图 (SLD) 和技术规范，指导现场安装团队。',
            'exp1.r3': '<strong>绘制现场图：</strong>绘制 MEP 管线路由、线管走向及安装参考图，避免现场碰撞。',
            'exp1.r4': '<strong>工程量清单与报告：</strong>为项目经理编制工程量清单 (BOQ)、材料估算及进度报告。',
            'exp1.r5': '<strong>团队协调：</strong>衔接总包、现场工程师、建筑师与分包商之间的沟通。',
            'exp4.role': 'STEM 讲师 – AP 物理与剑桥科学',
            'exp4.desc': '兼职科学与数学讲师，教授九年级 AP 物理、剑桥 IGCSE 及美式课程 —— 将物理理论与真实工程相结合。',
            'exp4.r1': '<strong>AP 物理：</strong>按照美国大学理事会 AP 物理课程，讲授运动学、动力学、能量、波动与静电学。',
            'exp4.r2': '<strong>剑桥与美式课程：</strong>按剑桥 IGCSE 与美国标准讲授九年级科学和数学。',
            'exp4.r3': '<strong>生动教学：</strong>通过实验演示、解题工作坊和考试辅导，增强学生信心。',
            'exp4.r4': '<strong>两个教学中心：</strong>同时在金边的 Well-Edu Tutoring 与 Edu STEM Academy 授课。',
            'exp4.drive': '查看 STEM 教学作品',
            'exp2.role': '计算机讲师',
            'exp2.desc': '为中学生讲授计算机、办公软件和平面设计。',
            'exp2.r1': '讲授 Microsoft Word、Excel（计算）、PowerPoint、Adobe Illustrator 和 Photoshop。',
            'exp2.r2': '将复杂的电脑操作拆解为简单易懂的分步课程，适合各水平学生。',
            'exp3.role': '青年大使与人道主义志愿者',
            'exp3.org': '柬埔寨红十字会 &amp; UYFN（United Youth for National Development）',
            'exp3.desc': '参与全国性社会服务、防灾准备、社区福利及青年领导力培训。',
            'chip.comm': '技术沟通',
            'chip.lead': '领导力',
            'chip.community': '社区参与',
            'chip.crisis': '危机管理',

            'proj.tag': '真实工程案例',
            'proj.title': '精选<span class="text-glow-amber">项目</span>',
            'proj.sub': '从建造机电系统到四足机器人、植保无人机和冠军循迹小车。点击任意卡片查看详情。',
            'proj.fAll': '全部',
            'proj.fMep': 'MEP 与暖通',
            'proj.fRobo': '机器人与 AI',
            'proj.fEmb': '无人机与硬件',
            'proj.details': '查看详情',
            'link.site': '现场资料',
            'link.office': '设计资料',
            'link.drive': '项目资料',
            'link.video1': '视频 1',
            'link.video2': '视频 2',

            'p1.badge': '现场 MEP',
            'p1.code': '商业机电',
            'p1.name': '商业楼宇暖通与机电安装',
            'p1.sum': '商业机械、电气与给排水系统的现场工程：绘制图纸、单线配电、编制工程量清单及风管平衡。',
            'p1.s1': '<span class="spec-k">应用：</span>多层商业及住宅楼',
            'p1.s2': '<span class="spec-k">工具：</span>AutoCAD、DIALux evo、单线图',
            'p1.s3': '<span class="spec-k">成果：</span>BOQ、无碰撞图纸、竣工图',
            'p2.badge': '精准农业科技',
            'p2.code': '自主四旋翼',
            'p2.name': '自主农业喷洒无人机',
            'p2.sum': '基于 F450 机架的自主四旋翼无人机，用于精准喷洒和作物监测，配备 Pixhawk 飞控、SunnySky 电机和自动喷洒泵。',
            'p2.s1': '<span class="spec-k">载荷：</span>微型水泵与喷嘴',
            'p2.s2': '<span class="spec-k">动力：</span>SunnySky 无刷电机 + 30A 电调',
            'p2.s3': '<span class="spec-k">飞控：</span>Pixhawk GPS 导航 & ExpressLRS',
            'p3.badge': '8 自由度步行机器人',
            'p3.code': '机器人与 AI',
            'p3.name': '语音控制四足步行机器人',
            'p3.sum': '8 自由度步行机器人，具备协调的腿部步态控制和实时响应的语音识别功能。',
            'p3.s1': '<span class="spec-k">驱动：</span>8 个大扭矩舵机（每条腿 2 个）',
            'p3.s2': '<span class="spec-k">处理：</span>单片机 + 语音模块',
            'p3.s3': '<span class="spec-k">功能：</span>小跑步态、全向行走、语音对话',
            'p4.badge': '冠军',
            'p4.code': '自主机器人',
            'p4.name': '冠军循迹机器人',
            'p4.sum': '荣获 ITC 循迹机器人竞赛<strong>第一名</strong>。自行设计 KiCad PCB，配备 5 路红外传感阵列，并为 900 RPM 微型电机调校 PID 转向。',
            'p4.s1': '<span class="spec-k">奖项：</span>🏆 第一名（ITC 竞赛）',
            'p4.s2': '<span class="spec-k">控制：</span>调校 PID + 路口识别逻辑',
            'p4.s3': '<span class="spec-k">硬件：</span>自制 KiCad PCB + 900 RPM 电机',
            'p5.badge': '照明仿真',
            'p5.code': '电气照明',
            'p5.name': '建筑与工业照明设计',
            'p5.sum': '使用 DIALux evo 进行照明设计与光度仿真：眩光值 (UGR)、平均照度和能效，符合 EN 12464 标准。',
            'p5.s1': '<span class="spec-k">软件：</span>DIALux evo & AutoCAD Architecture',
            'p5.s2': '<span class="spec-k">输出：</span>3D 伪彩照度图 & 灯具清单',
            'p5.s3': '<span class="spec-k">能效：</span>优化每层功率密度 (W/m²)',
            'p6.badge': 'PCB 与仿真',
            'p6.code': '硬件设计',
            'p6.name': '定制传感器与电机驱动板',
            'p6.sum': '在 KiCad 中完成原理图与 PCB 布局，并用 LTspice 仿真：浪涌保护、光耦隔离及 H 桥电机驱动，用于机器人和工业控制器。',
            'p6.s1': '<span class="spec-k">工具：</span>KiCad、LTspice、STM32CubeIDE',
            'p6.s2': '<span class="spec-k">电路：</span>光耦隔离栅极驱动、LDO 稳压',
            'p6.s3': '<span class="spec-k">测试：</span>示波器与逻辑分析仪验证',

            'skills.tag': '我的专长',
            'skills.title': '专业<span class="text-glow-cyan">技能</span>与工具',
            'skills.sub': '楼宇电气系统、嵌入式固件与工程软件 —— 全在一个工具箱里。',
            'skills.mepT': 'MEP 与电气工程',
            'skills.mepS': '楼宇设备、负荷计算与现场施工',
            'skills.roboT': '机器人与嵌入式系统',
            'skills.roboS': '固件、PID 控制、电路与传感器',
            'skills.swT': '软件与 CAD 工具',
            'skills.swS': '行业标准的设计、仿真与项目管理工具',
            'sk.m1': '暖通空调与机械安装',
            'sk.m2': 'MEP 制图与识图',
            'sk.m3': '单线图 (SLD) 与配电',
            'sk.m4': '工程量清单 (BOQ)',
            'sk.m5': '照明设计 (DIALux evo)',
            'sk.r1': 'PID 控制与调参',
            'sk.r2': '单片机固件 (STM32 / Arduino)',
            'sk.r3': '电路设计 (KiCad / LTspice)',
            'sk.r4': '传感器集成与遥测',
            'sk.r5': '机器人运动学与步态',
            'tool.autocad': 'MEP 与建筑制图',
            'tool.dialux': '3D 照明仿真',
            'tool.kicad': '原理图与双层 PCB',
            'tool.ltspice': '电路仿真',
            'tool.matlab': '控制系统与数学',
            'tool.stm32': 'ARM Cortex-M 固件',
            'tool.arduino': '快速原型',
            'tool.msproject': '进度与里程碑',
            'tool.adobe': '图形与图表',
            'tool.office': 'BOQ 与成本分析',

            'lab.tag': '亲自试一试',
            'lab.title': '互动<span class="text-glow-cyan">技术实验室</span>',
            'lab.sub': '拖动滑块，运行我在工作和机器人项目中使用的真实工程计算。',
            'lab.tab1': '空调冷负荷',
            'lab.tab2': 'PID 机器人控制',
            'lab.tab3': '照明计算器',
            'lab.mep.h': '房间与空调参数',
            'lab.mep.area': '面积 (m²)',
            'lab.mep.height': '层高 (m)',
            'lab.mep.people': '人数',
            'lab.mep.space': '房间类型：',
            'lab.mep.office': '办公室（中等热负荷）',
            'lab.mep.server': '机房 / 配电室（高热负荷）',
            'lab.mep.home': '住宅 / 公寓（中低热负荷）',
            'lab.mep.res': '计算结果',
            'lab.mep.vol': '房间体积',
            'lab.mep.load': '冷负荷',
            'lab.mep.air': '所需风量',
            'lab.mep.duct': '建议风管尺寸',
            'lab.mep.status': '⚡ 冷风：运行中',
            'lab.pid.h': 'PID 增益',
            'lab.pid.p': '比例',
            'lab.pid.i': '积分',
            'lab.pid.d': '微分',
            'lab.pid.try': '试试预设：',
            'lab.pid.tuned': '调校良好',
            'lab.pid.wobbly': '振荡',
            'lab.pid.slow': '太慢',
            'lab.pid.run': '运行仿真',
            'lab.pid.graph': '阶跃响应',
            'lab.pid.rise': '上升时间',
            'lab.pid.over': '超调量',
            'lab.pid.err': '稳态误差',
            'lab.lux.h': '房间照明设置',
            'lab.lux.use': '房间用途：',
            'lab.lux.o1': '办公室 / CAD 制图 (500 lux)',
            'lab.lux.o2': '教室 / 车间 (300 lux)',
            'lab.lux.o3': '电子与 PCB 装配 (750 lux)',
            'lab.lux.o4': '走廊 / 设备间 (150 lux)',
            'lab.lux.size': '房间尺寸（长 x 宽）',
            'lab.lux.lamp': '灯具',
            'lab.lux.res': '计算结果',
            'lab.lux.target': '目标照度',
            'lab.lux.count': '所需灯具数量',
            'lab.lux.power': '功率密度',
            'lab.lux.eff': '高能效 (A+)',
            'lab.lux.ugr': '眩光值 (UGR)',
            'lab.lux.ok': '&lt; 19（达标）',

            'edu.tag': '学历与推荐人',
            'edu.title': '<span class="text-glow-cyan">教育背景</span>与推荐人',
            'edu.sub': '国际双学位工程项目，以及大学讲师的推荐。',
            'edu.e1.year': '至今 &bull; 大四',
            'edu.e1.deg': '电气工程学士',
            'edu.e1.det': '主修<strong>机器人与自动化</strong>：单片机固件、楼宇及高压电气设计、PID 控制、工业控制系统和自动化设备。',
            'edu.e1.b1': 'ECAM LaSalle 双学位',
            'edu.e1.b2': '机器人与自动化',
            'edu.e1.b3': 'ITC 奖学金生',
            'edu.e2.deg': '通用英语课程 & 创意与批判性思维文凭',
            'edu.e2.det': '分析推理、辩论、问题解决与学术英语沟通。',
            'edu.e2.b2': '批判性思维',
            'edu.e3.deg': '高中毕业文凭（柬埔寨国家高考）',
            'edu.e3.det': '中学阶段重点学习数学、物理和自然科学，为大学工程学习打下基础。',
            'edu.awards': '🏆 奖项与荣誉',
            'edu.aw1': '循迹机器人竞赛第一名',
            'edu.aw1d': '凭借最快圈速、稳定的传感和自研 PID 算法获奖。',
            'edu.refs': '📋 学术推荐人',
            'edu.ref1': '电气与能源工程系 讲师',
            'edu.ref2': '电气与能源工程系 实验室主任',

            'contact.tag': '聊一聊',
            'contact.title': '<span class="text-glow-cyan">联系</span>我',
            'contact.sub': '可承接 MEP 工程、楼宇项目、机器人开发及物理辅导。我可以用中文、英文或高棉语回复。',
            'contact.direct': '联系方式',
            'contact.directSub': '电话或邮件是最快的联系方式。',
            'contact.email': '邮箱',
            'contact.phone': '电话',
            'contact.alt': '备用',
            'contact.loc': '地址',
            'contact.locVal': '柬埔寨 金边 堆士腊区',
            'contact.copy': '复制',
            'contact.docs': '下载我的文件',
            'contact.cv': '完整简历 (PDF)',
            'contact.resume': '简历摘要 (PDF)',
            'form.title': '给我留言',
            'form.note': '将在您的邮件应用中打开',
            'form.name': '您的姓名 / 公司 *',
            'form.namePh': '例如：王伟 / B&MEP Construction',
            'form.email': '您的邮箱 *',
            'form.type': '咨询类型',
            'form.t1': '商业 MEP 与暖通工程',
            'form.t2': '机器人、自动化与固件',
            'form.t3': 'AutoCAD / DIALux 制图与 BOQ',
            'form.t4': '全职工作邀请',
            'form.t6': '物理 / STEM 辅导',
            'form.t5': '其他 / 合作',
            'form.msg': '留言内容 *',
            'form.msgPh': '请告诉我项目情况、时间安排或您的需求……',
            'form.send': '发送留言',
            'footer.rights': '版权所有。',
            'footer.top': '顶部'
        }
    };

    /* ======================================================================
       2. TEXT USED BY script.js (toasts, pop-ups, form, quick-start panel)
       ====================================================================== */
    var UI = {
        en: {
            'doc.title': 'CHORN PHILIP | Electrical & MEP Engineer | Robotics & Automation',
            'lang.changed': 'Language: English',
            'role.mep': 'MEP & HVAC Engineer',
            'role.robo': 'Robotics & Embedded',
            'role.stem': 'STEM & Physics Instructor',
            'toast.mep': 'Now showing: MEP & HVAC field work',
            'toast.robo': 'Now showing: Robotics lab & PCB hardware',
            'toast.stem': 'Now showing: STEM physics teaching',
            'sfx.on': 'ON', 'sfx.off': 'OFF',
            'toast.sfxOn': 'Sound effects on', 'toast.sfxOff': 'Sound effects off',
            'copied': 'Copied: {x}',
            'copyFail': 'Could not copy — please select it manually: {x}',
            'modal.specs': 'Specifications',
            'modal.highlights': 'Highlights',
            'modal.links': 'Documents & videos',
            'modal.close': 'Close',
            'modal.prev': 'Previous',
            'modal.next': 'Next',
            'modal.share': 'Copy link',
            'modal.linkCopied': 'Link to this project copied',
            'modal.count': 'Project {i} of {n}',
            'match': 'Relevant to you',
            'form.sending': 'Opening your email app…',
            'form.subject': 'Portfolio inquiry: {topic} — {name}',
            'form.lblName': 'Name', 'form.lblEmail': 'Email', 'form.lblTopic': 'Topic',
            'form.ok': '<strong>Almost done!</strong> Your email app should now be open with the message ready — just press <strong>Send</strong> there.<br>Nothing opened? Email <a href="mailto:Chornphilip8@gmail.com">Chornphilip8@gmail.com</a> or copy your message below.',
            'form.copyMsg': 'Copy my message',
            'form.toast': 'Message prepared in your email app',
            'lab.grid': '{c} x {r} grid',
            'lab.dim': '{l}m x {w}m ({a} m²)',
            'lab.fixtures': '{n}',
            'intent.cta.projects': 'See matching projects',
            'intent.cta.contact': 'Contact me about this',
            'intent.cta.cv': 'Open my CV',
            'intent.cta.teach': 'See my teaching experience',
            'intent.cta.teachDrive': 'View teaching work',
            'intent.cta.lab': 'Try the interactive lab',
            'intent.mep.h': 'Here is what I bring to an MEP team',
            'intent.mep.points': ['Working now as an MEP technician on commercial sites (B&MEP Engineering)', 'HVAC installation, single-line diagrams, BOQ & site drafting in AutoCAD', 'Lighting design in DIALux evo to EN 12464'],
            'intent.robotics.h': 'Here is my robotics & embedded work',
            'intent.robotics.points': ['1st Place — ITC Line Follower Robot Competition (custom PCB + PID)', 'Autonomous spraying drone with Pixhawk and a voice-controlled 4-legged robot', 'STM32 / Arduino firmware, KiCad PCB design, LTspice simulation'],
            'intent.teaching.h': 'Here is how I can help your student',
            'intent.teaching.points': ['Teaching AP Physics, Cambridge IGCSE science and maths (Grade 9)', 'Real engineering examples that make physics easy to picture', 'Lessons in English, Khmer or Chinese'],
            'intent.browse.h': 'The highlights in 10 seconds',
            'intent.browse.points': ['4th-year Electrical Engineering, ITC × ECAM LaSalle dual degree', 'MEP technician by day, robotics builder and physics teacher too', 'Champion line-follower robot — plus 5 more projects with documents'],
            'filter.showing': 'Showing {n} project(s)'
        },
        km: {
            'doc.title': 'ជន ភីលីព | វិស្វករអគ្គិសនី និង MEP | រ៉ូបូត និងស្វ័យប្រវត្តិកម្ម',
            'lang.changed': 'ភាសា៖ ខ្មែរ',
            'role.mep': 'វិស្វករ MEP និង HVAC',
            'role.robo': 'រ៉ូបូត និង Embedded',
            'role.stem': 'គ្រូបង្រៀន STEM និងរូបវិទ្យា',
            'toast.mep': 'កំពុងបង្ហាញ៖ ការងារ MEP និង HVAC',
            'toast.robo': 'កំពុងបង្ហាញ៖ មន្ទីរពិសោធន៍រ៉ូបូត និង PCB',
            'toast.stem': 'កំពុងបង្ហាញ៖ ការបង្រៀនរូបវិទ្យា STEM',
            'sfx.on': 'បើក', 'sfx.off': 'បិទ',
            'toast.sfxOn': 'បានបើកសំឡេង', 'toast.sfxOff': 'បានបិទសំឡេង',
            'copied': 'បានចម្លង៖ {x}',
            'copyFail': 'មិនអាចចម្លងបាន — សូមជ្រើសរើសដោយដៃ៖ {x}',
            'modal.specs': 'លក្ខណៈបច្ចេកទេស',
            'modal.highlights': 'ចំណុចសំខាន់ៗ',
            'modal.links': 'ឯកសារ និងវីដេអូ',
            'modal.close': 'បិទ',
            'modal.prev': 'មុន',
            'modal.next': 'បន្ទាប់',
            'modal.share': 'ចម្លងតំណ',
            'modal.linkCopied': 'បានចម្លងតំណគម្រោងនេះ',
            'modal.count': 'គម្រោងទី {i} នៃ {n}',
            'match': 'ទាក់ទងនឹងអ្នក',
            'form.sending': 'កំពុងបើកកម្មវិធីអ៊ីមែល…',
            'form.subject': 'សំណួរពី Portfolio៖ {topic} — {name}',
            'form.lblName': 'ឈ្មោះ', 'form.lblEmail': 'អ៊ីមែល', 'form.lblTopic': 'ប្រធានបទ',
            'form.ok': '<strong>ជិតរួចហើយ!</strong> កម្មវិធីអ៊ីមែលរបស់អ្នកគួរតែបើកជាមួយសាររួចរាល់ — គ្រាន់តែចុច <strong>Send</strong>។<br>មិនបើក? សូមផ្ញើទៅ <a href="mailto:Chornphilip8@gmail.com">Chornphilip8@gmail.com</a> ឬចម្លងសាររបស់អ្នកខាងក្រោម។',
            'form.copyMsg': 'ចម្លងសាររបស់ខ្ញុំ',
            'form.toast': 'សារត្រូវបានរៀបចំក្នុងកម្មវិធីអ៊ីមែល',
            'lab.grid': 'ក្រឡា {c} x {r}',
            'lab.dim': '{l}m x {w}m ({a} m²)',
            'lab.fixtures': '{n}',
            'intent.cta.projects': 'មើលគម្រោងដែលពាក់ព័ន្ធ',
            'intent.cta.contact': 'ទាក់ទងខ្ញុំអំពីរឿងនេះ',
            'intent.cta.cv': 'បើក CV របស់ខ្ញុំ',
            'intent.cta.teach': 'មើលបទពិសោធន៍បង្រៀន',
            'intent.cta.teachDrive': 'មើលស្នាដៃបង្រៀន',
            'intent.cta.lab': 'សាកល្បងមន្ទីរពិសោធន៍',
            'intent.mep.h': 'អ្វីដែលខ្ញុំអាចផ្ដល់ឱ្យក្រុម MEP',
            'intent.mep.points': ['កំពុងធ្វើការជាបច្ចេកទេស MEP នៅការដ្ឋានពាណិជ្ជកម្ម (B&MEP Engineering)', 'ដំឡើង HVAC ប្លង់ខ្សែតែមួយ BOQ និងគូរប្លង់ការដ្ឋានក្នុង AutoCAD', 'រចនាពន្លឺក្នុង DIALux evo តាមស្តង់ដារ EN 12464'],
            'intent.robotics.h': 'ការងាររ៉ូបូត និង Embedded របស់ខ្ញុំ',
            'intent.robotics.points': ['ជើងឯកលេខ ១ — ការប្រកួតរ៉ូបូតដើរតាមខ្សែ ITC (PCB ផ្ទាល់ខ្លួន + PID)', 'Drone បាញ់ថ្នាំស្វ័យប្រវត្តិ Pixhawk និងរ៉ូបូតជើងបួនបញ្ជាដោយសំឡេង', 'Firmware STM32 / Arduino ការរចនា PCB KiCad និងការក្លែងធ្វើ LTspice'],
            'intent.teaching.h': 'របៀបដែលខ្ញុំអាចជួយសិស្សរបស់អ្នក',
            'intent.teaching.points': ['បង្រៀន AP Physics វិទ្យាសាស្ត្រ Cambridge IGCSE និងគណិតវិទ្យា (ថ្នាក់ទី៩)', 'ឧទាហរណ៍វិស្វកម្មពិតៗ ដែលធ្វើឱ្យរូបវិទ្យាងាយយល់', 'បង្រៀនជាភាសាខ្មែរ អង់គ្លេស ឬចិន'],
            'intent.browse.h': 'ចំណុចសំខាន់ៗក្នុង ១០ វិនាទី',
            'intent.browse.points': ['និស្សិតវិស្វកម្មអគ្គិសនីឆ្នាំទី៤ សញ្ញាបត្រពីរ ITC × ECAM LaSalle', 'បច្ចេកទេស MEP ពេលថ្ងៃ អ្នកបង្កើតរ៉ូបូត និងគ្រូរូបវិទ្យាផងដែរ', 'រ៉ូបូតដើរតាមខ្សែជើងឯក — និងគម្រោង ៥ ទៀតដែលមានឯកសារ'],
            'filter.showing': 'កំពុងបង្ហាញ {n} គម្រោង'
        },
        zh: {
            'doc.title': 'CHORN PHILIP | 电气与机电工程师 | 机器人与自动化',
            'lang.changed': '语言：中文',
            'role.mep': 'MEP 与暖通工程师',
            'role.robo': '机器人与嵌入式',
            'role.stem': 'STEM 物理讲师',
            'toast.mep': '当前显示：MEP 与暖通现场工作',
            'toast.robo': '当前显示：机器人实验室与 PCB 硬件',
            'toast.stem': '当前显示：STEM 物理教学',
            'sfx.on': '开', 'sfx.off': '关',
            'toast.sfxOn': '音效已开启', 'toast.sfxOff': '音效已关闭',
            'copied': '已复制：{x}',
            'copyFail': '无法复制，请手动选择：{x}',
            'modal.specs': '技术参数',
            'modal.highlights': '项目亮点',
            'modal.links': '文件与视频',
            'modal.close': '关闭',
            'modal.prev': '上一个',
            'modal.next': '下一个',
            'modal.share': '复制链接',
            'modal.linkCopied': '已复制该项目链接',
            'modal.count': '第 {i} / {n} 个项目',
            'match': '与您相关',
            'form.sending': '正在打开邮件应用…',
            'form.subject': '作品集咨询：{topic} — {name}',
            'form.lblName': '姓名', 'form.lblEmail': '邮箱', 'form.lblTopic': '类型',
            'form.ok': '<strong>快完成了！</strong>您的邮件应用应已打开并填好内容 —— 请在其中点击<strong>发送</strong>。<br>没有打开？请发邮件至 <a href="mailto:Chornphilip8@gmail.com">Chornphilip8@gmail.com</a>，或复制下方的留言。',
            'form.copyMsg': '复制我的留言',
            'form.toast': '留言已在邮件应用中准备好',
            'lab.grid': '{c} x {r} 布置',
            'lab.dim': '{l}m x {w}m（{a} m²）',
            'lab.fixtures': '{n} 盏',
            'intent.cta.projects': '查看相关项目',
            'intent.cta.contact': '就此联系我',
            'intent.cta.cv': '打开我的简历',
            'intent.cta.teach': '查看教学经历',
            'intent.cta.teachDrive': '查看教学作品',
            'intent.cta.lab': '试试互动实验室',
            'intent.mep.h': '我能为 MEP 团队带来什么',
            'intent.mep.points': ['现任商业工地 MEP 技术员（B&MEP Engineering）', '暖通安装、单线图、工程量清单及 AutoCAD 现场制图', '使用 DIALux evo 按 EN 12464 进行照明设计'],
            'intent.robotics.h': '我的机器人与嵌入式作品',
            'intent.robotics.points': ['第一名 —— ITC 循迹机器人竞赛（自制 PCB + PID）', 'Pixhawk 自主喷洒无人机与语音控制四足机器人', 'STM32 / Arduino 固件、KiCad PCB 设计、LTspice 仿真'],
            'intent.teaching.h': '我能如何帮助您的孩子',
            'intent.teaching.points': ['教授 AP 物理、剑桥 IGCSE 科学与数学（九年级）', '用真实工程案例让物理更直观易懂', '可用中文、英文或高棉语授课'],
            'intent.browse.h': '10 秒看重点',
            'intent.browse.points': ['ITC × ECAM LaSalle 双学位电气工程大四学生', '白天是 MEP 技术员，也做机器人、教物理', '冠军循迹机器人 —— 另有 5 个附带资料的项目'],
            'filter.showing': '显示 {n} 个项目'
        }
    };

    /* ======================================================================
       3. PROJECT POP-UP TRANSLATIONS (English lives in script.js PROJECT_DETAILS)
       ====================================================================== */
    var PROJECTS = {
        km: {
            'mep-hvac': {
                title: 'ប្រព័ន្ធ MEP និង HVAC អគារពាណិជ្ជកម្ម',
                category: 'B&MEP Engineering Construction Co., Ltd // កម្រិតពាណិជ្ជកម្ម',
                overview: 'បច្ចេកទេស MEP នៅការដ្ឋាន ទទួលខុសត្រូវការដំឡើងប្រព័ន្ធ HVAC និង VRV ការចែកចាយអគ្គិសនីខ្សែតែមួយ និងការសម្របសម្រួលប្រព័ន្ធទឹក។ ភ្ជាប់ប្លង់រចនាទៅនឹងការអនុវត្តជាក់ស្ដែង ដើម្បីកុំឱ្យផ្លូវបំពង់ខ្សែ និងបំពង់ខ្យល់ប៉ះទង្គិចគ្នា។',
                specs: [
                    { k: 'ក្រុមហ៊ុន', v: 'B&MEP Engineering Construction Co., Ltd' },
                    { k: 'ភារកិច្ចចម្បង', v: 'ដំឡើង HVAC, ប្លង់ As-Built MEP, រៀបចំ BOQ' },
                    { k: 'កម្មវិធីវិស្វកម្ម', v: 'AutoCAD MEP, DIALux evo, Microsoft Project, Excel BOQ' },
                    { k: 'ផ្នែកអគ្គិសនី', v: 'តាប្លូចែកចាយតង់ស្យុងទាប (LV-DB), ផ្លូវបំពង់ខ្សែ, ទ្រខ្សែ' },
                    { k: 'ផ្នែក HVAC', v: 'គណនាទំហំបំពង់ខ្យល់, តម្រឹមលំហូរខ្យល់ (CFM), បំពង់ស្ពាន់ទឹកត្រជាក់, VRV' }
                ],
                highlights: [
                    'រៀបចំ BOQ យ៉ាងច្បាស់លាស់ជាមួយការបែងចែកតម្លៃសម្ភារៈ ដើម្បីកាត់បន្ថយការខ្ជះខ្ជាយក្នុងការទិញ។',
                    'គូរប្លង់ Shop drawing និងសម្របសម្រួលប្លង់រវាងក្រុមរចនាសម្ព័ន្ធ ស្ថាបត្យកម្ម និងអគ្គិសនី។',
                    'ត្រួតពិនិត្យការធ្វើតេស្ត និងដាក់ឱ្យដំណើរការបំពង់ខ្យល់ និងការតម្រឹមផាសអគ្គិសនីនៅការដ្ឋាន។'
                ],
                links: ['📁 Drive ការដ្ឋាន', '📐 Drive រចនាការិយាល័យ']
            },
            'drone': {
                title: 'Drone បាញ់ថ្នាំកសិកម្មស្វ័យប្រវត្តិ',
                category: 'បច្ចេកវិទ្យាកសិកម្មច្បាស់លាស់ // Quadcopter ស្វ័យប្រវត្តិ',
                overview: 'រចនា និងបង្កើតគំរូ Drone បាញ់ថ្នាំស្វ័យប្រវត្តិលើតួ F450។ ភ្ជាប់ Pixhawk flight controller ជាមួយ GPS ម៉ូទ័រ SunnySky brushless និងប្រព័ន្ធបូមទឹកតូច សម្រាប់ហោះតាមចំណុចកំណត់ និងបាញ់ថ្នាំចំគោលដៅ។',
                specs: [
                    { k: 'តួ', v: 'F450 Quadcopter X-Frame' },
                    { k: 'ប្រព័ន្ធម៉ូទ័រ', v: 'ម៉ូទ័រ SunnySky brushless ជាមួយ ESC 30A' },
                    { k: 'Flight Controller និង GPS', v: 'Pixhawk ជាមួយ GPS និង Compass' },
                    { k: 'បន្ទុក និងការបាញ់', v: 'ម៉ាស៊ីនបូមទឹកតូច ជាមួយក្បាលបាញ់' },
                    { k: 'ការបញ្ជា និង Telemetry', v: 'ExpressLRS និង Mission Planner waypoint' }
                ],
                highlights: [
                    'កំណត់ Pixhawk កែតម្រូវ Compass និងការហោះតាម GPS waypoint តាម Mission Planner។',
                    'ភ្ជាប់ម៉ាស៊ីនបូមដែលធ្វើសមកាលកម្មជាមួយការហោះ ដើម្បីបាញ់ថ្នាំចំគោលដៅ។'
                ],
                links: ['📁 Drive គម្រោង Quadcopter']
            },
            'quadruped': {
                title: 'រ៉ូបូតជើងបួនបញ្ជាដោយសំឡេង',
                category: 'រ៉ូបូតត្រាប់តាមសត្វ និងការដំណើរការសំឡេង',
                overview: 'បង្កើតរ៉ូបូតជើងបួន 8-DOF ដែលមានចលនាជើងសម្របសម្រួល និងការគ្រប់គ្រងការដើរ។ ភ្ជាប់ការស្គាល់បញ្ជាសំឡេង និងការនិយាយឆ្លើយតប ដែលអាចឱ្យរ៉ូបូតសន្ទនាជាមួយអ្នកប្រើ ពេលកំពុងដើរយ៉ាងមានលំនឹង។',
                specs: [
                    { k: 'កម្រិតសេរីភាព', v: 'Servo កម្លាំងខ្លាំង ៨ (២ ក្នុងមួយជើង)' },
                    { k: 'ការបញ្ជា Kinematics', v: 'ការបង្កើតចលនា Trot និង Kinematics ជើង' },
                    { k: 'ដំណើរការ និងសំឡេង', v: 'Microcontroller + ការស្គាល់សំឡេង និងការនិយាយ' },
                    { k: 'ការផលិត', v: 'តួរចនាដោយ 3D ជាមួយទ្រ Servo ច្រើនអ័ក្ស' }
                ],
                highlights: [
                    'សាងសង់តួរ៉ូបូតជើងបួនដែលមានចំណុចទំនាញមានលំនឹង និងអាចដើរទៅមុខ/បត់បានយ៉ាងរលូន។',
                    'ភ្ជាប់ម៉ូឌុលបញ្ជាសំឡេង ដែលអាចឱ្យអ្នកប្រើបញ្ជា និងរ៉ូបូតធ្វើចលនាដោយស្វ័យប្រវត្តិ។'
                ],
                links: ['📁 Drive គម្រោងរ៉ូបូតជើងបួន', '▶️ វីដេអូសាកល្បង (ភាគ ១)', '▶️ វីដេអូសាកល្បង (ភាគ ២)']
            },
            'linefollower': {
                title: 'រ៉ូបូតដើរតាមខ្សែស្វ័យប្រវត្តិ ជើងឯកលេខ ១',
                category: 'ការប្រកួតរ៉ូបូតផ្លូវការ ITC // ប្រព័ន្ធជើងឯក',
                overview: 'ឈ្នះជើងឯកលេខ ១ ក្នុងការប្រកួតរ៉ូបូតដើរតាមខ្សែនៅវិទ្យាស្ថានបច្ចេកវិទ្យាកម្ពុជា។ រចនា PCB ផ្ទាល់ខ្លួនក្នុង KiCad មានឧបករណ៍ចាប់ពន្លឺ IR ៥ ឆានែល និងម៉ូទ័រ N20 ល្បឿន 900 RPM ដែលសរសេរកម្មវិធីឱ្យដើរតាមផ្លូវ និងធ្វើកិច្ចការជាក់លាក់។',
                specs: [
                    { k: 'សមិទ្ធផល', v: '🏆 ជើងឯកលេខ ១ (វិទ្យាស្ថានបច្ចេកវិទ្យាកម្ពុជា)' },
                    { k: 'ក្បួនបញ្ជា', v: 'PID (Proportional-Integral-Derivative) ច្បាស់លាស់ខ្ពស់' },
                    { k: 'ការផលិត Hardware', v: 'PCB រចនាផ្ទាល់ខ្លួនក្នុង KiCad' },
                    { k: 'ឧបករណ៍ចាប់', v: 'IR ៥ ឆានែល' },
                    { k: 'ម៉ូទ័រ', v: 'ម៉ូទ័រលេខដែកតូច 900 RPM' }
                ],
                highlights: [
                    'កែតម្រូវ PID ដើម្បីដើរតាមខ្សែលឿន និងបត់កែងយ៉ាងរលូនជាមួយម៉ូទ័រ 900 RPM។',
                    'សរសេរកម្មវិធីចាប់ផ្លូវបំបែក ធ្វើចលនាស្វ័យប្រវត្តិ និងបំពេញគោលដៅនៃការប្រកួត។'
                ],
                links: ['📁 Drive គម្រោងរ៉ូបូតដើរតាមខ្សែ']
            },
            'dialux': {
                title: 'ការរចនាពន្លឺសម្រាប់អគារ និងឧស្សាហកម្ម',
                category: 'DIALux evo 3D // វិស្វកម្មពន្លឺ',
                overview: 'ធ្វើការគណនាពន្លឺ និងការក្លែងធ្វើ 3D សម្រាប់រោងជាង និងអគារការិយាល័យដោយ DIALux evo។ ផ្ដល់ផែនទីពន្លឺ ការផ្ទៀងផ្ទាត់កម្រិតពន្លឺចាំង (UGR) និងការអនុលោមតាមការសន្សំថាមពលតាមស្តង់ដារ EN 12464។',
                specs: [
                    { k: 'កម្មវិធីក្លែងធ្វើ', v: 'DIALux evo 12 និង AutoCAD Architecture' },
                    { k: 'ស្តង់ដារ', v: 'EN 12464-1 (ពន្លឺកន្លែងធ្វើការក្នុងអគារ)' },
                    { k: 'លទ្ធផលសំខាន់', v: 'ផែនទីពន្លឺពណ៌, តារាងចង្កៀង, ដង់ស៊ីតេថាមពល (W/m²)' },
                    { k: 'ទិន្នន័យចង្កៀង', v: 'វិភាគខ្សែកោងចែកចាយពន្លឺ IES / LDT' }
                ],
                highlights: [
                    'កែលម្អគម្លាត និងការជ្រើសរើសចង្កៀង ដើម្បីទទួលបានពន្លឺមធ្យម 500 lux ខណៈកាត់បន្ថយថាមពល ១៨%។',
                    'រៀបចំផ្លូវពន្លឺសង្គ្រោះបន្ទាន់ និងការចែកចាយពន្លឺថ្មបម្រុង។'
                ],
                links: ['📁 Drive ការក្លែងធ្វើពន្លឺ']
            },
            'pcb': {
                title: 'បន្ទះសៀគ្វីឧបករណ៍ចាប់ និងបញ្ជាម៉ូទ័រ',
                category: 'KiCad EDA និង LTspice // Hardware អាណាឡូក និងឌីជីថល',
                overview: 'បង្កើតសៀគ្វីបញ្ជាអេឡិចត្រូនិករឹងមាំ ខ្សែផ្គត់ផ្គង់ថាមពល និងការញែកអុបទិក សម្រាប់ម៉ូទ័រ DC កម្លាំងខ្លាំង និង microcontroller។',
                specs: [
                    { k: 'ឧបករណ៍ EDA', v: 'KiCad 8.0 (Schematic និង PCB), LTspice XVII' },
                    { k: 'ឧបករណ៍គ្រប់គ្រងតង់ស្យុង', v: 'LDO, Buck converter ជាមួយតម្រង EMI' },
                    { k: 'ការញែក និងការការពារ', v: 'Optocoupler ល្បឿនលឿន, TVS diode, ការការពារប៉ូលបញ្ច្រាស' }
                ],
                highlights: [
                    'លុបបំបាត់ការដាច់ភ្លើង microcontroller និងសំឡេងរំខានម៉ូទ័រ ដោយប្រើដីញែកដាច់ និង capacitor bypass។',
                    'ផ្ទៀងផ្ទាត់ចម្លើយតបបណ្ដោះអាសន្ន និងលក្ខណៈប្រេកង់ដោយ Oscilloscope ឌីជីថល។'
                ],
                links: ['📁 Drive Hardware និង Schematic']
            }
        },
        zh: {
            'mep-hvac': {
                title: '商业楼宇 MEP 与暖通空调系统',
                category: 'B&MEP Engineering Construction Co., Ltd // 商业级',
                overview: '现场 MEP 技术员，负责暖通空调及 VRV 系统安装、单线配电以及给排水协调。将设计图纸与现场施工实际结合，确保线管与风管路由零碰撞。',
                specs: [
                    { k: '公司', v: 'B&MEP Engineering Construction Co., Ltd' },
                    { k: '主要职责', v: '暖通安装、MEP 竣工图、编制 BOQ' },
                    { k: '工程软件', v: 'AutoCAD MEP、DIALux evo、Microsoft Project、Excel BOQ' },
                    { k: '电气范围', v: '低压配电箱 (LV-DB)、线管路由、电缆桥架' },
                    { k: '暖通范围', v: '风管选型、风量平衡 (CFM)、冷媒铜管、VRV' }
                ],
                highlights: [
                    '编制含材料成本明细的精确工程量清单，减少采购浪费。',
                    '绘制施工深化图，协调结构、建筑与电气团队的布置。',
                    '监督通风管道调试及电气三相平衡测试。'
                ],
                links: ['📁 现场资料', '📐 设计资料']
            },
            'drone': {
                title: '自主农业喷洒无人机',
                category: '精准农业科技 // 自主四旋翼机器人',
                overview: '基于 F450 四旋翼机架设计并制作的紧凑型自主喷洒无人机。集成 Pixhawk 飞控与 GPS、高效 SunnySky 无刷电机以及微型水泵系统，实现自动航点飞行和定点喷洒。',
                specs: [
                    { k: '机架', v: 'F450 X 型四旋翼机架' },
                    { k: '动力系统', v: 'SunnySky 无刷电机 + 30A 电调 (ESC)' },
                    { k: '飞控与 GPS', v: 'Pixhawk 飞控，配 GPS 与罗盘' },
                    { k: '载荷与喷洒', v: '微型水泵 + 喷嘴' },
                    { k: '遥控与数传', v: 'ExpressLRS 链路 & Mission Planner 航点飞行' }
                ],
                highlights: [
                    '通过 Mission Planner 配置 Pixhawk、校准罗盘并设置 GPS 航点自动飞行。',
                    '集成与飞控同步的微型水泵，实现精准定点喷洒。'
                ],
                links: ['📁 四旋翼项目资料']
            },
            'quadruped': {
                title: '语音交互四足步行机器人',
                category: '仿生机器人与语音处理',
                overview: '研制 8 自由度仿生四足步行机器人，具备协调的腿部运动与步态控制。集成语音指令识别和语音输出，使机器人在稳定行走的同时可与用户对话。',
                specs: [
                    { k: '自由度', v: '8 个大扭矩舵机（每条腿 2 个）' },
                    { k: '运动学控制', v: '自研小跑步态生成与腿部运动学' },
                    { k: '处理与音频', v: '单片机 + 语音识别与语音合成' },
                    { k: '结构制造', v: '3D 设计机身 + 多轴舵机支架' }
                ],
                highlights: [
                    '搭建重心平衡的四足机身，实现稳定前进与转向步态。',
                    '集成语音指令模块，用户可通过语音控制机器人自主运动。'
                ],
                links: ['📁 四足机器人项目资料', '▶️ 测试视频（第 1 部分）', '▶️ 测试视频（第 2 部分）']
            },
            'linefollower': {
                title: '冠军自主循迹机器人（第一名）',
                category: 'ITC 官方机器人竞赛 // 冠军作品',
                overview: '在柬埔寨理工学院循迹机器人竞赛中荣获总冠军。使用 KiCad 自行设计 PCB，配备 5 路红外传感阵列和 900 RPM 高速 N20 微型电机，编程实现精确循迹和特定任务。',
                specs: [
                    { k: '成绩', v: '🏆 第一名（柬埔寨理工学院）' },
                    { k: '控制算法', v: '高精度 PID（比例-积分-微分）控制' },
                    { k: '硬件制作', v: 'KiCad 自主设计 PCB' },
                    { k: '传感器', v: '5 路红外反射传感阵列' },
                    { k: '电机', v: '900 RPM 微型金属减速电机' }
                ],
                highlights: [
                    '使用 900 RPM 电机调校 PID 参数，实现高速平稳循迹和急弯通过。',
                    '编写路口识别与任务处理程序，自主完成赛道目标。'
                ],
                links: ['📁 循迹机器人项目资料']
            },
            'dialux': {
                title: '建筑与工业照明光度设计',
                category: 'DIALux evo 3D // 照明工程',
                overview: '使用 DIALux evo 为工业车间和商业办公楼进行光度计算和 3D 照明仿真，提供等照度图、统一眩光值 (UGR) 验证以及符合 EN 12464 的节能评估。',
                specs: [
                    { k: '仿真软件', v: 'DIALux evo 12 & AutoCAD Architecture' },
                    { k: '标准', v: 'EN 12464-1（室内工作场所照明）' },
                    { k: '主要成果', v: '伪彩照度图、灯具表、功率密度 (W/m²)' },
                    { k: '灯具光度数据', v: 'IES / LDT 配光曲线分析' }
                ],
                highlights: [
                    '优化灯具间距与选型，工作面平均照度达 500 lux，同时降低 18% 功耗。',
                    '规划应急疏散照明路线及备用电池照度分布。'
                ],
                links: ['📁 照明仿真资料']
            },
            'pcb': {
                title: '定制传感器与电机驱动模块',
                category: 'KiCad EDA & LTspice // 模拟与数字硬件',
                overview: '为大功率直流电机和单片机设计可靠的嵌入式控制电路、电源稳压和光耦隔离接口。',
                specs: [
                    { k: 'EDA 工具', v: 'KiCad 8.0（原理图与 PCB）、LTspice XVII 仿真' },
                    { k: '电源稳压', v: 'LDO 稳压器、带 EMI 滤波的 Buck 变换器' },
                    { k: '隔离与保护', v: '高速光耦、TVS 续流二极管、防反接保护' }
                ],
                highlights: [
                    '通过隔离地平面和旁路电容阵列，消除单片机掉电和电机反电动势干扰。',
                    '使用数字示波器验证瞬态响应与频率特性。'
                ],
                links: ['📁 硬件与原理图资料']
            }
        }
    };

    /* ======================================================================
       4. ENGINE
       ====================================================================== */
    var listeners = [];
    var current = normalise(document.documentElement.lang);

    function normalise(lang) {
        lang = String(lang || 'en').toLowerCase().slice(0, 2);
        return SUPPORTED.indexOf(lang) > -1 ? lang : 'en';
    }

    function fill(str, vars) {
        if (!vars) return str;
        return String(str).replace(/\{(\w+)\}/g, function (m, k) {
            return vars[k] !== undefined ? vars[k] : m;
        });
    }

    function ui(key, vars) {
        var table = UI[current] || UI.en;
        var val = table[key] !== undefined ? table[key] : UI.en[key];
        if (val === undefined) return key;
        return Array.isArray(val) ? val : fill(val, vars);
    }

    function translateAttr(attr, prop) {
        var dict = I18N[current];
        document.querySelectorAll('[' + attr + ']').forEach(function (el) {
            var key = el.getAttribute(attr);
            var store = '_i18nEn_' + prop;
            if (el[store] === undefined) el[store] = el.getAttribute(prop) || '';
            var val = dict && dict[key] !== undefined ? dict[key] : el[store];
            el.setAttribute(prop, val.replace(/&amp;/g, '&').replace(/&bull;/g, '•'));
        });
    }

    function apply(lang) {
        current = normalise(lang);
        var dict = I18N[current];

        document.documentElement.lang = current === 'zh' ? 'zh-Hans' : current;

        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (el._i18nEn === undefined) el._i18nEn = el.innerHTML;
            el.innerHTML = dict && dict[key] !== undefined ? dict[key] : el._i18nEn;
        });
        translateAttr('data-i18n-ph', 'placeholder');
        translateAttr('data-i18n-title', 'title');
        translateAttr('data-i18n-aria', 'aria-label');

        document.title = ui('doc.title');

        document.querySelectorAll('.lang-btn').forEach(function (btn) {
            var on = btn.getAttribute('data-lang') === current;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        try { localStorage.setItem(STORAGE_KEY, current); } catch (e) {}

        // Keep ?lang= in the address bar in sync if the visitor arrived with it
        try {
            var url = new URL(location.href);
            if (url.searchParams.has('lang')) {
                url.searchParams.set('lang', current);
                history.replaceState(null, '', url.toString());
            }
        } catch (e) {}

        listeners.forEach(function (cb) { try { cb(current); } catch (e) {} });
    }

    window.I18n = {
        get lang() { return current; },
        apply: apply,
        ui: ui,
        project: function (id) { return (PROJECTS[current] || {})[id] || null; },
        onChange: function (cb) { listeners.push(cb); }
    };

    // Language buttons
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var lang = btn.getAttribute('data-lang');
            if (lang === current) return;
            apply(lang);
            if (typeof window.showToast === 'function') window.showToast(ui('lang.changed'));
        });
    });

    apply(current);
})();
