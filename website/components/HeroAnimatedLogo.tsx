"use client";

import React from "react";
import { Logo } from "@/components/logo";

export const AnimatedHeroLogo = () => {
	return (
		<div 
			className="relative w-20 h-6"
			style={{
				width: 449 * 1,
				height: 114 * 1,
			}}
		>
			<div className={`w-full h-full relative `}>
				<div className="w-full h-full absolute top-0 left-0">
					<Logo hideKitPart={true} />
				</div>
				<div className="w-full h-full absolute top-0 left-0">
					<Logo hideSpawnPart={true}/>
				</div>
			</div>
		</div>
	)
}