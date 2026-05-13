"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterGroup = {
  id: string;
  title: string;
  type: "checkbox" | "radio" | "range" | "select";
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
};

export type FilterState = Record<string, string | string[] | [number, number]>;

type FilterSidebarProps = {
  filters: FilterGroup[];
  value: FilterState;
  onChange: (state: FilterState) => void;
};

export function FilterSidebar({ filters, value, onChange }: FilterSidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCheckboxChange = (groupId: string, optionValue: string) => {
    const current = (value[groupId] as string[]) || [];
    const updated = current.includes(optionValue)
      ? current.filter((v) => v !== optionValue)
      : [...current, optionValue];
    onChange({ ...value, [groupId]: updated });
  };

  const handleRadioChange = (groupId: string, optionValue: string) => {
    onChange({ ...value, [groupId]: optionValue });
  };

  const handleRangeChange = (
    groupId: string,
    index: 0 | 1,
    newValue: number
  ) => {
    const current = (value[groupId] as [number, number]) || [0, 0];
    const updated: [number, number] = [...current] as [number, number];
    updated[index] = newValue;
    onChange({ ...value, [groupId]: updated });
  };

  const handleSelectChange = (groupId: string, optionValue: string) => {
    onChange({ ...value, [groupId]: optionValue });
  };

  const handleClearAll = () => {
    onChange({});
  };

  return (
    <aside className="filter-sidebar">
      <div className="filter-sidebar__header">
        <h3>Bộ lọc</h3>
        <button
          className="filter-sidebar__clear"
          onClick={handleClearAll}
          type="button"
        >
          Xóa bộ lọc
        </button>
      </div>

      {filters.map((group) => {
        const isCollapsed = collapsed[group.id] ?? false;

        return (
          <div key={group.id} className="filter-sidebar__group">
            <button
              className="filter-sidebar__group-header"
              onClick={() => toggleSection(group.id)}
              type="button"
            >
              <span>{group.title}</span>
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>

            {!isCollapsed && (
              <div className="filter-sidebar__group-content">
                {group.type === "checkbox" &&
                  group.options?.map((option) => (
                    <label
                      key={option.value}
                      className="filter-sidebar__checkbox"
                    >
                      <input
                        type="checkbox"
                        checked={
                          ((value[group.id] as string[]) || []).includes(
                            option.value
                          )
                        }
                        onChange={() =>
                          handleCheckboxChange(group.id, option.value)
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}

                {group.type === "radio" &&
                  group.options?.map((option) => (
                    <label key={option.value} className="filter-sidebar__radio">
                      <input
                        type="radio"
                        name={group.id}
                        checked={value[group.id] === option.value}
                        onChange={() =>
                          handleRadioChange(group.id, option.value)
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}

                {group.type === "range" && (
                  <div className="filter-sidebar__range">
                    <div className="filter-sidebar__range-inputs">
                      <input
                        type="number"
                        min={group.min ?? 0}
                        max={group.max ?? 100}
                        step={group.step ?? 1}
                        value={
                          ((value[group.id] as [number, number]) || [
                            group.min ?? 0,
                            group.max ?? 100,
                          ])[0]
                        }
                        onChange={(e) =>
                          handleRangeChange(group.id, 0, Number(e.target.value))
                        }
                        placeholder="Min"
                      />
                      <span className="filter-sidebar__range-separator">—</span>
                      <input
                        type="number"
                        min={group.min ?? 0}
                        max={group.max ?? 100}
                        step={group.step ?? 1}
                        value={
                          ((value[group.id] as [number, number]) || [
                            group.min ?? 0,
                            group.max ?? 100,
                          ])[1]
                        }
                        onChange={(e) =>
                          handleRangeChange(group.id, 1, Number(e.target.value))
                        }
                        placeholder="Max"
                      />
                    </div>
                  </div>
                )}

                {group.type === "select" && (
                  <select
                    className="filter-sidebar__select"
                    value={(value[group.id] as string) || ""}
                    onChange={(e) =>
                      handleSelectChange(group.id, e.target.value)
                    }
                  >
                    <option value="">Tất cả</option>
                    {group.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
