type Option = { label: string; value: string };

type ToggleOptionsProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

export function ToggleOptions({ options, value, onChange }: ToggleOptionsProps) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-wax/20">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-3 text-body transition-colors ${
            value === opt.value
              ? "bg-ember text-wax"
              : "bg-evergreen text-wax/60 hover:text-wax"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
