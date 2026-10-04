import { A } from "@solidjs/router";
import { ComicArt } from "~/components/comics/ComicArt";
import "~/components/comics/comic-creator.css";
import "./landing.css";
import { SampleComic } from "./SampleComic";

export function LandingPage() {
  return (
    <main class="comic-landing">
      <div class="landing-shell">
        <header class="landing-header">
          <A href="/" class="comic-logo compact" aria-label="ComicBam home">
            <span>Comic</span><strong>Bam!</strong>
          </A>
          <nav class="landing-nav" aria-label="Account">
            <A href="/sign-in" class="landing-sign-in">Sign in</A>
            <A href="/sign-up" class="comic-btn primary">Create account</A>
            <A href="/books" class="landing-books">My Books</A>
          </nav>
        </header>

        <section class="landing-hero" aria-labelledby="landing-title">
          <div class="landing-intro">
            <h1 id="landing-title">Make a comic book you can <em>print!</em></h1>
            <p class="landing-lede">
              Pick your panels, add words and pictures, then print a real book you can hold.
            </p>
            <div class="landing-actions">
              <A href="/sign-up" class="comic-btn primary">Create your account</A>
              <A href="/sign-in" class="landing-text-link">Already have an account? Sign in</A>
            </div>
          </div>
          <figure class="landing-example">
            <span class="landing-example-sticker" aria-hidden="true">
              <svg viewBox="0 0 100 100"><polygon points="50,2 61,16 79,8 80,26 98,30 88,46 100,60 83,68 88,86 69,85 60,100 47,88 31,98 27,80 8,80 15,63 0,50 15,38 7,20 26,19 32,2" fill="#ff5a47" stroke="#1b1733" stroke-width="4" stroke-linejoin="round" /></svg>
              <span>Sample<br />comic!</span>
            </span>
            <div class="landing-example-paper"><SampleComic /></div>
          </figure>
        </section>

        <section class="landing-how" aria-labelledby="landing-how-title">
          <div class="landing-section-heading">
            <h2 id="landing-how-title">Three steps to your very own comic book</h2>
          </div>
          <ol class="landing-steps">
            <li data-step="1"><ComicArt name="page-four" size={84} class="landing-step-art" /><div><h3><span class="landing-step-num">1</span>Pick a layout</h3><p>Choose how many comic panels go on each page.</p></div></li>
            <li data-step="2"><ComicArt name="speech" size={84} class="landing-step-art" /><div><h3><span class="landing-step-num">2</span>Add the story</h3><p>Type speech bubbles and captions, or add photos of your drawings.</p></div></li>
            <li data-step="3"><ComicArt name="printer-booklet" size={84} class="landing-step-art" /><div><h3><span class="landing-step-num">3</span>Print it out</h3><p>Print one page, or fold all your pages into a booklet.</p></div></li>
          </ol>
        </section>

        <section class="landing-close" aria-label="Start making a comic">
          <div class="landing-close-copy"><ComicArt name="rocket-pencil" size={120} class="landing-close-art" /><h2>Got a story idea? Turn it into a book!</h2></div>
          <A href="/sign-up" class="comic-btn primary">Create account</A>
        </section>
        <footer class="landing-footer"><span>ComicBam</span><span>Make a story. Build a book. Print it.</span></footer>
      </div>
    </main>
  );
}
