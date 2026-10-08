"use client";

/**
 * Back-to-top arrow at the end of the landing page. Same smooth scroll the
 * footer's logo link already uses — plain window scroll, no router involved.
 */
export function ScrollToTop() {
  return (
    <div className="flex justify-center pb-14">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll back to top"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-teal/40 hover:text-teal"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
    </div>
  );
}
