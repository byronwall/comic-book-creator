import { A } from "@solidjs/router";
import "~/components/comics/comic-creator.css";
import "./landing.css";

function SampleComic() {
  return (
    <svg
      class="landing-comic-art"
      viewBox="0 0 560 470"
      role="img"
      aria-labelledby="sample-title sample-description"
    >
      <title id="sample-title">A tiny comic about a moon rabbit</title>
      <desc id="sample-description">
        Three illustrated panels show a rabbit finding a star and returning it to the night sky.
      </desc>
      <defs>
        <pattern id="comic-dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.25" fill="#0d1730" opacity=".12" />
        </pattern>
      </defs>
      <rect width="560" height="470" rx="15" fill="#fff" />
      <path d="M0 15Q0 0 15 0h530q15 0 15 15v58H0z" fill="#ffd32a" />
      <text x="28" y="48" class="landing-comic-title">THE MOON RABBIT</text>
      <g stroke="#0d1730" stroke-width="5" stroke-linejoin="round">
        <rect x="22" y="92" width="250" height="350" rx="4" fill="#dff0ff" />
        <rect x="288" y="92" width="250" height="163" rx="4" fill="#fff4c1" />
        <rect x="288" y="279" width="250" height="163" rx="4" fill="#e8f2ff" />
      </g>
      <rect x="22" y="92" width="250" height="350" fill="url(#comic-dots)" />
      <circle cx="214" cy="134" r="29" fill="#fff" stroke="#0d1730" stroke-width="3" />
      <path d="m211 117 5 11 12 1-9 8 3 12-11-6-10 6 2-12-9-8 12-1z" fill="#ffd32a" />
      <path d="M22 367q73-43 128-2t122-8v85H22z" fill="#75c76d" stroke="#0d1730" stroke-width="4" />
      <g stroke="#0d1730" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M97 301 87 207q-1-15 10-12 12 3 22 78l11-99q2-17 13-12 13 5 8 111" fill="#fff" />
        <ellipse cx="133" cy="307" rx="58" ry="61" fill="#fff" />
        <ellipse cx="115" cy="299" rx="6" ry="8" fill="#0d1730" stroke="none" />
        <ellipse cx="152" cy="299" rx="6" ry="8" fill="#0d1730" stroke="none" />
        <path d="m128 314 9 0-5 6z" fill="#ff4d3d" />
        <path d="M132 322q-9 11-17 2m17-2q9 11 17 2" fill="none" />
        <ellipse cx="182" cy="351" rx="37" ry="14" fill="#fff" />
      </g>
      <path d="M39 117q0-11 12-11h91q12 0 12 11v35q0 11-12 11h-49l-15 15v-15H51q-12 0-12-11z" fill="#fff" stroke="#0d1730" stroke-width="3" />
      <text x="51" y="139" class="landing-comic-caption">A star!</text>
      <text x="51" y="156" class="landing-comic-small">I can help.</text>
      <g fill="#0d1730">
        <circle cx="331" cy="128" r="3" /><circle cx="405" cy="111" r="2" /><circle cx="483" cy="153" r="3" />
        <path d="m374 133 3 9 10 1-8 6 3 9-8-5-8 5 2-9-7-6 9-1z" fill="#ffd32a" />
      </g>
      <path d="M338 214q54-29 101-7" fill="none" stroke="#0d1730" stroke-width="4" stroke-dasharray="4 9" />
      <path d="M347 181q0-17 17-17h112q17 0 17 17v31q0 17-17 17h-56l-20 15v-15h-36q-17 0-17-17z" fill="#fff" stroke="#0d1730" stroke-width="3" />
      <text x="361" y="192" class="landing-comic-caption">Back you go,</text>
      <text x="383" y="210" class="landing-comic-caption">little star!</text>
      <path d="M315 401q34-77 71-44 31-49 73-4 24-17 53 3v86H302z" fill="#90c7ff" stroke="#0d1730" stroke-width="4" />
      <path d="m430 308 7 16 18 2-14 12 4 18-15-9-15 9 4-18-14-12 18-2z" fill="#ffd32a" stroke="#0d1730" stroke-width="3" />
      <text x="318" y="426" class="landing-comic-small">THE END</text>
    </svg>
  );
}

export function LandingPage() {
  return (
    <main class="comic-landing">
      <div class="landing-shell">
        <header class="landing-header">
          <A href="/" class="comic-logo compact" aria-label="Comic Book Creator home">
            <span>Comic</span><strong>Creator</strong>
          </A>
          <nav class="landing-nav" aria-label="Account">
            <A href="/sign-in" class="landing-sign-in">Sign in</A>
            <A href="/sign-up" class="comic-btn primary">Create account</A>
            <A href="/books" class="landing-books">My books</A>
          </nav>
        </header>

        <section class="landing-hero" aria-labelledby="landing-title">
          <div class="landing-intro">
            <h1 id="landing-title">Make a comic book you can <em>print.</em></h1>
            <p class="landing-lede">
              Choose page layouts, add words or pictures, and print a story you made yourself.
            </p>
            <div class="landing-actions">
              <A href="/sign-up" class="comic-btn primary">Create your account</A>
              <A href="/sign-in" class="landing-text-link">Already have an account? Sign in</A>
            </div>
            <p class="landing-note">Your saved comics stay together in your own library.</p>
          </div>
          <figure class="landing-example">
            <span class="landing-example-sticker" aria-hidden="true">A little<br />comic example</span>
            <div class="landing-example-paper"><SampleComic /></div>
            <figcaption>A made-up story, ready for paper.</figcaption>
          </figure>
        </section>

        <section class="landing-how" aria-labelledby="landing-how-title">
          <div class="landing-section-heading">
            <h2 id="landing-how-title">Three simple steps. Your own kind of story.</h2>
          </div>
          <ol class="landing-steps">
            <li><span class="landing-step-number">01</span><div><h3>Pick a layout</h3><p>Give each page the panels your story needs.</p></div></li>
            <li><span class="landing-step-number">02</span><div><h3>Add the story</h3><p>Write speech bubbles and captions, or add your own photos.</p></div></li>
            <li><span class="landing-step-number">03</span><div><h3>Print it out</h3><p>Print pages one by one or make a folded booklet.</p></div></li>
          </ol>
        </section>

        <section class="landing-close" aria-label="Start making a comic">
          <div><h2>Turn one good idea into a book you can hold.</h2></div>
          <A href="/sign-up" class="comic-btn primary">Create account</A>
        </section>
        <footer class="landing-footer"><span>Comic Book Creator</span><span>Make a story. Build a book. Print it.</span></footer>
      </div>
    </main>
  );
}
