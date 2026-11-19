import Link from "next/link";
import { BriefcaseBusiness, CalendarDays, Heart, LifeBuoy, MessageCircle, UserRound } from "lucide-react";

const options = [
  { href: "/posts/stories", title: "Post", detail: "Share something with your campus community.", icon: MessageCircle },
  { href: "/posts/events", title: "Schedule an event", detail: "Tell people what is happening and when.", icon: CalendarDays },
  { href: "/couples/new", title: "Couple search", detail: "Create a profile post to meet someone.", icon: Heart },
  { href: "/posts/anonymous", title: "Anonymous post", detail: "Share without showing your name.", icon: UserRound },
  { href: "/gigs/new", title: "Gig", detail: "Post an opportunity with the details people need.", icon: BriefcaseBusiness },
  { href: "/help-advice/new", title: "Help or advice", detail: "Ask for practical support or advice.", icon: LifeBuoy },
];

export default function NewPostPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 pt-6 pb-10">
      <p className="feed-eyebrow">CREATE SOMETHING</p>
      <h1 className="text-2xl font-bold mb-2">What would you like to post?</h1>
      <p className="text-sm text-brand-gray mb-5">Choose a type and we’ll show the fields needed for that post.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(({ href, title, detail, icon: Icon }) => (
          <Link key={href} href={href} className="card flex items-start gap-3 transition hover:-translate-y-0.5">
            <span className="rounded-xl bg-brand-gray-light p-2"><Icon size={20} /></span>
            <span><strong className="block">{title}</strong><span className="text-sm text-brand-gray">{detail}</span></span>
          </Link>
        ))}
      </div>
    </main>
  );
}
