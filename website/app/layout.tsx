import "./global.css";

import { scan } from 'react-scan';

import { Navbar } from "@/components/nav-bar";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";
import { NavbarProvider } from "@/components/nav-mobile";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { baseUrl, createMetadata } from "@/lib/metadata";
import Loglib from "@loglib/tracker/react";

if (typeof window !== 'undefined') {
  const ENABLE_SCAN = process.env.NODE_ENV === 'development';
  scan({
    enabled: true,
    log: true, // logs render info to console (default: false)
  });
}

export const metadata = createMetadata({
	title: {
		template: "%s | Spawnkit",
		default: "Spawnkit",
	},
	description: "Build distributed, stateful microservices that scale and works on your own infrastructure.",
	metadataBase: baseUrl,
});

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="icon" href="/favicon/favicon.ico" sizes="any" />
			</head>
			<body
				className={`${GeistSans.variable} ${GeistMono.variable} font-sans relative`}
			>
				<RootProvider
					theme={{
						enableSystem: true,
						defaultTheme: "dark",
						forcedTheme: "dark",
					}}
				>
					<NavbarProvider>
						{/* <Navbar /> */}
						{children}
					</NavbarProvider>
				</RootProvider>
			</body>
		</html>
	);
}
