import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/landing/top-nav";
import Hero from "@/components/landing/hero";
import LatelyOnEmber from "@/components/landing/lately-on-ember";
import HowItWorks from "@/components/landing/how-it-works";
import Footer from "@/components/landing/footer";
import MobileTabBar from "@/components/landing/mobile-tab-bar";
import PageEdges from "@/components/ui/page-edges";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? null;
  const name = user?.user_metadata?.full_name ?? null;

  return (
    <div>
      <PageEdges top="evergreen" bottomMobile="night" />
      <div className="bg-evergreen bg-page-glow">
        <TopNav email={email} name={name} />
        <Hero />
        <LatelyOnEmber />
        <HowItWorks />
      </div>
      <Footer clearance="tab-bar" />
      <MobileTabBar email={email} />
    </div>
  );
}
