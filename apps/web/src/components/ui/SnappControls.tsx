import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker,
  DateRangePicker,
  RangeCalendar,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  Heading,
  I18nProvider,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  Switch,
  Text,
  TextArea,
  TextField,
  Input,
} from "react-aria-components";
import { parseDate, type DateValue } from "@internationalized/date";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import { textLength, validateText, type TextRules } from "./validation";
import "./controls.css";

type Theme = {
  theme: "dark" | "light";
  reduced: boolean;
  variables: CSSProperties;
};
const ThemeContext = createContext<Theme>({
  theme: "dark",
  reduced: false,
  variables: {},
});
export function SnappControlProvider({
  children,
  ...theme
}: Theme & { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={theme}>
      <I18nProvider locale="en-PH">{children}</I18nProvider>
    </ThemeContext.Provider>
  );
}
function useOverlayTheme() {
  const { theme, reduced, variables } = useContext(ThemeContext);
  return {
    "data-snapp-theme": theme,
    "data-reduced": reduced,
    style: variables,
  };
}

export type SelectOption = {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
};
export function SnappSelect({
  label,
  value,
  onChange,
  options,
  error,
  disabled,
  required,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  error?: string;
  disabled?: boolean;
  required?: boolean;
  description?: string;
}) {
  const overlay = useOverlayTheme();
  return (
    <Select
      className="snapp-select"
      selectedKey={value || null}
      onSelectionChange={(key) => onChange(String(key ?? ""))}
      isDisabled={disabled}
      isRequired={required}
      isInvalid={!!error}
      validationBehavior="aria"
      placeholder="Choose an option"
    >
      <Label className="snapp-label">
        {label}
        {required && <span>Required</span>}
      </Label>
      <Button
        className="snapp-select-trigger"
        aria-invalid={error ? true : undefined}
      >
        <SelectValue>
          {({ selectedText, isPlaceholder }) =>
            isPlaceholder ? "Choose an option" : selectedText
          }
        </SelectValue>
        <ChevronDown size={16} aria-hidden="true" />
      </Button>
      {description && (
        <Text slot="description" className="snapp-hint">
          {description}
        </Text>
      )}
      <FieldError className="snapp-error">{error}</FieldError>
      <Popover
        className="snapp-ui snapp-popover"
        {...overlay}
        placement="bottom start"
      >
        <ListBox
          className="snapp-listbox"
          items={options}
          disabledKeys={options.filter((o) => o.disabled).map((o) => o.id)}
        >
          {(option) => (
            <ListBoxItem
              className="snapp-option"
              id={option.id}
              textValue={option.label}
            >
              {({ isSelected }) => (
                <>
                  <div>
                    <Text slot="label">{option.label}</Text>
                    {option.description && (
                      <Text slot="description">{option.description}</Text>
                    )}
                  </div>
                  {isSelected && <Check size={16} aria-hidden="true" />}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}

export function SnappDatePicker({
  label,
  value,
  onChange,
  min,
  max,
  error,
  required = true,
  disabled = false,
}: {
  label: string;
  value: DateValue | null;
  onChange: (date: DateValue | null) => void;
  min: string;
  max: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const overlay = useOverlayTheme();
  return (
    <DatePicker
      className="snapp-date-picker"
      value={value}
      onChange={onChange}
      minValue={parseDate(min)}
      maxValue={parseDate(max)}
      placeholderValue={parseDate(min)}
      isRequired={required}
      isDisabled={disabled}
      isInvalid={!!error}
      validationBehavior="aria"
      granularity="day"
      shouldCloseOnSelect
    >
      <Label className="snapp-label">
        {label}
        {required && <span>Required</span>}
      </Label>
      <Group className="snapp-date-group">
        <DateInput className="snapp-date-input">
          {(segment) => (
            <DateSegment segment={segment} className="snapp-date-segment" />
          )}
        </DateInput>
        <Button
          className="snapp-icon-button"
          aria-label={`Open ${label.toLowerCase()} calendar`}
        >
          <CalendarDays size={18} aria-hidden="true" />
        </Button>
      </Group>
      <Text slot="description" className="snapp-hint">
        {min} to {max} · Asia/Manila
      </Text>
      <FieldError className="snapp-error">
        {error || "Enter a complete date within the available range."}
      </FieldError>
      <Popover
        className="snapp-ui snapp-popover snapp-calendar-popover"
        {...overlay}
        placement="bottom start"
      >
        <Dialog
          className="snapp-calendar-dialog"
          aria-label={`${label} calendar`}
        >
          <Calendar className="snapp-calendar">
            <header>
              <Button
                slot="previous"
                aria-label="Previous month"
                className="snapp-icon-button"
              >
                <ChevronLeft size={18} />
              </Button>
              <Heading />
              <Button
                slot="next"
                aria-label="Next month"
                className="snapp-icon-button"
              >
                <ChevronRight size={18} />
              </Button>
            </header>
            <CalendarGrid className="snapp-calendar-grid">
              <CalendarGridHeader>
                {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell className="snapp-calendar-cell" date={date} />
                )}
              </CalendarGridBody>
            </CalendarGrid>
            <Text slot="errorMessage" className="snapp-error" />
          </Calendar>
          <p className="snapp-hint">
            Arrow keys move by day. Page Up/Down changes month. Enter selects.
          </p>
        </Dialog>
      </Popover>
    </DatePicker>
  );
}

export function SnappDateRangePicker({
  label,
  value,
  onChange,
  min,
  max,
  error,
  required = true,
  disabled = false,
  markedDates,
  markedLabel = "has entries",
}: {
  label: string;
  value: { start: DateValue; end: DateValue } | null;
  /** ISO dates to mark with a dot in the calendar (e.g. days with logged hours). */
  markedDates?: readonly string[];
  markedLabel?: string;
  onChange: (date: { start: DateValue; end: DateValue } | null) => void;
  min: string;
  max: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const overlay = useOverlayTheme();
  return (
    <DateRangePicker
      className="snapp-date-picker"
      value={value}
      onChange={onChange}
      minValue={parseDate(min)}
      maxValue={parseDate(max)}
      placeholderValue={parseDate(min)}
      isRequired={required}
      isDisabled={disabled}
      isInvalid={!!error}
      validationBehavior="aria"
      granularity="day"
      shouldCloseOnSelect
    >
      <Label className="snapp-label">
        {label}
        {required && <span>Required</span>}
      </Label>
      <Group className="snapp-date-group">
        <div className="snapp-range-inputs">
          <DateInput slot="start" className="snapp-date-input">
            {(segment) => (
              <DateSegment segment={segment} className="snapp-date-segment" />
            )}
          </DateInput>
          <span aria-hidden="true">to</span>
          <DateInput slot="end" className="snapp-date-input">
            {(segment) => (
              <DateSegment segment={segment} className="snapp-date-segment" />
            )}
          </DateInput>
        </div>
        <Button
          className="snapp-icon-button"
          aria-label={`Open ${label.toLowerCase()} calendar`}
        >
          <CalendarDays size={18} aria-hidden="true" />
        </Button>
      </Group>
      <Text slot="description" className="snapp-hint">
        {min} to {max} · Asia/Manila
      </Text>
      <FieldError className="snapp-error">
        {error || "Enter a complete date within the available range."}
      </FieldError>
      <Popover
        className="snapp-ui snapp-popover snapp-calendar-popover"
        {...overlay}
        placement="bottom start"
      >
        <Dialog
          className="snapp-calendar-dialog"
          aria-label={`${label} calendar`}
        >
          <RangeCalendar className="snapp-calendar snapp-range-calendar">
            <header>
              <Button
                slot="previous"
                aria-label="Previous month"
                className="snapp-icon-button"
              >
                <ChevronLeft size={18} />
              </Button>
              <Heading />
              <Button
                slot="next"
                aria-label="Next month"
                className="snapp-icon-button"
              >
                <ChevronRight size={18} />
              </Button>
            </header>
            <CalendarGrid className="snapp-calendar-grid">
              <CalendarGridHeader>
                {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => {
                  const marked = markedDates?.includes(date.toString());
                  return (
                    <CalendarCell
                      className="snapp-calendar-cell"
                      date={date}
                      data-marked={marked || undefined}
                    >
                      {({ formattedDate }) => (
                        <>
                          {formattedDate}
                          {marked && (
                            <>
                              <i
                                className="snapp-calendar-mark"
                                aria-hidden="true"
                              />
                              <span className="snapp-visually-hidden">
                                , {markedLabel}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </CalendarCell>
                  );
                }}
              </CalendarGridBody>
            </CalendarGrid>
            {markedDates && (
              <p className="snapp-calendar-legend">
                <i className="snapp-calendar-mark" aria-hidden="true" />{" "}
                {markedLabel}
              </p>
            )}
            <Text slot="errorMessage" className="snapp-error" />
          </RangeCalendar>
          <p className="snapp-hint">
            Arrow keys move by day. Page Up/Down changes month. Enter selects.
          </p>
        </Dialog>
      </Popover>
    </DateRangePicker>
  );
}

export function SnappTextField({
  label,
  value,
  onChange,
  rules,
  multiline = false,
  submitted = false,
  disabled = false,
  description,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  rules: TextRules;
  multiline?: boolean;
  submitted?: boolean;
  disabled?: boolean;
  description?: string;
  placeholder?: string;
}) {
  const [touched, setTouched] = useState(false);
  const [composing, setComposing] = useState(false);
  const length = textLength(value);
  const problem = validateText(value, rules);
  const over = length > rules.max;
  const near = length >= Math.ceil(rules.max * 0.9) && !over;
  const invalid = !composing && !!problem && (touched || submitted || over);
  const state = invalid
    ? "invalid"
    : near
      ? "near"
      : length >= rules.min
        ? "valid"
        : length
          ? "progress"
          : "empty";
  const progress = Math.min(100, (length / rules.max) * 100);
  const Icon = invalid
    ? XCircle
    : near
      ? TriangleAlert
      : length >= rules.min
        ? Check
        : Info;
  const status = invalid
    ? problem
    : near
      ? `${rules.max - length} characters remaining.`
      : length >= rules.min
        ? "Minimum met. Ready to submit."
        : `${rules.min}–${rules.max} characters. Leading and trailing spaces do not count.`;
  return (
    <TextField
      className="snapp-text-field"
      value={value}
      onChange={onChange}
      isRequired={rules.required !== false}
      isDisabled={disabled}
      isInvalid={invalid}
      validationBehavior="aria"
      onBlur={() => setTouched(true)}
      data-length-state={state}
    >
      <Label className="snapp-label">
        {label}
        <span>{rules.required === false ? "Optional" : "Required"}</span>
      </Label>
      <div className="snapp-text-frame">
        {multiline ? (
          <TextArea
            className="snapp-text-input"
            placeholder={placeholder}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
          />
        ) : (
          <Input
            className="snapp-text-input"
            placeholder={placeholder}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
          />
        )}
      </div>
      <div className="snapp-field-meta">
        <span className="snapp-length-state">
          <Icon size={14} aria-hidden="true" />
          {state === "invalid"
            ? "Needs correction"
            : state === "near"
              ? length === rules.max
                ? "Limit reached"
                : "Near limit"
              : state === "valid"
                ? "Minimum met"
                : "Length requirement"}
        </span>
        <span className="snapp-count">
          <span className="snapp-length-meter" aria-hidden="true">
            <i style={{ transform: `scaleX(${progress / 100})` }} />
          </span>
          {length} / {rules.max}
        </span>
      </div>
      <Text slot="description" className="snapp-hint">
        {description ? `${description} ` : ""}
        {invalid ? `${rules.min}–${rules.max} characters.` : status}
      </Text>
      <FieldError className="snapp-error">{problem}</FieldError>
    </TextField>
  );
}

export function SnappSwitch({
  label,
  selected,
  onChange,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Switch
      className="snapp-switch"
      isSelected={selected}
      onChange={onChange}
      isDisabled={disabled}
    >
      <span className="snapp-switch-track" aria-hidden="true">
        <span />
      </span>
      {label}
    </Switch>
  );
}
export function SnappSlider({
  label,
  value,
  onChange,
  min,
  max,
  suffix = "",
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <Slider
      className="snapp-slider"
      value={value}
      onChange={onChange}
      minValue={min}
      maxValue={max}
      isDisabled={disabled}
    >
      <div className="snapp-slider-label">
        <Label>{label}</Label>
        <SliderOutput>
          {value}
          {suffix}
        </SliderOutput>
      </div>
      <SliderTrack className="snapp-slider-track">
        {({ state }) => (
          <>
            <div className="snapp-slider-rail" />
            <div
              className="snapp-slider-fill"
              style={{ width: `${state.getThumbPercent(0) * 100}%` }}
            />
            <SliderThumb className="snapp-slider-thumb" />
          </>
        )}
      </SliderTrack>
    </Slider>
  );
}

/** Roving tab focus; panels retain their stable id and accessible name. */
export function SnappTabs({
  label,
  options,
  value,
  onChange,
  panelId,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  panelId: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="lib-tabs" role="tablist" aria-label={label}>
      {options.map((option, index) => (
        <button
          type="button"
          role="tab"
          id={`${panelId}-${index}`}
          aria-controls={panelId}
          key={option}
          ref={(node) => {
            refs.current[index] = node;
          }}
          aria-selected={value === option}
          tabIndex={value === option ? 0 : -1}
          onClick={() => onChange(option)}
          onKeyDown={(event) => {
            const next =
              event.key === "ArrowRight"
                ? (index + 1) % options.length
                : event.key === "ArrowLeft"
                  ? (index + options.length - 1) % options.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? options.length - 1
                      : -1;
            if (next >= 0) {
              event.preventDefault();
              onChange(options[next]);
              refs.current[next]?.focus();
            }
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export type ToastTone = "info" | "warning" | "error";
type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
  returnFocusTo: HTMLElement | null;
};
export function useSnappToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const notify = (message: string, tone: ToastTone = "info") => {
    const id = ++nextId.current;
    const returnFocusTo =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setToasts((items) => [
      ...items.filter((item) => item.message !== message),
      { id, message, tone, returnFocusTo },
    ]);
  };
  const dismiss = (id: number) =>
    setToasts((items) => items.filter((item) => item.id !== id));
  return { toasts, notify, dismiss };
}
export function SnappToastRegion({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
}) {
  return (
    <div className="snapp-toasts" role="region" aria-label="Notifications">
      {toasts.slice(0, 3).map((toast) => (
        <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />
      ))}
    </div>
  );
}
function ToastItem({
  toast,
  dismiss,
}: {
  toast: Toast;
  dismiss: (id: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const remaining = useRef(6000);
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  useEffect(() => {
    const handler = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  useEffect(() => {
    if (hover || focus || hidden || toast.tone !== "info") return;
    const start = Date.now();
    const timeout = setTimeout(
      () => dismissRef.current(toast.id),
      remaining.current,
    );
    return () => {
      clearTimeout(timeout);
      remaining.current = Math.max(0, remaining.current - (Date.now() - start));
    };
  }, [hover, focus, hidden, toast.id, toast.tone]);
  const Icon =
    toast.tone === "error"
      ? XCircle
      : toast.tone === "warning"
        ? TriangleAlert
        : Check;
  const titleId = useId();
  return (
    <div
      className="snapp-toast"
      data-tone={toast.tone}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setFocus(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocus(false);
      }}
    >
      <Icon size={18} aria-hidden="true" />
      <div
        role={toast.tone === "error" ? "alert" : "status"}
        aria-atomic="true"
        id={titleId}
      >
        {toast.message}
      </div>
      <button
        type="button"
        className="snapp-icon-button"
        aria-label="Dismiss notification"
        aria-describedby={titleId}
        onClick={() => {
          dismiss(toast.id);
          requestAnimationFrame(() => {
            if (
              toast.returnFocusTo?.isConnected &&
              !toast.returnFocusTo.matches(":disabled")
            )
              toast.returnFocusTo.focus();
          });
        }}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
