import { AccountForm } from "~/components/auth/AccountForm";
import { PageMeta } from "~/lib/seo";

export default function SignInRoute() {
  return <><PageMeta title="Sign in | ComicBam" description="Sign in to your private comic library." /><AccountForm mode="sign-in" /></>;
}
