

import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { docsOptions } from "../layout.config";
import ArticleLayout from "@/components/side-bar";
import { DocsNavBarMobile } from "@/components/nav-mobile";
// import { usePathname } from "next/navigation";

export default function Layout({ children }: { children: ReactNode }) {
	// const pathname = usePathname();

	return (
		<DocsLayout
			{...docsOptions}
			sidebar={{
				component: (
					<div className="mr-[--fd-sidebar-width]">
						<ArticleLayout />
					</div>
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
	);
}
