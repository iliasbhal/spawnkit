'use client'

import React from "react";
import { useBoundingClientRect } from "@/hooks/useBoundingClientRect";

interface HeroBackgroundProps {
	boxSize?: number;
}

export const HeroBackground = React.memo((props: HeroBackgroundProps) => {
	const { boxSize = 45 } = props;

	const heroRef = React.useRef<HTMLDivElement>(null);

	// const { width: heroWidth, height: heroHeight } = useBoundingClientRect(heroRef);

	const boxRowCount = 32;// Math.ceil(heroWidth / boxSize);
	const boxColCount = 14; //Math.ceil(heroHeight / boxSize);
	// console.log({
	// 	row: boxRowCount,
	// 	col: boxColCount,
	// })

	const [activeMap, setActiveMap] = React.useState<Record<number, { until: number, active: boolean }>>({});
	React.useEffect(() => {
		const interval = setInterval(() => {
			setActiveMap((activeMap) => {
				const now = Date.now();
				const nextActiveMap: typeof activeMap = { ...activeMap };
	
				Array.from({ length: boxColCount * boxRowCount }).map((_, itemId) => {
					const chanceToBecomeActive = 1 / 500;
					const isActiveConfig = nextActiveMap[itemId] ?? { until: 0, active: false };
					if (isActiveConfig.until > now) {
						nextActiveMap[itemId] = isActiveConfig;  // Preserve existing active state
						return;
					}

					const random = Math.random();
					const nextActive = random < chanceToBecomeActive;
					const stayActiveFor = Math.floor(random * 2000);
					nextActiveMap[itemId] = { 
						until: nextActive ? now + 1000 : 0, 
						active: nextActive 
					};
				});

				return nextActiveMap;
			});
		}, 100);

		return () => {
			clearInterval(interval)
		};
	}, [boxColCount * boxRowCount]);

	return (
		<div 
			ref={heroRef} 
			className="relative opacity-65 w-full h-full inset-0  bg-white/5 [mask-image:linear-gradient(to_bottom,white,transparent)] dark:[box-shadow:0_-20px_80px_-20px_#8686f01f_inset]"
			style={{
				padding: 8,
			}}
		>
			<div
				className="flex flex-col items-center justify-center "
				style={{
					transformOrigin:'0% 0%',
					translate: '-50px 0px',
					rotate: '-10deg',
					
				}}
			>
				{Array.from({ length: 3 + boxColCount }, (_, rowIdx) => {
					return (
						<div  key={rowIdx} className="flex flex-row">
							{Array.from({ length: 1 + boxRowCount }, (_, colIdx) => {
								const itemId = rowIdx * colIdx;
								const isActive = activeMap[itemId]?.active ?? false;

								return (
									<BackgroundBox 
										key={colIdx} 
										size={boxSize} 
										isActive={isActive}
									/>
								);
							})}
						</div>
					);
				})}
			</div>
		</div>
	);
});

const BackgroundBox = React.memo((props: { size: number, isActive: boolean }) => {
	const BASE_COLOR = 'hsl(var(--foreground))';
	const ACTIVE_COLOR = 'yellow';

	const GAP = 4;
	const SIZE = props.size - (2 *GAP);

	return (
		<div 
			className="flex items-center justify-center relative"
			style={{
				width: SIZE,
				height: SIZE,
				margin: GAP,
				opacity: props.isActive ? 0.5 : 0.2,
			}}
		>
			<div
				className={`absolute shadow-xl border rounded-md transition-all ease-out duration-500 ${props.isActive ? 'active' : ''}`}
				style={{
					width: '100%',
					height: '100%',
					transform: `rotate(${props.isActive ? 90 : 0}deg)`,
					borderWidth: 1,
					borderColor: props.isActive ? ACTIVE_COLOR : BASE_COLOR,
				}}
			/>
			<svg 
				xmlns="http://www.w3.org/2000/svg" 
				strokeWidth="10px"
				strokeOpacity="1" 
				className={`transition-all duration-500 ${props.isActive ? 'active' : ''}`}
				style={{
					fill: ACTIVE_COLOR,
					fillOpacity: props.isActive ? 0.2 : 0,
					stroke: props.isActive ? ACTIVE_COLOR : BASE_COLOR,
				}}
				width={SIZE / 2} 
				height={SIZE / 2} 
				viewBox="0 0 256 256"
			>
				<path d="M240.58984,128a15.84794,15.84794,0,0,1-10.53125,15.03711l-63.81543,23.206-23.206,63.81543a16.001,16.001,0,0,1-30.07422,0L89.75684,166.24316l-63.81543-23.206a16.001,16.001,0,0,1,0-30.07422L89.75684,89.75684l23.20605-63.81543a16.001,16.001,0,0,1,30.07422,0l23.206,63.81543,63.81543,23.20605A15.84794,15.84794,0,0,1,240.58984,128Z"/>
			</svg>
		</div>
	)
})

