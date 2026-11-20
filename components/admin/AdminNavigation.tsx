"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowLeft, FileText, FileWarning, HeartHandshake, LayoutDashboard, MessageSquareText, ReceiptText, UsersRound } from "lucide-react";

const items = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: UsersRound },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/reports", label: "Reports", icon: FileWarning },
  { href: "/admin/scan-queue", label: "Moderation", icon: Activity },
  { href: "/admin/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/admin/causes", label: "Causes", icon: HeartHandshake },
  { href: "/admin/suggestions", label: "Suggestions", icon: MessageSquareText },
];

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <aside className="admin-sidebar">
      <Link href="/admin/dashboard" className="admin-brand"><span className="admin-brand-mark">CH</span><span>Comrade Hub<small>ADMIN CONSOLE</small></span></Link>
      <p className="admin-nav-label">WORKSPACE</p>
      <nav className="admin-nav" aria-label="Admin navigation">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`));
          return <Link className={`admin-nav-link${active ? " active" : ""}`} href={href} key={href}><Icon size={18} /><span>{label}</span></Link>;
        })}
      </nav>
      <div className="admin-sidebar-bottom"><Link href="/posts" className="admin-return"><ArrowLeft size={17} /> Back to student app</Link><form action="/api/auth/logout" method="post"><button className="admin-logout">Log out</button></form></div>
    </aside>
  );
}
