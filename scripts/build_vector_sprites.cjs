// Draws the vector sprites for the added options (flat style, soft gradients) as trimmed WebP files.
// Needs `npm i --no-save sharp`. Usage: node scripts/build_vector_sprites.cjs [preview]
const sharp = require("sharp");
const fs = require("fs");
const OUT = require("node:path").resolve(
  __dirname,
  "../public/assets/sprites/generated",
);
const PREVIEW = process.argv[2] === "preview";

const defs = `<defs>
  <linearGradient id="metal" x1="0" x2="1"><stop offset="0" stop-color="#8d98a3"/><stop offset=".35" stop-color="#e8eef2"/><stop offset=".7" stop-color="#a9b4bd"/><stop offset="1" stop-color="#6d7882"/></linearGradient>
  <linearGradient id="metalV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef3f6"/><stop offset=".5" stop-color="#b3bec7"/><stop offset="1" stop-color="#7c8791"/></linearGradient>
  <linearGradient id="blue" x1="0" x2="1"><stop offset="0" stop-color="#4f7fa3"/><stop offset=".4" stop-color="#8fbbd6"/><stop offset="1" stop-color="#4a7090"/></linearGradient>
  <linearGradient id="green" x1="0" x2="1"><stop offset="0" stop-color="#4f7d45"/><stop offset=".4" stop-color="#86b574"/><stop offset="1" stop-color="#456d3c"/></linearGradient>
  <linearGradient id="white" x1="0" x2="1"><stop offset="0" stop-color="#d9d6cc"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#c9c6bb"/></linearGradient>
  <linearGradient id="kraft" x1="0" x2="1"><stop offset="0" stop-color="#b98c58"/><stop offset=".5" stop-color="#d9b383"/><stop offset="1" stop-color="#a97b49"/></linearGradient>
  <linearGradient id="cloth" x1="0" x2="1"><stop offset="0" stop-color="#cdbb97"/><stop offset=".5" stop-color="#eadcb9"/><stop offset="1" stop-color="#bda982"/></linearGradient>
  <linearGradient id="gray" x1="0" x2="1"><stop offset="0" stop-color="#6c7378"/><stop offset=".4" stop-color="#a3abb0"/><stop offset="1" stop-color="#5c6368"/></linearGradient>
  <linearGradient id="solar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#25456b"/><stop offset=".5" stop-color="#3b6a9c"/><stop offset="1" stop-color="#1f3b5c"/></linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff7d0"/><stop offset="1" stop-color="#ffd978"/></linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>`;
