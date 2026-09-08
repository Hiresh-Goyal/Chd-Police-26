import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCase } from '../hooks/useCase';
import { useTimeline } from '../hooks/useTimeline';

import { DomainBadge } from '../components/common/Badge';
import { Drawer } from '../components/common/Drawer';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

type TimelineEvent = {
  id: string;
  case_id?: string;
  event_type: string;
  timestamp: string;
  timeDisplay?: string;
  domain: string;
  title: string;
  description?: string;
  actor_raw?: string;
  peer_raw?: string;
  device_id?: string;
  location_raw?: string;
  amount?: number;
  source?: string;
  provenance?: string;
  metadata?: Record<string, unknown>;
  isCritical?: boolean;
  [key: string]: unknown;
};

type EventGroup = {
  id: string;
  events: TimelineEvent[];
  left: number;
};

const DOMAIN_CONFIG = [
  { key: 'CDR', label: 'CDR', color: '#0891B2' },
  { key: 'IPDR', label: 'IPDR', color: '#7C3AED' },
  { key: 'BANK', label: 'BANK', color: '#F97316' },
  { key: 'SOCIAL', label: 'SOCIAL', color: '#16A34A' },
  { key: 'NCRP', label: 'NCRP', color: '#C8102E' },
] as const;

const DOMAIN_EVENT_TYPES: Record<string, string[]> = {
  CDR: ['CALL', 'SMS'],
  IPDR: ['IPDR_SESSION'],
  BANK: ['BANK_TRANSFER', 'BANK_CASHOUT', 'CASHOUT', 'ATM_WITHDRAWAL'],
  SOCIAL: ['SOCIAL_POST', 'SOCIAL_INTERACTION'],
  NCRP: ['COMPLAINT', 'NCRP'],
};

const formatTimelineDate = (timestamp: string) => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatTimelineTime = (timestamp: string) => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const getTimestamp = (event: TimelineEvent) => {
  const value = new Date(event.timestamp).getTime();
  return Number.isFinite(value) ? value : null;
};

const getEventDomain = (event: TimelineEvent) => {
  const domain = String(event.domain ?? '').toUpperCase();

  if (domain === 'CDR' || domain === 'IPDR' || domain === 'BANK' || domain === 'SOCIAL' || domain === 'NCRP') {
    return domain;
  }

  for (const [candidate, types] of Object.entries(DOMAIN_EVENT_TYPES)) {
    if (types.includes(event.event_type)) {
      return candidate;
    }
  }

  return null;
};

const getEventMetadata = (event: TimelineEvent): Record<string, unknown> => {
  if (event.metadata && typeof event.metadata === 'object') {
    return event.metadata;
  }

  return {};
};

const getDomainColor = (domain: string) => {
  return DOMAIN_CONFIG.find(d => d.key === domain)?.color ?? '#64748B';
};

const getDomainIcon = (domain: string) => {
  switch (domain) {
    case 'CDR':
      return 'call';
    case 'IPDR':
      return 'router';
    case 'BANK':
      return 'account_balance';
    default:
      return null;
  }
};

