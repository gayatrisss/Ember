// `align` drives the mobile-only zig-zag: in a single column the steps alternate
// left/right so the eye travels down the page instead of reading as one block.
// At lg the steps sit in a three-up grid and all align left.
const steps = [
  {
    number: "01",
    align: "start",
    headline: (
      <>
        Find your <span className="text-ember">escape</span>
      </>
    ),
    body: "Every cabin on Recreation.gov, searchable by where you want to go and when you want to be there.",
  },
  {
    number: "02",
    align: "end",
    headline: (
      <>
        Set an <span className="text-ember">alert</span>
      </>
    ),
    body: "Pick the cabin and the dates. We'll watch Recreation.gov every few minutes so you don't have to.",
  },
  {
    number: "03",
    align: "start",
    headline: (
      <>
        Get there <span className="text-ember">first</span>
      </>
    ),
    body: "The moment a cabin opens, we put it in your hands immediately. They move fast, but you move faster.",
  },
] as const;

const alignClasses = {
  start: "items-start text-left",
  end: "items-end text-right lg:items-start lg:text-left",
};

export default function HowItWorks() {
  return (
    <section className="pt-major pb-major lg:pt-64 lg:pb-32">
      <div className="page-container">
        <h2 className="text-display-geist text-wax text-center lg:text-left">
          Catch every cancellation
        </h2>
        <div className="mt-grouped flex flex-col gap-grouped lg:mt-24 lg:grid lg:grid-cols-3 lg:gap-6">
          {steps.map((step) => (
            <div key={step.number} className={`flex flex-col ${alignClasses[step.align]}`}>
              {/* The rule hugs the number on mobile and spans the column on desktop. */}
              <span className="text-step-number text-ember uppercase border-b border-ember pb-2 mb-bonded lg:pb-4 lg:mb-8 lg:block lg:w-full">
                {step.number}
              </span>
              <h3 className="text-step-headline">{step.headline}</h3>
              <p className="text-body text-wax/80 mt-grouped lg:mt-12 max-w-copy">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
