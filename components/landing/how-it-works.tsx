const steps = [
  {
    number: "01",
    headline: <>Find your <span className="text-ember">escape</span></>,
    body: "Every cabin on Recreation.gov, searchable by where you want to go and when you want to be there.",
  },
  {
    number: "02",
    headline: <>Set an <span className="text-ember">alert</span></>,
    body: "Pick the cabin and the dates. We'll watch Recreation.gov every few minutes so you don't have to.",
  },
  {
    number: "03",
    headline: <>Get there <span className="text-ember">first</span></>,
    body: "The moment a cabin opens, we put it in your hands immediately. They move fast, but you move faster.",
  },
];

export default function HowItWorks() {
  return (
    <section className="pt-64 pb-32">
      <div className="page-container">
        <h2 className="text-display-geist text-wax text-left">
          Catch every cancellation
        </h2>
        <div className="grid grid-cols-3 gap-6 mt-24">
          {steps.map((step) => (
            <div key={step.number}>
              <div className="text-data text-ember uppercase border-b border-ember pb-4 mb-8">
                {step.number}
              </div>
              <h3 className="text-display-fraunces-sm">{step.headline}</h3>
              <p className="text-body text-wax/80 mt-12 max-w-copy">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
