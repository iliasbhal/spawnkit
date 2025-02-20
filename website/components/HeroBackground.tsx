'use client'

import React from "react";
import { motion } from "motion/react";
import { useBoundingClientRect } from "@/hooks/useBoundingClientRect";

interface HeroBackgroundProps {
	boxSize?: number;
}

export const HeroBackground = React.memo((props: HeroBackgroundProps) => {
	const { boxSize = 45 } = props;

	const heroRef = React.useRef<HTMLDivElement>(null);

	const { width: heroWidth, height: heroHeight } = useBoundingClientRect(heroRef);

	const boxRowCount = Math.ceil(heroWidth / boxSize);
	const boxColCount = Math.ceil(heroHeight / boxSize);

	return (
		<div 
			ref={heroRef} 
			className="relative opacity-65 w-full h-full inset-0 flex flex-col items-center justify-center  bg-white/5 [mask-image:linear-gradient(to_bottom,white,transparent)] dark:[box-shadow:0_-20px_80px_-20px_#8686f01f_inset]"
			style={{
				padding: 8,
			}}
		>
			{Array.from({ length: 1 + boxColCount }, (_, rowIdx) => {
				return (
					<div 
						key={rowIdx}
						className="flex flex-row"
						style={{ 
							opacity: rowIdx == 0 ? 0 : 1 ,
							rotate: '-10deg',
							transform: 'translateY(-100px)'
						}}
					>
						{Array.from({ length: 1 + boxRowCount }, (_, colIdx) => {
							return (
								<BackgroundBox 
									key={colIdx} 
									size={boxSize} 
								/>
							);
						})}
					</div>
				);
			})}
		</div>
	);
});

const BackgroundBox = React.memo((props: { size: number }) => {
	const [isActive, setIsActive] = React.useState(false);

	const baseColor = 'hsl(var(--foreground))';
	const activeColor = 'yellow';
	
	React.useEffect(() => {
		const minRateOfChange = 1000;
		const rateOfChange = Math.random() * 1000 + minRateOfChange;
		const interval = setInterval(() => {
			const chance = 1 / 50;
			const nextActive = Math.random() < chance;
			const hasChanged = nextActive !== isActive;
			if (!hasChanged) return;
			setIsActive(nextActive);
		}, rateOfChange);

		return () => clearInterval(interval);
	}, [isActive]);

	const GAP = 4;
	const SIZE = props.size - GAP;

	return (
		<motion.div
			className="flex items-center justify-center shadow-xl border rounded-md"
			initial={{	
				width: SIZE,
				height: SIZE,
				margin: GAP,
				opacity: 0.2,
				borderWidth: 1,
				borderColor: baseColor,
			}}
			animate={{
				opacity: isActive ? 0.5 : 0.2,
				rotate: isActive ? 90 : 0,
				borderColor: isActive ? activeColor : baseColor,
				// scale: isActive ? 1.1 : 1,
				// transition: {
				// 	duration: .5
				// }
			}}
		>
			<motion.svg 
				xmlns="http://www.w3.org/2000/svg" 
				strokeWidth="10px"
				strokeOpacity="1" 
				initial={{
					fill: activeColor,
					fillOpacity: 0,
					stroke: baseColor
				}}
				animate={{
					fillOpacity: isActive ? 0.2 : 0,
					stroke: isActive ? activeColor : baseColor,
					// transition: {
					// 	type: "spring", 
					// 	bounce: 0.25
					// }
				}}
				width={SIZE / 2} 
				height={SIZE / 2} 
				viewBox="0 0 256 256"
			>
				<path d="M240.58984,128a15.84794,15.84794,0,0,1-10.53125,15.03711l-63.81543,23.206-23.206,63.81543a16.001,16.001,0,0,1-30.07422,0L89.75684,166.24316l-63.81543-23.206a16.001,16.001,0,0,1,0-30.07422L89.75684,89.75684l23.20605-63.81543a16.001,16.001,0,0,1,30.07422,0l23.206,63.81543,63.81543,23.20605A15.84794,15.84794,0,0,1,240.58984,128Z"/>
			</motion.svg>
		</motion.div>
	)
})