export const Timeline: React.FC = () => {
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const { data: caseData, loading: caseLoading } = useCase(caseId ?? '');

  const [activeDomains, setActiveDomains] = useState<string[]>([
    'CDR',
    'IPDR',
    'BANK',
    'SOCIAL',
    'NCRP',
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [zoomScale, setZoomScale] = useState<'1hr' | '30m' | '15m'>('1hr');
  const [selectedDate, setSelectedDate] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  /*
   * Fetch the complete timeline for the case.
   *
   * Filtering by domain/date is intentionally done locally so that
   * changing the visual filters does not cause the page to briefly
   * render one dataset and then another.
   */
  const {
    data: timelineEvents = [],
    loading: timelineLoading,
  } = useTimeline(caseId ?? '');

  const loading = caseLoading || timelineLoading;

  const normalizedEvents = useMemo<TimelineEvent[]>(() => {
    return (timelineEvents as TimelineEvent[])
      .filter(event => getTimestamp(event) !== null)
      .map(event => ({
        ...event,
        domain: getEventDomain(event) ?? String(event.domain ?? 'UNKNOWN'),
        metadata: getEventMetadata(event),
      }))
      .sort(
        (a, b) =>
          (getTimestamp(a) ?? 0) - (getTimestamp(b) ?? 0),
      );
  }, [timelineEvents]);

  const availableDates = useMemo(() => {
    return Array.from(
      new Set(normalizedEvents.map(event => formatTimelineDate(event.timestamp))),
    );
  }, [normalizedEvents]);

  /*
   * Select the first available date only after the complete backend
   * response has arrived.
   */
  useEffect(() => {
    if (!availableDates.length) {
      setSelectedDate('');
      return;
    }

    setSelectedDate(current =>
      current && availableDates.includes(current)
        ? current
        : availableDates[0],
    );
  }, [availableDates]);

  const dateEvents = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return normalizedEvents.filter(
      event => formatTimelineDate(event.timestamp) === selectedDate,
    );
  }, [normalizedEvents, selectedDate]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return dateEvents.filter(event => {
      const domain = getEventDomain(event);

      if (domain && !activeDomains.includes(domain)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        event.id,
        event.event_type,
        event.title,
        event.description,
        event.actor_raw,
        event.peer_raw,
        event.device_id,
        event.location_raw,
        event.source,
        event.provenance,
        ...Object.entries(getEventMetadata(event)).flatMap(([key, value]) => [
          key,
          String(value),
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [dateEvents, activeDomains, searchQuery]);

  const uploadedFiles = caseData?.evidence ?? [];
  const hasUploads = uploadedFiles.some(
    file => String(file.status).toLowerCase() === 'complete',
  );

  /*
   * The visible timeline is always at least the selected zoom period.
   *
   * Importantly, the zoom period is NOT used to throw away events.
   * If events span multiple hours, the timeline becomes wider and
   * horizontally scrollable.
   */
  const zoomMinutes =
    zoomScale === '1hr'
      ? 60
      : zoomScale === '30m'
        ? 30
        : 15;

  const timelineRange = useMemo(() => {
    if (!filteredEvents.length) {
      return null;
    }

    const timestamps = filteredEvents
      .map(getTimestamp)
      .filter((value): value is number => value !== null);

    if (!timestamps.length) {
      return null;
    }

    const earliest = Math.min(...timestamps);
    const latest = Math.max(...timestamps);

    const zoomMs = zoomMinutes * 60 * 1000;

    /*
     * Keep a minimum one zoom-period viewport.
     * When the real data spans more than that, retain the complete
     * range and let the container scroll horizontally.
     */
    const actualDuration = Math.max(latest - earliest, 0);
    const duration = Math.max(actualDuration, zoomMs);

    /*
     * Snap the start to a clean zoom boundary.
     * This makes the axis stable and readable without changing
     * the actual event timestamps.
     */
    const earliestDate = new Date(earliest);

    const minute = earliestDate.getMinutes();

    const boundary =
      zoomMinutes >= 60
        ? 60
        : zoomMinutes;

    const snappedMinutes =
      Math.floor(minute / boundary) * boundary;

    const start = new Date(earliestDate);
    start.setMinutes(snappedMinutes, 0, 0);

    let end = new Date(start.getTime() + duration);

    if (end.getTime() < latest) {
      end = new Date(latest + zoomMs);
    }

    return {
      start,
      end,
      durationMs: end.getTime() - start.getTime(),
    };
  }, [filteredEvents, zoomMinutes]);

  /*
   * Pixels per minute.
   *
   * This is presentation geometry, not event positioning.
   * Event positions themselves are calculated from their timestamps.
   */
  const pixelsPerMinute = 8;

  const timelineWidth = useMemo(() => {
    if (!timelineRange) {
      return 1000;
    }

    const minutes = timelineRange.durationMs / 60000;

    return Math.max(
      1000,
      Math.ceil(minutes * pixelsPerMinute),
    );
  }, [timelineRange]);

  const positionForTimestamp = (timestamp: string) => {
    if (!timelineRange) {
      return 0;
    }

    const time = getTimestamp({
      timestamp,
    } as TimelineEvent);

    if (time === null) {
      return 0;
    }

    const ratio =
      (time - timelineRange.start.getTime()) /
      timelineRange.durationMs;

    return Math.max(
      0,
      Math.min(
        timelineWidth,
        ratio * timelineWidth,
      ),
    );
  };

  /*
   * Group visually colliding events.
   *
   * Events are NOT merged or discarded.
   * They simply share one stack position.
   */
  const buildEventGroups = (events: TimelineEvent[]): EventGroup[] => {
    if (!events.length) {
      return [];
    }

    const positioned = events
      .map(event => ({
        event,
        left: positionForTimestamp(event.timestamp),
      }))
      .sort((a, b) => a.left - b.left);

    const groups: EventGroup[] = [];

    /*
     * Existing cards are roughly 150–220px wide.
     * Using 190px as the collision distance means cards which would
     * overlap are represented by one stack.
     */
    const collisionDistance = 190;

    positioned.forEach(item => {
      const lastGroup = groups[groups.length - 1];

      if (
        !lastGroup ||
        item.left - lastGroup.left > collisionDistance
      ) {
        groups.push({
          id: `${item.event.id}-group`,
          left: item.left,
          events: [item.event],
        });
      } else {
        lastGroup.events.push(item.event);
      }
    });

    return groups;
  };

  const laneGroups = useMemo(() => {
    return {
      SOCIAL: buildEventGroups(
        filteredEvents.filter(
          event => getEventDomain(event) === 'SOCIAL',
        ),
      ),
      CDR: buildEventGroups(
        filteredEvents.filter(
          event => getEventDomain(event) === 'CDR',
        ),
      ),
      IPDR: buildEventGroups(
        filteredEvents.filter(
          event => getEventDomain(event) === 'IPDR',
        ),
      ),
      BANK: buildEventGroups(
        filteredEvents.filter(
          event => getEventDomain(event) === 'BANK',
        ),
      ),
      NCRP: buildEventGroups(
        filteredEvents.filter(
          event => getEventDomain(event) === 'NCRP',
        ),
      ),
    };
  }, [filteredEvents, timelineRange, timelineWidth]);

  /*
   * Critical/correlated events are used for the existing EPISODES
   * visual block. Its position is derived from the actual timestamps
   * rather than a hardcoded ml-[55%].
   */
  const episodeEvents = useMemo(() => {
    const critical = filteredEvents.filter(event => event.isCritical);

    if (critical.length) {
      return critical;
    }

    /*
     * If the backend does not mark events as critical, use the first
     * chronological events only as the existing correlation preview.
     * These are still real backend events.
     */
    return filteredEvents.slice(0, Math.min(filteredEvents.length, 4));
  }, [filteredEvents]);

  const episodePosition = useMemo(() => {
    if (!episodeEvents.length || !timelineRange) {
      return null;
    }

    const timestamps = episodeEvents
      .map(getTimestamp)
      .filter((value): value is number => value !== null);

    if (!timestamps.length) {
      return null;
    }

    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);

    const left =
      ((start - timelineRange.start.getTime()) /
        timelineRange.durationMs) *
      timelineWidth;

    const width =
      Math.max(
        190,
        ((Math.max(end - start, 0) + 15 * 60 * 1000) /
          timelineRange.durationMs) *
        timelineWidth,
      );

    return {
      left: Math.max(0, Math.min(left, timelineWidth - 190)),
      width: Math.min(
        Math.max(width, 190),
        Math.max(190, timelineWidth),
      ),
    };
  }, [episodeEvents, timelineRange, timelineWidth]);

  const axisTicks = useMemo(() => {
    if (!timelineRange) {
      return [];
    }

    const stepMs = zoomMinutes * 60 * 1000;
    const ticks: number[] = [];

    let cursor = timelineRange.start.getTime();

    while (cursor <= timelineRange.end.getTime()) {
      ticks.push(cursor);
      cursor += stepMs;
    }

    return ticks;
  }, [timelineRange, zoomMinutes]);

  const toggleDomain = (domain: string) => {
    if (activeDomains.includes(domain)) {
      if (activeDomains.length > 1) {
        setActiveDomains(activeDomains.filter(d => d !== domain));
      } else {
        showToast(
          'At least one domain must remain active.',
          'warning',
        );
      }
    } else {
      setActiveDomains([...activeDomains, domain]);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(previous => ({
      ...previous,
      [groupId]: !previous[groupId],
    }));
  };

  const handleExportTimeline = () => {
    const json = JSON.stringify(filteredEvents, null, 2);
    const blob = new Blob([json], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `timeline_case_${caseId}_${(
      selectedDate || 'timeline'
    ).replace(/\s+/g, '_')}.json`;

    anchor.click();

    URL.revokeObjectURL(url);

    showToast(
      'Timeline exported successfully.',
      'success',
    );
  };

  const renderEventGroups = (
    groups: EventGroup[],
    domain: string,
  ) => {
    const color = getDomainColor(domain);
    const icon = getDomainIcon(domain);

    return groups.map(group => {
      const expanded = !!expandedGroups[group.id];
      const first = group.events[0];
      const multiple = group.events.length > 1;

      return (
        <div
          key={group.id}
          className="absolute"
          style={{
            left: group.left,
            transform: 'translateX(-50%)',
            top: 10,
            zIndex: expanded ? 50 : 10,
          }}
        >
          <div className="relative">
            {multiple &&
              !expanded &&
              group.events.slice(1).map((event, index) => (
                <div
                  key={event.id}
                  className="absolute border-2 rounded px-3 py-1.5 pointer-events-none"
                  style={{
                    inset: 0,
                    borderColor: color,
                    backgroundColor: `${color}10`,
                    transform: `translate(
                      ${(index + 1) * 4}px,
                      ${(index + 1) * 4}px
                    )`,
                    zIndex: -index - 1,
                  }}
                />
              ))}

            <button
              type="button"
              onClick={() => {
                if (multiple) {
                  toggleGroup(group.id);
                } else {
                  setSelectedEvent(first);
                }
              }}
              className="relative bg-white border-2 rounded px-3 py-1.5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 text-left"
              style={{
                borderColor: color,
                minWidth: multiple ? 170 : 150,
                maxWidth: 220,
              }}
            >
              {icon ? (
                <span
                  className="material-symbols-outlined text-[16px] shrink-0"
                  style={{ color }}
                >
                  {icon}
                </span>
              ) : (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: color,
                  }}
                />
              )}

              <div className="min-w-0">
                <div
                  className="text-[11px] font-bold font-mono truncate"
                  style={{ color }}
                >
                  {formatTimelineTime(first.timestamp)} •{' '}
                  {first.title}
                </div>

                <div className="text-[10px] text-[#191C1E] truncate">
                  {multiple
                    ? `${group.events.length} events • Click to expand`
                    : first.description || '—'}
                </div>
              </div>
            </button>

            {expanded && (
              <div className="absolute left-0 top-full mt-1 w-[280px] bg-white border border-[#D9E1EA] rounded-md shadow-lg overflow-hidden z-[100]">
                <div
                  className="px-3 py-2 border-b border-[#EDF0F4] text-[10px] font-bold font-mono"
                  style={{ color }}
                >
                  {group.events.length} EVENTS
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {group.events.map(event => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] border-b border-[#EDF0F4] last:border-b-0"
                    >
                      <div
                        className="text-[10px] font-bold font-mono"
                        style={{ color }}
                      >
                        {formatTimelineTime(event.timestamp)} •{' '}
                        {event.title}
                      </div>

                      <div className="text-[10px] text-[#191C1E] truncate mt-0.5">
                        {event.description || '—'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  if (
    !loading &&
    normalizedEvents.length === 0 &&
    !hasUploads
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">
          timeline
        </span>

        <div>
          <p className="font-bold text-[#0B2340]">
            No evidence uploaded yet
          </p>

          <p className="text-sm text-[#64748B] mt-1">
            Upload CDR, bank or IPDR files to generate the timeline.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon="upload_file"
          onClick={() =>
            navigate(`/cases/${caseId}/upload-evidence`)
          }
        >
          Upload Evidence
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">
              #{caseId}
            </span>

            <span>•</span>

            <span className="font-medium text-[#191C1E]">
              {caseData?.name ??
                caseData?.title ??
                'Case'}
            </span>

            <span>•</span>

            <span>
              {caseData?.status ?? '—'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">
            Cross-Domain Timeline
          </h1>

          <p className="text-sm text-[#424751] mt-0.5">
            Chronological multi-lane correlation of telecom,
            bank, data, and social events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="download"
            onClick={handleExportTimeline}
          >
            Export Timeline
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon="add_task"
            onClick={() =>
              showToast(
                'Timeline sequence added to Evidence Report draft.',
                'success',
              )
            }
          >
            Add to Report
          </Button>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="bg-white border border-[#D9E1EA] rounded-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="material-symbols-outlined text-[#64748B] text-[18px]">
              calendar_today
            </span>

            <select
              value={selectedDate}
              onChange={event =>
                setSelectedDate(event.target.value)
              }
              className="font-mono text-xs font-bold text-[#191C1E] bg-[#F8FAFC] border border-[#D9E1EA] rounded px-2 py-1 cursor-pointer"
            >
              {availableDates.map(date => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-[#D9E1EA] hidden sm:block" />

          <input
            type="text"
            placeholder="Search Entity / Event..."
            value={searchQuery}
            onChange={event =>
              setSearchQuery(event.target.value)
            }
            className="text-xs border border-[#D9E1EA] rounded px-2 py-1 outline-none focus:border-[#0B5CAB]"
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-[#64748B] tracking-wider uppercase mr-1">
              DOMAINS:
            </span>

            {DOMAIN_CONFIG.map(domain => {
              const active = activeDomains.includes(
                domain.key,
              );

              return (
                <button
                  key={domain.key}
                  onClick={() =>
                    toggleDomain(domain.key)
                  }
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border transition-all flex items-center gap-1.5 ${active
                      ? 'bg-white shadow-xs'
                      : 'opacity-40 bg-slate-100 border-transparent text-slate-400'
                    }`}
                  style={{
                    borderColor: active
                      ? domain.color
                      : 'transparent',
                    color: active
                      ? domain.color
                      : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: domain.color,
                    }}
                  />

                  {domain.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setZoomScale(
                zoomScale === '15m'
                  ? '30m'
                  : '1hr',
              )
            }
            className="p-1 text-[#64748B] hover:text-[#191C1E] hover:bg-slate-100 rounded"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-[18px]">
              zoom_out
            </span>
          </button>

          <span className="text-xs font-mono text-[#64748B]">
            {zoomScale} scale
          </span>

          <button
            onClick={() =>
              setZoomScale(
                zoomScale === '1hr'
                  ? '30m'
                  : '15m',
              )
            }
            className="p-1 text-[#64748B] hover:text-[#191C1E] hover:bg-slate-100 rounded"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-[18px]">
              zoom_in
            </span>
          </button>
        </div>
      </div>

      {/* Timeline Canvas */}
      <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <div
            className="relative"
            style={{
              width: timelineRange
                ? timelineWidth + 172
                : '100%',
              minWidth: '100%',
            }}
          >
            {/* Timeline Header */}
            <div className="flex h-9 bg-[#F8FAFC] border-b border-[#D9E1EA] sticky top-0 z-20 text-xs font-mono text-[#64748B]">
              <div className="w-44 shrink-0 border-r border-[#D9E1EA] flex items-center justify-center font-bold uppercase text-[10px] text-[#424751] sticky left-0 bg-[#F8FAFC] z-30">
                TIMELINE LANE
              </div>

              <div
                className="relative flex items-center"
                style={{
                  width: timelineWidth,
                }}
              >
                {axisTicks.map(tick => {
                  const left = timelineRange
                    ? ((tick -
                      timelineRange.start.getTime()) /
                      timelineRange.durationMs) *
                    timelineWidth
                    : 0;

                  return (
                    <span
                      key={tick}
                      className="absolute -translate-x-1/2"
                      style={{
                        left,
                      }}
                    >
                      {formatTimelineTime(
                        new Date(tick).toISOString(),
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* EPISODES */}
            <div className="flex min-h-[90px] border-b border-[#D9E1EA] bg-[#FFF5F5]/60 relative group overflow-visible">
              <div className="w-44 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2 sticky left-0 z-20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#DC2626]">
                  EPISODES
                </span>

                <span className="text-[9px] text-[#64748B] font-mono">
                  Core Correlation
                </span>
              </div>

              <div
                className="relative p-2"
                style={{
                  width: timelineWidth,
                }}
              >
                {episodeEvents.length > 0 &&
                  episodePosition && (
                    <div
                      onClick={() =>
                        showToast(
                          episodeEvents
                            .map(event => event.title)
                            .join(' → '),
                          'info',
                        )
                      }
                      className="absolute top-2 h-[66px] bg-[#DC2626]/10 border-2 border-dashed border-[#DC2626] rounded-md p-2 cursor-pointer hover:bg-[#DC2626]/20 transition-all flex items-center gap-2 overflow-hidden"
                      style={{
                        left: episodePosition.left,
                        width: episodePosition.width,
                      }}
                    >
                      <span className="material-symbols-outlined text-[#DC2626] text-[18px] shrink-0 animate-pulse">
                        warning
                      </span>

                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-[#DC2626] font-mono">
                          {episodeEvents
                            .map(event => event.title)
                            .join(' → ')}
                        </div>

                        <div className="text-[10px] text-[#424751] truncate">
                          {episodeEvents.length} backend events
                          {' • '}
                          {new Set(
                            episodeEvents.map(
                              event =>
                                getEventDomain(event),
                            ),
                          ).size}{' '}
                          domains
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* SOCIAL */}
            {activeDomains.includes('SOCIAL') && (
              <div className="flex min-h-[90px] border-b border-[#D9E1EA] relative hover:bg-[#F8FAFC] transition-colors overflow-visible">
                <div className="w-44 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2 sticky left-0 z-20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#16A34A]">
                    SOCIAL
                  </span>

                  <span className="text-[9px] text-[#64748B] font-mono">
                    WhatsApp / TG
                  </span>
                </div>

                <div
                  className="relative"
                  style={{
                    width: timelineWidth,
                  }}
                >
                  {renderEventGroups(
                    laneGroups.SOCIAL,
                    'SOCIAL',
                  )}
                </div>
              </div>
            )}

            {/* CDR */}
            {activeDomains.includes('CDR') && (
              <div className="flex min-h-[90px] border-b border-[#D9E1EA] relative hover:bg-[#F8FAFC] transition-colors overflow-visible">
                <div className="w-44 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2 sticky left-0 z-20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0891B2]">
                    CDR
                  </span>

                  <span className="text-[9px] text-[#64748B] font-mono">
                    Voice & SMS
                  </span>
                </div>

                <div
                  className="relative"
                  style={{
                    width: timelineWidth,
                  }}
                >
                  {renderEventGroups(
                    laneGroups.CDR,
                    'CDR',
                  )}
                </div>
              </div>
            )}

            {/* IPDR */}
            {activeDomains.includes('IPDR') && (
              <div className="flex min-h-[90px] border-b border-[#D9E1EA] relative hover:bg-[#F8FAFC] transition-colors overflow-visible">
                <div className="w-44 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2 sticky left-0 z-20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED]">
                    IPDR
                  </span>

                  <span className="text-[9px] text-[#64748B] font-mono">
                    Data Sessions
                  </span>
                </div>

                <div
                  className="relative"
                  style={{
                    width: timelineWidth,
                  }}
                >
                  {renderEventGroups(
                    laneGroups.IPDR,
                    'IPDR',
                  )}
                </div>
              </div>
            )}

            {/* BANK */}
            {activeDomains.includes('BANK') && (
              <div className="flex min-h-[90px] border-b border-[#D9E1EA] relative hover:bg-[#F8FAFC] transition-colors overflow-visible">
                <div className="w-44 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2 sticky left-0 z-20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#F97316]">
                    BANK
                  </span>

                  <span className="text-[9px] text-[#64748B] font-mono">
                    IMPS & Cash-out
                  </span>
                </div>

                <div
                  className="relative"
                  style={{
                    width: timelineWidth,
                  }}
                >
                  {renderEventGroups(
                    laneGroups.BANK,
                    'BANK',
                  )}
                </div>
              </div>
            )}

            {/* NCRP */}
            {activeDomains.includes('NCRP') && (
              <div className="flex min-h-[90px] relative hover:bg-[#F8FAFC] transition-colors overflow-visible">
                <div className="w-44 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2 sticky left-0 z-20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8102E]">
                    NCRP
                  </span>

                  <span className="text-[9px] text-[#64748B] font-mono">
                    1930 Portal
                  </span>
                </div>

                <div
                  className="relative"
                  style={{
                    width: timelineWidth,
                  }}
                >
                  {renderEventGroups(
                    laneGroups.NCRP,
                    'NCRP',
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Details Drawer */}
      <Drawer
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title={
          selectedEvent?.title ||
          'Event Details'
        }
        subtitle={
          selectedEvent?.timestamp
            ? formatTimelineTime(
              selectedEvent.timestamp,
            )
            : undefined
        }
        width="w-[420px]"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => {
                if (!selectedEvent) {
                  return;
                }

                navigator.clipboard.writeText(
                  JSON.stringify(
                    selectedEvent,
                    null,
                    2,
                  ),
                );

                showToast(
                  'Event JSON copied to clipboard.',
                  'success',
                );
              }}
            >
              Copy Payload
            </Button>

            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => {
                if (!selectedEvent) {
                  return;
                }

                showToast(
                  `Event #${selectedEvent.id} marked as primary evidence.`,
                  'success',
                );

                setSelectedEvent(null);
              }}
            >
              Tag as Key Finding
            </Button>
          </>
        }
      >
        {selectedEvent && (
          <div className="space-y-4 text-xs">
            {/* Header domain & description */}
            <div className="p-3 bg-[#F8FAFC] border border-[#D9E1EA] rounded">
              <div className="flex items-center justify-between mb-2">
                <DomainBadge
                  domain={getEventDomain(
                    selectedEvent,
                  ) ?? 'UNKNOWN'}
                  size="md"
                />

                {selectedEvent.isCritical && (
                  <span className="bg-[#DC2626]/10 text-[#DC2626] font-bold text-[10px] px-2 py-0.5 rounded font-mono">
                    CRITICAL CORRELATION
                  </span>
                )}
              </div>

              <p className="text-sm font-medium text-[#191C1E] leading-snug">
                {selectedEvent.description ||
                  '—'}
              </p>
            </div>

            {/* Structured Metadata */}
            <div>
              <h4 className="text-[11px] font-bold text-[#424751] uppercase tracking-wider mb-2">
                Forensic Parameters
              </h4>

              <div className="bg-white border border-[#D9E1EA] rounded divide-y divide-[#EDF0F4]">
                {Object.entries(
                  getEventMetadata(
                    selectedEvent,
                  ),
                ).length ? (
                  Object.entries(
                    getEventMetadata(
                      selectedEvent,
                    ),
                  ).map(([key, value]) => (
                    <div
                      key={key}
                      className="p-2.5 flex justify-between gap-3"
                    >
                      <span className="text-[#64748B] font-medium">
                        {key}
                      </span>

                      <span className="font-mono text-[#191C1E] font-semibold text-right break-all">
                        {String(value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 text-[#64748B]">
                    No structured metadata available.
                  </div>
                )}
              </div>
            </div>

            {/* Provenance */}
            <div>
              <h4 className="text-[11px] font-bold text-[#424751] uppercase tracking-wider mb-2">
                Evidence Provenance & Ingestion Source
              </h4>

              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E1EA] font-mono text-[11px] text-[#424751]">
                <div className="text-[#0B5CAB] font-bold">
                  {selectedEvent.source ||
                    '—'}
                </div>

                <div className="mt-1 text-[#64748B]">
                  {selectedEvent.provenance ||
                    '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};