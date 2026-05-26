import TopNav from "@/components/landing/top-nav";
import Hero from "@/components/landing/hero";
import LatelyOnEmber from "@/components/landing/lately-on-ember";
import HowItWorks from "@/components/landing/how-it-works";
import Footer from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      {/* TODO: sticky search header on scroll past hero */}
      <div className="bg-night bg-page-glow">
        <TopNav />

          <Hero />
          <LatelyOnEmber />
          <HowItWorks />

      </div>
      <Footer />
    </>
  );
}
