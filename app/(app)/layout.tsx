"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Heart, House, LifeBuoy, Plus, UserRound, HandCoins } from "lucide-react";
import { LogoWordmark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const navItems = [
  { href: "/posts", label: "Posts", detail: "Browse the community", icon: House },
  { href: "/couples", label: "Couples", detail: "Meet people to date", icon: Heart },
  { href: "/gigs", label: "Gigs", detail: "Find campus opportunities", icon: BriefcaseBusiness },
  { href: "/help-advice/help", label: "Help & advice", detail: "Support your community", icon: LifeBuoy },
  { href: "/profile", label: "Profile", detail: "Your account and wallet", icon: UserRound },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell min-h-screen">
      <aside className="desktop-sidebar">
        <Link href="/posts" className="sidebar-brand" aria-label="Comrade Hub home">
          <LogoWordmark size={30} />
        </Link>
        <p className="sidebar-section-label">YOUR SPACE</p>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`sidebar-link${active ? " active" : ""}`}>
                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                <span className="sidebar-link-copy">
                  <span>{item.label}</span>
                  <small>{item.detail}</small>
                </span>
              </Link>
            );
          })}
        </nav>
        <Link href="/sponsor/causes" className={`sidebar-link sidebar-campaign-link${pathname?.startsWith("/sponsor/causes") ? " active" : ""}`}>
          <HandCoins size={19} /><span className="sidebar-link-copy"><span>Campaigns</span><small>Support a campus cause</small></span>
        </Link>
        <Link className="sidebar-compose" href="/posts/new">
          <Plus size={19} />
          <span>Create a post</span>
        </Link>
        <div className="sidebar-footer">
          <ThemeToggle />
          <p>Made for students, together.</p>
        </div>
      </aside>
      <div className="app-content">
        <div className="mobile-theme-toggle">
          <ThemeToggle />
        </div>
        {children}
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
                <span>{item.label === "Help & advice" ? "Help" : item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
