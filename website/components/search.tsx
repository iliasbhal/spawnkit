'use client'

import { useSearchContext } from "fumadocs-ui/provider";
import { Search } from "lucide-react";
import {Kbd} from "@heroui/kbd";
import { loglib } from "@loglib/tracker";

export const SearchInput = () => {
  if (typeof window === 'undefined') {
    return (
      <div className="flex items-center gap-2 p-2 pl-4 rounded-sm bg-black/10 dark:bg-white/10 cursor-text">
        <Search className="w-4 h-4" />
        <p className="text-sm text-transparent bg-gradient-to-tr from-gray-500 to-stone-400 bg-clip-text whitespace-nowrap">
          Search documentation...
        </p>

        <div className="pr-40 "/>
        <Kbd keys={["command"] as const} className="opacity-50">K</Kbd>
      </div>
    )
  }

	const { setOpenSearch } = useSearchContext();
	return (
		<div
			className="flex items-center gap-2 p-2 pl-4 rounded-sm  bg-black/20 dark:bg-white/20 opacity-70 hover:opacity-90 cursor-text"
			onClick={() => {
				setOpenSearch(true);
				loglib.track("sidebar-search-open");
			}}
		>
			<Search className="w-4 h-4" />
			<p className="text-sm text-black dark:text-white whitespace-nowrap">
				Search documentation...
			</p>

			<div className="pr-40 "/>
      <Kbd keys={["command"] as const}>K</Kbd>
		</div>
	)
}