"use client";
import type { ClassValue } from "clsx";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { cn } from "@/lib/utils";
import React from "react";

type Props = {
	href: string;
	children: (config: { isActive: boolean, isHover: boolean }) => React.ReactElement;
	startWith: string;
	title?: string | null;
	className?: ClassValue;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

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
					? "bg-primary/10 text-primary"
					: "text-muted-foreground hover:text-primary/80 hover:bg-primary/10 opacity-90",
				"w-full transition-colors flex items-center gap-x-2.5 hover:bg-primary/10 px-5 py-1",
				className,
			)}
			{...props}
		>
			{props.children({ isActive, isHover })}
		</Link>
	);
};
