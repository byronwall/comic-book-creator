import { AccountForm } from "~/components/auth/AccountForm";
import { PageMeta } from "~/lib/seo";

export default function SignUpRoute() {
  return <><PageMeta title="Create account | Comic Book Creator" description="Create your private comic book library." /><AccountForm mode="sign-up" /></>;
}
