import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/landing/top-nav";
import Hero from "@/components/landing/hero";
import LatelyOnEmber from "@/components/landing/lately-on-ember";
import HowItWorks from "@/components/landing/how-it-works";
import Footer from "@/components/landing/footer";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <div className="bg-night bg-page-glow">
        <TopNav email={user?.email ?? null} />
        <Hero />
        <LatelyOnEmber />
        <HowItWorks />
      </div>
      <Footer />
    </>
  );
}
