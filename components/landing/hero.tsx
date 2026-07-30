import Link from "next/link";
import AlertForm from "./alert-form";

export default function Hero() {
  return (
    // No bottom padding at mobile: the gap to the next section is owned by that
    // section's pt-section, so each vertical gap has exactly one owner.
    <section className="page-container pt-6 lg:py-24">
      {/* The top nav is desktop-only, so below lg the wordmark lives here, centred
          above the headline rather than in a bar. */}
      <Link
        href="/"
        className="lg:hidden block text-center text-display-fraunces-md text-wax logo-glow-hover"
      >
        ember.
      </Link>

      <div className="flex flex-col lg:flex-row gap-section lg:gap-section-lg items-center lg:items-start">
        <div className="flex-1 min-w-0 pt-section lg:pt-10 text-center lg:text-left">
          <h1>
            <span className="text-wax block text-display-fraunces">Refresh less,</span>
            <span className="text-ember block text-display-geist">camp more.</span>
          </h1>
          <p className="text-body text-wax/85 mt-bonded lg:mt-bonded-lg max-w-copy-wide mx-auto lg:mx-0">
            Every cabin on Recreation.gov, polled every 90 seconds. When one opens up for your
            dates, you&apos;re the first to know.
          </p>
        </div>
        <div className="w-full lg:w-sidebar lg:shrink-0">
          <AlertForm />
        </div>
      </div>
    </section>
  );
}
