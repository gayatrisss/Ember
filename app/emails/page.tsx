import PageEdges from "@/components/ui/page-edges";
import { render } from "@react-email/components";
import { AvailabilityAlert, type AvailabilityAlertProps } from "@/emails/availability-alert";
import { EmailFrame } from "@/app/emails/email-frame";

// Email preview gallery — the email counterpart to /design. Each template is rendered
// to HTML server-side and shown in an isolated iframe. Add new emails here as they're built.
const EXAMPLES: { label: string; note: string; props: AvailabilityAlertProps }[] = [
  {
    label: "Availability alert",
    note: "Same-month range, with price — the Figma reference (Maxey Cabin)",
    props: {
      cabinName: "Maxey Cabin",
      dateRange: "July 9th–12th",
      price: "$50/night",
      location: "Gallatin National Forest",
      bookUrl: "https://www.recreation.gov/camping/campgrounds/234309",
      manageUrl: "http://localhost:3000/my-alerts",
      logoUrl: "http://localhost:3000/email/logo.png",
    },
  },
  {
    label: "Availability alert · cross-month",
    note: "Range spanning two months, longer cabin + forest names",
    props: {
      cabinName: "Granite Peak Lookout",
      dateRange: "July 30th – August 2nd",
      price: "$75/night",
      location: "Custer Gallatin National Forest",
      bookUrl: "https://www.recreation.gov/camping/campgrounds/234309",
      manageUrl: "http://localhost:3000/my-alerts",
      logoUrl: "http://localhost:3000/email/logo.png",
    },
  },
  {
    label: "Availability alert · no price",
    note: "Cabin with no nightly rate on file — the PRICE row is omitted",
    props: {
      cabinName: "Trail Creek Cabin",
      dateRange: "August 14th–16th",
      price: null,
      location: "Beaverhead-Deerlodge National Forest",
      bookUrl: "https://www.recreation.gov/camping/campgrounds/234309",
      manageUrl: "http://localhost:3000/my-alerts",
      logoUrl: "http://localhost:3000/email/logo.png",
    },
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-data text-smoke uppercase tracking-widest mb-1">{children}</p>;
}

export default async function EmailsPage() {
  const rendered = await Promise.all(
    EXAMPLES.map((e) => render(<AvailabilityAlert {...e.props} />))
  );

  return (
    <div className="min-h-screen bg-night">
      {/* No footer on this page — it ends on night, so both gutters are night. */}
      <PageEdges bottom="night" />
      <header className="sticky top-0 z-40 border-b border-wax/10 bg-night/95 backdrop-blur-sm">
        <div className="page-container flex items-center justify-between h-14">
          <span className="text-display-fraunces-sm text-ember">Ember</span>
          <span className="text-data text-smoke uppercase tracking-widest">Email Previews</span>
        </div>
      </header>

      <div className="page-container py-16 space-y-16">
        {EXAMPLES.map((e, i) => (
          <section key={e.label} className="space-y-4">
            <div>
              <SectionLabel>{e.label}</SectionLabel>
              <p className="text-data text-smoke/50 uppercase tracking-widest">{e.note}</p>
            </div>
            <div className="max-w-2xl mx-auto">
              <EmailFrame html={rendered[i]} title={e.label} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