const shadow = () => ""; // objects get their own shadow in the scene
const svg = (inner, w = 500, h = 500) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${inner}</svg>`;

const S = {};
// ---------- kitchen
S.faucet = svg(`${shadow(250, 478, 150)}
  <rect x="190" y="400" width="120" height="70" rx="10" fill="url(#metalV)"/>
  <rect x="215" y="250" width="70" height="170" rx="16" fill="url(#metal)"/>
  <path d="M250 270 C250 120 330 90 400 130 L400 190 C350 165 320 190 320 260 L320 330 L215 330 L215 250 Z" fill="url(#metal)" opacity=".0"/>
  <path d="M235 260 L235 150 C235 80 330 50 395 110 L395 160 L375 175 C340 140 300 160 300 200 L300 300 Z" fill="url(#metal)"/>
  <rect x="352" y="150" width="66" height="30" rx="8" fill="url(#metalV)"/>
  <rect x="332" y="175" width="42" height="14" rx="5" fill="#6d7882"/>
  <rect x="150" y="300" width="70" height="26" rx="10" fill="url(#metalV)"/>
  <circle cx="150" cy="313" r="14" fill="#5d97c9"/>`);
S["tape"] = svg(`${shadow(250, 440, 140, 20)}
  <ellipse cx="250" cy="300" rx="170" ry="150" fill="#dfe9f2"/>
  <ellipse cx="250" cy="300" rx="170" ry="150" fill="none" stroke="#a9bdd0" stroke-width="10"/>
  <ellipse cx="250" cy="300" rx="62" ry="54" fill="#2b2f33"/>
  <ellipse cx="250" cy="296" rx="62" ry="54" fill="none" stroke="#9aa6b0" stroke-width="8"/>
  <path d="M110 300 C120 190 240 130 340 160" fill="none" stroke="#fff" stroke-width="12" opacity=".7"/>
  <path d="M330 150 C390 120 440 130 470 160 L470 200 C440 190 400 190 350 210 Z" fill="#f5f9fc" stroke="#a9bdd0" stroke-width="6"/>`);
// ---------- bathroom
S.showerAir = svg(`${shadow(250, 480, 130)}
  <path d="M60 110 C60 60 120 40 190 60 L250 90" fill="none" stroke="url(#metal)" stroke-width="26" stroke-linecap="round"/>
  <path d="M250 85 L300 120" fill="none" stroke="#7d8892" stroke-width="30" stroke-linecap="round"/>
  <ellipse cx="320" cy="220" rx="150" ry="52" transform="rotate(30 320 220)" fill="url(#metal)"/>
  <ellipse cx="338" cy="236" rx="132" ry="42" transform="rotate(30 338 236)" fill="#46525c"/>
  ${Array.from({ length: 21 }, (_, i) => {
    const a = i % 7,
      b = Math.floor(i / 7);
    return `<circle cx="${270 + a * 22 + b * 9}" cy="${228 + a * 12 + b * -2 - b * 14}" r="6" fill="#aeb9c2"/>`;
  }).join("")}
  <circle cx="395" cy="330" r="11" fill="#9fd0ee" opacity=".85"/><circle cx="360" cy="372" r="8" fill="#9fd0ee" opacity=".85"/><circle cx="430" cy="372" r="9" fill="#9fd0ee" opacity=".85"/><circle cx="398" cy="412" r="7" fill="#9fd0ee" opacity=".85"/>`);
S.limiter = svg(`${shadow(250, 380, 150, 18)}
  <ellipse cx="250" cy="250" rx="170" ry="118" fill="url(#metalV)"/>
  <ellipse cx="250" cy="250" rx="140" ry="92" fill="#3a444d"/>
  <ellipse cx="250" cy="250" rx="108" ry="68" fill="#3b82b8"/>
  <ellipse cx="250" cy="250" rx="62" ry="38" fill="#1f2a33"/>
  <ellipse cx="250" cy="240" rx="118" ry="70" fill="none" stroke="#bfe0f4" stroke-width="7" opacity=".6"/>`);
S.barrel = svg(`${shadow(250, 484, 150)}
  <rect x="120" y="130" width="260" height="340" rx="38" fill="url(#blue)"/>
  <rect x="120" y="205" width="260" height="14" fill="#33556f" opacity=".6"/><rect x="120" y="360" width="260" height="14" fill="#33556f" opacity=".6"/>
  <ellipse cx="250" cy="132" rx="130" ry="34" fill="#3c6584"/>
  <ellipse cx="250" cy="132" rx="104" ry="24" fill="#16293a"/>
  <rect x="226" y="62" width="48" height="40" rx="8" fill="#2f4f67"/><rect x="204" y="95" width="92" height="22" rx="10" fill="#2f4f67"/>
  <path d="M140 165 L162 440" stroke="#dcecf6" stroke-width="12" stroke-linecap="round" opacity=".35"/>`);
S.tray = svg(`${shadow(250, 420, 190, 22)}
  <path d="M40 210 L460 210 L430 380 C426 396 412 404 396 404 L104 404 C88 404 74 396 70 380 Z" fill="url(#gray)"/>
  <ellipse cx="250" cy="210" rx="210" ry="52" fill="#8a9298"/>
  <ellipse cx="250" cy="214" rx="188" ry="40" fill="#3c4348"/>
  <path d="M90 250 L112 380" stroke="#e7ecef" stroke-width="10" stroke-linecap="round" opacity=".3"/>`);
// ---------- lights
const bulbBase = `<rect x="165" y="360" width="170" height="60" rx="14" fill="url(#metalV)"/><rect x="190" y="418" width="120" height="40" rx="12" fill="url(#metal)"/><rect x="215" y="454" width="70" height="30" rx="12" fill="#444"/>
  <path d="M175 365 L325 365" stroke="#6d7882" stroke-width="6"/><path d="M180 385 L320 385" stroke="#6d7882" stroke-width="6"/>`;
S.cfl = svg(`${shadow(250, 488, 110)}
  <rect x="170" y="330" width="160" height="40" rx="12" fill="url(#white)"/>
  ${bulbBase.replace('y="360"', 'y="365"')}
  ${[0, 1, 2, 3, 4].map((i) => `<path d="M${200 + i * 0} ${330 - i * 52} C 140 ${300 - i * 52}, 360 ${312 - i * 52}, 300 ${284 - i * 52}" fill="none" stroke="#fff8e6" stroke-width="34" stroke-linecap="round"/><path d="M${200} ${330 - i * 52} C 140 ${300 - i * 52}, 360 ${312 - i * 52}, 300 ${284 - i * 52}" fill="none" stroke="#f1dd9a" stroke-width="12" stroke-linecap="round" opacity=".7"/>`).join("")}
  <path d="M250 60 C 215 40 285 20 250 0" fill="none"/>`);
S.smartBulb = svg(`${shadow(250, 488, 110)}
  <path d="M250 38 C 130 38 100 170 160 250 C 190 290 190 320 190 345 L310 345 C310 320 310 290 340 250 C 400 170 370 38 250 38 Z" fill="url(#glass)"/>
  <path d="M190 345 L310 345 L318 372 L182 372 Z" fill="#e9eef1"/>
  ${bulbBase}
  <path d="M215 250 L250 150 L285 250 L250 215 Z" fill="#ffffff" opacity=".85"/>
  <path d="M345 90 C 385 120 395 170 380 215" fill="none" stroke="#3b82b8" stroke-width="10" stroke-linecap="round"/>
  <path d="M372 62 C 430 105 440 175 418 236" fill="none" stroke="#3b82b8" stroke-width="10" stroke-linecap="round" opacity=".7"/>
  <circle cx="318" cy="140" r="9" fill="#3b82b8"/>`);
// ---------- office power
S.powerTimer = svg(`${shadow(250, 450, 190, 20)}
  <rect x="50" y="170" width="400" height="250" rx="34" fill="url(#white)"/>
  <rect x="50" y="170" width="400" height="250" rx="34" fill="none" stroke="#b6b3a8" stroke-width="6"/>
  <circle cx="165" cy="295" r="82" fill="#f3f1ea" stroke="#8a8f94" stroke-width="8"/>
  <circle cx="165" cy="295" r="68" fill="none" stroke="#c9ccd0" stroke-width="4" stroke-dasharray="5 11"/>
  <path d="M165 295 L165 240" stroke="#2b2f33" stroke-width="10" stroke-linecap="round"/><path d="M165 295 L205 312" stroke="#2b2f33" stroke-width="10" stroke-linecap="round"/><circle cx="165" cy="295" r="9" fill="#2b2f33"/>
  <rect x="290" y="215" width="130" height="60" rx="10" fill="#272c30"/><rect x="290" y="300" width="130" height="60" rx="10" fill="#272c30"/>
  <circle cx="330" cy="245" r="7" fill="#777"/><circle cx="380" cy="245" r="7" fill="#777"/><circle cx="330" cy="330" r="7" fill="#777"/><circle cx="380" cy="330" r="7" fill="#777"/>
  <circle cx="445" cy="150" r="0" />`);
S.solarCharger = svg(`${shadow(250, 470, 190, 20)}
  <path d="M80 250 L420 250 L460 100 L120 100 Z" fill="url(#solar)"/>
  <path d="M80 250 L420 250 L460 100 L120 100 Z" fill="none" stroke="#c7d0d8" stroke-width="8"/>
  <path d="M193 100 L153 250 M307 100 L267 250 M420 100 L380 250" stroke="#8fb3d4" stroke-width="4"/><path d="M100 175 L440 175" stroke="#8fb3d4" stroke-width="4"/>
  <path d="M250 250 L250 330" stroke="#5c6368" stroke-width="22"/><rect x="130" y="330" width="240" height="120" rx="18" fill="url(#white)" stroke="#b6b3a8" stroke-width="5"/>
  <rect x="180" y="368" width="60" height="42" rx="8" fill="#272c30"/><rect x="262" y="368" width="60" height="42" rx="8" fill="#272c30"/><circle cx="410" cy="400" r="14" fill="#6cc04a"/>`);
// ---------- garden
S.wateringCan = svg(`${shadow(250, 478, 170)}
  <path d="M110 190 L330 190 L350 440 C352 456 340 468 324 468 L116 468 C100 468 88 456 90 440 Z" fill="url(#green)"/>
  <ellipse cx="220" cy="190" rx="110" ry="26" fill="#3d6a35"/><ellipse cx="220" cy="190" rx="88" ry="17" fill="#17301a"/>
  <path d="M338 330 L470 130" stroke="#4f7d45" stroke-width="30" stroke-linecap="round"/><path d="M338 330 L470 130" stroke="#86b574" stroke-width="10" stroke-linecap="round" opacity=".6"/>
  <ellipse cx="478" cy="118" rx="40" ry="16" transform="rotate(-55 478 118)" fill="url(#metal)"/>
  <path d="M120 175 C60 110 90 50 160 50 C230 50 300 100 280 170" fill="none" stroke="#3d6a35" stroke-width="22" stroke-linecap="round"/>
  <path d="M130 215 L146 440" stroke="#d6efc8" stroke-width="10" stroke-linecap="round" opacity=".35"/>`);
S.rainTank = svg(`${shadow(250, 484, 170)}
  <rect x="90" y="80" width="320" height="390" rx="46" fill="url(#gray)"/>
  <ellipse cx="250" cy="82" rx="160" ry="34" fill="#7d858b"/><ellipse cx="250" cy="82" rx="118" ry="22" fill="#2a3338"/>
  <rect x="150" y="190" width="200" height="12" fill="#4a5258" opacity=".55"/><rect x="150" y="330" width="200" height="12" fill="#4a5258" opacity=".55"/>
  <rect x="226" y="418" width="48" height="38" rx="8" fill="url(#metal)"/><rect x="214" y="450" width="72" height="18" rx="6" fill="#6d7882"/>
  <path d="M130 120 L150 430" stroke="#e7ecef" stroke-width="12" stroke-linecap="round" opacity=".3"/>
  <path d="M410 40 L410 120 L335 120" fill="none" stroke="#5c6368" stroke-width="22" stroke-linejoin="round"/>
  <path d="M250 260 C 214 306 224 346 250 346 C 276 346 286 306 250 260 Z" fill="#6cb4de"/>`);
S.moisture = svg(`${shadow(250, 484, 130, 14)}
  <rect x="150" y="60" width="200" height="150" rx="22" fill="url(#white)" stroke="#b6b3a8" stroke-width="6"/>
  <rect x="180" y="90" width="140" height="62" rx="10" fill="#1f2a33"/><rect x="194" y="104" width="44" height="34" rx="6" fill="#5bd16a"/>
  <rect x="226" y="205" width="48" height="70" fill="#5c6368"/>
  <path d="M200 275 L300 275 L270 470 L230 470 Z" fill="url(#metal)"/><path d="M200 275 L222 470" stroke="#e8eef2" stroke-width="6" opacity=".6"/>
  <path d="M170 460 C 210 480 290 480 330 460 C 300 440 200 440 170 460Z" fill="#6b4a2f"/>`);
S.rainSensor = svg(`${shadow(250, 440, 160, 18)}
  <path d="M70 330 C 70 160 180 90 250 90 C 320 90 430 160 430 330 Z" fill="url(#white)" stroke="#b6b3a8" stroke-width="6"/>
  <rect x="70" y="330" width="360" height="56" rx="14" fill="#9aa3aa"/>
  <circle cx="250" cy="220" r="52" fill="#2b4f6e"/><circle cx="250" cy="220" r="30" fill="#6cb4de"/>
  <path d="M250 330 L250 400" stroke="#5c6368" stroke-width="24"/>
  <path d="M440 120 C 436 154 452 154 448 120 C 446 108 442 108 440 120Z" fill="#6cb4de"/><path d="M92 112 C 88 146 104 146 100 112 C 98 100 94 100 92 112Z" fill="#6cb4de"/>`);
S.mechTimer = svg(
  `${shadow(250, 470, 150, 16)}
  <rect x="120" y="80" width="260" height="380" rx="40" fill="url(#white)" stroke="#b6b3a8" stroke-width="6"/>
  <circle cx="250" cy="230" r="108" fill="#f3f1ea" stroke="#8a8f94" stroke-width="8"/>
  ${Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<path d="M${250 + Math.sin(a) * 82} ${230 - Math.cos(a) * 82} L${250 + Math.sin(a) * 98} ${230 - Math.cos(a) * 98}" stroke="#2b2f33" stroke-width="6"/>`;
  }).join("")}
  <path d="M250 230 L250 160" stroke="#2b2f33" stroke-width="10" stroke-linecap="round"/><circle cx="250" cy="230" r="12" fill="#c9694a"/>
  <rect x="210" y="372" width="80" height="50" rx="10" fill="#2f6f8f"/><path d="M250 460 L250 500" stroke="#2f6f8f" stroke-width="30"/>`,
  500,
  500,
);
// ---------- packaging
S.clothSack = svg(`${shadow(250, 476, 160)}
  <path d="M120 150 C60 260 70 420 130 462 L370 462 C430 420 440 260 380 150 Z" fill="url(#cloth)"/>
  <path d="M120 150 C150 118 350 118 380 150 C350 186 150 186 120 150Z" fill="#cdbb97"/>
  <path d="M130 150 C180 190 320 190 370 150" fill="none" stroke="#8a7650" stroke-width="10"/>
  <path d="M190 160 C160 100 120 80 100 110 M310 160 C340 100 380 80 400 110" fill="none" stroke="#8a7650" stroke-width="10" stroke-linecap="round"/>
  <path d="M170 250 L160 430 M250 240 L250 450 M330 250 L340 430" stroke="#b9a57e" stroke-width="5" opacity=".7"/>
  <circle cx="250" cy="330" r="46" fill="#c9694a" opacity=".85"/>`);
