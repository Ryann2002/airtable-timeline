import React, { useState, useMemo, useRef, useLayoutEffect } from "react";

// --- HELPER FUNCTIONS ---

const assignLanes = (items) => {
  if (!items || items.length === 0) return [];
  const sortedItems = [...items].sort(
    (a, b) => new Date(a.start) - new Date(b.start)
  );
  const lanes = [];

  function assignItemToLane(item) {
    for (const lane of lanes) {
      if (new Date(lane[lane.length - 1].end) < new Date(item.start)) {
        lane.push(item);
        return;
      }
    }
    lanes.push([item]);
  }

  for (const item of sortedItems) {
    assignItemToLane(item);
  }
  return lanes;
};

const calculateWidth = (start, end, minDate, maxDate, timelineWidth) => {
  const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24) + 1 || 1;
  const itemDays =
    (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24) + 1;
  return (itemDays / totalDays) * timelineWidth;
};

const calculatePosition = (start, minDate, maxDate, timelineWidth) => {
  const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24) + 1 || 1;
  const daysFromStart =
    (new Date(start) - new Date(minDate)) / (1000 * 60 * 60 * 24);
  return (daysFromStart / totalDays) * timelineWidth;
};

// --- TOOLTIP COMPONENT ---
const Tooltip = ({ content, x, y, visible }) => {
  const tooltipRef = useRef(null);
  const [style, setStyle] = useState({
    opacity: 0,
    transform: "translate(0, 0)",
  });

  useLayoutEffect(() => {
    if (visible && tooltipRef.current && content) {
      const tooltipEl = tooltipRef.current;
      const tooltipRect = tooltipEl.getBoundingClientRect();
      const newTop = y - tooltipRect.height - 12;
      let newLeft = x - tooltipRect.width / 2;
      if (newLeft < 0) newLeft = 8;
      if (newLeft + tooltipRect.width > window.innerWidth) {
        newLeft = window.innerWidth - tooltipRect.width - 8;
      }
      setStyle({
        transform: `translate(${newLeft}px, ${newTop}px)`,
        opacity: 1,
        transition: "opacity 0.2s ease-in-out",
      });
    } else {
      setStyle((s) => ({ ...s, opacity: 0 }));
    }
  }, [content, x, y, visible]);

  if (!content) return null;
  const duration =
    Math.ceil(
      (new Date(content.end) - new Date(content.start)) / (1000 * 60 * 60 * 24)
    ) + 1;
  return (
    <div
      ref={tooltipRef}
      className="fixed top-0 left-0 z-50 w-max max-w-xs bg-gray-900 text-white text-sm rounded-lg py-2 px-3 whitespace-nowrap shadow-xl pointer-events-none"
      style={style}
    >
      <div className="font-semibold">{content.name}</div>
      <div className="text-gray-300 mt-1">
        {content.start} → {content.end}
      </div>
      <div className="text-gray-400 text-xs mt-1">
        Duration: {duration} day{duration !== 1 ? "s" : ""}
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
    </div>
  );
};

