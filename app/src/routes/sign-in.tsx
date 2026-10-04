import { AccountForm } from "~/components/auth/AccountForm";
import { PageMeta } from "~/lib/seo";

export default function SignInRoute() {
  return <><PageMeta title="Sign in | Comic Book Creator" description="Sign in to your private comic library." /><AccountForm mode="sign-in" /></>;
}
