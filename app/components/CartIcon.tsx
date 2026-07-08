"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export default function CartIcon() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 hover:bg-sand"
      aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.5l.9 3m0 0 1.6 8.4a1.8 1.8 0 0 0 1.8 1.5h8.1a1.8 1.8 0 0 0 1.77-1.47L20.4 8.1H5.65M9 20.25a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm8.1 0a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z"
        />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-semibold text-white">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
