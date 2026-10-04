const ink = "#1b1733";

function Burst(props: { points: string; fill: string; transform?: string }) {
  return <polygon points={props.points} fill={props.fill} stroke={ink} stroke-width="4" stroke-linejoin="round" transform={props.transform} />;
}

function TRex() {
  return (
    <g stroke={ink} stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
      <path d="M110 340 Q60 344 22 380 L22 404 Q70 380 116 384 Z" fill="#4fb85f" />
      <path d="M96 440 L100 384 Q120 372 140 386 L132 440 Z" fill="#4fb85f" />
      <path d="M160 440 L162 384 Q184 372 202 388 L196 440 Z" fill="#4fb85f" />
      <ellipse cx="152" cy="346" rx="66" ry="52" fill="#5cc46b" transform="rotate(-18 152 346)" />
      <ellipse cx="170" cy="356" rx="30" ry="28" fill="#c9f0b5" stroke="none" />
      <path d="M160 310 Q168 270 192 254 L246 282 Q226 300 218 330 Q196 336 160 310 Z" fill="#5cc46b" />
      <path d="M214 322 l14 6 m-14 -6 l10 14" fill="none" />
      <path d="M182 250 Q182 212 222 210 L262 212 Q272 214 272 228 L272 250 L196 262 Z" fill="#5cc46b" />
      <path d="M196 262 L270 252 L268 266 Q260 290 214 292 Q196 290 196 262 Z" fill="#5cc46b" />
      <path d="M202 260 L210 270 L218 258 L226 268 L234 256 L242 266 L250 254 L258 264 L266 252" fill="#fff" stroke-width="3" />
      <path d="M206 266 L214 278 L222 268 L230 280 L238 270 L246 280 L254 268" fill="#fff" stroke-width="3" />
      <circle cx="146" cy="342" r="6" fill="#3f9a4d" stroke="none" />
      <circle cx="120" cy="368" r="5" fill="#3f9a4d" stroke="none" />
      <circle cx="210" cy="224" r="9" fill="#fff" stroke-width="3" />
      <circle cx="212" cy="225" r="4" fill={ink} stroke="none" />
      <path d="M196 212 L222 218" stroke-width="5" />
    </g>
  );
}

function Robot() {
  return (
    <g stroke={ink} stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
      <path d="M368 214 L356 246 L372 236 L374 252 L384 228 Z" fill="#ffd23f" />
      <path d="M392 214 L386 244 L400 234 L404 250 L410 224 Z" fill="#ff5a47" />
      <rect x="360" y="168" width="54" height="48" rx="10" fill="#2f6bff" />
      <rect x="372" y="180" width="30" height="16" rx="4" fill="#ffd23f" />
      <path d="M414 182 L440 160" stroke-width="10" />
      <path d="M414 182 L440 160" stroke="#2f6bff" stroke-width="5" />
      <circle cx="442" cy="156" r="8" fill="#dfe7f2" />
      <path d="M360 186 L344 204" stroke-width="10" />
      <path d="M360 186 L344 204" stroke="#2f6bff" stroke-width="5" />
      <rect x="364" y="124" width="46" height="40" rx="10" fill="#dfe7f2" />
      <rect x="370" y="134" width="34" height="14" rx="7" fill="#35d0f0" />
      <path d="M374 156 q13 7 26 0" fill="none" />
      <path d="M387 124 L387 110" />
      <circle cx="387" cy="106" r="5" fill="#ff5a47" />
      <path d="M318 150 h22 M310 170 h26 M322 190 h18" stroke-width="3" />
    </g>
  );
}