S.basket = svg(`${shadow(250, 470, 190, 20)}
  <path d="M70 230 L430 230 L396 430 C392 450 376 460 356 460 L144 460 C124 460 108 450 104 430 Z" fill="#b98c58"/>
  ${Array.from({ length: 8 }, (_, i) => `<path d="M${84 + i * 46} 236 L${100 + i * 40} 456" stroke="#8f6a3f" stroke-width="7" opacity=".7"/>`).join("")}
  ${Array.from({ length: 5 }, (_, i) => `<path d="M${78 + i * 4} ${262 + i * 40} L${422 - i * 4} ${262 + i * 40}" stroke="#d9b383" stroke-width="8" opacity=".8"/>`).join("")}
  <path d="M90 230 C 90 70 410 70 410 230" fill="none" stroke="#8f6a3f" stroke-width="22" stroke-linecap="round"/>
  <path d="M90 230 C 90 80 410 80 410 230" fill="none" stroke="#d9b383" stroke-width="7" stroke-linecap="round" opacity=".7"/>`);
S.tote = svg(`${shadow(250, 484, 170)}
  <path d="M110 200 L390 200 L412 468 L88 468 Z" fill="url(#cloth)"/>
  <path d="M170 200 C 150 60 350 60 330 200" fill="none" stroke="#b9a57e" stroke-width="22" stroke-linecap="round"/>
  <path d="M110 200 L390 200" stroke="#8a7650" stroke-width="8"/>
  <path d="M190 270 C 190 250 250 250 250 290 C 250 250 310 250 310 270 C 310 320 250 360 250 360 C 250 360 190 320 190 270 Z" fill="#6aa357"/>
  <path d="M120 440 L380 440" stroke="#b9a57e" stroke-width="5" opacity=".6"/>`);
