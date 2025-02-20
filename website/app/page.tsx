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

const features = [
	{
		id: 1,
		label: "Framework Agnostic",
		title: "Supports for popular <strong>frameworks</strong>.",
		description:
			"Supports popular frameworks, including React, Vue, Svelte, Astro, Solid, Next.js, Nuxt, Tanstack Start, Hono, and more.",
		icon: PlugZap2Icon,
	},
	{
		id: 2,
		label: "Authentication",
		title: "Email & Password <strong>Authentication</strong>.",
		description:
			"Built-in support for email and password authentication, with session and account management features.",
		icon: LockClosedIcon,
	},
	{
		id: 3,
		label: "Social Sign-on",
		title: "Support multiple <strong>OAuth providers</strong>.",
		description:
			"Allow users to sign in with their accounts, including GitHub, Google, Discord, Twitter, and more.",
		icon: Webhook,
	},
	{
		id: 4,
		label: "Two Factor",
		title: "Multi Factor <strong>Authentication</strong>.",
		description:
			"Secure your users accounts with two factor authentication with a few lines of code.",
		icon: ShieldCheckIcon,
	},
	{
		id: 5,
		label: "Multi Tenant",
		title: "<strong>Organization</strong> Members and Invitation.",
		description:
			"Multi tenant support with members, organization, teams and invitation with access control.",

		icon: RabbitIcon,
	},

	{
		id: 6,
		label: "Plugin Ecosystem",
		title: "A lot more features with <strong>plugins</strong>.",
		description:
			"Improve your application experience with our official plugins and those created by the community.",
		icon: PlugIcon,
	},
];

export default function HomePage() {
	return (
		<main className="h-min mx-auto overflow-x-hidden">
				<div className="md:w-10/12 my-20 mx-auto font-geist relative  rounded-none -pr-2">
			<div className="w-full md:mx-0">
			<div className="relative col-span-3 md:border-[1.2px] h-full">
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
										Roll your own auth with confidence in minutes!<br />
										No vendor lock-in, no proprietary code.
									</p>
								</div>
							</div>
						</div>
				
						<div className="grid grid-cols-1 relative md:grid-rows-2 md:grid-cols-3 border-b-[1.2px] border-r-[1.2px]">
							<div className="hidden md:grid top-1/2 left-0 -translate-y-1/2 w-full grid-cols-3 z-10 pointer-events-none select-none absolute">
								<Plus className="w-8 h-8 text-neutral-300 translate-x-[16.5px] translate-y-[.5px] ml-auto dark:text-neutral-600" />
								<Plus className="w-8 h-8 text-neutral-300 ml-auto translate-x-[16.5px] translate-y-[.5px] dark:text-neutral-600" />
							</div>
							{features.map((feature, index) => {
								const isStartOfRow = index % 3 === 0;
								const isEndOfRow = index % 3 === 2;
								return (
									<div
									key={feature.id}
									className={cn(
										"justify-center md:min-h-[240px] border-t-[1.2px] transform-gpu flex flex-col p-10",
										{
											"border-l-[1.2px]": !isStartOfRow,
											"border-r-[1.2px]": !isEndOfRow,
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

const AnimatedHeroLogo = () => {
	const [isAnimating, setIsAnimating] = React.useState(false);
	React.useEffect(() => {
		setTimeout(() => {
			setIsAnimating(true);
		}, 300)
	}, []);


	return (
		<div 
			className="relative w-20 h-6"
			style={{
				width: 449 * 1.3,
				height: 114 * 1.3,
			}}
		>
			<MotionConfig 
				transition={{
					type: "spring",
					bounce: 0.4,
				}}
			>
				<motion.div 
					className="w-full h-full absolute top-0 left-0"
					initial={{ 
						translateY: 0,
					}}
					animate={isAnimating ? { 
						translateY: [20, 0],
						rotate: [1, 0],
						transformOrigin: "0px 0px"
					} : {
						translateY: 0,
					}} 
				>
					<Logo hideKitPart={true} />
				</motion.div>
				<motion.div 
					className="w-full h-full absolute top-0 left-0"
					initial={{ 
						translateY: 0 
					}}
					animate={{ 
						translateY: [-30,0],
						rotate: [1, 0],
						transformOrigin: "0px 0px"
					}}
				>
					<Logo hideSpawnPart={true}/>
				</motion.div>
			</MotionConfig>
		</div>
	)
}