// {
//   "ns": "yt",
//   "el": "detailpage",
//   "cpn": "v8qa-U9GhAbhio3T",
//   "ver": 2,
//   "cmt": "0",
//   "fmt": "396",
//   "fs": "0",
//   "rt": "25.727",
//   "euri": "",
//   "lact": 0,
//   "cl": "725870172",
//   "mos": 0,
//   "state": "249",
//   "volume": 100,
//   "cbrand": "apple",
//   "cbr": "Chrome",
//   "cbrver": "132.0.0.0",
//   "c": "WEB",
//   "cver": "2.20250214.00.00",
//   "cplayer": "UNIPLAYER",
//   "cos": "Macintosh",
//   "cosver": "10_15_7",
//   "cplatform": "DESKTOP",
//   "hl": "fr_CA",
//   "cr": "TH",
//   "len": "461",
//   "fexp": "v1,23986023,18621,434717,127326,133212,14625955,11684381,43454,9954,9105,18310,4420,2821,2870,56242,19100,8479,19339,18644,13046,1823,18242,28968,9606,3362,2156,65,10501,3025,391,2586,3568,6620,13730,9251,3480,2024,495,6731,268,2551,961,2975,2361,3888,6857,665,207,429,2761,788,2275,238,1252,136,1908,3463,2056,1204,129,640,62,2771,1212,1124,1684,599",
//   "feature": "endscreen",
//   "afmt": "251",
//   "muted": "0",
//   "vis": "10",
//   "au_d": "en-US.4",
//   "docid": "Gzl7evXvRl8",
//   "ei": "_3O1Z6bJDv239fwPjY65gAg",
//   "plid": "AAYueIE6ABSVUJPz",
//   "referrer": "https://www.youtube.com/watch?v=99R50wwE03M",
//   "sdetail": "rv:99R50wwE03M",
//   "sourceid": "yw",
//   "of": "D1fwAWBbd7It0rmJ-8fpfQ",
//   "vm": "CAEQARgEOjJBSHFpSlRMeGd6aHZScFRRSE5zd3R4bEU1TmFrZUdVeWYwNFNyYVNieWN1aHVRYS0wd2JWQUZVQTZSU2k4RGN3dmRFY2JkYlV3RlNBLW53bXh0QTk2d282djRvdVN0eXI5RXNscVJYSnFYb0c3WjZEeTV2TEhWZFNpVTU4R0w5X0xOd3FWSnEzekF4AQ",
//   "lct": "0.000",
//   "lsk": true,
//   "lmf": false,
//   "lbw": "7034079.239",
//   "lhd": "0.055",
//   "lst": "0.000",
//   "laa": "",
//   "lva": "",
//   "lar": "itag_251_type_3_src_reslicemakeSliceInfosMediaBytes_segsrc_reslicemakeSliceInfosMediaBytes_seg_1_range_142419-286167_time_10.0-20.0_off_0_len_143749_end_1",
//   "lvr": "itag_396_type_3_src_reslicemakeSliceInfosMediaBytes_segsrc_reslicemakeSliceInfosMediaBytes_seg_4_range_516601-552890_time_19.8-25.8_off_0_len_36290_end_1",
//   "laq": "285106",
//   "lvq": "551163",
//   "prerolls": "ad",
//   "ismb": 12370000,
//   "leader": 1,
//   "relative_loudness": "-7.420",
//   "optimal_format": "360p",
//   "user_qual": 360,
//   "release_version": "youtube.player.web_20250211_01_RC00",
//   "debug_videoId": "Gzl7evXvRl8",
//   "adns": "yt",
//   "adel": "adunit",
//   "adcpn": "YEhg7DEDpxM_v2sq",
//   "adver": 2,
//   "adcmt": "9.019",
//   "adfmt": "243",
//   "adfs": "0",
//   "adrt": "25.705",
//   "adadformat": "15_2_1",
//   "adcontent_v": "Gzl7evXvRl8",
//   "adeuri": "",
//   "adlact": 1,
//   "adcl": "725870172",
//   "admos": 0,
//   "adstate": "4",
//   "advolume": 100,
//   "adcbrand": "apple",
//   "adcbr": "Chrome",
//   "adcbrver": "132.0.0.0",
//   "adc": "WEB",
//   "adcver": "2.20250214.00.00",
//   "adcplayer": "UNIPLAYER",
//   "adcos": "Macintosh",
//   "adcosver": "10_15_7",
//   "adcplatform": "DESKTOP",
//   "adautoplay": "1",
//   "adsautoplay": "1",
//   "addelay": 27,
//   "adhl": "fr_CA",
//   "adcr": "TH",
//   "aduga": "32",
//   "adlen": "29.961",
//   "adfexp": "v1,23986023,18621,434717,127326,133212,14625955,11684381,43454,9954,9105,18310,4420,2821,2870,56242,19100,8479,19339,18644,13046,1823,18242,28968,9606,3362,2156,65,10501,3025,391,2586,3568,6620,13730,9251,3480,2024,495,6731,268,2551,961,2975,2361,3888,6857,665,207,429,2761,788,2275,238,1252,136,1908,3463,2056,1204,129,640,62,2771,1212,1124,1684,599",
//   "adafmt": "251",
//   "admuted": "0",
//   "advis": "10",
//   "addocid": "DC7JChPXpBk",
//   "adei": "_3O1Z7m-Hf239fwPjY65gAg",
//   "adplid": "AAYueIE9o7g0sXlU",
//   "adreferrer": "https://www.youtube.com/watch?v=99R50wwE03M",
//   "adsdetail": "rv:99R50wwE03M",
//   "adsourceid": "yw",
//   "adadcontext": "CAESEwiRhuiJiM-LAxXcep0JHb9aJFEgASgGMAE",
//   "adaqi": "_3O1Z9GKEdz19fwPv7WRiQU",
//   "adof": "wpCttTnDw-3KTbQLS4GLXw",
//   "advm": "CAEQABgEOjJBSHFpSlRKQnIwNUg4M0tNZFN2aVVWUTdtNkN6am5tVXRMdVM2RFlvUV94RVM3bUJkQWJYQUZVQTZSVE1wZGNnXzEtX3l4bU1KWG9OelFGLXQwQ3EzV0hVdEtOZk4yMEpGdGlNZGw4S3VLVnB5T29oUmdnWkE1WmQwVkFJNmdUZF9LQVVLMTVMbEZwVg",
//   "adhost_cpn": "v8qa-U9GhAbhio3T",
//   "advct": "9.019",
//   "advd": "29.961",
//   "advpl": "0.000-9.019",
//   "advbu": "0.000-29.961",
//   "advbs": "0.000-29.961",
//   "advpa": "1",
//   "advsk": "0",
//   "adven": "0",
//   "advpr": "1",
//   "advrs": "4",
//   "advns": "2",
//   "advec": "null",
//   "advemsg": "",
//   "advvol": "0.5888436282383371",
//   "advdom": "1",
//   "advsrc": "1",
//   "advw": "1463",
//   "advh": "823",
//   "adlct": "9.019",
//   "adlsk": false,
//   "adlmf": false,
//   "adlbw": "7034079.239",
//   "adlhd": "0.055",
//   "adlst": "0.000",
//   "adlaa": "itag_251_type_3_src_reslicemakeSliceInfosMediaBytes_segsrc_reslicemakeSliceInfosMediaBytes_seg_2_range_579285-580813_time_29.9-30.0_off_190970_len_1529_end_1_eos_1",
//   "adlva": "itag_243_type_3_src_reslicemakeSliceInfosMediaBytes_segsrc_reslicemakeSliceInfosMediaBytes_seg_4_range_626091-661503_time_28.3-29.9_off_68203_len_35413_end_1_eos_1",
//   "adlar": "itag_251_type_3_src_reslicemakeSliceInfosMediaBytes_segsrc_reslicemakeSliceInfosMediaBytes_seg_2_range_579285-580813_time_29.9-30.0_off_190970_len_1529_end_1_eos_1",
//   "adlvr": "itag_243_type_3_src_reslicemakeSliceInfosMediaBytes_segsrc_reslicemakeSliceInfosMediaBytes_seg_4_range_626091-661503_time_28.3-29.9_off_68203_len_35413_end_1_eos_1",
//   "adlaq": "0",
//   "adlvq": "0",
//   "adlab": "0.000-29.961",
//   "adlvb": "0.000-29.946",
//   "adismb": 14570000,
//   "adleader": 1,
//   "adrelative_loudness": "4.600",
//   "adoptimal_format": "360p",
//   "aduser_qual": 360,
//   "adrelease_version": "youtube.player.web_20250211_01_RC00",
//   "addebug_videoId": "DC7JChPXpBk",
//   "ad_skipBtnDbgInfo": "{\"player\":{\"bounds\":{\"x\":0,\"y\":56,\"width\":1920,\"height\":823,\"top\":56,\"right\":1920,\"bottom\":879,\"left\":0},\"class\":\"html5-video-player ytp-transparent ytp-exp-bottom-control-flexbox ytp-modern-caption ytp-exp-ppp-update ytp-livebadge-color ytp-fit-cover-video ytp-fine-scrubbing-exp ytp-hide-info-bar ytp-large-width-mode ytp-autonav-endscreen-cancelled-state ad-created ad-showing ad-interrupting paused-mode\"},\"videoAds\":{\"bounds\":{\"x\":0,\"y\":56,\"width\":1920,\"height\":823,\"top\":56,\"right\":1920,\"bottom\":879,\"left\":0},\"display\":\"block\",\"opacity\":\"1\",\"visibility\":\"visible\",\"zIndex\":\"auto\",\"hidden\":false,\"html\":\"<div class=\\\"video-ads ytp-ad-module\\\" data-layer=\\\"4\\\"><div class=\\\"ytp-ad-player-overlay-layout\\\" id=\\\"player-overlay-layout:0\\\" style=\\\"\\\"><div class=\\\"ytp-ad-player-overlay-layout__player-card-container\\\"><div class=\\\"ytp-ad-avatar-lockup-card ytp-ad-component--clickable\\\" id=\\\"ad-avatar-lockup-card:3\\\" style=\\\"\\\"><img class=\\\"ytp-ad-avatar ytp-ad-avatar--size-m ytp-ad-avatar--circular\\\" id=\\\"ad-avatar:4\\\" src=\\\"https://yt3.ggpht.com/Ga9Onb9eBr8_DlVRQiKcM5V0mjulw7na0OtbaJmPhrhI4Ge7euDPTNQggMBvF3SxgUt8IRxT=s88-c-k-c0x00ffffff-no-rj\\\" style=\\\"\\\"><div class=\\\"ytp-ad-avatar-lockup-card__avatar_and_text_container\\\"><div class=\\\"ytp-ad-avatar-lockup-card__text_container\\\"><div class=\\\"ad-simple-attributed-string ytp-ad-avatar-lockup-card__headline\\\" id=\\\"ad-simple-attributed-string:5\\\" aria-label=\\\"Build a Chatbot\\\" style=\\\"\\\">Build a Chatbot</div><div class=\\\"ad-simple-attributed-string ytp-ad-avatar-lockup-card__description\\\" id=\\\"ad-simple-attributed-string:6\\\" aria-label=\\\"chatbase.co\\\" style=\\\"\\\">chatbase.co</div></div></div><button class=\\\"ytp-ad-button-vm ytp-ad-component--clickable ytp-ad-button-vm--style-filled ytp-ad-button-vm--size-default\\\" id=\\\"ad-button:7\\\" aria-label=\\\"Sign up This link opens in new tab\\\" role=\\\"link\\\" style=\\\"\\\"><span class=\\\"ytp-ad-button-vm__text\\\">Sign up</span></button></div></div><div class=\\\"ytp-ad-player-overlay-layout__ad-info-container\\\"><span class=\\\"ytp-ad-badge--clean-player ytp-ad-badge--stark-clean-player\\\" id=\\\"ad-badge:8\\\" style=\\\"\\\"><div class=\\\"ad-simple-attributed-string ytp-ad-badge__text--clean-player ytp-ad-badge__text--clean-player-with-light-shadow\\\" id=\\\"ad-simple-attributed-string:9\\\" aria-label=\\\"Commandité\\\" style=\\\"\\\">Commandité</div></span><span class=\\\"ytp-ad-hover-text-button ytp-ad-info-hover-text-button ytp-ad-info-hover-text-button--clean-player\\\" id=\\\"ad-info-hover-text-button:c\\\" style=\\\"\\\"><button class=\\\"ytp-ad-button ytp-ad-button-link ytp-ad-clickable ytp-ad-hover-text-button--clean-player ytp-ad-hover-text-button--clean-player-with-light-shadow\\\" id=\\\"button:d\\\" aria-label=\\\"Mon centre d'annonces\\\" style=\\\"\\\"><span class=\\\"ytp-ad-button-icon\\\"><svg fill=\\\"#fff\\\" height=\\\"12px\\\" viewBox=\\\"0 -960 960 960\\\" width=\\\"12px\\\" style=\\\"padding-top: 8px;\\\"><path d=\\\"M430.09-270.8h101.34V-528H430.09v257.2Zm49.52-338.03q20.94 0 35.34-14.01 14.4-14.01 14.4-34.95 0-20.94-14.01-35.34-14.01-14.39-34.95-14.39-20.94 0-35.34 14.01-14.4 14.01-14.4 34.95 0 20.94 14.01 35.34 14.01 14.39 34.95 14.39Zm.67 548.18q-86.64 0-163.19-32.66-76.56-32.66-133.84-89.94t-89.94-133.8q-32.66-76.51-32.66-163.41 0-87.15 32.72-163.31t90.14-133.61q57.42-57.44 133.79-89.7 76.38-32.27 163.16-32.27 87.14 0 163.31 32.26 76.16 32.26 133.61 89.71 57.45 57.45 89.71 133.86 32.26 76.42 32.26 163.33 0 86.91-32.27 163.08-32.26 76.18-89.7 133.6-57.45 57.42-133.83 90.14-76.39 32.72-163.27 32.72Zm-.33-105.18q131.13 0 222.68-91.49 91.54-91.49 91.54-222.63 0-131.13-91.49-222.68-91.49-91.54-222.63-91.54-131.13 0-222.68 91.49-91.54 91.49-91.54 222.63 0 131.13 91.49 222.68 91.49 91.54 222.63 91.54ZM480-480Z\\\"></path></svg></span></button><div class=\\\"ytp-ad-hover-text-container ytp-ad-info-hover-text-short\\\">Mon centre d'annonces<div class=\\\"ytp-ad-hover-text-callout\\\"></div></div></span><span class=\\\"ytp-ad-pod-index ytp-ad-pod-index--autohide ytp-ad-pod-index--stark ytp-ad-pod-index--stark-with-light-shadow\\\" id=\\\"ad-pod-index:a\\\" style=\\\"\\\"><div class=\\\"ad-simple-attributed-string\\\" id=\\\"ad-simple-attributed-string:b\\\" aria-label=\\\"1 sur 2\\\" style=\\\"\\\">1 sur 2</div></span><div class=\\\"ytp-visit-advertiser-link ytp-visit-advertiser-link--clean-player ytp-visit-advertiser-link--clean-player-with-light-shadow ytp-ad-component--clickable\\\" id=\\\"visit-advertiser-link:e\\\" aria-label=\\\"chatbase.co This link opens in new tab\\\" role=\\\"link\\\" tabindex=\\\"0\\\" style=\\\"\\\"><span class=\\\"ytp-visit-advertiser-link__text\\\">chatbase.co</span></div></div><div class=\\\"ytp-ad-player-overlay-layout__skip-or-preview-container\\\"><div class=\\\"ytp-skip-ad\\\" id=\\\"skip-ad:1\\\" style=\\\"\\\"><button class=\\\"ytp-skip-ad-button\\\" id=\\\"skip-button:2\\\" style=\\\"opacity: 0.5;\\\"><div class=\\\"ytp-skip-ad-button__text\\\">Ignorer</div><span class=\\\"ytp-skip-ad-button__icon\\\"><svg height=\\\"100%\\\" viewBox=\\\"-6 -6 36 36\\\" width=\\\"100%\\\"><path d=\\\"M5,18l10-6L5,6V18L5,18z M19,6h-2v12h2V6z\\\" fill=\\\"#fff\\\"></path></svg></span></button></div></div><div class=\\\"ytp-ad-player-overlay-layout__ad-disclosure-banner-container\\\"></div></div></div>\"},\"skipButton\":{\"bounds\":{\"x\":1795.125,\"y\":748,\"width\":102.875,\"height\":36,\"top\":748,\"right\":1898,\"bottom\":784,\"left\":1795.125},\"display\":\"flex\",\"opacity\":\"0.5\",\"visibility\":\"visible\",\"zIndex\":\"1000\",\"hidden\":false,\"ima\":0,\"bulleit\":0,\"component\":1}}",
//   "0sz": "false",
//   "op": "",
//   "yof": "false",
//   "dis": "",
//   "gpu": "ANGLE_(Apple,_ANGLE_Metal_Renderer__Apple_M3,_Unspecified_Version)",
//   "ps": "desktop-polymer",
//   "debug_playbackQuality": "medium",
//   "debug_date": "Wed Feb 19 2025 13:03:05 GMT+0700 (Indochina Time)",
//   "origin": "https://www.youtube.com",
//   "timestamp": 1739944985298
// }