S.envelope = svg(`${shadow(250, 440, 190, 20)}
  <rect x="50" y="130" width="400" height="290" rx="14" fill="url(#kraft)"/>
  <path d="M50 140 L250 290 L450 140" fill="none" stroke="#8f6a3f" stroke-width="10" stroke-linejoin="round"/>
  <path d="M50 410 L210 270 M450 410 L290 270" fill="none" stroke="#8f6a3f" stroke-width="8" opacity=".7"/>
  <circle cx="250" cy="300" r="26" fill="#6aa357"/><path d="M240 300 L250 310 L266 290" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`);
// ---------- roof
S.balconyPanel = svg(`${shadow(250, 486, 170, 14)}
  <path d="M60 330 L440 330 L470 120 L90 120 Z" fill="url(#solar)"/>
  <path d="M60 330 L440 330 L470 120 L90 120 Z" fill="none" stroke="#c7d0d8" stroke-width="9"/>
  <path d="M187 120 L157 330 M313 120 L283 330 M440 330 L470 120" stroke="#8fb3d4" stroke-width="4"/><path d="M75 225 L455 225" stroke="#8fb3d4" stroke-width="4"/>
  <path d="M180 330 L140 478 M320 330 L360 478" stroke="#6d7882" stroke-width="20" stroke-linecap="round"/><path d="M110 478 L390 478" stroke="#6d7882" stroke-width="18" stroke-linecap="round"/>`);
