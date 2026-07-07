"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

export type WorkCenterTabDefinition<T extends string = string> = {
  id: T;
  label: string;
};

export type WorkCenterPanel<T extends string = string> = {
  id: T;
  content: ReactNode;
};

type WorkCenterTabsProps<T extends string = string> = {
  initialTab: T;
  tabs: Array<WorkCenterTabDefinition<T>>;
  panels: Array<WorkCenterPanel<T>>;
  basePath: string;
  queryParam?: string;
  ariaLabel?: string;
};

export function WorkCenterTabs<T extends string = string>({
  initialTab,
  tabs,
  panels,
  basePath,
  queryParam = "work_tab",
  ariaLabel = "Centro de trabajo"
}: WorkCenterTabsProps<T>) {
  const [activeTab, setActiveTab] = useState<T>(initialTab);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function updateUrl(nextTab: T) {
    const url = new URL(window.location.href);
    if (nextTab === tabs[0]?.id) {
      url.searchParams.delete(queryParam);
    } else {
      url.searchParams.set(queryParam, nextTab);
    }
    window.history.replaceState(null, "", `${basePath}${url.search}`);
  }

  function scrollToWorkCenterIfNeeded() {
    const node = containerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const isVisible = rect.bottom > 120 && rect.top < window.innerHeight - 120;
    if (!isVisible) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleTabChange(nextTab: T) {
    scrollToWorkCenterIfNeeded();
    updateUrl(nextTab);

    if (nextTab === activeTab) return;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    setIsTransitioning(true);
    timeoutRef.current = window.setTimeout(() => {
      setActiveTab(nextTab);
      window.requestAnimationFrame(() => setIsTransitioning(false));
    }, 90);
  }

  const activePanel = panels.find((panel) => panel.id === activeTab) ?? panels[0];

  return (
    <div ref={containerRef} id="tutor-work-center-tabs">
      <div className="border-b border-slate-200 p-2">
        <nav className="flex gap-1 overflow-x-auto" aria-label={ariaLabel}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex h-10 shrink-0 items-center rounded-xl px-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-sky-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div
        className={`p-4 transition-all duration-150 ease-out ${
          isTransitioning ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        {activePanel?.content}
      </div>
    </div>
  );
}