/** Synthetic landing-page comic. Never use real user content here. */
export function SampleComic() {
  return (
    <svg class="landing-comic-art" viewBox="0 0 560 470" role="img" aria-labelledby="sample-title sample-description">
      <title id="sample-title">A sample comic called Robo-Kid versus T-Rex</title>
      <desc id="sample-description">
        A roaring dinosaur stomps near a volcano, a flying robot kid zooms in, and a giant KA-BLAM fills the last panel.
      </desc>
      <defs>
        <pattern id="comic-dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill={ink} opacity=".14" />
        </pattern>
        <clipPath id="panel-a"><rect x="22" y="92" width="250" height="350" rx="4" /></clipPath>
        <clipPath id="panel-b"><rect x="288" y="92" width="250" height="163" rx="4" /></clipPath>
        <clipPath id="panel-c"><rect x="288" y="279" width="250" height="163" rx="4" /></clipPath>
      </defs>
      <rect width="560" height="470" rx="15" fill="#fff" />
      <path d="M0 15Q0 0 15 0h530q15 0 15 15v58H0z" fill="#ffd23f" />
      <text x="28" y="52" class="landing-comic-title">ROBO-KID VS. T-REX</text>
      <text x="470" y="50" class="landing-comic-small">#1</text>

      <g clip-path="url(#panel-a)">
        <rect x="22" y="92" width="250" height="350" fill="#ffb347" />
        <rect x="22" y="92" width="250" height="350" fill="url(#comic-dots)" />
        <path d="M150 300 L218 150 L250 150 L320 300 Z" fill="#8a5a44" stroke={ink} stroke-width="4" stroke-linejoin="round" />
        <path d="M218 150 L250 150 L262 176 L246 168 L236 182 L226 166 L210 176 Z" fill="#ff5a47" stroke={ink} stroke-width="3" stroke-linejoin="round" />
        <path d="M22 420 Q120 400 272 414 L272 442 L22 442 Z" fill="#c77d4a" stroke={ink} stroke-width="4" />
        <TRex />
        <Burst points="36,112 66,124 84,102 98,128 132,118 120,146 146,160 116,170 124,200 94,186 76,210 66,182 34,190 50,164 28,146 54,138" fill="#fff" />
        <text x="50" y="166" class="landing-comic-sfx" transform="rotate(-8 88 158)">ROAR!</text>
      </g>

      <g clip-path="url(#panel-b)">
        <rect x="288" y="92" width="250" height="163" fill="#bfe3ff" />
        <circle cx="336" cy="224" r="22" fill="#fff" />
        <circle cx="362" cy="232" r="18" fill="#fff" />
        <Robot />
        <path d="M444 118q0-14 14-14h58q14 0 14 14v24q0 14-14 14h-30l-16 14v-14h-12q-14 0-14-14z" fill="#fff" stroke={ink} stroke-width="3" />
        <text x="487" y="128" text-anchor="middle" class="landing-comic-caption">I've got</text>
        <text x="487" y="146" text-anchor="middle" class="landing-comic-caption">this!</text>
      </g>

      <g clip-path="url(#panel-c)">
        <rect x="288" y="279" width="250" height="163" fill="#2f6bff" />
        <rect x="288" y="279" width="250" height="163" fill="url(#comic-dots)" />
        <Burst points="300,300 352,318 372,286 398,316 440,290 444,326 500,312 472,346 526,368 474,380 494,420 444,402 420,438 396,404 346,430 356,392 300,396 336,364 294,340 342,334" fill="#ffd23f" />
        <Burst points="346,330 384,338 400,316 418,340 452,326 448,352 480,364 446,374 456,400 420,388 404,410 388,388 352,398 364,372 336,358 360,348" fill="#ff5a47" />
        <text x="413" y="374" text-anchor="middle" class="landing-comic-sfx big" transform="rotate(-6 413 366)">KA-BLAM!</text>
      </g>
      <rect x="298" y="408" width="164" height="26" fill="#fff3c4" stroke={ink} stroke-width="3" />
      <text x="380" y="426" text-anchor="middle" class="landing-comic-small">TO BE CONTINUED…</text>

      <g stroke={ink} stroke-width="5" stroke-linejoin="round" fill="none">
        <rect x="22" y="92" width="250" height="350" rx="4" />
        <rect x="288" y="92" width="250" height="163" rx="4" />
        <rect x="288" y="279" width="250" height="163" rx="4" />
      </g>
    </svg>
  );
}
