import React, { useEffect, useState } from "react";

/**
 * SettingsModal.jsx
 * - language, theme (system/light/dark), default countdown, auto-refresh and reduced motion
 */

export default function SettingsModal({ open, onClose, settings, onSave }) {
  const [local, setLocal] = useState(settings);

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-70 w-full max-w-lg p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Settings</h3>

        <div className="space-y-3">
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Theme
            <select
              value={local.theme}
              onChange={(e) => setLocal({ ...local, theme: e.target.value })}
              className="ml-2 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            >
              <option value="system">System (recommended)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Language
            <select
              value={local.language}
              onChange={(e) => setLocal({ ...local, language: e.target.value })}
              className="ml-2 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            >
              <option value="en">English</option>
              <option value="tc">繁體中文</option>
              <option value="sc">简体中文</option>
            </select>
          </label>

          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={local.defaultCountdown}
              onChange={(e) => setLocal({ ...local, defaultCountdown: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Show countdown by default (instead of exact time)
          </label>

          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Auto-refresh interval
            <select
              value={local.autoRefreshInterval}
              onChange={(e) => setLocal({ ...local, autoRefreshInterval: parseInt(e.target.value, 10) })}
              className="ml-2 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            >
              <option value={0}>Off</option>
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </label>

          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={local.reducedMotionPreference}
              onChange={(e) => setLocal({ ...local, reducedMotionPreference: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Reduce motion / disable extra animations
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700">Cancel</button>
          <button
            onClick={() => onSave(local)}
            className="px-3 py-2 rounded bg-blue-600 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}