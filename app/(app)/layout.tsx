"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, User, Home, Briefcase, LifeBuoy } from "lucide-react";

const tabs = [
  { href: "/couples", label: "Couples", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/posts", label: "Posts", icon: Home },
  { href: "/gigs", label: "Gigs", icon: Briefcase },
  { href: "/help-advice/help", label: "Help", icon: LifeBuoy },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen pb-24">
      {children}
      <nav className="bottom-nav">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname?.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className={active ? "active" : ""}>
              <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
