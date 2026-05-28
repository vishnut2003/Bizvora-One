import { redirect } from "next/navigation";

export default function MyAccountIndex() {
  redirect("/my-account/profile");
}
