import Link from "next/link";

const links = [
  { href: "/operations", label: "Operations Engineer" },
  { href: "/executive", label: "Executive / Account Manager" },
  { href: "/data-quality", label: "Data Quality / Admin" },
  { href: "/tickets", label: "Ticketing System" }
];

export function PersonaNav() {
  return (
    <nav className="persona-nav">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="persona-link">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
