"use client";

import React from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggler";

import { AsideLink } from "@/components/ui/aside-link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { contents, examples } from "./sidebar-content";
import { ChevronDownIcon } from "lucide-react";
import { loglib } from "@loglib/tracker";
import { cn } from "@/lib/utils";

export default function ArticleLayout() {
	const pathname = usePathname();
	const [currentOpen, setCurrentOpen] = useState<number>(0);

	function getDefaultValue() {
		const defaultValue = contents.findIndex((item) =>
			item.list.some((listItem) => listItem.href === pathname),
		);
		return defaultValue === -1 ? 0 : defaultValue;
	}

	const [group, setGroup] = useState("docs");

	useEffect(() => {
		const grp = pathname.includes("examples") ? "examples" : "docs";
		setGroup(grp);
		setCurrentOpen(getDefaultValue());
	}, [pathname]);

	const cts = group === "docs" ? contents : examples;

	return (
		<div 
			className="sticky top-fd-layout-top h-[var(--fd-toc-height)] flex-1 max-w-[var(--fd-sidebar-width)] pb-2 max-lg:hidden"
			style={{
				'--fd-toc-height': "calc(100dvh - var(--fd-banner-height) - var(--fd-nav-height))" 
			} as React.CSSProperties}
		>
			<aside className="border-r border-lines md:flex hidden w-[--fd-sidebar-width] overflow-y-auto absolute h-full flex-col justify-between">
				<div className="flex flex-col h-full justify-between">
					<MotionConfig
						transition={{ duration: 0.4, type: "spring", bounce: 0 }}
					>
						<div className="flex flex-col flex-1 overflow-scroll">
							{cts.map((item, index) => {
								const isOpen = currentOpen === index;

								return (
									<div 
										key={item.title}
										className={
											cn("border-b py-2.5", isOpen && "bg-white/05", {
												"opacity-100 hover:opacity-100": isOpen,
												"opacity-60 hover:opacity-100": !isOpen,
											})
										}
									>
										<button
											className="w-full border-lines text-sm px-5 py-2.5 -my-2.5 text-left flex items-center gap-2 cursor-pointer"
											onClick={() => setCurrentOpen(isOpen ? -1 : index)}
										>
											<item.Icon className="w-5 h-5" />
											<span className="grow">{item.title}</span>
											<motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
												<ChevronDownIcon
													className={cn(
														"h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
													)}
												/>
											</motion.div>
										</button>
										<AnimatePresence initial={false}>
											{currentOpen === index && (
												<motion.div
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: "auto" }}
													exit={{ opacity: 0, height: 0 }}
													className="relative overflow-hidden"
												>
													<motion.div
														// initial={{ opacity: 0, y: -20 }}
														// animate={{ opacity: 1, y: 0 }}
														className="text-sm py-2.5"
													>
														{item.list.map((listItem, j) => (
															<div
																key={listItem.title}
																className="mx-3 relative"
																onClick={() => {
																	loglib.track("sidebar-link-click", {
																		title: listItem.title,
																		href: listItem.href,
																	});
																}}
															>
																<Suspense fallback={<>Loading...</>}>
																	{listItem.group ? (
																		<div className="flex flex-row items-center gap-2 mx-5 my-1 pt-3">
																			<p className="text-sm text-transparent bg-gradient-to-tr dark:from-gray-100 dark:to-stone-200 bg-clip-text from-gray-900 to-stone-900">
																				{listItem.title}
																			</p>
																			<div className="flex-grow h-px bg-gradient-to-r from-stone-800/90 to-stone-800/60" />
																		</div>
																	) : (
																		<AsideLink
																			href={listItem.href}
																			title={listItem.title}
																			startWith="/docs"
																			className="break-words w-full rounded-md"
																		>
																			{({ isActive, isHover }) => (
																				<React.Fragment>
																					<listItem.icon
																						// style={isActive || isHover ? { '--foreground': 'var(--primary)'} as React.CSSProperties : {}	}
																						className={cn("w-4 h-4", {
																							// "text-primary": isActive || isHover,
																							// "text-stone-950 dark:text-white": !(isActive || isHover)
																						})} 
																					/>
																					{listItem.title}
																				</React.Fragment>
																			)}
																		</AsideLink>
																	)}
																</Suspense>
															</div>
														))}
													</motion.div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								)
							})}
						</div>
					</MotionConfig>

					{/* <div className="flex flex-0 border-t">
						<ThemeToggle />
					</div> */}
				</div>
			</aside>
		</div>
	);
}
