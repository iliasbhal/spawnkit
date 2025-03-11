"use client";

import React from "react";
import Link from "next/link";
import {
	Copy,
	Globe2Icon,
	PlugIcon,
	PlugZap2Icon,
	Plus,
	RabbitIcon,
	ShieldCheckIcon,
	Webhook,
} from "lucide-react";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { HeroBackground } from "@/components/HeroBackground";
import { cn } from "@/lib/utils";
import { Testimonial } from "@/components/landing/people-say";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Logo } from "@/components/logo";
import { motion, MotionConfig } from "motion/react";
import { AnimatedHeroLogo } from "@/components/HeroAnimatedLogo";

const features = [
	{
		id: 1,
		label: "Full Control",
		title: "Self-host with <strong>no vendor lock-in</strong>.",
		description:
			"Deploy and manage your infrastructure anywhere without being tied to specific cloud providers. You have complete control over your setup.",
		icon: Globe2Icon,
	},
	{
		id: 2,
		label: "No Cold Starts",
		title: "Persistent <strong>instances</strong> with no latency.",
		description:
			"Eliminate cold start latency with persistent instances that maintain state and stay ready to handle requests instantly.",
		icon: PlugZap2Icon,
	},
	{
		id: 3,
		label: "Real-time",
		title: "<strong>Real-time</strong> Communication.",
		description:
			"Built-in support for response streaming, broadcast capabilities, pub/sub messaging system, and remote procedure calls (RPC).",
		icon: Webhook,
	},
	{
		id: 4,
		label: "Scheduling",
		title: "Advanced <strong>Job Scheduling</strong>.",
		description:
			"Powerful scheduling features including delayed job execution, cron-style scheduling, and comprehensive job management.",
		icon: RabbitIcon,
	},
	{
		id: 5,
		label: "Plugin System",
		title: "Extensible <strong>Plugin</strong> Architecture.",
		description:
			"Enhance your application with plugins that add features like SQLite database support and more from our growing ecosystem.",
		icon: PlugIcon,
	},
	{
		id: 6,
		label: "Developer Experience",
		title: "First-class <strong>TypeScript</strong> Support.",
		description:
			"Enjoy strong type safety and graceful error propagation for a superior development experience.",
		icon: ShieldCheckIcon,
	},
];

export default function HomePage() {
	return (
		<main className="h-min mx-auto overflow-x-hidden">
				<div className="md:w-10/12 my-20 mx-auto font-geist relative  rounded-none -pr-2">
			<div className="w-full md:mx-0">
			<div className="relative col-span-3 border-yellow-200/20 border-[0.1px] h-full">
					<div className="w-full h-full">
						<div className="flex flex-col items-center justify-end w-full h-full gap-10 z-1 relative">
							<div className="absolute top-0 left-0 w-full h-full z-0">
								<HeroBackground />
							</div>
							<div className="flex flex-col items-center justify-center w-full  gap-10 z-1 relative py-40">
								<AnimatedHeroLogo />
								<div className="flex flex-col items-center justify-center w-full h-full gap-3 z-1 relative">
									<div className="flex items-center gap-2">
										<Link href="/docs" className="cursor-pointer hover:bg-primary/30">
											<Button variant="outline" className="p-6 font-normal text-lg bg-primary/60 hover:bg-primary/80">Documentation</Button>
										</Link>

										<Popover hideTimeout={2000}>
											<PopoverTrigger asChild >
												<Button 
														variant="outline"
														className="p-6 font-normal text-lg px-4 bg-slate-700/30 hover:bg-slate-700/40 gap-3 group relative"
														onClick={(e) => {
															navigator.clipboard.writeText("npm install spawnkit");
														}}
													>
														<span className="font-mono font-normal opacity-70">
															<span className="opacity-70">{'>'}</span> <span className="opacity-70">npm install</span> spawnkit
														</span>
														<Copy className="w-4 h-4" />
													</Button>
												</PopoverTrigger>
												<PopoverContent className="text-white font-light text-sm bg-green-900 px-2 py-1 rounded-md z-1">
													copied!
												</PopoverContent>
											</Popover>
									</div>
								<div className="h-3" />
									<p className="mx-auto text-xl font-thin tracking-tighter text-center">
										Build distributed, stateful microservices that scale and works on your own infrastructure.
									</p>
								</div>
							</div>
						</div>
				
						<div className="grid grid-cols-1 relative md:grid-rows-2 md:grid-cols-3 ">
							<div className="hidden md:grid top-1/2 left-0 -translate-y-1/2 w-full grid-cols-3 z-10 pointer-events-none select-none absolute">
								<Plus className="w-8 h-8 text-yellow-200/20 translate-x-[16.5px] translate-y-[.5px] ml-auto dark:text-yellow-200/20" />
								<Plus className="w-8 h-8 text-yellow-200/20 ml-auto translate-x-[16.5px] translate-y-[.5px] dark:text-yellow-200/20" />
							</div>
							{features.map((feature, index) => {
								const isStartOfRow = index % 3 === 0;
								const isEndOfRow = index % 3 === 2;
								return (
									<div
									key={feature.id}
									className={cn(
										"flex flex-col items-start justify-start md:min-h-[240px] border-yellow-200/20 border-t-[0.1px] transform-gpu p-10",
										{
											"border-l-[0.1px]": !isStartOfRow,
											// "border-r-[0.1px]": !isEndOfRow,
										}
									)}
								>
									<div className="flex items-center gap-2 my-1">
										<feature.icon className="w-4 h-4" />
										<p className="text-gray-600 dark:text-gray-400 font-mono">
											{feature.label}
										</p>
									</div>
									<div className="mt-2">
										<div className="max-w-full">
											<div className="flex gap-3 ">
												<p
													className="max-w-lg text-xl font-normal tracking-tighter md:text-2xl"
													dangerouslySetInnerHTML={{
														__html: feature.title,
													}}
												/>
											</div>
										</div>
										<p className="mt-2 text-sm text-left text-muted-foreground">
											{feature.description}
											<a className="ml-2 underline" href="/docs" target="_blank">
												Learn more
											</a>
										</p>
									</div>
								</div>
								)
							})}
						</div>
					</div>
				</div>

			</div>
		</div>

		<p className="text-center text-sm text-gray-500 p-20">
			©2025 Spawnkit Labs
		</p>
		</main>
	);
}
