

import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { docsOptions } from "../layout.config";
import ArticleLayout from "@/components/side-bar";
import { DocsNavBarMobile } from "@/components/nav-mobile";
import { Navbar } from "@/components/nav-bar";
// import { usePathname } from "next/navigation";

export default function Layout({ children }: { children: ReactNode }) {
	// const pathname = usePathname();

	return (
		<>
			<Navbar />
			<DocsLayout
				{...docsOptions}
				sidebar={{
				component: (
					<ArticleLayout />
				),
			}}
		>

			<DocsNavBarMobile />

			<div 
				// key={pathname}
				className="animate-fade-up flex flex-1"
			>
					{children}
				</div>
			</DocsLayout>
		</>
	);
}
