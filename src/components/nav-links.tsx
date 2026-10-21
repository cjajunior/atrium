"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/permissions";

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="overflow-x-auto lg:overflow-visible">
      <ul className="flex gap-1 px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
        {items.map((item) => {
          const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 text-[0.95rem] whitespace-nowrap transition-colors ${
                  active ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-mist"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