S.solarHeater = svg(`${shadow(250, 486, 200, 14)}
  <path d="M40 360 L330 360 L360 160 L70 160 Z" fill="#1d3550"/>
  ${Array.from({ length: 8 }, (_, i) => `<path d="M${64 + i * 36} 168 L${40 + i * 36} 352" stroke="#6ea6d4" stroke-width="12" opacity=".75" stroke-linecap="round"/>`).join("")}
  <path d="M40 360 L330 360 L360 160 L70 160 Z" fill="none" stroke="#c7d0d8" stroke-width="9"/>
  <rect x="330" y="120" width="140" height="240" rx="34" fill="url(#metalV)" stroke="#8a949c" stroke-width="5"/>
  <path d="M330 250 L260 250" stroke="#8a949c" stroke-width="16"/>
  <path d="M120 360 L100 470 M290 360 L310 470" stroke="#6d7882" stroke-width="18" stroke-linecap="round"/>`);
S.windTurbine = svg(`${shadow(250, 488, 100, 12)}
  <path d="M240 230 L260 230 L274 478 L226 478 Z" fill="url(#metalV)"/>
  <circle cx="250" cy="200" r="30" fill="url(#white)" stroke="#9aa3aa" stroke-width="5"/>
  <path d="M250 200 L226 40 C 250 30 264 60 250 200Z" fill="url(#white)" stroke="#9aa3aa" stroke-width="4"/>
  <path d="M250 200 L390 296 C 372 316 340 300 250 200Z" fill="url(#white)" stroke="#9aa3aa" stroke-width="4"/>
  <path d="M250 200 L110 296 C 128 316 160 300 250 200Z" fill="url(#white)" stroke="#9aa3aa" stroke-width="4"/>
  <circle cx="250" cy="200" r="13" fill="#c9694a"/>`);
