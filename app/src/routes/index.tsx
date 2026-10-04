import { LandingPage } from "~/components/landing/LandingPage";
import { PageMeta } from "~/lib/seo";

export default function HomeRoute() {
  return (
    <>
      <PageMeta
        title="Make a comic book you can print"
        description="Choose page layouts, add words and pictures, then print your comic as pages or a folded booklet."
      />
      <LandingPage />
    </>
  );
}
