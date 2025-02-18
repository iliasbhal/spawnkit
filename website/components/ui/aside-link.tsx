"use client";
import type { ClassValue } from "clsx";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { cn } from "@/lib/utils";
import React from "react";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & {
	href: string;
	children: (config: { isActive: boolean, isHover: boolean }) => React.ReactNode;
	startWith: string;
	title?: string | null;
	className?: ClassValue;
};

export const AsideLink = ({
	href,
	startWith,
	title,
	className,
	...props
}: Props) => {
	const segment = useSelectedLayoutSegment();

	const path = href;
	const isActive = path.replace("/docs/", "") === segment;
	const [isHover, setIsHover] = React.useState(false);
	return (
		<Link
			href={href}
			onMouseEnter={() => setIsHover(true)}
			onMouseLeave={() => setIsHover(false)}
			className={cn(
				isActive
					? "bg-primary/30 text-white"
					: "text-muted-foreground hover:text-white/80 hover:bg-primary/10 opacity-90",
				"w-full transition-colors flex items-center gap-x-2.5  px-5 py-1",
				className,
			)}
			{...props}
		>
			{props.children({ isActive, isHover })}
		</Link>
	);
};