// ---------- living room lamps
S.batteryLamp = svg(`${shadow(250, 450, 170, 16)}
  <rect x="50" y="270" width="400" height="76" rx="30" fill="url(#white)" stroke="#b6b3a8" stroke-width="6"/>
  <rect x="90" y="346" width="320" height="26" rx="10" fill="#ffe8a8"/><path d="M110 372 L50 440 M250 372 L250 450 M390 372 L450 440" stroke="#ffe8a8" stroke-width="10" opacity=".55"/>
  <rect x="330" y="296" width="76" height="26" rx="8" fill="#6cc04a"/><circle cx="110" cy="308" r="10" fill="#9aa3aa"/>`);
S.deskLamp = svg(`${shadow(250, 486, 150, 14)}
  <ellipse cx="250" cy="460" rx="130" ry="22" fill="url(#gray)"/><path d="M250 460 L190 250 L330 120" fill="none" stroke="url(#metal)" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="190" cy="250" r="17" fill="#6d7882"/>
  <path d="M286 78 L440 150 L400 220 L290 160 Z" fill="url(#white)" stroke="#b6b3a8" stroke-width="6"/><path d="M296 178 L392 232 L372 330 L290 262Z" fill="#ffe27a" opacity=".42"/>
  <ellipse cx="350" cy="170" rx="34" ry="17" transform="rotate(25 350 170)" fill="#fff8c4"/>`);
