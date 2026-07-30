import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/landing/top-nav";
import Hero from "@/components/landing/hero";
import LatelyOnEmber from "@/components/landing/lately-on-ember";
import HowItWorks from "@/components/landing/how-it-works";
import Footer from "@/components/landing/footer";
import MobileTabBar from "@/components/landing/mobile-tab-bar";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? null;
  const name = user?.user_metadata?.full_name ?? null;

  return (
    // pb-tab-bar keeps the footer clear of the fixed mobile tab bar; it collapses
    // to zero at lg where the tab bar isn't rendered.
    <div className="pb-tab-bar">
      <div className="bg-evergreen bg-page-glow">
        <TopNav email={email} name={name} />
        <Hero />
        <LatelyOnEmber />
        <HowItWorks />
      </div>
      <Footer />
      <MobileTabBar email={email} />
    </div>
  );
}