// --- TIMELINE ITEM COMPONENT ---
const TimelineItem = ({
  item,
  position,
  width,
  laneHeight,
  colorClass,
  onShowTooltip,
  onHideTooltip,
}) => {
  return (
    <div
      className="absolute rounded-lg border-2 cursor-pointer transition-transform duration-300 group hover:scale-[1.02] hover:z-40"
      style={{
        left: `${position}px`,
        width: `${width}px`,
        height: `${laneHeight - 8}px`,
        top: `${item.lane * laneHeight + 4}px`,
      }}
      onMouseEnter={(e) => onShowTooltip(item, e)}
      onMouseLeave={onHideTooltip}
    >
      <div
        className={`h-full w-full rounded-md ${colorClass} border-gray-300 group-hover:border-blue-400 group-hover:shadow-xl transition-all duration-300`}
      >
        <div className="px-3 py-2 h-full flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">
              {item.name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN TIMELINE COMPONENT ---
const Timeline = ({ items = [] }) => {
  const [viewMode, setViewMode] = useState("monthly");
  const laneHeight = 50;
  const leftPadding = 60;
  const timeScaleHeight = 50;
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: null,
    x: 0,
    y: 0,
  });

  const handleShowTooltip = (item, event) => {
    const itemRect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      content: item,
      x: itemRect.left + itemRect.width / 2,
      y: itemRect.top,
    });
  };
  const handleHideTooltip = () =>
    setTooltip((prev) => ({ ...prev, visible: false }));

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const colors = [
    "bg-blue-100",
    "bg-purple-100",
    "bg-teal-100",
    "bg-indigo-100",
    "bg-cyan-100",
    "bg-emerald-100",
    "bg-violet-100",
    "bg-sky-100",
  ];

  const { itemsWithLanes, minDate, maxDate, lanes } = useMemo(() => {
    if (items.length === 0) {
      const today = new Date();
      return { items: [], minDate: today, maxDate: today, lanes: 0 };
    }
    const lanesArray = assignLanes(items);
    const flatItems = lanesArray.flatMap((laneItems, laneIndex) =>
      laneItems.map((item) => ({ ...item, lane: laneIndex }))
    );
    const dates = items.flatMap((item) => [
      new Date(item.start),
      new Date(item.end),
    ]);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const numberOfLanes = lanesArray.length;
    return {
      itemsWithLanes: flatItems,
      minDate,
      maxDate,
      lanes: numberOfLanes,
    };
  }, [items]);

  const { displayMinDate, displayMaxDate } = useMemo(() => {
    const newMinDate = new Date(minDate);
    if (viewMode === "yearly") {
      newMinDate.setMonth(0, 1);
      newMinDate.setHours(0, 0, 0, 0);
    } else if (viewMode === "monthly") {
      newMinDate.setDate(1);
      newMinDate.setHours(0, 0, 0, 0);
    }
    return { displayMinDate: newMinDate, displayMaxDate: maxDate };
  }, [minDate, maxDate, viewMode]);

  const { timelineWidth, timeScale } = useMemo(() => {
    const pixelsPerDay = { daily: 50, weekly: 15, monthly: 5, yearly: 1.5 }[
      viewMode
    ];
    const totalDays =
      (displayMaxDate - displayMinDate) / (1000 * 60 * 60 * 24) + 1 || 1;
    const calculatedWidth = totalDays * pixelsPerDay;
    const timelineContentWidth = Math.max(
      calculatedWidth,
      containerWidth - leftPadding
    );
    const scale = [];
    let startOfPeriod, formatType, increment;
    switch (viewMode) {
      case "daily":
        startOfPeriod = new Date(displayMinDate);
        formatType = { month: "short", day: "numeric" };
        increment = (d) => d.setDate(d.getDate() + 1);
        break;
      case "weekly":
        startOfPeriod = new Date(displayMinDate);
        const day = startOfPeriod.getDay();
        const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7;
        startOfPeriod.setDate(startOfPeriod.getDate() + daysUntilMonday);
        formatType = { month: "short", day: "numeric" };
        increment = (d) => d.setDate(d.getDate() + 7);
        break;
      case "yearly":
        startOfPeriod = new Date(displayMinDate.getFullYear(), 0, 1);
        formatType = { year: "numeric" };
        increment = (d) => d.setFullYear(d.getFullYear() + 1);
        break;
      default:
        startOfPeriod = new Date(
          displayMinDate.getFullYear(),
          displayMinDate.getMonth(),
          1
        );
        formatType = { month: "short", year: "numeric" };
        increment = (d) => d.setMonth(d.getMonth() + 1);
    }
    const current = new Date(startOfPeriod);
    while (current <= displayMaxDate) {
      const position = calculatePosition(
        current,
        displayMinDate,
        displayMaxDate,
        timelineContentWidth
      );
      scale.push({
        position: position + leftPadding,
        label: current.toLocaleDateString("en-US", formatType),
      });
      increment(current);
    }
    return { timelineWidth: timelineContentWidth, timeScale: scale };
  }, [viewMode, displayMinDate, displayMaxDate, leftPadding, containerWidth]);

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No timeline items to display.</p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-4 bg-white">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Timeline Visualization
        </h2>
        <div className="flex bg-gray-100 rounded-lg p-1 shadow-sm">
          {[
            { key: "daily", label: "Day" },
            { key: "weekly", label: "Week" },
            { key: "monthly", label: "Month" },
            { key: "yearly", label: "Year" },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === mode.key
                  ? "bg-white text-blue-600 shadow-md transform scale-105"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto"
      >
        <div
          className="relative"
          style={{
            width: timelineWidth + leftPadding,
            height: timeScaleHeight + lanes * laneHeight,
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-full"
            style={{ zIndex: 10 }}
          >
            {timeScale.map((tick, index) => (
              <div
                key={`grid-${index}`}
                className="absolute top-0 bottom-0 w-px bg-gray-200"
                style={{ left: `${tick.position}px` }}
              />
            ))}
          </div>
          <div
            className="sticky top-0 left-0 w-full bg-gray-50/80 backdrop-blur-sm border-b border-gray-200"
            style={{ height: timeScaleHeight, zIndex: 30 }}
          >
            {timeScale.map((tick, index) => (
              <div
                key={index}
                className="absolute top-2"
                style={{ left: `${tick.position}px` }}
              >
                <div className="w-px h-2 bg-gray-400 mx-auto"></div>
                <span className="text-xs text-gray-600 mt-1 whitespace-nowrap absolute left-1/2 -translate-x-1/2">
                  {tick.label}
                </span>
              </div>
            ))}
          </div>
          <div className="relative" style={{ zIndex: 20 }}>
            {Array.from({ length: lanes }).map((_, laneIndex) => (
              <div
                key={laneIndex}
                className="relative border-b border-gray-100"
                style={{ height: laneHeight }}
              >
                <div
                  className="sticky left-0 top-0 h-full bg-gray-100/80 backdrop-blur-sm flex items-center justify-center"
                  style={{ width: leftPadding }}
                >
                  <span className="text-xs font-semibold text-gray-500">
                    {laneIndex + 1}
                  </span>
                </div>
              </div>
            ))}
            {itemsWithLanes.map((item, index) => {
              const position =
                calculatePosition(
                  item.start,
                  displayMinDate,
                  displayMaxDate,
                  timelineWidth
                ) + leftPadding;
              const width = calculateWidth(
                item.start,
                item.end,
                displayMinDate,
                displayMaxDate,
                timelineWidth
              );
              const colorClass = colors[item.lane % colors.length];
              return (
                <TimelineItem
                  key={index}
                  item={item}
                  position={position}
                  width={Math.max(20, width - 2)}
                  laneHeight={laneHeight}
                  colorClass={colorClass}
                  onShowTooltip={handleShowTooltip}
                  onHideTooltip={handleHideTooltip}
                />
              );
            })}
          </div>
        </div>
      </div>
      <Tooltip
        content={tooltip.content}
        x={tooltip.x}
        y={tooltip.y}
        visible={tooltip.visible}
      />
    </div>
  );
};

export default Timeline;