S.motionLamp = svg(`${shadow(250, 420, 140, 16)}
  <ellipse cx="250" cy="260" rx="170" ry="150" fill="url(#white)" stroke="#b6b3a8" stroke-width="6"/>
  <circle cx="250" cy="260" r="100" fill="#272c30"/><circle cx="250" cy="260" r="64" fill="#ffe27a"/>
  <circle cx="250" cy="260" r="36" fill="#fff8c4"/>
  <circle cx="400" cy="100" r="14" fill="#3b82b8"/>
  <path d="M340 70 C 390 40 450 60 470 110" fill="none" stroke="#3b82b8" stroke-width="10" stroke-linecap="round"/><path d="M360 100 C 395 82 430 92 446 124" fill="none" stroke="#3b82b8" stroke-width="10" stroke-linecap="round" opacity=".7"/>`);

// ---------- write
const names = {
  faucet: "faucet-new",
  tape: "tape-ptfe",
  showerAir: "shower-aerated",
  limiter: "shower-limiter",
  barrel: "barrel",
  tray: "tray",
  cfl: "bulb-cfl",
  smartBulb: "bulb-smart",
  powerTimer: "power-timer",
  solarCharger: "solar-charger",
  wateringCan: "watering-can",
  rainTank: "rain-tank",
  moisture: "sensor-moisture",
  rainSensor: "sensor-rain",
  mechTimer: "timer-mechanical",
  clothSack: "lentil-cloth",
  basket: "apple-basket",
  tote: "towel-cloth",
  envelope: "scarf-envelope",
  balconyPanel: "panel-balcony",
  solarHeater: "solar-heater",
  windTurbine: "wind-turbine",
  batteryLamp: "lamp-battery",
  deskLamp: "lamp-desk",
  motionLamp: "lamp-motion",
};
(async () => {
  const tiles = [];
  for (const [key, file] of Object.entries(names)) {
    const buf = await sharp(
      await sharp(Buffer.from(S[key])).trim().png().toBuffer(),
    )
      .webp({ quality: 88 })
      .toBuffer();
    if (!PREVIEW) fs.writeFileSync(`${OUT}/${file}.webp`, buf);
    tiles.push({
      file,
      png: await sharp(await sharp(Buffer.from(S[key])).trim().png().toBuffer())
        .resize(220, 220, { fit: "contain", background: "#e8dcc0" })
        .flatten({ background: "#e8dcc0" })
        .png()
        .toBuffer(),
    });
  }
  const cols = 5,
    rows = Math.ceil(tiles.length / cols);
  const sheet = await sharp({
    create: {
      width: cols * 230,
      height: rows * 230,
      channels: 3,
      background: "#d9cba6",
    },
  })
    .composite(
      tiles.map((t, i) => ({
        input: t.png,
        left: (i % cols) * 230 + 5,
        top: Math.floor(i / cols) * 230 + 5,
      })),
    )
    .png()
    .toFile("sprites-preview.png");
  console.log("done", tiles.length, sheet.width, sheet.height);
})();
