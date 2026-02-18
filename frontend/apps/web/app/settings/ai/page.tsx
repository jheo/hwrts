'use client';

import { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AiProvider = 'claude' | 'openai';

interface AiSettings {
  enabled: boolean;
  spellGrammar: boolean;
  provider: AiProvider;
}

const STORAGE_KEY = 'hw-ai-settings';

const defaultSettings: AiSettings = {
  enabled: true,
  spellGrammar: true,
  provider: 'claude',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionDivider() {
  return (
    <div
      className="my-6"
      style={{ borderTop: '1px solid var(--border-primary)' }}
    />
  );
}

function SettingRow({
  label,
  description,
  children,
  disabled,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3"
      style={{ opacity: disabled ? 0.5 : undefined }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
      style={{
        background: checked ? 'var(--accent-primary)' : 'var(--surface-tertiary)',
        border: '1px solid var(--border-primary)',
        // ring offset color
      }}
      aria-label={checked ? '켜짐' : '꺼짐'}
    >
      <span
        className="pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm transition-transform"
        style={{
          background: checked ? 'var(--accent-primary-text)' : 'var(--text-tertiary)',
          transform: checked ? 'translateX(18px)' : 'translateX(2px)',
        }}
      />
    </button>
  );
}

function ComingSoonBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        background: 'var(--surface-tertiary)',
        color: 'var(--text-tertiary)',
        border: '1px solid var(--border-primary)',
      }}
    >
      출시 예정
    </span>
  );
}

function SaveButton({
  onClick,
  saved,
}: {
  onClick: () => void;
  saved: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2"
      style={{
        background: 'var(--accent-primary)',
        color: 'var(--accent-primary-text)',
      }}
    >
      {saved ? '저장됨' : '저장'}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiSettingsPage() {
  const [settings, setSettings] = useState<AiSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AiSettings>;
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  function update<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaved(true);
      // Reset saved indicator after 2s
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore storage errors
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--text-active)' }}
        >
          AI 어시스트
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          AI가 글쓰기를 보조하는 방식을 설정합니다. AI는 제안만 할 수 있으며 글을 직접 생성하지 않습니다.
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-xl px-5 py-1"
        style={{
          background: 'var(--surface-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* Master toggle */}
        <SettingRow
          label="AI 어시스트"
          description="AI 기능 전체를 켜거나 끕니다."
        >
          <Switch
            id="ai-enabled"
            checked={settings.enabled}
            onChange={(val) => update('enabled', val)}
          />
        </SettingRow>

        <SectionDivider />

        {/* Feature toggles */}
        <p
          className="mb-1 text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--text-tertiary)' }}
        >
          기능
        </p>

        <SettingRow
          label="맞춤법/문법 검사"
          description="입력 중 맞춤법과 문법 오류를 실시간으로 검사합니다."
          disabled={!settings.enabled}
        >
          <Switch
            checked={settings.spellGrammar}
            onChange={(val) => update('spellGrammar', val)}
            disabled={!settings.enabled}
          />
        </SettingRow>

        <SettingRow
          label="팩트 체크"
          description="문서 내 사실 정보의 정확성을 검토합니다."
          disabled
        >
          <div className="flex items-center gap-2">
            <ComingSoonBadge />
            <Switch checked={false} onChange={() => {}} disabled />
          </div>
        </SettingRow>

        <SettingRow
          label="스타일 제안"
          description="글의 가독성과 문체 개선을 제안합니다."
          disabled
        >
          <div className="flex items-center gap-2">
            <ComingSoonBadge />
            <Switch checked={false} onChange={() => {}} disabled />
          </div>
        </SettingRow>

        <SectionDivider />

        {/* Provider selection */}
        <p
          className="mb-3 text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--text-tertiary)' }}
        >
          AI 공급자
        </p>

        <fieldset
          className="mb-3 flex flex-col gap-2"
          disabled={!settings.enabled}
          style={{ opacity: !settings.enabled ? 0.5 : undefined }}
          aria-label="AI 공급자 선택"
        >
          {(
            [
              { value: 'claude', label: 'Claude (Anthropic)', description: '한국어 지원 최적화' },
              { value: 'openai', label: 'OpenAI (GPT)', description: '영어 교정에 강점' },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--surface-primary)]"
              style={{
                border: `1px solid ${settings.provider === option.value ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                background:
                  settings.provider === option.value
                    ? 'var(--surface-primary)'
                    : 'transparent',
              }}
            >
              <input
                type="radio"
                name="provider"
                value={option.value}
                checked={settings.provider === option.value}
                onChange={() => update('provider', option.value)}
                disabled={!settings.enabled}
                className="mt-0.5 shrink-0 accent-[var(--accent-primary)]"
              />
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {option.label}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </fieldset>
      </div>

      {/* Save button */}
      <div className="mt-6 flex justify-end">
        <SaveButton onClick={handleSave} saved={saved} />
      </div>
    </div>
  );
}
