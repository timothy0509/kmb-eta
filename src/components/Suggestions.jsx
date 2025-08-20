import React from "react";

/**
 * Simple suggestions dropdown - shows name_en and small meta
 * props:
 *  - visible (bool)
 *  - items (array of stop objects)
 *  - onPick(item)
 */

export default function Suggestions({ visible, items = [], onPick, id }) {
  if (!visible || !items || items.length === 0) return null;
  return (
    <ul
      id={id}
      role="listbox"
      className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-64 overflow-auto z-40"
    >
      {items.map((s) => (
        <li
          key={s.stop}
          role="option"
          onClick={() => onPick && onPick(s)}
          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
        >
          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {s.name_en || s.name_tc || s.name_sc}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {s.stop}
          </div>
        </li>
      ))}
    </ul>
  );
}