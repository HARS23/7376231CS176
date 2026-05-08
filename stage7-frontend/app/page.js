"use client";

import { useEffect, useState } from "react";
import NotificationDashboard from "../src/components/NotificationDashboard";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <NotificationDashboard />;
}
