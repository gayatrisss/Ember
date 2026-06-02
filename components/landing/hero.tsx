import AlertForm from "./alert-form";

export default function Hero() {
  return (
    <section className="page-container py-24">
      <div className="flex flex-col lg:flex-row  gap-24 items-start">
        <div className="flex-1 min-w-0 pt-10">
          <h1>
            <span className="text-wax block text-display-fraunces">Refresh less,</span>
            <span className="text-ember block text-display-geist">camp more.</span>
          </h1>
          <p className="text-body text-wax/85 mt-8 max-w-copy-wide">
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
