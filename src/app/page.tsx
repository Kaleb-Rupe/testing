"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppHero } from "@/components/ui/ui-layout";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.push("/drift");
  }, [router]);

  return <AppHero title="Drift Protocol Dashboard" subtitle="Loading..." />;
}
